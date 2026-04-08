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
  overall: number;
  xp: number;
  level: number;
  rank: Rank;
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
    overall: {
      type: Number,
      default: 70,
      min: 1,
      max: 99,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
