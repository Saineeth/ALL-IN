"use client";

import { ChipStack as ChipStackType } from '../types/game';

interface ChipStackProps {
  chips: ChipStackType | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ChipStack({ chips, className = '', size = 'md' }: ChipStackProps) {
  if (!chips) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 border-2 text-[10px]',
    md: 'w-10 h-10 border-4 text-xs',
    lg: 'w-14 h-14 border-[6px] text-sm'
  };

  const stackOffset = {
    sm: 2,
    md: 4,
    lg: 6
  };

  const renderStack = (count: number, color: 'green' | 'blue' | 'red' | 'black', value: number) => {
    if (count === 0) return null;

    const colors = {
      green: 'bg-emerald-600 border-emerald-400 text-emerald-100',
      blue: 'bg-blue-600 border-blue-400 text-blue-100',
      red: 'bg-rose-600 border-rose-400 text-rose-100',
      black: 'bg-neutral-900 border-neutral-600 text-neutral-300'
    };

    // Max visual chips per stack to avoid overflowing
    const visualCount = Math.min(count, 5);

    return (
      <div className="relative group flex flex-col items-center justify-end h-32 w-14">
        {/* Chips */}
        <div className="relative w-full">
          {Array.from({ length: visualCount }).map((_, i) => (
            <div
              key={i}
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.5)] flex items-center justify-center font-bold font-mono
                ${sizeClasses[size]} ${colors[color]}
                ${i === visualCount - 1 ? 'z-10' : 'z-0'}
              `}
              style={{
                transform: `translate(-50%, -${i * stackOffset[size]}px)`,
              }}
            >
              {/* Only show value on top chip */}
              {i === visualCount - 1 && value}
            </div>
          ))}
        </div>
        {/* Count Label */}
        <div className="mt-4 bg-neutral-900/80 px-2 py-1 rounded text-xs font-mono text-neutral-400 border border-neutral-800">
          ×{count}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex gap-2 items-end justify-center ${className}`}>
      {renderStack(chips.green, 'green', 10)}
      {renderStack(chips.blue, 'blue', 25)}
      {renderStack(chips.red, 'red', 50)}
      {renderStack(chips.black, 'black', 100)}
    </div>
  );
}
