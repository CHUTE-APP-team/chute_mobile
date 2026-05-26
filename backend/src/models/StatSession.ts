import mongoose, { Document, Schema } from 'mongoose'

export interface IStatPlayer {
  name: string
  goals: number
  assists: number
}

export interface IStatSession extends Document {
  team: mongoose.Types.ObjectId
  matchId?: mongoose.Types.ObjectId
  date: Date
  label?: string
  players: IStatPlayer[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const StatPlayerSchema = new Schema<IStatPlayer>(
  {
    name:    { type: String, required: true },
    goals:   { type: Number, default: 0, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const StatSessionSchema = new Schema<IStatSession>(
  {
    team:      { type: Schema.Types.ObjectId, ref: 'TeamGroup', required: true },
    matchId:   { type: Schema.Types.ObjectId, ref: 'Match', default: null },
    date:      { type: Date, required: true },
    label:     { type: String, trim: true, default: '' },
    players:   { type: [StatPlayerSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

StatSessionSchema.index({ team: 1, date: -1 })

export default mongoose.model<IStatSession>('StatSession', StatSessionSchema)
