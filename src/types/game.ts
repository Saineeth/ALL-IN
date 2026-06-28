// ============================================================
// ALL IN — Shared TypeScript Types
// ============================================================

// ---- Card Types ----

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: CardRank;
  value: number; // A=1, 2-10=face, J=11, Q=12, K=13
}

// ---- Chip Types ----

export type ChipColor = 'green' | 'blue' | 'red' | 'black';

export interface ChipDefinition {
  color: ChipColor;
  value: number;
}

export interface ChipStack {
  green: number; // count of green chips (value 10 each)
  blue: number;  // count of blue chips (value 25 each)
  red: number;   // count of red chips (value 50 each)
  black: number; // count of black chips (value 100 each)
}

export const CHIP_VALUES: Record<ChipColor, number> = {
  green: 10,
  blue: 25,
  red: 50,
  black: 100,
};

export const INITIAL_CHIP_STACK: ChipStack = {
  green: 4,
  blue: 4,
  red: 4,
  black: 4,
};

export const INITIAL_TOTAL_CHIPS = 740; // 4×10 + 4×25 + 4×50 + 4×100

// ---- Player Types ----

export interface Player {
  id: string;        // socket ID
  name: string;
  hand: Card[];
  chips: ChipStack;
  totalBet: number;  // total chips committed this hand
  roundBet: number;  // chips bet in current round
  folded: boolean;
  allIn: boolean;
  connected: boolean;
}

// Sanitized player info sent to other players (hides hand)
export interface PublicPlayer {
  id: string;
  name: string;
  cardCount: number;
  chipTotal: number;
  totalBet: number;
  roundBet: number;
  folded: boolean;
  allIn: boolean;
  connected: boolean;
}

// ---- Pot Types ----

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

// ---- Game State Types ----

export type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'betting'
  | 'drawing'
  | 'community_reveal'
  | 'hand_selection'
  | 'showdown'
  | 'tie_break'
  | 'finished'
  | 'game_over';

export interface GameState {
  gameId: string;
  phase: GamePhase;
  hostId: string;
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pots: Pot[];
  chipPool: ChipStack;          // actual chip denominations in the pot
  currentRound: number;         // 1, 2, 3, ...
  currentBetAmount: number;     // the active bet players must match or exceed
  currentTurnIndex: number;     // index into active (non-folded) players
  turnOrder: string[];          // player IDs in turn order
  forceShowdown: boolean;
  maxHandSize: number;          // 7
  actionHistory: GameAction[];
}

// ---- Action Types ----

export type GameActionType =
  | 'bet'
  | 'fold'
  | 'force_showdown'
  | 'draw_card'
  | 'skip_draw'
  | 'community_reveal';

export interface GameAction {
  type: GameActionType;
  playerId: string;
  amount?: number;
  card?: Card;
  timestamp: number;
}

// ---- Scoring Types ----

export interface PlayerScore {
  playerId: string;
  playerName: string;
  hand: Card[];
  rawScore: number;
  matchedCommunityCards: Card[];
  reduction: number;
  finalScore: number;
  distanceFrom11: number;
  effectiveCardCount: number;
  sumOfSquares: number;
  rank: number;
}

// ---- Showdown Result ----

export interface ShowdownResult {
  rankings: PlayerScore[];
  potAwards: PotAward[];
  tieBreakCards?: TieBreakRound[];
}

export interface PotAward {
  potIndex: number;
  potAmount: number;
  winnerId: string;
  winnerName: string;
}

export interface TieBreakRound {
  round: number;
  cards: { playerId: string; card: Card }[];
  eliminatedIds: string[];
}

export interface MatchResult {
  matchNumber: number;
  potAwards: PotAward[];
  rankings: PlayerScore[];
  timestamp: number;
}

// ---- Socket Event Types ----

// Client → Server
export interface ClientEvents {
  create_game: (data: { playerName: string }) => void;
  join_game: (data: { gameId: string; playerName: string }) => void;
  start_game: (data: { gameId: string }) => void;
  place_bet: (data: { gameId: string; amount: number; chips: Partial<ChipStack> }) => void;
  fold: (data: { gameId: string }) => void;
  force_showdown: (data: { gameId: string; chips: Partial<ChipStack> }) => void;
  draw_card: (data: { gameId: string }) => void;
  skip_draw: (data: { gameId: string }) => void;
}

// Server → Client
export interface ServerEvents {
  game_created: (data: { gameId: string; player: PublicPlayer }) => void;
  player_joined: (data: { players: PublicPlayer[] }) => void;
  player_left: (data: { playerId: string; players: PublicPlayer[] }) => void;
  game_started: (data: { hand: Card[]; chipStack: ChipStack; turnOrder: string[] }) => void;
  betting_phase: (data: {
    round: number;
    minBet: number;
    currentBet: number;
    turnOrder: string[];
    currentTurnId: string;
  }) => void;
  your_turn: (data: { actions: AvailableAction[] }) => void;
  player_bet: (data: { playerId: string; playerName: string; amount: number; pots: Pot[] }) => void;
  player_folded: (data: { playerId: string; playerName: string }) => void;
  draw_phase: (data: { round: number }) => void;
  card_drawn: (data: { card: Card; handSize: number }) => void;
  player_drew_card: (data: { playerId: string; playerName: string; handSize: number }) => void;
  player_skipped_draw: (data: { playerId: string; playerName: string }) => void;
  community_card: (data: { card: Card; allCommunityCards: Card[] }) => void;
  force_showdown_declared: (data: { playerId: string; playerName: string; betAmount: number }) => void;
  showdown_results: (data: ShowdownResult) => void;
  tie_break_card: (data: { playerId: string; card: Card; round: number }) => void;
  game_over: (data: { finalStandings: PlayerScore[]; potAwards: PotAward[] }) => void;
  game_error: (data: { message: string }) => void;
  game_state_sync: (data: {
    phase: GamePhase;
    players: PublicPlayer[];
    communityCards: Card[];
    pots: Pot[];
    currentRound: number;
    currentBet: number;
    currentTurnId: string | null;
    myHand: Card[];
    myChips: ChipStack;
  }) => void;
}

export type AvailableAction =
  | { type: 'bet'; minAmount: number; maxAmount: number }
  | { type: 'fold' }
  | { type: 'force_showdown'; exactAmount: number }
  | { type: 'all_in' }
  | { type: 'draw_card' }
  | { type: 'skip_draw' };

// ---- Utility ----

export function getChipTotal(chips: ChipStack): number {
  return (
    chips.green * CHIP_VALUES.green +
    chips.blue * CHIP_VALUES.blue +
    chips.red * CHIP_VALUES.red +
    chips.black * CHIP_VALUES.black
  );
}

export function createPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    cardCount: player.hand.length,
    chipTotal: getChipTotal(player.chips),
    totalBet: player.totalBet,
    roundBet: player.roundBet,
    folded: player.folded,
    allIn: player.allIn,
    connected: player.connected,
  };
}

export const MAX_HAND_SIZE = 7;
export const TARGET_SCORE = 11;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
