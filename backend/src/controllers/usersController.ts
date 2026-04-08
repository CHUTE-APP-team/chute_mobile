/**
 * Users Controller
 *
 * OData-like usage examples:
 *
 *   GET /users?$select=name,email
 *   GET /users?$filter=role eq player
 *   GET /users?$top=20&$skip=0
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import User from '../models/User';
import { getUserById } from '../services/usersService';
import { sendSuccess } from '../utils/response';
import { parseODataQuery } from '../utils/odataQueryParser';

const LEADERBOARD_LIMIT = 50;

// ─── Get Current User ─────────────────────────────────────────────────────────

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getUserById(req.userId!);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// ─── List Users ───────────────────────────────────────────────────────────────
// ODATA-LIKE QUERY SUPPORT
// Supports: $select, $filter, $top, $skip
// Note: $expand not applicable here (no refs to populate on User)

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const odata = parseODataQuery(req.query);

    // Always exclude password, merge with any $select projection
    const projection = odata.select
      ? { ...odata.select, password: 0 }
      : { password: 0 };

    let query = User.find(odata.filter).select(projection).sort({ name: 1 });

    // $top / $skip — pagination
    if (odata.top  !== null) query = query.limit(odata.top);
    if (odata.skip !== null) query = query.skip(odata.skip);

    const users = await query.exec();
    sendSuccess(res, 'Users retrieved', users);
  } catch (err) {
    next(err);
  }
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
// GET /users/leaderboard
// Returns top 50 players sorted by xp DESC, level DESC, each with their position.

export const getLeaderboard = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const players = await User.find()
      .select('name xp level rank overall -password')
      .sort({ xp: -1, level: -1 })
      .limit(LEADERBOARD_LIMIT)
      .lean();

    const leaderboard = players.map((player, index) => ({
      position: index + 1,
      _id:      player._id,
      name:     player.name,
      xp:       player.xp   ?? 0,
      level:    player.level ?? 1,
      rank:     player.rank  ?? 'Bronze',
      overall:  player.overall ?? 70,
    }));

    sendSuccess(res, 'Leaderboard retrieved', leaderboard);
  } catch (err) {
    next(err);
  }
};
