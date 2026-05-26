import mongoose, { Document, Schema } from 'mongoose';

export const USER_ROLES = ['player', 'host', 'referee', 'coach', 'scout', 'photographer'] as const;
export type UserRole = typeof USER_ROLES[number];

export const RANKS = ['Bronze', 'Prata', 'Ouro', 'Elite'] as const;
export type Rank = typeof RANKS[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  stars: number;
  starRatingsCount: number;
  starRatingsSum: number;
  xp: number;
  level: number;
  rank: Rank;
  averageRating: number;
  totalMatches: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'player',
    },
    stars: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    starRatingsCount: {
      type: Number,
      default: 0,
    },
    starRatingsSum: {
      type: Number,
      default: 0,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    rank: {
      type: String,
      enum: RANKS,
      default: 'Bronze',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    totalMatches: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
