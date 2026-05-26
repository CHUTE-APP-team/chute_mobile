import mongoose, { Document, Schema } from 'mongoose'

export type Modality = 'futsal' | 'society' | 'campo'

export interface ICourt extends Document {
  name: string
  address: string
  modality: Modality
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const CourtSchema = new Schema<ICourt>(
  {
    name:     { type: String, required: true, trim: true },
    address:  { type: String, required: true, trim: true },
    modality: { type: String, enum: ['futsal', 'society', 'campo'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

export default mongoose.model<ICourt>('Court', CourtSchema)
