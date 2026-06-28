import { Player, Pot } from '../../types/game';

interface Contribution {
  playerId: string;
  amount: number;
}

export class PotManager {
  /**
   * Takes all players and their total committed chips in the hand,
   * and splits them into Main Pot and Side Pots based on all-in amounts.
   */
  static createPots(players: Player[]): Pot[] {
    const pots: Pot[] = [];
    
    // Create an array of contributions from players who bet > 0
    const contributions: Contribution[] = players
      .filter(p => p.totalBet > 0)
      .map(p => ({ playerId: p.id, amount: p.totalBet }))
      .sort((a, b) => a.amount - b.amount); // Sort by amount ascending

    if (contributions.length === 0) return [];

    let processedAmount = 0;

    for (let i = 0; i < contributions.length; i++) {
      const current = contributions[i];
      const chunk = current.amount - processedAmount;

      if (chunk > 0) {
        const eligiblePlayers: string[] = [];
        let potAmount = 0;

        // Everyone from here on has contributed AT LEAST this chunk
        for (let j = i; j < contributions.length; j++) {
          const p = players.find(p => p.id === contributions[j].playerId)!;
          
          potAmount += chunk;
          
          // Players who folded cannot win the pot, but their chips remain in it.
          // Wait, actually, typically eligible players are ONLY those who haven't folded.
          // We must check if they folded.
          if (!p.folded) {
            eligiblePlayers.push(p.id);
          }
        }

        pots.push({
          amount: potAmount,
          eligiblePlayerIds: eligiblePlayers,
        });

        processedAmount += chunk;
      }
    }

    return pots;
  }

  /**
   * Given calculated pots and ranked players, determines who wins each pot.
   * Note: The rankings should already resolve ties (via tie-break draw if necessary).
   * If there somehow is a tie passed here (meaning split pots, which rules forbid),
   * this assumes the first person in the array among tied wins, so tie-breakers MUST be complete.
   */
  static awardPots(pots: Pot[], finalRankings: { playerId: string; rank: number }[]) {
    // Sort rankings: rank 1 first
    const sortedRanks = [...finalRankings].sort((a, b) => a.rank - b.rank);

    const awards: { potIndex: number; potAmount: number; winnerId: string; winnerName: string }[] = [];

    // For each pot, find the highest ranked eligible player
    for (let i = 0; i < pots.length; i++) {
      const pot = pots[i];
      
      // Find the best rank among eligible
      const winner = sortedRanks.find(rankInfo => 
        pot.eligiblePlayerIds.includes(rankInfo.playerId)
      );

      if (winner) {
        // Need to know the player name. For simplicity, the caller will enrich this,
        // or we just return the playerId and the caller adds the name.
        awards.push({
          potIndex: i,
          potAmount: pot.amount,
          winnerId: winner.playerId,
          winnerName: 'Unknown', // Caller must map ID to Name
        });
      }
    }

    // Since rules say "There are no split pots. Every hand must produce exactly one winner for every pot."
    // We only award the whole pot to `winner`.
    return awards;
  }
}
