import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPost extends Document {
  content: string;
  author: Types.ObjectId;
  likes: Types.ObjectId[];
  createdAt: Date;
}

const PostSchema: Schema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [280, 'Content cannot exceed 280 characters'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema);
