import User from '../models/User';
import { AppError } from '../utils/AppError';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export const getUserById = async (userId: string): Promise<UserProfile> => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('User not found', 404);

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
};
