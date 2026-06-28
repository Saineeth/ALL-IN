"use client";

import { PublicPlayer, MatchResult, Pot } from '../types/game';

interface PlayerStatsProps {
  player: PublicPlayer | undefined;
  currentBet: number;
  matchHistory: MatchResult[];
  players: PublicPlayer[];
  pots: Pot[];
}

export function PlayerStats({ player, currentBet, matchHistory, players, pots }: PlayerStatsProps) {
  if (!player) return null;

  // Live pot = sum of all players' totalBet this match
  const totalPot = players.reduce((sum, p) => sum + p.totalBet, 0);
  const mainPotAmount = pots.length > 0 ? pots[0].amount : totalPot;

  // Max win = sum of min(myTotalBet, each non-folded player's totalBet)
  // This is how much you can possibly take home from the pot right now
  const maxWin = players
    .filter(p => !p.folded || p.id === player.id)
    .reduce((sum, p) => sum + Math.min(player.totalBet, p.totalBet), 0);

  // Compute total winnings from match history
  let totalWinnings = 0;
  for (const match of matchHistory) {
    for (const award of match.potAwards) {
      if (award.winnerId === player.id) {
        totalWinnings += award.potAmount;
      }
    }
  }

  // Net P/L: current chips - initial stack (740)
  const initialStack = 740;
  const netResult = player.chipTotal - initialStack;

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 w-56 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-800">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Stats</span>
      </div>

      {/* Last Bet — top, bold */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-3">
        <div className="text-emerald-500/70 text-[10px] font-bold uppercase tracking-widest">Last Bet</div>
        <div className="text-2xl font-mono font-black text-emerald-400">${currentBet}</div>
      </div>

      {/* Pot Info */}
      <div className="space-y-2 mb-3 pb-3 border-b border-neutral-800">
        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Total Pot</span>
          <span className="font-mono text-sm font-bold text-amber-400">${totalPot}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Main Pot</span>
          <span className="font-mono text-sm font-bold text-amber-300">${mainPotAmount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Max Win</span>
          <span className={`font-mono text-sm font-bold ${maxWin > 0 ? 'text-emerald-400' : 'text-neutral-600'}`}>
            {maxWin > 0 ? `$${maxWin}` : '—'}
          </span>
        </div>
      </div>

      {/* Player Stats */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Bet This Match</span>
          <span className="font-mono text-sm font-bold text-amber-400">${player.totalBet}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Your Stack</span>
          <span className="font-mono text-sm font-bold text-white">${player.chipTotal}</span>
        </div>

        <div className="h-px bg-neutral-800"></div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Total Won</span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            +${totalWinnings}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Net P/L</span>
          <span className={`font-mono text-sm font-bold ${netResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netResult >= 0 ? '+' : ''}{netResult}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500">Bet This Round</span>
          <span className="font-mono text-sm font-bold text-neutral-300">${player.roundBet}</span>
        </div>
      </div>

      {/* Status badges */}
      {(player.folded || player.allIn || player.chipTotal === 0) && (
        <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-wrap gap-1.5">
          {player.folded && (
            <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">
              FOLDED
            </span>
          )}
          {player.allIn && (
            <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20">
              ALL IN
            </span>
          )}
          {player.chipTotal === 0 && (
            <span className="bg-neutral-800 text-neutral-500 text-[10px] font-bold px-2 py-0.5 rounded border border-neutral-700">
              SPECTATOR
            </span>
          )}
        </div>
      )}
    </div>
  );
}
