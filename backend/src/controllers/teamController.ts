import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import TeamGroup from '../models/TeamGroup';
import User from '../models/User';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';

// ─── Create Team ──────────────────────────────────────────────────────────────

export async function createTeam(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) throw new AppError('Team name is required', 400);

    const team = await TeamGroup.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      createdBy: req.userId,
      members: [req.userId],
    });

    const populated = await TeamGroup.findById(team._id)
      .populate('members', 'name email -password')
      .populate('createdBy', 'name email -password');

    sendSuccess(res, 'Team created', populated, 201);
  } catch (err) {
    next(err);
  }
}

// ─── List My Teams ────────────────────────────────────────────────────────────

export async function getMyTeams(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teams = await TeamGroup.find({ members: req.userId })
      .populate('members', 'name email -password')
      .populate('createdBy', 'name email -password')
      .sort({ createdAt: -1 });

    sendSuccess(res, 'Teams retrieved', teams);
  } catch (err) {
    next(err);
  }
}

// ─── Get Team ─────────────────────────────────────────────────────────────────

export async function getTeam(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const team = await TeamGroup.findById(req.params.id)
      .populate('members', 'name email overall level rank -password')
      .populate('createdBy', 'name email -password');

    if (!team) throw new AppError('Team not found', 404);

    const isMember = team.members.some(
      (m: any) => m._id.toString() === req.userId
    );
    if (!isMember) throw new AppError('You are not a member of this team', 403);

    sendSuccess(res, 'Team retrieved', team);
  } catch (err) {
    next(err);
  }
}

// ─── Update Team ──────────────────────────────────────────────────────────────

export async function updateTeam(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const team = await TeamGroup.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.createdBy.toString() !== req.userId) {
      throw new AppError('Only the team creator can edit it', 403);
    }

    const { name, description } = req.body;
    if (name)        team.name        = name.trim();
    if (description !== undefined) team.description = description.trim();

    await team.save();

    const populated = await TeamGroup.findById(team._id)
      .populate('members', 'name email -password')
      .populate('createdBy', 'name email -password');

    sendSuccess(res, 'Team updated', populated);
  } catch (err) {
    next(err);
  }
}

// ─── Delete Team ──────────────────────────────────────────────────────────────

export async function deleteTeam(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const team = await TeamGroup.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.createdBy.toString() !== req.userId) {
      throw new AppError('Only the team creator can delete it', 403);
    }

    await TeamGroup.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Team deleted', null);
  } catch (err) {
    next(err);
  }
}

// ─── Add Member by Email ──────────────────────────────────────────────────────

export async function addMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const team = await TeamGroup.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    const isMember = team.members.some((m) => m.toString() === req.userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);

    const { email } = req.body;
    if (!email?.trim()) throw new AppError('Email is required', 400);

    const newUser = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email');
    if (!newUser) throw new AppError('No user found with that email', 404);

    const alreadyMember = team.members.some(
      (m) => m.toString() === (newUser._id as Types.ObjectId).toString()
    );
    if (alreadyMember) throw new AppError('User is already a member', 400);

    team.members.push(newUser._id as Types.ObjectId);
    await team.save();

    const populated = await TeamGroup.findById(team._id)
      .populate('members', 'name email overall level rank -password')
      .populate('createdBy', 'name email -password');

    sendSuccess(res, 'Member added', populated);
  } catch (err) {
    next(err);
  }
}
