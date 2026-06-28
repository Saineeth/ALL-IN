"use client";

import { useState, useCallback } from 'react';
import { ChipStack as ChipStackType, AvailableAction, CHIP_VALUES } from '../types/game';

interface BettingControlsProps {
  myChips: ChipStackType | null;
  actions: AvailableAction[];
  isMyTurn: boolean;
  phase: string;
  onBet: (amount: number, chips: Partial<ChipStackType>) => void;
  onFold: () => void;
  onForceShowdown: (chips: Partial<ChipStackType>) => void;
  onAllIn: () => void;
  onDrawCard: () => void;
  onSkipDraw: () => void;
}

const CHIP_COLORS = {
  green: { bg: '#059669', border: '#34d399', text: '#d1fae5', glow: 'rgba(5,150,105,0.4)' },
  blue: { bg: '#2563eb', border: '#60a5fa', text: '#dbeafe', glow: 'rgba(37,99,235,0.4)' },
  red: { bg: '#e11d48', border: '#fb7185', text: '#ffe4e6', glow: 'rgba(225,29,72,0.4)' },
  black: { bg: '#171717', border: '#525252', text: '#d4d4d4', glow: 'rgba(82,82,82,0.4)' },
} as const;

export function BettingControls({ 
  myChips, 
  actions, 
  isMyTurn,
  phase,
  onBet, 
  onFold, 
  onForceShowdown,
  onAllIn,
  onDrawCard, 
  onSkipDraw 
}: BettingControlsProps) {
  const [selectedChips, setSelectedChips] = useState<Partial<ChipStackType>>({ green: 0, blue: 0, red: 0, black: 0 });
  const [chipAnimating, setChipAnimating] = useState<string | null>(null);
  const [betSent, setBetSent] = useState(false);
  
  // Only hide completely during lobby, showdown, dealing, hand_selection, or if we have no chips info
  if (!myChips) return null;
  if (['lobby', 'dealing', 'hand_selection', 'showdown', 'tie_break', 'finished', 'game_over'].includes(phase)) return null;

  const disabled = !isMyTurn || actions.length === 0;

  const currentSelectionValue = 
    (selectedChips.green || 0) * CHIP_VALUES.green +
    (selectedChips.blue || 0) * CHIP_VALUES.blue +
    (selectedChips.red || 0) * CHIP_VALUES.red +
    (selectedChips.black || 0) * CHIP_VALUES.black;

  const handleAddChip = (color: keyof ChipStackType) => {
    if (myChips[color] > (selectedChips[color] || 0)) {
      setChipAnimating(color);
      setSelectedChips(prev => ({ ...prev, [color]: (prev[color] || 0) + 1 }));
      setTimeout(() => setChipAnimating(null), 300);
    }
  };

  const handleRemoveChip = (color: keyof ChipStackType) => {
    if ((selectedChips[color] || 0) > 0) {
      setSelectedChips(prev => ({ ...prev, [color]: (prev[color] || 0) - 1 }));
    }
  };

  const resetSelection = () => {
    setSelectedChips({ green: 0, blue: 0, red: 0, black: 0 });
  };

  // Find specific actions available
  const betAction = actions.find(a => a.type === 'bet') as Extract<AvailableAction, { type: 'bet' }> | undefined;
  const foldAction = actions.find(a => a.type === 'fold');
  const forceShowdownAction = actions.find(a => a.type === 'force_showdown') as Extract<AvailableAction, { type: 'force_showdown' }> | undefined;
  const drawAction = actions.find(a => a.type === 'draw_card');
  const skipDrawAction = actions.find(a => a.type === 'skip_draw');
  const allInAction = actions.find(a => a.type === 'all_in');

  const totalStack = myChips.green*10 + myChips.blue*25 + myChips.red*50 + myChips.black*100;

  const isValidBet = betAction && currentSelectionValue >= betAction.minAmount && currentSelectionValue <= betAction.maxAmount;
  const isAllIn = currentSelectionValue === totalStack;
  const canSubmitBet = currentSelectionValue > 0 && (isValidBet || isAllIn);
  
  const isValidForceShowdown = forceShowdownAction && currentSelectionValue === forceShowdownAction.exactAmount;

  const handleBet = () => {
    setBetSent(true);
    setTimeout(() => {
      onBet(currentSelectionValue, selectedChips);
      resetSelection();
      setBetSent(false);
    }, 400);
  };

  const handleForceShowdown = () => {
    setBetSent(true);
    setTimeout(() => {
      onForceShowdown(selectedChips);
      resetSelection();
      setBetSent(false);
    }, 400);
  };

  const handleAllIn = () => {
    setBetSent(true);
    setTimeout(() => {
      onAllIn();
      resetSelection();
      setBetSent(false);
    }, 500);
  };

  // Determine button label
  const getBetLabel = () => {
    if (currentSelectionValue === 0) return `Call (${betAction?.minAmount || 0})`;
    return betAction?.minAmount === 0 ? 'Bet' : 'Raise';
  };

  return (
    <div className="bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 p-4 sticky bottom-0 left-0 right-0 z-50 relative">
      
      {/* Waiting overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-t-lg">
          <div className="flex items-center gap-3 bg-neutral-900/90 px-5 py-2.5 rounded-full border border-neutral-700/50">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-neutral-400 font-medium">Waiting for your turn</span>
          </div>
        </div>
      )}

      <div className={`max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        
        {/* Draw Phase Controls */}
        {phase === 'drawing' ? (
          <div className="flex flex-col gap-3 w-full">
            <div className="text-center text-sm text-neutral-400">
              Build your hand before betting begins
            </div>
            <div className="flex gap-4 w-full">
              {drawAction && (
                <button 
                  onClick={onDrawCard}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-[0_0_15px_rgba(5,150,105,0.3)] active:scale-95"
                >
                  Draw Card
                </button>
              )}
              {skipDrawAction && (
                <button 
                  onClick={onSkipDraw}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 hover:shadow-[0_0_25px_rgba(217,119,6,0.4)] text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 active:scale-95"
                >
                  {drawAction ? 'Done Drawing' : 'Done (Max Cards)'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Betting Phase Controls */
          <>
            {/* Chip Selector */}
            <div className="flex gap-4 p-4 bg-neutral-950 rounded-2xl border border-neutral-800/50 relative overflow-hidden">
              {/* Ambient shimmer */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
                  animation: 'shimmer 3s ease-in-out infinite',
                }}
              />
              
              {(['green', 'blue', 'red', 'black'] as const).map(color => {
                const count = selectedChips[color] || 0;
                const isAnimating = chipAnimating === color;
                const remaining = myChips[color] - count;
                
                return (
                  <div key={color} className="flex flex-col items-center gap-2 relative">
                    {/* Chip button */}
                    <button 
                      onClick={() => handleAddChip(color)}
                      disabled={remaining === 0}
                      className="w-12 h-12 rounded-full shadow-lg border-2 flex items-center justify-center font-bold transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed relative"
                      style={{
                        backgroundColor: CHIP_COLORS[color].bg,
                        borderColor: CHIP_COLORS[color].border,
                        color: CHIP_COLORS[color].text,
                        transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: count > 0 
                          ? `0 0 15px ${CHIP_COLORS[color].glow}, inset 0 1px 1px rgba(255,255,255,0.2)` 
                          : `inset 0 1px 1px rgba(255,255,255,0.2)`,
                      }}
                    >
                      {CHIP_VALUES[color]}
                      
                      {/* Inner ring decoration */}
                      <div 
                        className="absolute inset-1.5 rounded-full border border-dashed pointer-events-none"
                        style={{ borderColor: `${CHIP_COLORS[color].border}50` }}
                      />
                    </button>
                    
                    {/* Selected count badge */}
                    {count > 0 && (
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white border border-neutral-700"
                        style={{ 
                          backgroundColor: CHIP_COLORS[color].bg,
                          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        }}
                      >
                        {count}
                      </div>
                    )}
                    
                    {/* Remaining label */}
                    <span className="text-[10px] text-neutral-500 tabular-nums">{remaining} left</span>
                    
                    {/* Undo button */}
                    {count > 0 && (
                      <button 
                        onClick={() => handleRemoveChip(color)}
                        className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded transition-all duration-200 hover:text-white active:scale-95"
                      >
                        −
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col flex-1 w-full gap-2">
              {/* Selected amount display */}
              <div 
                className="flex justify-between items-center bg-neutral-950 px-4 py-2 rounded-lg border border-neutral-800 transition-all duration-300"
                style={{
                  borderColor: currentSelectionValue > 0 ? 'rgba(16,185,129,0.3)' : undefined,
                  boxShadow: currentSelectionValue > 0 ? '0 0 10px rgba(16,185,129,0.1)' : undefined,
                }}
              >
                <span className="text-neutral-400 text-sm">Selected:</span>
                <span 
                  className="text-2xl font-mono text-emerald-400 font-bold transition-all duration-200"
                  style={{ 
                    transform: chipAnimating ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  ${currentSelectionValue}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div 
                className="flex gap-2 transition-all duration-400"
                style={{
                  transform: betSent ? 'translateY(-10px) scale(0.95)' : 'translateY(0)',
                  opacity: betSent ? 0.5 : 1,
                }}
              >
                {foldAction && (
                  <button 
                    onClick={onFold}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 active:scale-95 border border-neutral-700/50 hover:border-neutral-600"
                  >
                    Fold
                  </button>
                )}
                
                <button 
                  onClick={handleBet}
                  disabled={!canSubmitBet}
                  className="flex-1 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 relative overflow-hidden"
                  style={{
                    background: canSubmitBet 
                      ? 'linear-gradient(135deg, #059669, #10b981)' 
                      : '#065f46',
                    boxShadow: canSubmitBet 
                      ? '0 0 20px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' 
                      : 'none',
                  }}
                >
                  {/* Button shine effect */}
                  {canSubmitBet && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                        animation: 'shimmer 2s ease-in-out infinite',
                      }}
                    />
                  )}
                  <span className="relative z-10">{getBetLabel()}</span>
                </button>

                {forceShowdownAction && (
                  <button 
                    onClick={handleForceShowdown}
                    disabled={!isValidForceShowdown}
                    className="text-white px-4 py-3 rounded-lg font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm whitespace-nowrap active:scale-95"
                    style={{
                      background: isValidForceShowdown 
                        ? 'linear-gradient(135deg, #d97706, #f59e0b)' 
                        : '#78350f',
                      boxShadow: isValidForceShowdown 
                        ? '0 0 15px rgba(217,119,6,0.3)' 
                        : 'none',
                    }}
                    title={`Requires exactly $${forceShowdownAction.exactAmount}`}
                  >
                    Force Showdown
                  </button>
                )}

                {allInAction && (
                  <button 
                    onClick={handleAllIn}
                    className="text-white px-4 py-3 rounded-lg font-bold transition-all duration-300 text-sm whitespace-nowrap active:scale-95 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #be123c, #e11d48)',
                      boxShadow: '0 0 20px rgba(225,29,72,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    {/* Pulsing glow */}
                    <div 
                      className="absolute inset-0 pointer-events-none animate-pulse"
                      style={{ 
                        background: 'radial-gradient(circle at center, rgba(225,29,72,0.3) 0%, transparent 70%)',
                      }}
                    />
                    <span className="relative z-10">ALL IN (${totalStack})</span>
                  </button>
                )}
              </div>

              {/* Reset */}
              {currentSelectionValue > 0 && (
                <button 
                  onClick={resetSelection}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors text-center py-1"
                >
                  Reset Selection
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
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
