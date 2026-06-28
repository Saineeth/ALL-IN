// ============================================================
// Game Mongoose Model
// ============================================================

import mongoose, { Schema, Document } from 'mongoose';

// ---- Sub-schemas ----

const CardSchema = new Schema({
  suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'], required: true },
  rank: { type: String, required: true },
  value: { type: Number, required: true },
}, { _id: false });

const ChipStackSchema = new Schema({
  green: { type: Number, default: 0 },
  blue: { type: Number, default: 0 },
  red: { type: Number, default: 0 },
  black: { type: Number, default: 0 },
}, { _id: false });

const PlayerSchema = new Schema({
  id: { type: String, required: true },        // socket ID
  name: { type: String, required: true },
  hand: { type: [CardSchema], default: [] },
  chips: { type: ChipStackSchema, required: true },
  totalBet: { type: Number, default: 0 },
  roundBet: { type: Number, default: 0 },
  folded: { type: Boolean, default: false },
  allIn: { type: Boolean, default: false },
  connected: { type: Boolean, default: true },
}, { _id: false });

const PotSchema = new Schema({
  amount: { type: Number, required: true },
  eligiblePlayerIds: { type: [String], required: true },
}, { _id: false });

const GameActionSchema = new Schema({
  type: {
    type: String,
    enum: ['bet', 'fold', 'force_showdown', 'draw_card', 'skip_draw', 'community_reveal'],
    required: true,
  },
  playerId: { type: String, required: true },
  amount: { type: Number },
  card: { type: CardSchema },
  timestamp: { type: Number, required: true },
}, { _id: false });

// ---- Score sub-schema (for finished games) ----

const PlayerScoreSchema = new Schema({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  hand: { type: [CardSchema], default: [] },
  rawScore: { type: Number, required: true },
  matchedCommunityCards: { type: [CardSchema], default: [] },
  reduction: { type: Number, required: true },
  finalScore: { type: Number, required: true },
  distanceFrom11: { type: Number, required: true },
  effectiveCardCount: { type: Number, required: true },
  sumOfSquares: { type: Number, required: true },
  rank: { type: Number, required: true },
}, { _id: false });

const PotAwardSchema = new Schema({
  potIndex: { type: Number, required: true },
  potAmount: { type: Number, required: true },
  winnerId: { type: String, required: true },
  winnerName: { type: String, required: true },
}, { _id: false });

// ---- Main Game Schema ----

export interface IGame extends Document {
  gameId: string;
  phase: string;
  hostId: string;
  players: typeof PlayerSchema[];
  deck: typeof CardSchema[];
  communityCards: typeof CardSchema[];
  pots: typeof PotSchema[];
  currentRound: number;
  currentBetAmount: number;
  currentTurnIndex: number;
  turnOrder: string[];
  forceShowdown: boolean;
  maxHandSize: number;
  actionHistory: typeof GameActionSchema[];
  // Results (populated after game ends)
  finalRankings: typeof PlayerScoreSchema[];
  potAwards: typeof PotAwardSchema[];
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema({
  gameId: { type: String, required: true, unique: true, index: true },
  phase: {
    type: String,
    enum: ['lobby', 'dealing', 'betting', 'drawing', 'community_reveal', 'showdown', 'tie_break', 'finished'],
    default: 'lobby',
  },
  hostId: { type: String, required: true },
  players: { type: [PlayerSchema], default: [] },
  deck: { type: [CardSchema], default: [] },
  communityCards: { type: [CardSchema], default: [] },
  pots: { type: [PotSchema], default: [] },
  currentRound: { type: Number, default: 0 },
  currentBetAmount: { type: Number, default: 0 },
  currentTurnIndex: { type: Number, default: 0 },
  turnOrder: { type: [String], default: [] },
  forceShowdown: { type: Boolean, default: false },
  maxHandSize: { type: Number, default: 7 },
  actionHistory: { type: [GameActionSchema], default: [] },
  // Results
  finalRankings: { type: [PlayerScoreSchema], default: [] },
  potAwards: { type: [PotAwardSchema], default: [] },
}, {
  timestamps: true,
});

// Avoid model recompilation in dev (hot reload)
export const GameModel = mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);
export default GameModel;
