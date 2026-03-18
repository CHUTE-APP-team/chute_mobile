import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMatch extends Document {
  title: string;
  location: string;
  date: Date;
  maxPlayers: number;
  players: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
}

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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMatch>('Match', MatchSchema);
