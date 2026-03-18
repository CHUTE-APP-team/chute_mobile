import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import Match from '../models/Match';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';

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

export async function getMatches(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const matches = await Match.find().sort({ date: 1 });
    sendSuccess(res, 'Matches retrieved', matches);
  } catch (err) {
    next(err);
  }
}

export async function joinMatch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const userId = req.userId as string;
    const alreadyJoined = match.players.some((p) => p.toString() === userId);

    if (alreadyJoined) {
      throw new AppError('You have already joined this match', 400);
    }

    if (match.players.length >= match.maxPlayers) {
      throw new AppError('Match is full', 400);
    }

    match.players.push(new Types.ObjectId(userId));
    await match.save();

    sendSuccess(res, 'Joined match', match);
  } catch (err) {
    next(err);
  }
}
