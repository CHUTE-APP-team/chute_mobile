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
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import { parseODataQuery } from '../utils/odataQueryParser';

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

    // Build base query with optional $filter
    let query = Match.find(odata.filter).sort({ date: 1 });

    // $select — return only requested fields
    if (odata.select) query = query.select(odata.select);

    // $expand — populate related documents
    for (const path of odata.expand) {
      query = query.populate(path, '-password');
    }

    // $top / $skip — pagination
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

    // $select — return only requested fields
    if (odata.select) query = query.select(odata.select);

    // $expand — populate related documents
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
    await match.save();

    // Re-fetch with players populated so the client gets full player objects
    const populated = await Match.findById(match._id).populate('players', 'name -password');
    sendSuccess(res, 'Joined match', populated);
  } catch (err) {
    next(err);
  }
}
