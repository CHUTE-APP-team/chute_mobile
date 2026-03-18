import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser, UserRole } from '../models/User';
import { AppError } from '../utils/AppError';

export interface AuthPayload {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: Date;
  };
}

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) throw new AppError('JWT_SECRET is not configured', 500);

  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
};

const formatUser = (user: IUser): AuthPayload['user'] => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: UserRole = 'player'
): Promise<AuthPayload> => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashedPassword, role });

  return { token: generateToken(String(user._id)), user: formatUser(user) };
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthPayload> => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  return { token: generateToken(String(user._id)), user: formatUser(user) };
};
