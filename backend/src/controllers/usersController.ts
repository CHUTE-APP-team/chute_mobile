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
