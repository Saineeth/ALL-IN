"use client";

import { MatchResult, PotAward } from '../types/game';

interface MatchHistoryProps {
  matches: MatchResult[];
  isOpen: boolean;
  onToggle: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function totalWinnings(potAwards: PotAward[]): Map<string, { name: string; amount: number }> {
  const map = new Map<string, { name: string; amount: number }>();
  for (const award of potAwards) {
    const existing = map.get(award.winnerId);
    if (existing) {
      existing.amount += award.potAmount;
    } else {
      map.set(award.winnerId, { name: award.winnerName, amount: award.potAmount });
    }
  }
  return map;
}

export function MatchHistory({ matches, isOpen, onToggle }: MatchHistoryProps) {
  const sortedMatches = [...matches].sort((a, b) => b.matchNumber - a.matchNumber);

  return (
    <>
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Toggle tab – visible when sidebar is closed */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-[90] h-24 w-8 flex items-center justify-center
          bg-neutral-900 border border-neutral-800 border-r-0 rounded-l-lg
          text-neutral-400 hover:text-white hover:bg-neutral-800
          transition-all duration-300 ease-in-out
          ${isOpen ? 'right-80' : 'right-0'}`}
        aria-label={isOpen ? 'Close match history' : 'Open match history'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 right-0 z-[85] h-full w-80 bg-neutral-900 border-l border-neutral-800
          shadow-[-8px_0_30px_rgba(0,0,0,0.5)]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Match History
          </h2>
          <button
            onClick={onToggle}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
            aria-label="Close match history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Match count badge */}
        <div className="px-5 py-2 border-b border-neutral-800/50">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} played
          </span>
        </div>

        {/* Match list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          {sortedMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-neutral-500 text-sm font-medium">No matches played yet</p>
              <p className="text-neutral-600 text-xs mt-1">Results will appear here after each match</p>
            </div>
          ) : (
            sortedMatches.map((match) => {
              const winnerMap = totalWinnings(match.potAwards);
              const totalPot = match.potAwards.reduce((sum, a) => sum + a.potAmount, 0);

              return (
                <div
                  key={match.matchNumber}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                      Match #{match.matchNumber}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {formatRelativeTime(match.timestamp)}
                    </span>
                  </div>

                  {/* Winners */}
                  <div className="space-y-2">
                    {Array.from(winnerMap.entries()).map(([winnerId, { name, amount }]) => (
                      <div key={winnerId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-neutral-200 truncate max-w-[120px]">
                            {name}
                          </span>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          +${amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total pot */}
                  <div className="mt-3 pt-2 border-t border-neutral-800/50 flex items-center justify-between">
                    <span className="text-xs text-neutral-600">Total Pot</span>
                    <span className="text-xs font-mono text-neutral-400">${totalPot}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
