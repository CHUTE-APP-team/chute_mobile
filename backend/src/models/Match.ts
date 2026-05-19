import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITeam {
  name: string;
  players: Types.ObjectId[];
  totalOverall: number;
}

export type MatchStatus = 'open' | 'finished';

export interface IPlayerResult {
  playerId: Types.ObjectId;
  notaFinal: number;
  isWinner: boolean;
  isMvp: boolean;
  xpEarned: number;
  goals: number;
  assists: number;
}

export interface IMatch extends Document {
  title: string;
  location: string;
  date: Date;
  maxPlayers: number;
  players: Types.ObjectId[];
  createdBy: Types.ObjectId;
  teams: ITeam[];
  teamsGeneratedAt?: Date;
  status: MatchStatus;
  winnerTeam?: string;
  mvpPlayerId?: Types.ObjectId;
  playerResults: IPlayerResult[];
  finishedAt?: Date;
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    totalOverall: { type: Number, default: 0 },
  },
  { _id: false }
);

const MatchSchema: Schema = new Schema<IMatch>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    maxPlayers: {
      type: Number,
      required: [true, 'Max players is required'],
      min: [2, 'Match must allow at least 2 players'],
    },
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teams: {
      type: [TeamSchema],
      default: [],
    },
    teamsGeneratedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['open', 'finished'],
      default: 'open',
    },
    winnerTeam: {
      type: String,
    },
    mvpPlayerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    playerResults: [
      {
        playerId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
        notaFinal: { type: Number, required: true, min: 0, max: 10 },
        isWinner:  { type: Boolean, default: false },
        isMvp:     { type: Boolean, default: false },
        xpEarned:  { type: Number, default: 0 },
        goals:     { type: Number, default: 0 },
        assists:   { type: Number, default: 0 },
        _id: false,
      },
    ],
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMatch>('Match', MatchSchema);
