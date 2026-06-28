// ============================================================
// Player Mongoose Model — Persistent Stats Across Games
// ============================================================

import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  gamesPlayed: number;
  gamesWon: number;
  handsWon: number;
  totalChipsWon: number;
  totalChipsLost: number;
  bestScore: number;           // closest to 11 ever achieved
  forceShowdownsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerStatsSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  handsWon: { type: Number, default: 0 },
  totalChipsWon: { type: Number, default: 0 },
  totalChipsLost: { type: Number, default: 0 },
  bestScore: { type: Number, default: Infinity },
  forceShowdownsUsed: { type: Number, default: 0 },
}, {
  timestamps: true,
});

export const PlayerModel = mongoose.models.PlayerStats || mongoose.model<IPlayer>('PlayerStats', PlayerStatsSchema);
export default PlayerModel;
