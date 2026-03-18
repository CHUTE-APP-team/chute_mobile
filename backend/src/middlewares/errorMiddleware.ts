import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    sendError(res, message, 422);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  if (err instanceof Error) {
    console.error('[Unhandled Error]', err);
    sendError(res, 'Internal server error', 500);
    return;
  }

  sendError(res, 'Unknown error', 500);
};
