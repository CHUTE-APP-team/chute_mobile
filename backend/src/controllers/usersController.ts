import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getUserById } from '../services/usersService';
import { sendSuccess } from '../utils/response';

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
