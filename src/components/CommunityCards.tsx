"use client";

import { Card as CardType } from '../types/game';
import { Card } from './Card';

interface CommunityCardsProps {
  cards: CardType[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always render 5 slots to keep layout stable
  const slots = Array.from({ length: 5 });

  return (
    <div className="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-2xl p-4 flex gap-3 shadow-2xl relative">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full border border-neutral-700">
        Community Cards
      </div>
      
      {slots.map((_, idx) => {
        const card = cards[idx];
        return (
          <div key={idx} className="relative">
            {/* Empty slot placeholder */}
            <div className="absolute inset-0 border-2 border-dashed border-neutral-700 rounded-lg bg-neutral-800/20"></div>
            
            {/* Card if present */}
            {card ? (
              <div className="hover:-translate-y-1 transition-transform cursor-pointer relative">
                {/* Glow behind card */}
                <div 
                  className="absolute inset-0 rounded-lg blur-md -z-10 animate-pulse"
                  style={{ 
                    background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
                    animationDuration: '3s',
                  }}
                />
                <Card card={card} dealDelay={idx * 200} />
              </div>
            ) : (
              <div className="w-16 h-24"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
