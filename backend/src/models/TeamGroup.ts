import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITeamGroup extends Document {
  name: string;
  description?: string;
  city?: string;
  state?: string;
  emblemShape: 'shield' | 'circle' | 'star';
  emblemColor: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
}

const TeamGroupSchema: Schema = new Schema<ITeamGroup>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    city:  { type: String, trim: true },
    state: { type: String, trim: true },
    emblemShape: { type: String, enum: ['shield', 'circle', 'star'], default: 'shield' },
    emblemColor: { type: String, default: '#FF6A00' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ITeamGroup>('TeamGroup', TeamGroupSchema);
