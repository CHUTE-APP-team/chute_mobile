/**
 * Match Controller
 *
 * OData-like usage examples:
 *
 *   GET /matches?$select=title,location
 *   GET /matches?$expand=players
 *   GET /matches?$filter=location eq "Arena XP"
 *   GET /matches?$top=10&$skip=0
 *   GET /matches?$expand=players&$select=title,location,maxPlayers
 *
 *   GET /matches/:id?$expand=players
 *   GET /matches/:id?$expand=players,organizer
 */

import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import Match from '../models/Match';
import User from '../models/User';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import { parseODataQuery } from '../utils/odataQueryParser';
import { generateBalancedTeams, shouldAutoGenerateTeams } from '../services/matchService';
import { buildPlayerResults, updatePlayerProgress, FinishMatchPayload, recalcPlayerStats } from '../services/progressionService';

const MIN_PLAYERS_FOR_TEAMS = 4;

// ─── Create Match ─────────────────────────────────────────────────────────────

export async function createMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, location, date, maxPlayers } = req.body;
    const match = await Match.create({
      title,
      location,
      date,
      maxPlayers,
      players: [req.userId],
      createdBy: req.userId,
    });
    sendSuccess(res, 'Match created', match, 201);
  } catch (err) {
    next(err);
  }
}

// ─── List Matches ─────────────────────────────────────────────────────────────
// ODATA-LIKE QUERY SUPPORT
// Supports: $select, $expand, $filter, $top, $skip

export async function getMatches(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const odata = parseODataQuery(req.query);

    let query = Match.find(odata.filter).sort({ date: 1 });

    if (odata.select) query = query.select(odata.select);

    for (const path of odata.expand) {
      query = query.populate(path, '-password');
    }

    if (odata.top  !== null) query = query.limit(odata.top);
    if (odata.skip !== null) query = query.skip(odata.skip);

    const matches = await query.exec();
    sendSuccess(res, 'Matches retrieved', matches);
  } catch (err) {
    next(err);
  }
}

// ─── Get Single Match ─────────────────────────────────────────────────────────
// ODATA-LIKE QUERY SUPPORT
// Supports: $select, $expand

export async function getMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const odata = parseODataQuery(req.query);

    let query = Match.findById(req.params.id);

    if (odata.select) query = query.select(odata.select);

    for (const path of odata.expand) {
      query = query.populate(path, '-password');
    }

    const match = await query.exec();

    if (!match) throw new AppError('Match not found', 404);

    sendSuccess(res, 'Match retrieved', match);
  } catch (err) {
    next(err);
  }
}

// ─── Join Match ───────────────────────────────────────────────────────────────

export async function joinMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) throw new AppError('Match not found', 404);

    const userId = req.userId as string;
    const alreadyJoined = match.players.some((p) => p.toString() === userId);

    if (alreadyJoined) throw new AppError('You have already joined this match', 400);
    if (match.players.length >= match.maxPlayers) throw new AppError('Match is full', 400);

    match.players.push(new Types.ObjectId(userId));

    // Auto-generate balanced teams when minimum player threshold is reached
    if (shouldAutoGenerateTeams(match.players.length, MIN_PLAYERS_FOR_TEAMS)) {
      const playersWithOverall = await User.find(
        { _id: { $in: match.players } },
        { _id: 1, overall: 1 }
      ).lean();

      const [teamA, teamB] = generateBalancedTeams(playersWithOverall as { _id: Types.ObjectId; overall: number }[]);
      match.teams = [teamA, teamB];
      match.teamsGeneratedAt = new Date();
    }

    await match.save();

    const populated = await Match.findById(match._id)
      .populate('players', 'name overall -password')
      .populate('teams.players', 'name overall -password');

    sendSuccess(res, 'Joined match', populated);
  } catch (err) {
    next(err);
  }
}

// ─── Generate Teams (manual) ──────────────────────────────────────────────────

export async function generateMatchTeams(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) throw new AppError('Match not found', 404);

    if (match.createdBy.toString() !== req.userId) {
      throw new AppError('Only the match owner can generate teams', 403);
    }

    if (match.players.length < MIN_PLAYERS_FOR_TEAMS) {
      throw new AppError(
        `At least ${MIN_PLAYERS_FOR_TEAMS} players are required to generate teams`,
        400
      );
    }

    const playersWithOverall = await User.find(
      { _id: { $in: match.players } },
      { _id: 1, overall: 1 }
    ).lean();

    const [teamA, teamB] = generateBalancedTeams(playersWithOverall as { _id: Types.ObjectId; overall: number }[]);
    match.teams = [teamA, teamB];
    match.teamsGeneratedAt = new Date();
    await match.save();

    const populated = await Match.findById(match._id)
      .populate('teams.players', 'name overall -password');

    sendSuccess(res, 'Times gerados com sucesso', { teams: populated!.teams });
  } catch (err) {
    next(err);
  }
}

// ─── Rate Players ─────────────────────────────────────────────────────────────
// POST /matches/:id/rate
// Body: { playerId, rating, goals?, assists?, mvp? }

export async function ratePlayer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    const { playerId, rating, goals = 0, assists = 0, mvp = false } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      throw new AppError('rating must be a number between 0 and 10', 400);
    }

    const targetId = new Types.ObjectId(playerId);
    const isInMatch = match.players.some((p) => p.equals(targetId));
    if (!isInMatch) throw new AppError('Player is not in this match', 400);

    // Upsert: update if exists, insert otherwise
    const existingIndex = match.playerResults.findIndex((r) =>
      r.playerId.equals(targetId)
    );

    const winnerTeam = match.teams.find((t) => t.name === match.winnerTeam);
    const isWinner = winnerTeam?.players.some((p) => p.equals(targetId)) ?? false;
    const isMvp    = mvp || match.mvpPlayerId?.equals(targetId) || false;

    if (existingIndex >= 0) {
      match.playerResults[existingIndex].notaFinal = rating;
      match.playerResults[existingIndex].goals     = goals;
      match.playerResults[existingIndex].assists   = assists;
      match.playerResults[existingIndex].isMvp     = isMvp;
    } else {
      match.playerResults.push({
        playerId: targetId,
        notaFinal: rating,
        isWinner,
        isMvp,
        xpEarned: 0,
        goals,
        assists,
      });
    }

    await match.save();

    // Recalculate player overall / averageRating / totalMatches
    await recalcPlayerStats(playerId);

    sendSuccess(res, 'Avaliação salva', { playerId, rating, goals, assists, isMvp });
  } catch (err) {
    next(err);
  }
}

// ─── Get Teams ────────────────────────────────────────────────────────────────

export async function getMatchTeams(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id)
      .populate('players', 'name overall -password')
      .populate('teams.players', 'name overall -password');

    if (!match) throw new AppError('Match not found', 404);

    sendSuccess(res, 'Teams retrieved', {
      teams: match.teams,
      players: match.players,
      playerCount: match.players.length,
      maxPlayers: match.maxPlayers,
      hasTeams: match.teams.length === 2,
      teamsGeneratedAt: match.teamsGeneratedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Finish Match ─────────────────────────────────────────────────────────────
// PATCH /matches/:id/finish
// Body: { winnerTeam, mvpPlayerId, playerNotes: { [userId]: notaFinal } }

export async function finishMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) throw new AppError('Match not found', 404);

    if (match.createdBy.toString() !== req.userId) {
      throw new AppError('Only the match owner can finish the match', 403);
    }

    if (match.status === 'finished') {
      throw new AppError('Match is already finished', 400);
    }

    const payload = req.body as FinishMatchPayload;

    const results = buildPlayerResults(match, payload);

    match.status        = 'finished';
    match.winnerTeam    = payload.winnerTeam;
    match.mvpPlayerId   = new Types.ObjectId(payload.mvpPlayerId);
    match.playerResults = results;
    match.finishedAt    = new Date();
    await match.save();

    await updatePlayerProgress(results);

    sendSuccess(res, 'Partida finalizada', {
      winnerTeam: match.winnerTeam,
      mvpPlayerId: match.mvpPlayerId,
      playerResults: match.playerResults,
    });
  } catch (err) {
    next(err);
  }
}
