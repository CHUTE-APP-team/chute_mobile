import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): void => {
  const body: ApiResponse<T> = { success: true, message };
  if (data !== undefined) body.data = data;
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): void => {
  const body: ApiResponse<never> = { success: false, message };
  res.status(statusCode).json(body);
};
