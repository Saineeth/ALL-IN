"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSocket } from '../lib/socket';
import { PublicPlayer, Card, ChipStack, Pot, AvailableAction, ShowdownResult, GamePhase, MatchResult } from '../types/game';

interface GameUIState {
  isConnected: boolean;
  gameId: string | null;
  phase: GamePhase;
  players: PublicPlayer[];
  communityCards: Card[];
  pots: Pot[];
  currentRound: number;
  currentBet: number;
  currentTurnId: string | null;
  hostId: string | null;
  myHand: Card[];
  myChips: ChipStack | null;
  availableActions: AvailableAction[];
  error: string | null;
  showdownResults: ShowdownResult | null;
  tieBreakNeeded: boolean;
  matchNumber: number;
  matchHistory: MatchResult[];
  gameOverWinner: { id: string; name: string } | null;
  foldedHands: Record<string, Card[]>;
}

const initialState: GameUIState = {
  isConnected: false,
  gameId: null,
  phase: 'lobby',
  players: [],
  communityCards: [],
  pots: [],
  currentRound: 0,
  currentBet: 0,
  currentTurnId: null,
  hostId: null,
  myHand: [],
  myChips: null,
  availableActions: [],
  error: null,
  showdownResults: null,
  tieBreakNeeded: false,
  matchNumber: 0,
  matchHistory: [],
  gameOverWinner: null,
  foldedHands: {},
};

interface GameActions {
  createGame: (playerName: string) => void;
  joinGame: (gameId: string, playerName: string) => void;
  rejoinGame: (gameId: string) => void;
  startGame: () => void;
  placeBet: (amount: number, chips: Partial<ChipStack>) => void;
  fold: () => void;
  forceShowdown: (chips: Partial<ChipStack>) => void;
  allIn: () => void;
  drawCard: () => void;
  skipDraw: () => void;
  submitHandSelection: (selectedIndices: number[]) => void;
  nextMatch: () => void;
}

interface GameContextValue {
  state: GameUIState;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameUIState>(initialState);

  useEffect(() => {
    const socket = getSocket();

    if (socket.connected) {
      setState(s => ({ ...s, isConnected: true }));
    }

    const onConnect = () => setState(s => ({ ...s, isConnected: true }));
    const onDisconnect = () => setState(s => ({ ...s, isConnected: false }));

    const onGameCreated = ({ gameId }: { gameId: string }) => {
      setState(s => ({ ...s, gameId, phase: 'lobby', error: null }));
    };

    const onGameStateSync = (data: Partial<GameUIState>) => {
      setState(s => ({ ...s, ...data }));
    };

    const onPrivateStateSync = (data: Partial<GameUIState>) => {
      setState(s => ({ ...s, ...data }));
    };

    const onGameError = ({ message }: { message: string }) => {
      setState(s => ({ ...s, error: message }));
      setTimeout(() => setState(s => ({ ...s, error: null })), 5000);
    };

    const onShowdownResults = (results: ShowdownResult) => {
      setState(s => ({ ...s, phase: 'finished', showdownResults: results }));
    };
    
    const onTieBreakNeeded = () => {
      setState(s => ({ ...s, tieBreakNeeded: true, phase: 'tie_break' }));
    };

    const onGameOverFinal = (data: { winnerId: string; winnerName: string }) => {
      setState(s => ({ ...s, phase: 'game_over', gameOverWinner: { id: data.winnerId, name: data.winnerName } }));
    };

    const onRejoinSuccess = ({ gameId }: { gameId: string }) => {
      setState(s => ({ ...s, gameId, error: null }));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_created', onGameCreated);
    socket.on('game_state_sync', onGameStateSync);
    socket.on('private_state_sync', onPrivateStateSync);
    socket.on('game_error', onGameError);
    socket.on('showdown_results', onShowdownResults);
    socket.on('tie_break_needed', onTieBreakNeeded);
    socket.on('game_over_final', onGameOverFinal);
    socket.on('rejoin_success', onRejoinSuccess);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_created', onGameCreated);
      socket.off('game_state_sync', onGameStateSync);
      socket.off('private_state_sync', onPrivateStateSync);
      socket.off('game_error', onGameError);
      socket.off('showdown_results', onShowdownResults);
      socket.off('tie_break_needed', onTieBreakNeeded);
      socket.off('game_over_final', onGameOverFinal);
      socket.off('rejoin_success', onRejoinSuccess);
    };
  }, []);

  // Actions
  const createGame = useCallback((playerName: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('playerName', playerName);
    getSocket().emit('create_game', { playerName });
  }, []);

  const joinGame = useCallback((gameId: string, playerName: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('playerName', playerName);
    setState(s => ({ ...s, gameId: gameId.toUpperCase() }));
    getSocket().emit('join_game', { gameId, playerName });
  }, []);

  const rejoinGame = useCallback((gameId: string) => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('playerName') : null;
    if (savedName) {
      setState(s => ({ ...s, gameId: gameId.toUpperCase() }));
      getSocket().emit('rejoin_game', { gameId, playerName: savedName });
    }
  }, []);

  const startGame = useCallback(() => {
    if (state.gameId) getSocket().emit('start_game', { gameId: state.gameId });
  }, [state.gameId]);

  const placeBet = useCallback((amount: number, chips: Partial<ChipStack>) => {
    if (state.gameId) getSocket().emit('place_bet', { gameId: state.gameId, amount, chips });
  }, [state.gameId]);

  const fold = useCallback(() => {
    if (state.gameId) getSocket().emit('fold', { gameId: state.gameId });
  }, [state.gameId]);

  const forceShowdown = useCallback((chips: Partial<ChipStack>) => {
    if (state.gameId) getSocket().emit('force_showdown', { gameId: state.gameId, chips });
  }, [state.gameId]);

  const drawCard = useCallback(() => {
    if (state.gameId) getSocket().emit('draw_card', { gameId: state.gameId });
  }, [state.gameId]);

  const skipDraw = useCallback(() => {
    if (state.gameId) getSocket().emit('skip_draw', { gameId: state.gameId });
  }, [state.gameId]);

  const allIn = useCallback(() => {
    if (state.gameId) getSocket().emit('all_in', { gameId: state.gameId });
  }, [state.gameId]);

  const submitHandSelection = useCallback((selectedIndices: number[]) => {
    if (state.gameId) getSocket().emit('submit_hand_selection', { gameId: state.gameId, selectedIndices });
  }, [state.gameId]);

  const nextMatch = useCallback(() => {
    if (state.gameId) getSocket().emit('next_match', { gameId: state.gameId });
  }, [state.gameId]);

  const value: GameContextValue = {
    state,
    actions: {
      createGame,
      joinGame,
      rejoinGame,
      startGame,
      placeBet,
      fold,
      forceShowdown,
      allIn,
      drawCard,
      skipDraw,
      submitHandSelection,
      nextMatch,
    }
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
