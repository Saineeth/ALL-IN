"use client";

import { Pot, PublicPlayer } from '../types/game';

interface PotDisplayProps {
  pots: Pot[];
  players: PublicPlayer[];
  matchNumber?: number;
  currentRound?: number;
}

export function PotDisplay({ pots, players, matchNumber, currentRound }: PotDisplayProps) {
  // Live pot = sum of all players' totalBet (always accurate, even during betting)
  const livePot = players.reduce((sum, p) => sum + p.totalBet, 0);
  const sidePots = pots.slice(1);
  const mainPotAmount = pots.length > 0 ? pots[0].amount : livePot;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Match & Round Badge */}
      {(matchNumber !== undefined && matchNumber > 0) && (
        <div className="flex gap-2">
          <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20">
            Match #{matchNumber}
          </span>
          {currentRound !== undefined && currentRound > 0 && (
            <span className="bg-neutral-800 text-neutral-400 text-xs font-bold px-3 py-1 rounded-full border border-neutral-700">
              Round {currentRound}/6
            </span>
          )}
        </div>
      )}

      {/* Total Pot */}
      <div className="bg-neutral-950/80 backdrop-blur border border-amber-500/30 rounded-xl px-8 py-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col items-center min-w-[140px]">
        <span className="text-amber-500/70 text-[10px] font-bold uppercase tracking-widest mb-1">
          Total Pot
        </span>
        <span className="text-3xl font-mono font-bold text-amber-400">
          ${livePot}
        </span>
      </div>

      {/* Main Pot + Side Pots breakdown */}
      {(sidePots.length > 0 || livePot > 0) && (
        <div className="flex gap-2 flex-wrap justify-center">
          {/* Main Pot */}
          <div className="bg-neutral-900/80 backdrop-blur px-4 py-2 rounded-lg border border-amber-500/15 flex flex-col items-center min-w-[80px]">
            <span className="text-amber-400/60 text-[9px] font-bold uppercase tracking-wider">
              Main Pot
            </span>
            <span className="text-sm font-mono font-bold text-amber-300">
              ${mainPotAmount}
            </span>
          </div>
          {/* Side Pots */}
          {sidePots.map((pot, idx) => (
            <div 
              key={idx} 
              className="bg-neutral-900/80 backdrop-blur px-4 py-2 rounded-lg border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)] flex flex-col items-center min-w-[80px]"
            >
              <span className="text-purple-400/70 text-[9px] font-bold uppercase tracking-wider">
                Side Pot {idx + 1}
              </span>
              <span className="text-sm font-mono font-bold text-purple-300">
                ${pot.amount}
              </span>
            </div>
          ))}
          {sidePots.length === 0 && (
            <div className="bg-neutral-900/80 backdrop-blur px-4 py-2 rounded-lg border border-purple-500/10 flex flex-col items-center min-w-[80px] opacity-50">
              <span className="text-purple-400/50 text-[9px] font-bold uppercase tracking-wider">
                Side Pot
              </span>
              <span className="text-sm font-mono font-bold text-purple-300/50">
                —
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
