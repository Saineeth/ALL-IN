import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/GameEngine';
import { createPublicPlayer, getChipTotal } from '../../types/game';

// In-memory store for active games (until saved to DB on completion)
const activeGames = new Map<string, GameEngine>();

export function registerSocketHandlers(io: Server, socket: Socket) {
  
  // Emit state to everyone in a room
  const broadcastGameState = (gameId: string) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    
    const state = game.getState();
    const publicPlayers = state.players.map(createPublicPlayer);
    
    // Collect hands of folded players to reveal
    const foldedHands: Record<string, { suit: string; rank: string; value: number }[]> = {};
    for (const player of state.players) {
      if (player.folded && player.hand.length > 0) {
        foldedHands[player.id] = player.hand;
      }
    }

    // Send public state to room
    io.to(gameId).emit('game_state_sync', {
      phase: state.phase,
      players: publicPlayers,
      communityCards: state.communityCards,
      pots: state.pots,
      currentRound: state.currentRound,
      currentBet: state.currentBetAmount,
      currentTurnId: state.turnOrder[state.currentTurnIndex] || null,
      hostId: state.hostId,
      matchNumber: game.getMatchNumber(),
      matchHistory: game.getMatchHistory(),
      foldedHands,
    });

    // Send private info to each player
    for (const player of state.players) {
      if (player.connected) {
        io.to(player.id).emit('private_state_sync', {
          myHand: player.hand,
          myChips: player.chips,
          availableActions: game.getAvailableActions(player.id),
        });
      }
    }
  };

  const handleAction = (gameId: string, actionFn: (game: GameEngine) => void) => {
    try {
      const game = activeGames.get(gameId);
      if (!game) throw new Error('Game not found');
      
      actionFn(game);
      broadcastGameState(gameId);
      
    } catch (err: any) {
      socket.emit('game_error', { message: err.message });
    }
  };

  socket.on('create_game', ({ playerName }) => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const game = new GameEngine(gameId, (event, payload) => {
      // Event emitter callback from engine
      io.to(gameId).emit(event, payload);
    });
    
    activeGames.set(gameId, game);
    
    try {
      game.joinGame(socket.id, playerName);
      socket.join(gameId);
      socket.emit('game_created', { gameId });
      broadcastGameState(gameId);
    } catch (err: any) {
      socket.emit('game_error', { message: err.message });
    }
  });

  socket.on('join_game', ({ gameId, playerName }) => {
    const upperGameId = gameId.toUpperCase();
    handleAction(upperGameId, (game) => {
      game.joinGame(socket.id, playerName);
      socket.join(upperGameId);
    });
  });

  socket.on('rejoin_game', ({ gameId, playerName }) => {
    const upperGameId = gameId.toUpperCase();
    try {
      const game = activeGames.get(upperGameId);
      if (!game) {
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }

      const oldId = game.rejoinGame(socket.id, playerName);
      if (oldId) {
        socket.join(upperGameId);
        socket.emit('rejoin_success', { gameId: upperGameId });
        broadcastGameState(upperGameId);
      } else {
        // No matching player found — try joining as new (only works in lobby)
        const state = game.getState();
        if (state.phase === 'lobby') {
          game.joinGame(socket.id, playerName);
          socket.join(upperGameId);
          broadcastGameState(upperGameId);
        } else {
          socket.emit('game_error', { message: 'Cannot rejoin: no matching player found' });
        }
      }
    } catch (err: any) {
      socket.emit('game_error', { message: err.message });
    }
  });

  socket.on('start_game', ({ gameId }) => {
    handleAction(gameId, (game) => game.startGame(socket.id));
  });

  socket.on('place_bet', ({ gameId, amount, chips }) => {
    handleAction(gameId, (game) => game.placeBet(socket.id, amount, chips));
  });

  socket.on('fold', ({ gameId }) => {
    handleAction(gameId, (game) => game.fold(socket.id));
  });

  socket.on('force_showdown', ({ gameId, chips }) => {
    handleAction(gameId, (game) => game.forceShowdown(socket.id, chips));
  });

  socket.on('all_in', ({ gameId }) => {
    handleAction(gameId, (game) => {
      const state = game.getState();
      const player = state.players.find(p => p.id === socket.id);
      if (!player) throw new Error('Player not found');
      // Bet their entire remaining stack
      const allChips = { ...player.chips };
      const totalAmount = allChips.green*10 + allChips.blue*25 + allChips.red*50 + allChips.black*100;
      game.placeBet(socket.id, totalAmount, allChips);
      // Ensure allIn flag is set (placeBet only sets it when under-calling)
      player.allIn = true;
    });
  });

  socket.on('draw_card', ({ gameId }) => {
    handleAction(gameId, (game) => game.drawCard(socket.id));
    // We need to coordinate drawing phase end here.
    // For simplicity, let's auto-end if everyone has drawn/skipped.
    // This logic is slightly complex, so I'll add a helper.
  });

  socket.on('skip_draw', ({ gameId }) => {
    handleAction(gameId, (game) => game.skipDraw(socket.id));
  });
  
  socket.on('admin_end_draw_phase', ({ gameId }) => {
    handleAction(gameId, (game) => game.endDrawPhase());
  });

  socket.on('submit_hand_selection', ({ gameId, selectedIndices }) => {
    handleAction(gameId, (game) => game.submitHandSelection(socket.id, selectedIndices));
  });

  socket.on('next_match', ({ gameId }) => {
    handleAction(gameId, (game) => game.startNextMatch());
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Find games this player was in
    for (const [gameId, game] of activeGames.entries()) {
      const state = game.getState();
      if (state.players.find(p => p.id === socket.id)) {
        game.removePlayer(socket.id);
        broadcastGameState(gameId);
      }
    }
  });
}
