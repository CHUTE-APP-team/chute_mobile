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

    let query: any = Match.find(odata.filter).sort({ date: 1 });

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

    let query: any = Match.findById(req.params.id);

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
    // Remove from invites if they were invited
    match.invites = match.invites.filter((i) => i.toString() !== userId) as typeof match.invites;

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

// ─── Draw Teams (snake draft) ─────────────────────────────────────────────────
// POST /matches/:id/draw-teams
// Sorts confirmed players by overall DESC, distributes via snake draft (A B B A…),
// persists teams on the match, and returns both teams with player details.

export async function drawTeams(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    if (match.createdBy.toString() !== req.userId) {
      throw new AppError('Only the organizer can draw teams', 403);
    }
    if (match.status === 'finished') throw new AppError('Match is already finished', 400);
    if (match.players.length < 2) {
      throw new AppError('At least 2 players are required to draw teams', 400);
    }

    const playersWithOverall = await User.find(
      { _id: { $in: match.players } },
      { _id: 1, name: 1, overall: 1 }
    ).lean() as { _id: Types.ObjectId; name: string; overall: number }[];

    const [teamA, teamB] = generateBalancedTeams(playersWithOverall);

    match.teams = [teamA, teamB];
    match.teamsGeneratedAt = new Date();
    await match.save();

    // Build response with full player details
    const playerMap = new Map(playersWithOverall.map((p) => [p._id.toString(), p]));

    const buildDetail = (team: typeof teamA) => ({
      name: team.name,
      totalOverall: team.totalOverall,
      players: team.players.map((id) => {
        const p = playerMap.get(id.toString());
        return { _id: id, name: p?.name ?? '—', overall: p?.overall ?? 0 };
      }),
    });

    sendSuccess(res, 'Teams drawn', {
      teamA: buildDetail(teamA),
      teamB: buildDetail(teamB),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Invite User to Match ─────────────────────────────────────────────────────
// POST /matches/:id/invite  — only organizer; looks up user by email

export async function inviteToMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    if (match.createdBy.toString() !== req.userId) {
      throw new AppError('Only the organizer can invite players', 403);
    }
    if (match.status === 'finished') throw new AppError('Match is already finished', 400);

    const { email } = req.body;
    if (!email?.trim()) throw new AppError('Email is required', 400);

    const target = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email');
    if (!target) throw new AppError('No user found with that email', 404);

    const targetId = target._id as Types.ObjectId;
    const alreadyPlayer = match.players.some((p) => p.equals(targetId));
    if (alreadyPlayer) throw new AppError('User is already in the match', 400);

    const alreadyInvited = match.invites.some((i) => i.equals(targetId));
    if (alreadyInvited) throw new AppError('User is already invited', 400);

    match.invites.push(targetId);
    await match.save();

    sendSuccess(res, 'Invite sent', { invitedUser: { _id: target._id, name: target.name, email: target.email } });
  } catch (err) {
    next(err);
  }
}

// ─── Leave Match ──────────────────────────────────────────────────────────────
// POST /matches/:id/leave

export async function leaveMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    if (match.status === 'finished') throw new AppError('Match is already finished', 400);

    const userId = req.userId as string;
    const inPlayers = match.players.some((p) => p.toString() === userId);
    const inInvites = match.invites.some((i) => i.toString() === userId);

    if (!inPlayers && !inInvites) throw new AppError('You are not in this match', 400);
    if (match.createdBy.toString() === userId) throw new AppError('The organizer cannot leave the match', 400);

    match.players = match.players.filter((p) => p.toString() !== userId) as typeof match.players;
    match.invites = match.invites.filter((i) => i.toString() !== userId) as typeof match.invites;
    await match.save();

    sendSuccess(res, 'You left the match', null);
  } catch (err) {
    next(err);
  }
}

// ─── List My Pending Invites ──────────────────────────────────────────────────
// GET /matches/my-invites

export async function getMyInvites(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const matches = await Match.find({
      invites: req.userId,
      status: 'open',
    })
      .select('title location date maxPlayers players createdBy invites')
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .lean();

    sendSuccess(res, 'Pending invites retrieved', matches);
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
