import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import Post from '../models/Post';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';

const FEED_LIMIT = 20;

// ─── Create Post ──────────────────────────────────────────────────────────────

export async function createPost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { content } = req.body;
    if (!content?.trim()) throw new AppError('Content is required', 400);
    if (content.trim().length > 280) throw new AppError('Content cannot exceed 280 characters', 400);

    const post = await Post.create({ content: content.trim(), author: req.userId, likes: [] });
    const populated = await Post.findById(post._id)
      .populate('author', 'name');

    sendSuccess(res, 'Post created', populated, 201);
  } catch (err) {
    next(err);
  }
}

// ─── List Posts ───────────────────────────────────────────────────────────────

export async function getPosts(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const posts = await Post.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(FEED_LIMIT)
      .lean();

    sendSuccess(res, 'Posts retrieved', posts);
  } catch (err) {
    next(err);
  }
}

// ─── Toggle Like ──────────────────────────────────────────────────────────────

export async function toggleLike(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404);

    const userId = new Types.ObjectId(req.userId!);
    const alreadyLiked = post.likes.some((id) => id.equals(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(userId)) as typeof post.likes;
    } else {
      post.likes.push(userId);
    }

    await post.save();
    sendSuccess(res, alreadyLiked ? 'Unliked' : 'Liked', { likes: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    next(err);
  }
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

export async function deletePost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404);
    if (post.author.toString() !== req.userId) {
      throw new AppError('Only the author can delete this post', 403);
    }

    await Post.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Post deleted', null);
  } catch (err) {
    next(err);
  }
}
