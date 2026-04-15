import User, { UserRole, Rank } from '../models/User';
import { AppError } from '../utils/AppError';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  overall: number;
  xp: number;
  level: number;
  rank: Rank;
  averageRating: number;
  totalMatches: number;
}

export const getUserById = async (userId: string): Promise<UserProfile> => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('User not found', 404);

  return {
    id:            String(user._id),
    name:          user.name,
    email:         user.email,
    role:          user.role,
    overall:       user.overall,
    xp:            user.xp,
    level:         user.level,
    rank:          user.rank,
    averageRating: user.averageRating ?? 0,
    totalMatches:  user.totalMatches  ?? 0,
  };
};
