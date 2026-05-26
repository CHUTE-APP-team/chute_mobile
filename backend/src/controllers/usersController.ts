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
import User, { USER_ROLES } from '../models/User';
import { getUserById } from '../services/usersService';
import { sendSuccess } from '../utils/response';
import { parseODataQuery } from '../utils/odataQueryParser';
import { AppError } from '../utils/AppError';

const LEADERBOARD_LIMIT = 50;
const RANKING_DEFAULT_LIMIT = 20;

// ─── Get Current User ─────────────────────────────────────────────────────────

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getUserById(req.userId!);
    sendSuccess(res, 'User retrieved', user);
  } catch (err) {
    next(err);
  }
};

// ─── Update Current User ──────────────────────────────────────────────────────

export const updateMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, role } = req.body as { name?: string; role?: string };

    if (role && !USER_ROLES.includes(role as any)) {
      throw new AppError(`Invalid role. Must be one of: ${USER_ROLES.join(', ')}`, 400);
    }

    const updates: Record<string, string> = {};
    if (name)  updates.name = name.trim();
    if (role)  updates.role = role;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) throw new AppError('User not found', 404);

    sendSuccess(res, 'User updated', user);
  } catch (err) {
    next(err);
  }
};

// ─── Delete Current User ──────────────────────────────────────────────────────

export const deleteMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, 'Account deleted', null);
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

    // Always exclude password.
    // If $select was provided, remove 'password' from the inclusion list (pure inclusion projection).
    // Otherwise fall back to a pure exclusion projection.
    let projection: Record<string, number> | string;
    if (odata.select) {
      const { password: _omit, ...safeSelect } = odata.select as Record<string, number>;
      projection = safeSelect;
    } else {
      projection = '-password';
    }

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

// ─── Ranking ──────────────────────────────────────────────────────────────────
// GET /ranking?limit=20&page=1
// Ordered by: overall DESC → averageRating DESC → totalMatches DESC

export const getRanking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || RANKING_DEFAULT_LIMIT, 100);
    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const skip  = (page - 1) * limit;

    const players = await User.find()
      .select('name stars starRatingsCount averageRating totalMatches xp level rank')
      .sort({ stars: -1, averageRating: -1, totalMatches: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments();

    const ranking = players.map((player, index) => ({
      position:         skip + index + 1,
      _id:              player._id,
      name:             player.name,
      stars:            player.stars            ?? 3,
      starRatingsCount: player.starRatingsCount ?? 0,
      averageRating:    player.averageRating    ?? 0,
      totalMatches:     player.totalMatches     ?? 0,
      xp:               player.xp               ?? 0,
      level:            player.level             ?? 1,
      rank:             player.rank              ?? 'Bronze',
    }));

    sendSuccess(res, 'Ranking retrieved', {
      ranking,
      page,
      limit,
      total,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Player Stats ─────────────────────────────────────────────────────────────
// GET /users/:id/stats

export const getPlayerStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('name stars starRatingsCount averageRating totalMatches xp level rank')
      .lean();

    if (!user) throw new AppError('User not found', 404);

    sendSuccess(res, 'Player stats retrieved', {
      _id:              user._id,
      name:             user.name,
      stars:            user.stars            ?? 3,
      starRatingsCount: user.starRatingsCount ?? 0,
      averageRating:    user.averageRating    ?? 0,
      totalMatches:     user.totalMatches     ?? 0,
      xp:               user.xp               ?? 0,
      level:            user.level             ?? 1,
      rank:             user.rank              ?? 'Bronze',
    });
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
      .select('name xp level rank stars starRatingsCount')
      .sort({ xp: -1, level: -1 })
      .limit(LEADERBOARD_LIMIT)
      .lean();

    const leaderboard = players.map((player, index) => ({
      position:         index + 1,
      _id:              player._id,
      name:             player.name,
      xp:               player.xp               ?? 0,
      level:            player.level             ?? 1,
      rank:             player.rank              ?? 'Bronze',
      stars:            player.stars             ?? 3,
      starRatingsCount: player.starRatingsCount  ?? 0,
    }));

    sendSuccess(res, 'Leaderboard retrieved', leaderboard);
  } catch (err) {
    next(err);
  }
};
