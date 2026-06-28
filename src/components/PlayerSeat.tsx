"use client";

import { PublicPlayer, Card as CardType } from '../types/game';
import { Card } from './Card';
import { useEffect, useState, useRef } from 'react';

interface PlayerSeatProps {
  player: PublicPlayer;
  isMe: boolean;
  isCurrentTurn: boolean;
  myHand?: CardType[];
  foldedHand?: CardType[];
  position: 'bottom' | 'top' | 'left' | 'right' | 'top-left' | 'top-right';
}

export function PlayerSeat({ player, isMe, isCurrentTurn, myHand, foldedHand, position }: PlayerSeatProps) {
  const isTop = position.startsWith('top');
  const [justFolded, setJustFolded] = useState(false);
  const prevFolded = useRef(player.folded);

  // Detect when player folds
  useEffect(() => {
    if (player.folded && !prevFolded.current) {
      setJustFolded(true);
      const timer = setTimeout(() => setJustFolded(false), 800);
      return () => clearTimeout(timer);
    }
    prevFolded.current = player.folded;
  }, [player.folded]);
  
  return (
    <div className={`relative flex flex-col items-center gap-4 transition-all duration-300 ${isCurrentTurn ? 'scale-105' : 'scale-100 opacity-80'}`}>
      
      {/* Turn Indicator Glow */}
      {isCurrentTurn && (
        <div className="absolute inset-0 -m-8 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-amber-500/20 to-transparent rounded-full blur-xl -z-10 animate-pulse"></div>
      )}

      {/* Cards Area */}
      <div className={`flex -space-x-12 ${isTop ? 'order-last mt-4' : 'mb-4'}`}>
        {isMe && myHand ? (
          myHand.map((card, idx) => (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`} 
              className="hover:-translate-y-4 transition-transform duration-200"
              style={player.folded ? { opacity: 0.5, transition: 'opacity 0.5s ease' } : undefined}
            >
              <Card card={card} dealDelay={idx * 120} />
            </div>
          ))
        ) : player.folded && foldedHand && foldedHand.length > 0 ? (
          foldedHand.map((card, idx) => (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`}
              style={{ opacity: 0.5, transition: 'opacity 0.5s ease' }}
            >
              <Card card={card} dealDelay={idx * 100} className="scale-75 origin-bottom" />
            </div>
          ))
        ) : (
          Array.from({ length: player.cardCount }).map((_, idx) => (
            <div key={idx}>
              <Card faceDown dealDelay={idx * 100} className="scale-75 origin-bottom" />
            </div>
          ))
        )}
      </div>

      {/* Info Plate with optional RGB border */}
      <div className="relative">
        {/* RGB spinning border for all-in */}
        {player.allIn && (
          <div 
            className="absolute -inset-[2px] rounded-xl z-0"
            style={{
              background: 'conic-gradient(from 0deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0000ff, #8b00ff, #ff0000)',
              animation: 'rgbSpin 1.5s linear infinite',
              filter: 'blur(1px)',
            }}
          />
        )}
        
        <div 
          className={`relative z-[1] bg-neutral-900/90 backdrop-blur-md rounded-xl p-3 min-w-[140px] text-center transition-all duration-500 ${
            player.allIn
              ? 'shadow-[0_0_20px_rgba(255,0,0,0.3)]' 
              : isCurrentTurn 
                ? 'border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'border border-neutral-800'
          }`}
          style={player.allIn ? { border: 'none' } : undefined}
        >
          {/* Status Badges */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 whitespace-nowrap z-10">
            {player.folded && (
              <span 
                className="bg-neutral-800 text-neutral-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-neutral-700"
                style={justFolded ? { animation: 'badgePop 0.3s ease-out' } : undefined}
              >
                Folded
              </span>
            )}
            {player.allIn && (
              <span 
                className="text-white text-[10px] uppercase font-bold px-3 py-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  boxShadow: '0 0 10px rgba(220,38,38,0.5)',
                  animation: 'badgePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                ALL IN
              </span>
            )}
          </div>

          <div className="font-bold text-neutral-200 truncate">{player.name} {isMe && '(You)'}</div>
          
          <div className={`mt-1 font-mono rounded py-1 border flex items-center justify-center gap-1 ${
            player.allIn 
              ? 'text-red-400 bg-red-950/30 border-red-900/30' 
              : 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30'
          }`}>
            <span className={player.allIn ? 'text-red-600' : 'text-emerald-600'}>$</span>
            {player.chipTotal}
          </div>

          {/* Current Round Bet */}
          {player.roundBet > 0 && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-neutral-800/90 border border-amber-900/50 text-amber-400 font-mono text-sm px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
              Bet: {player.roundBet}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes rgbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes badgePop {
          0% { transform: translateX(-50%) scale(0); }
          70% { transform: translateX(-50%) scale(1.2); }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
