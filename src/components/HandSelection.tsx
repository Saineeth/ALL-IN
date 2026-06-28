"use client";

import { useState } from 'react';
import { Card as CardType } from '../types/game';
import { Card } from './Card';

interface HandSelectionProps {
  communityCards: CardType[];
  myHand: CardType[];
  onSubmit: (selectedIndices: number[]) => void;
}

export function HandSelection({ communityCards, myHand, onSubmit }: HandSelectionProps) {
  // Determine which community cards CAN cancel a hand card (matching value)
  // A community card is "usable" if its value appears in the hand.
  // We also need to respect counts: if hand has one K and community has two Ks, only one K is usable.
  const usableIndices = (() => {
    const handValueCounts = new Map<number, number>();
    for (const c of myHand) {
      handValueCounts.set(c.value, (handValueCounts.get(c.value) || 0) + 1);
    }
    // Track how many community cards of each value we've marked usable
    const usedCounts = new Map<number, number>();
    const result = new Set<number>();
    for (let i = 0; i < communityCards.length; i++) {
      const val = communityCards[i].value;
      const handCount = handValueCounts.get(val) || 0;
      const alreadyUsed = usedCounts.get(val) || 0;
      if (alreadyUsed < handCount) {
        result.add(i);
        usedCounts.set(val, alreadyUsed + 1);
      }
    }
    return result;
  })();

  // Start with only usable community cards selected
  const [selected, setSelected] = useState<Set<number>>(() => new Set(usableIndices));
  const [submitted, setSubmitted] = useState(false);

  const toggleCard = (idx: number) => {
    if (submitted) return;
    if (!usableIndices.has(idx)) return; // Can't toggle non-matching cards
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit(Array.from(selected));
  };

  // Calculate what the score would be with current selection
  const handTotal = myHand.reduce((s, c) => s + c.value, 0);
  const selectedReduction = Array.from(selected).reduce((s, i) => s + communityCards[i].value, 0);
  const effectiveScore = handTotal - selectedReduction;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl"
        style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Choose Your Community Cards</h2>
          <p className="text-sm text-neutral-400">
            Toggle matching cards to cancel them from your hand.
          </p>
          <div className="mt-2 inline-block bg-neutral-800 px-4 py-1.5 rounded-full border border-neutral-700">
            <span className="text-neutral-400 text-sm">Effective Score: </span>
            <span className={`font-mono font-bold text-lg ${effectiveScore === 11 ? 'text-emerald-400' : Math.abs(effectiveScore - 11) <= 2 ? 'text-amber-400' : 'text-white'}`}>{effectiveScore}</span>
            <span className="text-neutral-500 text-xs ml-1">(target: 11)</span>
          </div>
        </div>

        {/* Your Hand */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Your Hand (raw score: {handTotal})</div>
          <div className="flex gap-2 justify-center">
            {myHand.map((card, idx) => (
              <div key={idx} className="opacity-80">
                <Card card={card} dealDelay={idx * 80} />
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-800" />

        {/* Community Cards — selectable */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold">
            Community Cards — click to toggle
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            {communityCards.map((card, idx) => {
              const isSelected = selected.has(idx);
              const isUsable = usableIndices.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleCard(idx)}
                  disabled={submitted || !isUsable}
                  className="relative transition-all duration-300 ease-out focus:outline-none disabled:cursor-not-allowed"
                  style={{
                    transform: isUsable
                      ? (isSelected ? 'translateY(-8px) scale(1.1)' : 'translateY(0) scale(0.95)')
                      : 'translateY(0) scale(0.85)',
                    filter: isUsable
                      ? (isSelected ? 'none' : 'brightness(0.5) grayscale(0.5)')
                      : 'brightness(0.3) grayscale(0.8)',
                    opacity: isUsable ? 1 : 0.5,
                  }}
                >
                  <Card card={card} dealDelay={idx * 100} />
                  
                  {/* Selection indicator */}
                  {isSelected && isUsable && (
                    <div 
                      className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-neutral-900"
                      style={{ animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                    >
                      ✓
                    </div>
                  )}

                  {/* Lock icon for non-usable */}
                  {!isUsable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-neutral-900/80 rounded-full p-1">
                        <span className="text-neutral-500 text-xs">✕</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Glow when selected */}
                  {isSelected && isUsable && (
                    <div 
                      className="absolute inset-0 rounded-lg -z-10"
                      style={{
                        boxShadow: '0 0 15px rgba(16,185,129,0.4)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          style={{
            background: submitted 
              ? '#374151' 
              : 'linear-gradient(135deg, #059669, #10b981)',
            boxShadow: submitted ? 'none' : '0 0 20px rgba(16,185,129,0.3)',
          }}
        >
          {submitted ? (
            <span className="flex items-center justify-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              Waiting for other players...
            </span>
          ) : (
            `Confirm Selection (${selected.size} card${selected.size !== 1 ? 's' : ''})`
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          0% { transform: scale(0); }
          80% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
