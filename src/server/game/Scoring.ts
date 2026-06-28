import { Card, TARGET_SCORE } from '../../types/game';

export class Scoring {
  static calculateRawScore(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + card.value, 0);
  }

  /**
   * Applies community cards optimally to get as close to TARGET_SCORE (11) as possible.
   * "Each Community Card may be used once. Each card in a player's hand may be canceled once."
   * Because we only cancel identical values, finding matches is straightforward,
   * but we must choose WHICH subsets of matches get us closest to 11.
   */
  static applyCommunityReductions(hand: Card[], communityCards: Card[]): { 
    finalScore: number; 
    matchedCards: Card[];
    reduction: number;
  } {
    // 1. Find all possible value matches between hand and community cards
    const handCounts = new Map<number, Card[]>();
    for (const card of hand) {
      if (!handCounts.has(card.value)) handCounts.set(card.value, []);
      handCounts.get(card.value)!.push(card);
    }

    const communityCounts = new Map<number, Card[]>();
    for (const card of communityCards) {
      if (!communityCounts.has(card.value)) communityCounts.set(card.value, []);
      communityCounts.get(card.value)!.push(card);
    }

    // 2. Pair them up to find all *potential* individual matches
    const allPotentialMatches: Card[] = []; // Hand cards that CAN be matched
    
    for (const [val, hCards] of handCounts.entries()) {
      const cCards = communityCounts.get(val) || [];
      const matchCount = Math.min(hCards.length, cCards.length);
      for (let i = 0; i < matchCount; i++) {
        allPotentialMatches.push(hCards[i]);
      }
    }

    // 3. We have N potential matches. We must find the subset of these matches
    // that brings the score closest to 11.
    const rawScore = this.calculateRawScore(hand);
    
    let bestScore = rawScore;
    let bestDiff = Math.abs(rawScore - TARGET_SCORE);
    let bestSubset: Card[] = [];

    // Brute-force all combinations of potential matches (max matches is 7, 2^7 = 128 subsets, very fast)
    const numSubsets = 1 << allPotentialMatches.length;
    for (let i = 0; i < numSubsets; i++) {
      let currentSubScore = rawScore;
      const currentSubset: Card[] = [];

      for (let bit = 0; bit < allPotentialMatches.length; bit++) {
        if ((i & (1 << bit)) !== 0) {
          currentSubScore -= allPotentialMatches[bit].value;
          currentSubset.push(allPotentialMatches[bit]);
        }
      }

      const diff = Math.abs(currentSubScore - TARGET_SCORE);
      
      // Tie-breaker 1 inside matching: "Lower Score Wins Equal-Distance Ties"
      // Wait, we just want the absolute closest to 11 for this player.
      // If two subsets result in same distance, e.g., 9 (-2) and 13 (+2),
      // we prefer the lower score (9) for the player's final result.
      if (diff < bestDiff || (diff === bestDiff && currentSubScore < bestScore)) {
        bestDiff = diff;
        bestScore = currentSubScore;
        bestSubset = currentSubset;
      }
    }

    const reduction = bestSubset.reduce((sum, card) => sum + card.value, 0);

    return {
      finalScore: bestScore,
      matchedCards: bestSubset,
      reduction,
    };
  }

  static calculateSumOfSquares(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + Math.pow(card.value, 2), 0);
  }

  /**
   * Ranks players based on the 5-level hierarchy.
   * NOTE: Level 5 (Tie-Break Draw) is NOT handled here. 
   * If players have rank '1', and there are multiple, Level 5 must trigger in GameEngine.
   */
  static rankPlayers(
    players: { id: string; name: string; hand: Card[] }[], 
    communityCards: Card[]
  ) {
    const scores = players.map(p => {
      const rawScore = this.calculateRawScore(p.hand);
      const { finalScore, matchedCards, reduction } = this.applyCommunityReductions(p.hand, communityCards);
      const effectiveCardCount = p.hand.length + matchedCards.length;
      const sumOfSquares = this.calculateSumOfSquares(p.hand);

      return {
        playerId: p.id,
        playerName: p.name,
        hand: p.hand,
        rawScore,
        matchedCommunityCards: matchedCards,
        reduction,
        finalScore,
        distanceFrom11: Math.abs(finalScore - TARGET_SCORE),
        effectiveCardCount,
        sumOfSquares,
      };
    });

    // Sort to determine rank
    scores.sort((a, b) => {
      // 1. Closest to 11
      if (a.distanceFrom11 !== b.distanceFrom11) {
        return a.distanceFrom11 - b.distanceFrom11; // Lower distance is better
      }

      // 2. Lower score wins equal-distance (e.g., 9 vs 13 -> 9 wins)
      if (a.finalScore !== b.finalScore) {
        return a.finalScore - b.finalScore; // Lower score is better
      }

      // 3. Higher Effective Card Count
      if (a.effectiveCardCount !== b.effectiveCardCount) {
        return b.effectiveCardCount - a.effectiveCardCount; // Higher is better
      }

      // 4. Lowest Sum of Squares
      if (a.sumOfSquares !== b.sumOfSquares) {
        return a.sumOfSquares - b.sumOfSquares; // Lower is better
      }

      // 5. Tied.
      return 0;
    });

    // Assign numeric ranks (1 is best). Ties get the same rank.
    const ranked = scores.map(s => ({ ...s, rank: 0 }));
    if (ranked.length === 0) return ranked;

    let currentRank = 1;
    ranked[0].rank = 1;

    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1];
      const curr = ranked[i];

      const isTied = 
        prev.distanceFrom11 === curr.distanceFrom11 &&
        prev.finalScore === curr.finalScore &&
        prev.effectiveCardCount === curr.effectiveCardCount &&
        prev.sumOfSquares === curr.sumOfSquares;

      if (!isTied) {
        currentRank = i + 1; // Rank leaps (e.g., 1, 1, 3)
      }
      
      curr.rank = currentRank;
    }

    return ranked;
  }

  /**
   * Like rankPlayers, but each player has their own selected subset of community cards.
   */
  static rankPlayersWithSelections(
    players: { id: string; name: string; hand: Card[] }[],
    playerCommunityCards: Map<string, Card[]>
  ) {
    const scores = players.map(p => {
      const communityCards = playerCommunityCards.get(p.id) || [];
      const rawScore = this.calculateRawScore(p.hand);
      const { finalScore, matchedCards, reduction } = this.applyCommunityReductions(p.hand, communityCards);
      const effectiveCardCount = p.hand.length + matchedCards.length;
      const sumOfSquares = this.calculateSumOfSquares(p.hand);

      return {
        playerId: p.id,
        playerName: p.name,
        hand: p.hand,
        rawScore,
        matchedCommunityCards: matchedCards,
        reduction,
        finalScore,
        distanceFrom11: Math.abs(finalScore - TARGET_SCORE),
        effectiveCardCount,
        sumOfSquares,
      };
    });

    scores.sort((a, b) => {
      if (a.distanceFrom11 !== b.distanceFrom11) return a.distanceFrom11 - b.distanceFrom11;
      if (a.finalScore !== b.finalScore) return a.finalScore - b.finalScore;
      if (a.effectiveCardCount !== b.effectiveCardCount) return b.effectiveCardCount - a.effectiveCardCount;
      if (a.sumOfSquares !== b.sumOfSquares) return a.sumOfSquares - b.sumOfSquares;
      return 0;
    });

    const ranked = scores.map(s => ({ ...s, rank: 0 }));
    if (ranked.length === 0) return ranked;

    let currentRank = 1;
    ranked[0].rank = 1;

    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1];
      const curr = ranked[i];
      const isTied =
        prev.distanceFrom11 === curr.distanceFrom11 &&
        prev.finalScore === curr.finalScore &&
        prev.effectiveCardCount === curr.effectiveCardCount &&
        prev.sumOfSquares === curr.sumOfSquares;
      if (!isTied) currentRank = i + 1;
      curr.rank = currentRank;
    }

    return ranked;
  }
}
