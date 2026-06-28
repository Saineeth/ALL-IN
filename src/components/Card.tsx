"use client";

import { Card as CardType } from '../types/game';
import { useEffect, useState } from 'react';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  className?: string;
  /** Stagger delay in ms for deal-in animation */
  dealDelay?: number;
}

export function Card({ card, faceDown = false, className = '', dealDelay = 0 }: CardProps) {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';
  const [isDealt, setIsDealt] = useState(dealDelay === 0);
  
  useEffect(() => {
    if (dealDelay > 0) {
      const timer = setTimeout(() => setIsDealt(true), dealDelay);
      return () => clearTimeout(timer);
    }
  }, [dealDelay]);

  const getSuitSymbol = (suit?: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  return (
    <div 
      className={`relative w-16 h-24 rounded-lg shadow-xl transition-all duration-500 ease-out ${className}`}
      style={{ 
        perspective: '1000px',
        transform: isDealt ? 'translateY(0) scale(1)' : 'translateY(-40px) scale(0.5)',
        opacity: isDealt ? 1 : 0,
      }}
    >
      {/* Card flip container */}
      <div 
        className="absolute inset-0 transition-transform duration-700 ease-in-out"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div 
          className="absolute inset-0 bg-white rounded-lg border-2 border-neutral-200 overflow-hidden flex flex-col justify-between p-1"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {card && (
            <>
              {/* Top-left corner */}
              <div className={`leading-none ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
                <div className="font-bold" style={{ fontSize: '10px' }}>{card.rank}</div>
                <div style={{ fontSize: '11px', marginTop: '-1px' }}>{getSuitSymbol(card.suit)}</div>
              </div>
              
              {/* Center suit */}
              <div className={`flex items-center justify-center opacity-40 ${isRed ? 'text-red-600' : 'text-neutral-900'}`} style={{ fontSize: '18px' }}>
                {getSuitSymbol(card.suit)}
              </div>
              
              {/* Bottom-right corner */}
              <div className={`leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
                <div className="font-bold" style={{ fontSize: '10px' }}>{card.rank}</div>
                <div style={{ fontSize: '11px', marginTop: '-1px' }}>{getSuitSymbol(card.suit)}</div>
              </div>
            </>
          )}
        </div>

        {/* Back of card */}
        <div 
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 25%, #1a0505 50%, #2d0f0f 75%, #1a0a0a 100%)',
            border: '2px solid #8b6914',
          }}
        >
          {/* Gold inner border */}
          <div 
            className="absolute rounded-md overflow-hidden flex items-center justify-center"
            style={{
              inset: '3px',
              border: '1px solid rgba(212, 175, 55, 0.5)',
              background: 'linear-gradient(180deg, #1f0808 0%, #2a0e0e 50%, #1f0808 100%)',
            }}
          >
            {/* Diamond lattice pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cardPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M4 0L8 4L4 8L0 4Z" fill="none" stroke="#d4af37" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cardPattern)" />
            </svg>

            {/* Center emblem glow */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '28px',
                height: '28px',
                background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
              }}
            />

            {/* Center spade emblem */}
            <div className="relative z-10 flex flex-col items-center" style={{ color: '#d4af37' }}>
              <div style={{ fontSize: '16px', lineHeight: 1, filter: 'drop-shadow(0 0 3px rgba(212,175,55,0.4))' }}>♠</div>
            </div>

            {/* Corner decorations */}
            <div className="absolute top-1 left-1" style={{ fontSize: '5px', color: '#d4af37', opacity: 0.6 }}>◆</div>
            <div className="absolute top-1 right-1" style={{ fontSize: '5px', color: '#d4af37', opacity: 0.6 }}>◆</div>
            <div className="absolute bottom-1 left-1" style={{ fontSize: '5px', color: '#d4af37', opacity: 0.6 }}>◆</div>
            <div className="absolute bottom-1 right-1" style={{ fontSize: '5px', color: '#d4af37', opacity: 0.6 }}>◆</div>

            {/* Top/bottom edge lines */}
            <div className="absolute top-1.5 left-2 right-2 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' }} />
            <div className="absolute bottom-1.5 left-2 right-2 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
