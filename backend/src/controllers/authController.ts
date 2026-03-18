import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { sendSuccess } from '../utils/response';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const payload = await registerUser(name, email, password);
    sendSuccess(res, 'User registered successfully', payload, 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const payload = await loginUser(email, password);
    sendSuccess(res, 'Login successful', payload);
  } catch (err) {
    next(err);
  }
};
