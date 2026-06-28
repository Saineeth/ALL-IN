import {
  GameState as IGameState,
  GamePhase,
  Player,
  Card,
  ChipStack,
  INITIAL_CHIP_STACK,
  MAX_HAND_SIZE,
  AvailableAction,
  MatchResult,
  getChipTotal
} from '../../types/game';
import { Deck } from './Deck';
import { ChipManager } from './ChipManager';

const MAX_ROUNDS = 6;
import { Scoring } from './Scoring';
import { PotManager } from './PotManager';

export class GameEngine {
  private state: IGameState;
  
  // Callback to emit events back to the socket layer
  private emitEvent: (event: string, payload: any) => void;

  // Track which players have finished drawing (clicked 'Done')
  private drawDone: Set<string> = new Set();

  // The final bet from the previous round (carries over as minimum)
  private previousRoundBet: number = 0;

  // Tournament tracking
  private matchNumber: number = 0;
  private matchHistory: MatchResult[] = [];

  constructor(gameId: string, emitEvent: (event: string, payload: any) => void) {
    this.emitEvent = emitEvent;
    this.state = {
      gameId,
      phase: 'lobby',
      hostId: '',
      players: [],
      deck: [],
      communityCards: [],
      pots: [],
      chipPool: { green: 0, blue: 0, red: 0, black: 0 },
      currentRound: 0,
      currentBetAmount: 0,
      currentTurnIndex: -1,
      turnOrder: [],
      forceShowdown: false,
      maxHandSize: MAX_HAND_SIZE,
      actionHistory: [],
    };
  }

  public getState(): IGameState {
    return this.state;
  }

  public getMatchNumber(): number {
    return this.matchNumber;
  }

  public getMatchHistory(): MatchResult[] {
    return this.matchHistory;
  }

  // --- LOBBY PHASE ---

  public joinGame(playerId: string, playerName: string) {
    if (this.state.phase !== 'lobby') {
      throw new Error('Game is already in progress');
    }
    if (this.state.players.find(p => p.id === playerId)) {
      throw new Error('Player already in game');
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      chips: { ...INITIAL_CHIP_STACK },
      totalBet: 0,
      roundBet: 0,
      folded: false,
      allIn: false,
      connected: true,
    };

    if (this.state.players.length === 0) {
      this.state.hostId = playerId;
    }

    this.state.players.push(newPlayer);
    return newPlayer;
  }

  public removePlayer(playerId: string) {
    if (this.state.phase === 'lobby') {
      this.state.players = this.state.players.filter(p => p.id !== playerId);
      if (this.state.hostId === playerId && this.state.players.length > 0) {
        this.state.hostId = this.state.players[0].id;
      }
    } else {
      // In-game disconnect — mark as disconnected but don't remove
      const p = this.state.players.find(pl => pl.id === playerId);
      if (p) {
        p.connected = false;
        // If it's their turn, auto-fold (only if not round 1 where folding is banned)
        if (this.getCurrentTurnPlayer()?.id === playerId && this.state.currentRound > 1) {
          this.fold(playerId);
        }
      }
    }
  }

  /**
   * Reconnect a player after a page refresh.
   * Finds a disconnected player by name and swaps their socket ID.
   * Returns the old player ID if successful, null otherwise.
   */
  public rejoinGame(newSocketId: string, playerName: string): string | null {
    // Find a disconnected player with this name
    const player = this.state.players.find(p => p.name === playerName && !p.connected);
    if (!player) {
      // Also try to find a connected player with the same name (duplicate tab)
      const existing = this.state.players.find(p => p.name === playerName);
      if (existing) {
        // Already connected — swap ID anyway for the new socket
        const oldId = existing.id;
        existing.id = newSocketId;
        existing.connected = true;

        // Update turn order
        this.state.turnOrder = this.state.turnOrder.map(id => id === oldId ? newSocketId : id);
        if (this.state.hostId === oldId) this.state.hostId = newSocketId;

        return oldId;
      }
      return null;
    }

    const oldId = player.id;
    player.id = newSocketId;
    player.connected = true;

    // Update turn order references
    this.state.turnOrder = this.state.turnOrder.map(id => id === oldId ? newSocketId : id);

    // Update host if needed
    if (this.state.hostId === oldId) {
      this.state.hostId = newSocketId;
    }

    return oldId;
  }

  // --- GAME FLOW ---

  public startGame(hostId: string) {
    if (this.state.phase !== 'lobby') throw new Error('Game already started');
    if (this.state.hostId !== hostId) throw new Error('Only host can start the game');
    if (this.state.players.length < 2) throw new Error('Need at least 2 players');

    this.state.phase = 'dealing';
    this.state.deck = Deck.shuffle(Deck.create());
    
    // Determine initial turn order
    this.state.turnOrder = this.state.players.map(p => p.id);
    
    // Deal 1 private card to everyone
    for (const player of this.state.players) {
      const { drawn, remaining } = Deck.draw(this.state.deck, 1);
      player.hand = drawn;
      this.state.deck = remaining;
    }

    // Go to drawing phase first — players build their hand before any betting
    this.startDrawingPhase();
  }

  private startDrawingPhase() {
    this.state.phase = 'drawing';
    this.drawDone = new Set();

    // Auto-mark players who already have max cards
    for (const p of this.state.players) {
      if (p.hand.length >= this.state.maxHandSize) {
        this.drawDone.add(p.id);
      }
    }

    this.emitEvent('draw_phase', { round: 0 });
    this.checkDrawPhaseComplete();
  }

  private startBettingRound(round: number) {
    this.state.phase = 'betting';
    this.state.currentRound = round;
    // Carry over the previous round's final bet as the minimum for this round
    this.state.currentBetAmount = this.previousRoundBet;
    this.state.currentTurnIndex = 0;

    // Reset round bets
    for (const p of this.state.players) {
      p.roundBet = 0;
    }

    // Skip folded or all-in players for the first turn
    this.advanceTurnUntilValid();
    
    // If no one is valid to bet (everyone all-in or folded except 1), skip to end of round
    if (this.state.currentTurnIndex >= this.state.turnOrder.length) {
      this.endBettingRound();
    }
  }

  // --- ACTIONS ---

  public placeBet(playerId: string, targetTotalAmount: number, chipsUsed: Partial<ChipStack>) {
    this.validateTurn(playerId);
    const p = this.getPlayer(playerId);

    const betAmount = ChipManager.calculateBetAmount(chipsUsed);
    const newTotalRoundBet = p.roundBet + betAmount;

    // Round 1: free betting — no minimum to match, bet any amount > 0
    // Round 2+: must match current bet unless going all-in
    if (this.state.currentRound > 1 && newTotalRoundBet < this.state.currentBetAmount) {
      const totalChipsValue = p.chips.green*10 + p.chips.blue*25 + p.chips.red*50 + p.chips.black*100;
      if (betAmount !== totalChipsValue) {
        throw new Error('Bet amount must match or exceed current active bet, unless going All-In');
      } else {
        p.allIn = true;
      }
    }

    // Round 1 rule: must bet something
    if (this.state.currentRound === 1 && betAmount === 0) {
      throw new Error('Must bet > 0 in Round 1');
    }

    // Process chips
    p.chips = ChipManager.deductChips(p.chips, chipsUsed);
    // Add bet chips to the pot's chip pool (normalize partial to full ChipStack)
    const normalizedChips: ChipStack = {
      green: chipsUsed.green || 0,
      blue: chipsUsed.blue || 0,
      red: chipsUsed.red || 0,
      black: chipsUsed.black || 0,
    };
    this.state.chipPool = ChipManager.addChips(this.state.chipPool, normalizedChips);
    p.roundBet += betAmount;
    p.totalBet += betAmount;

    // Update game bet tracking
    if (p.roundBet > this.state.currentBetAmount) {
      this.state.currentBetAmount = p.roundBet;
    }

    // Record action
    this.recordAction('bet', playerId, betAmount);

    this.advanceTurn();
  }

  public fold(playerId: string) {
    if (this.state.currentRound === 1) {
      throw new Error('Folding is not allowed in Round 1');
    }
    
    const p = this.getPlayer(playerId);
    p.folded = true;
    this.recordAction('fold', playerId);

    // Check if only 1 player remains — they win immediately
    const activePlayers = this.state.players.filter(pl => !pl.folded);
    if (activePlayers.length === 1) {
      this.goToShowdown();
      return;
    }

    // If it was their turn, advance
    if (this.getCurrentTurnPlayer()?.id === playerId) {
      this.advanceTurn();
    }
  }

  public forceShowdown(playerId: string, chipsUsed: Partial<ChipStack>) {
    if (this.state.currentRound < 3) {
      throw new Error('Force Showdown only available from Round 3 onwards');
    }
    this.validateTurn(playerId);
    
    const p = this.getPlayer(playerId);
    const betAmount = ChipManager.calculateBetAmount(chipsUsed);
    // Use the effective bet (current round or carried-over from last round)
    const effectiveBet = Math.max(this.state.currentBetAmount, this.previousRoundBet);
    const targetAmount = effectiveBet * 2;

    if (effectiveBet === 0) {
       throw new Error('Cannot force showdown when there is no active bet');
    }

    if (p.roundBet + betAmount !== targetAmount) {
      throw new Error(`Force Showdown requires exactly double the active bet (${targetAmount})`);
    }

    // Process
    p.chips = ChipManager.deductChips(p.chips, chipsUsed);
    // Add force-showdown chips to pool (normalize partial)
    const normalizedChips: ChipStack = {
      green: chipsUsed.green || 0,
      blue: chipsUsed.blue || 0,
      red: chipsUsed.red || 0,
      black: chipsUsed.black || 0,
    };
    this.state.chipPool = ChipManager.addChips(this.state.chipPool, normalizedChips);
    p.roundBet += betAmount;
    p.totalBet += betAmount;
    
    this.state.currentBetAmount = p.roundBet;
    this.state.forceShowdown = true;

    this.recordAction('force_showdown', playerId, betAmount);

    // End betting immediately and go to showdown
    this.goToShowdown();
  }

  // --- DRAWING PHASE ---

  public drawCard(playerId: string) {
    if (this.state.phase !== 'drawing') throw new Error('Not the drawing phase');
    if (this.drawDone.has(playerId)) throw new Error('You are done drawing');
    const p = this.getPlayer(playerId);
    if (p.folded) throw new Error('Folded players cannot draw');
    if (p.hand.length >= this.state.maxHandSize) throw new Error('Maximum hand size reached (7)');
    
    const { drawn, remaining } = Deck.draw(this.state.deck, 1);
    p.hand.push(drawn[0]);
    this.state.deck = remaining;

    this.recordAction('draw_card', playerId, undefined, drawn[0]);

    // Auto-mark done if they hit max hand size
    if (p.hand.length >= this.state.maxHandSize) {
      this.drawDone.add(p.id);
      this.checkDrawPhaseComplete();
    }
  }

  /** Player is done drawing cards (clicked 'Done Drawing') */
  public skipDraw(playerId: string) {
    if (this.state.phase !== 'drawing') throw new Error('Not the drawing phase');
    if (this.drawDone.has(playerId)) throw new Error('Already done drawing');
    this.drawDone.add(playerId);
    this.recordAction('skip_draw', playerId);
    this.checkDrawPhaseComplete();
  }

  // --- TURN MANAGEMENT ---

  private validateTurn(playerId: string) {
    if (this.state.phase !== 'betting') throw new Error('Not betting phase');
    const currentTurn = this.getCurrentTurnPlayer();
    if (!currentTurn || currentTurn.id !== playerId) {
      throw new Error("Not your turn");
    }
  }

  private getCurrentTurnPlayer(): Player | null {
    if (this.state.currentTurnIndex >= 0 && this.state.currentTurnIndex < this.state.turnOrder.length) {
      const id = this.state.turnOrder[this.state.currentTurnIndex];
      return this.getPlayer(id);
    }
    return null;
  }

  private advanceTurn() {
    this.state.currentTurnIndex++;
    this.advanceTurnUntilValid();

    // Check if betting round is over
    if (this.isBettingRoundComplete()) {
      this.endBettingRound();
    }
  }

  private advanceTurnUntilValid() {
    while (this.state.currentTurnIndex < this.state.turnOrder.length) {
      const p = this.getCurrentTurnPlayer()!;
      if (!p.folded && !p.allIn) {
        break; // Found a valid player to act
      }
      this.state.currentTurnIndex++;
    }
  }

  private isBettingRoundComplete(): boolean {
    // 1. Have we cycled through everyone at least once?
    if (this.state.currentTurnIndex < this.state.turnOrder.length) {
      return false; 
    }

    // 2. Round 1: free betting — round ends after one full pass (no matching required)
    if (this.state.currentRound === 1) {
      return true;
    }

    // 3. Round 2+: check if anyone needs to call.
    // A round is complete when all non-folded, non-all-in players have matching roundBets.
    const activePlayers = this.state.players.filter(p => !p.folded && !p.allIn);
    
    for (const p of activePlayers) {
      if (p.roundBet < this.state.currentBetAmount) {
        // Someone hasn't matched the bet. We need to do another orbit.
        this.state.currentTurnIndex = 0;
        this.advanceTurnUntilValid();
        return false;
      }
    }

    return true; // Everyone matches!
  }

  private endBettingRound() {
    // Save this round's final bet as the minimum for next round
    this.previousRoundBet = this.state.currentBetAmount;

    // Check if only 1 person left (everyone else folded)
    const activePlayers = this.state.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.goToShowdown();
      return;
    }

    // If all or all-but-one active players have 0 chips, no more betting possible → showdown
    const playersWithChips = activePlayers.filter(p => ChipManager.calculateBetAmount(p.chips) > 0);
    if (playersWithChips.length <= 1) {
      this.goToShowdown();
      return;
    }

    // Force showdown or reached max rounds → showdown
    if (this.state.forceShowdown || this.state.currentRound >= MAX_ROUNDS) {
      this.goToShowdown();
      return;
    }

    // Reveal a community card, then start next betting round
    const { drawn, remaining } = Deck.draw(this.state.deck, 1);
    this.state.communityCards.push(drawn[0]);
    this.state.deck = remaining;
    this.recordAction('community_reveal', 'server', undefined, drawn[0]);

    this.startBettingRound(this.state.currentRound + 1);
  }

  private checkDrawPhaseComplete() {
    if (this.state.phase !== 'drawing') return;

    const activePlayers = this.state.players.filter(p => !p.folded);
    const allDone = activePlayers.every(p => this.drawDone.has(p.id));

    if (allDone) {
      this.endDrawPhase();
    }
  }

  public endDrawPhase() {
    // Drawing is done — start the first betting round (no community card yet)
    this.startBettingRound(1);
  }

  // --- SHOWDOWN ---

  // Track which players have submitted their community card selections
  private handSelections: Map<string, number[]> = new Map(); // playerId -> indices of selected community cards

  public goToShowdown() {
    // 1. Create pots
    this.state.pots = PotManager.createPots(this.state.players);

    const activePlayers = this.state.players.filter(p => !p.folded);

    // If only 1 player active (everyone folded) or no community cards, skip selection
    if (activePlayers.length <= 1 || this.state.communityCards.length === 0) {
      this.state.phase = 'showdown';
      const rankings = Scoring.rankPlayers(activePlayers, this.state.communityCards);
      this.awardPotsAndFinish(rankings);
      return;
    }

    // Enter hand selection phase — players choose which community cards to use
    this.state.phase = 'hand_selection';
    this.handSelections = new Map();
    this.emitEvent('hand_selection_start', {
      communityCards: this.state.communityCards,
      activePlayerIds: activePlayers.map(p => p.id),
    });
  }

  /**
   * Player submits which community card indices they want to use.
   * selectedIndices: array of indices into this.state.communityCards (e.g. [0, 2] = use 1st and 3rd)
   */
  public submitHandSelection(playerId: string, selectedIndices: number[]) {
    if (this.state.phase !== 'hand_selection') throw new Error('Not in hand selection phase');
    const p = this.state.players.find(pl => pl.id === playerId && !pl.folded);
    if (!p) throw new Error('Player not found or folded');
    if (this.handSelections.has(playerId)) throw new Error('Already submitted selection');

    // Validate indices
    for (const idx of selectedIndices) {
      if (idx < 0 || idx >= this.state.communityCards.length) {
        throw new Error('Invalid community card index');
      }
    }

    this.handSelections.set(playerId, selectedIndices);
    this.emitEvent('hand_selection_submitted', { playerId, count: selectedIndices.length });

    this.checkAllSelectionsIn();
  }

  private checkAllSelectionsIn() {
    const activePlayers = this.state.players.filter(p => !p.folded);
    if (this.handSelections.size < activePlayers.length) return;

    // All players have submitted — score each player with their chosen community cards
    this.state.phase = 'showdown';

    // Build per-player community card subsets
    const playerCommunityCards = new Map<string, Card[]>();
    for (const p of activePlayers) {
      const indices = this.handSelections.get(p.id) || [];
      const selectedCards = indices.map(i => this.state.communityCards[i]);
      playerCommunityCards.set(p.id, selectedCards);
    }

    // Score with individual selections
    const rankings = Scoring.rankPlayersWithSelections(activePlayers, playerCommunityCards);

    const rank1Players = rankings.filter(r => r.rank === 1);
    if (rank1Players.length > 1) {
      this.state.phase = 'tie_break';
      this.emitEvent('tie_break_needed', { tiedPlayerIds: rank1Players.map(r => r.playerId) });
      return;
    }

    this.awardPotsAndFinish(rankings);
  }

  public runTieBreakRound(tiedPlayerIds: string[]) {
    if (this.state.phase !== 'tie_break') throw new Error('Not in tie-break phase');

    const tiedCards: { playerId: string; card: Card }[] = [];
    
    for (const id of tiedPlayerIds) {
      const { drawn, remaining } = Deck.draw(this.state.deck, 1);
      tiedCards.push({ playerId: id, card: drawn[0] });
      this.state.deck = remaining;
    }

    // Find lowest value
    const lowestValue = Math.min(...tiedCards.map(c => c.card.value));
    
    const winners = tiedCards.filter(c => c.card.value === lowestValue);

    this.emitEvent('tie_break_result', { cards: tiedCards, remainingTied: winners.map(w => w.playerId) });

    if (winners.length === 1) {
      // Tie broken! Winner gets rank 1, others get rank 2
      // Recalculate or manually adjust rankings and award
      const activePlayers = this.state.players.filter(p => !p.folded);
      let rankings = Scoring.rankPlayers(activePlayers, this.state.communityCards);
      
      // Force the winner to rank 1, and demote others
      const winnerId = winners[0].playerId;
      for (const r of rankings) {
        if (tiedPlayerIds.includes(r.playerId)) {
          r.rank = r.playerId === winnerId ? 1 : 2;
        }
      }
      
      this.awardPotsAndFinish(rankings);
    } else {
      // Still tied, wait for next round of `runTieBreakRound`
    }
  }

  private awardPotsAndFinish(rankings: ReturnType<typeof Scoring.rankPlayers>) {
    const potAwards = PotManager.awardPots(this.state.pots, rankings.map(r => ({ playerId: r.playerId, rank: r.rank })));
    
    // Group winnings by player (a player can win multiple pots)
    const winningsByPlayer = new Map<string, number>();
    const totalPotAmount = this.state.pots.reduce((sum, p) => sum + p.amount, 0);

    for (const award of potAwards) {
      const winner = this.getPlayer(award.winnerId);
      award.winnerName = winner.name;
      winningsByPlayer.set(award.winnerId, (winningsByPlayer.get(award.winnerId) || 0) + award.potAmount);
    }

    // Distribute actual chips from chipPool to winners
    if (winningsByPlayer.size === 1) {
      // Single winner — give them the entire chip pool (exact chips)
      const winnerId = winningsByPlayer.keys().next().value!;
      const winner = this.getPlayer(winnerId);
      winner.chips = ChipManager.addChips(winner.chips, this.state.chipPool);
    } else {
      // Multiple winners — distribute proportionally
      for (const [playerId, amount] of winningsByPlayer) {
        const winner = this.getPlayer(playerId);
        const fraction = totalPotAmount > 0 ? amount / totalPotAmount : 0;
        const share: ChipStack = {
          green: Math.round(this.state.chipPool.green * fraction),
          blue: Math.round(this.state.chipPool.blue * fraction),
          red: Math.round(this.state.chipPool.red * fraction),
          black: Math.round(this.state.chipPool.black * fraction),
        };
        winner.chips = ChipManager.addChips(winner.chips, share);
      }
    }

    // Reset chip pool
    this.state.chipPool = { green: 0, blue: 0, red: 0, black: 0 };

    // Record match in history
    this.matchHistory.push({
      matchNumber: this.matchNumber,
      potAwards,
      rankings,
      timestamp: Date.now(),
    });

    this.state.phase = 'finished';
    this.emitEvent('showdown_results', { rankings, potAwards, matchNumber: this.matchNumber });
  }

  // --- NEXT MATCH (Tournament Loop) ---

  public startNextMatch() {
    // Check if game is over: only 1 player with chips remaining
    const playersWithChips = this.state.players.filter(p =>
      p.connected && getChipTotal(p.chips) > 0
    );

    if (playersWithChips.length <= 1) {
      this.state.phase = 'game_over';
      const winner = playersWithChips[0];
      this.emitEvent('game_over_final', {
        winnerId: winner?.id || null,
        winnerName: winner?.name || 'No one',
        matchHistory: this.matchHistory,
      });
      return;
    }

    // Start new match
    this.matchNumber++;
    this.state.deck = Deck.shuffle(Deck.create());
    this.state.communityCards = [];
    this.state.pots = [];
    this.state.chipPool = { green: 0, blue: 0, red: 0, black: 0 };
    this.state.currentRound = 0;
    this.state.currentBetAmount = 0;
    this.state.currentTurnIndex = -1;
    this.state.forceShowdown = false;
    this.state.actionHistory = [];
    this.previousRoundBet = 0;
    this.drawDone = new Set();
    this.handSelections = new Map();

    // Reset player match state, keep chips
    for (const p of this.state.players) {
      p.hand = [];
      p.totalBet = 0;
      p.roundBet = 0;
      p.allIn = false;

      // Players with no chips are spectators (auto-folded)
      if (getChipTotal(p.chips) === 0 || !p.connected) {
        p.folded = true;
      } else {
        p.folded = false;
      }
    }

    // Update turn order (only players with chips)
    this.state.turnOrder = this.state.players
      .filter(p => !p.folded)
      .map(p => p.id);

    // Deal 1 card to active players
    this.state.phase = 'dealing';
    for (const p of this.state.players) {
      if (!p.folded) {
        const { drawn, remaining } = Deck.draw(this.state.deck, 1);
        p.hand = drawn;
        this.state.deck = remaining;
      }
    }

    // Go to drawing phase
    this.startDrawingPhase();
  }

  // --- UTILS ---

  private getPlayer(id: string): Player {
    const p = this.state.players.find(p => p.id === id);
    if (!p) throw new Error('Player not found');
    return p;
  }

  private recordAction(type: IGameState['actionHistory'][0]['type'], playerId: string, amount?: number, card?: Card) {
    this.state.actionHistory.push({
      type,
      playerId,
      amount,
      card,
      timestamp: Date.now()
    });
  }

  public getAvailableActions(playerId: string): AvailableAction[] {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || p.folded) return [];

    // --- Drawing Phase ---
    if (this.state.phase === 'drawing') {
      if (this.drawDone.has(playerId)) return []; // already done
      const actions: AvailableAction[] = [];
      if (p.hand.length < this.state.maxHandSize) {
        actions.push({ type: 'draw_card' });
      }
      actions.push({ type: 'skip_draw' }); // "Done Drawing"
      return actions;
    }

    // --- Betting Phase ---
    if (this.state.phase !== 'betting') return [];
    if (this.getCurrentTurnPlayer()?.id !== playerId) return [];
    if (p.allIn) return [];

    const actions: AvailableAction[] = [];
    const playerStack = p.chips.green*10 + p.chips.blue*25 + p.chips.red*50 + p.chips.black*100;
    const minAmountToCall = this.state.currentBetAmount - p.roundBet;
    
    // Fold
    if (this.state.currentRound > 1) {
      actions.push({ type: 'fold' });
    }

    // Bet / Call
    // Round 1: no minimum to match (free betting)
    // Round 2+: must match current bet
    const minBet = this.state.currentRound === 1 ? 0 : Math.max(0, minAmountToCall);
    actions.push({ 
      type: 'bet', 
      minAmount: minBet, 
      maxAmount: playerStack 
    });

    // All-In (always available if they have chips)
    if (playerStack > 0) {
      actions.push({ type: 'all_in' });
    }

    // Force Showdown (uses effective bet = max of current and previous round)
    const effectiveBet = Math.max(this.state.currentBetAmount, this.previousRoundBet);
    if (this.state.currentRound >= 3 && effectiveBet > 0) {
      const targetTotal = effectiveBet * 2;
      const amountNeeded = targetTotal - p.roundBet;
      if (amountNeeded > 0 && amountNeeded <= playerStack) {
         actions.push({ type: 'force_showdown', exactAmount: amountNeeded });
      }
    }

    return actions;
  }
}
