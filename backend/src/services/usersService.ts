import User, { UserRole, Rank } from '../models/User';
import { AppError } from '../utils/AppError';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  stars: number;
  starRatingsCount: number;
  xp: number;
  level: number;
  rank: Rank;
  averageRating: number;
  totalMatches: number;
  city?: string;
  state?: string;
  birthDate?: string;
  strongFoot?: 'right' | 'left';
}

export const getUserById = async (userId: string): Promise<UserProfile> => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('User not found', 404);

  return {
    id:               String(user._id),
    name:             user.name,
    email:            user.email,
    role:             user.role,
    stars:            user.stars            ?? 3,
    starRatingsCount: user.starRatingsCount ?? 0,
    xp:               user.xp,
    level:            user.level,
    rank:             user.rank,
    averageRating:    user.averageRating ?? 0,
    totalMatches:     user.totalMatches  ?? 0,
    city:             user.city,
    state:            user.state,
    birthDate:        user.birthDate ? user.birthDate.toISOString().slice(0, 10) : undefined,
    strongFoot:       user.strongFoot,
  };
};
