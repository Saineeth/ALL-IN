"use client";

import { ShowdownResult, Card as CardType } from '../types/game';
import { Card } from './Card';
import { useEffect, useState } from 'react';

interface ShowdownResultsProps {
  results: ShowdownResult;
  onNextMatch: () => void;
}

export function ShowdownResults({ results, onNextMatch }: ShowdownResultsProps) {
  const [countdown, setCountdown] = useState(5);
  const [phase, setPhase] = useState<'reveal' | 'showing' | 'fadeout'>('reveal');

  // Find overall winner (rank 1)
  const winner = results.rankings[0];

  useEffect(() => {
    // Start showing after reveal animation
    const revealTimer = setTimeout(() => setPhase('showing'), 600);
    return () => clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'showing') return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('fadeout');
          // Auto-advance after fadeout animation
          setTimeout(() => onNextMatch(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, onNextMatch]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        animation: phase === 'fadeout' 
          ? 'fadeOut 0.5s ease-out forwards'
          : 'none',
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-xl" />
      
      {/* Particle burst effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: '50%',
              top: '35%',
              backgroundColor: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#10b981' : '#d4af37',
              animation: `particle ${1.5 + Math.random()}s ease-out ${Math.random() * 0.5}s forwards`,
              ['--tx' as string]: `${(Math.random() - 0.5) * 600}px`,
              ['--ty' as string]: `${(Math.random() - 0.5) * 400}px`,
            }}
          />
        ))}
      </div>

      <div 
        className="relative bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full p-8 shadow-2xl"
        style={{
          animation: 'victorySlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Glow behind winner */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-64 rounded-full blur-[100px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(212,175,55,0.1) 50%, transparent 70%)',
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        />

        {/* Trophy + Winner */}
        <div className="text-center mb-8 relative z-10">
          <div 
            className="text-6xl mb-2"
            style={{ animation: 'trophyBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
          >
            🏆
          </div>
          <h2 
            className="text-4xl font-black text-amber-500 mb-2 uppercase tracking-widest"
            style={{ 
              animation: 'titleGlow 0.6s ease-out 0.4s both',
              textShadow: '0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(245,158,11,0.2)',
            }}
          >
            Victory
          </h2>
          <p 
            className="text-neutral-300 text-lg"
            style={{ animation: 'fadeInUp 0.5s ease-out 0.6s both' }}
          >
            <span className="text-white font-bold text-2xl">{winner.playerName}</span>
            <span className="text-neutral-500 ml-2">wins the match!</span>
          </p>
        </div>

        {/* Pots Breakdown */}
        <div 
          className="flex justify-center gap-4 mb-8 flex-wrap"
          style={{ animation: 'fadeInUp 0.5s ease-out 0.7s both' }}
        >
          {results.potAwards.map((award, idx) => (
            <div 
              key={idx} 
              className="bg-neutral-950 border border-emerald-900/50 rounded-xl p-4 text-center min-w-[150px]"
              style={{ animation: `fadeInUp 0.4s ease-out ${0.8 + idx * 0.1}s both` }}
            >
              <div className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest mb-1">
                {idx === 0 ? 'Main Pot' : `Side Pot ${idx}`}
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400 mb-2">${award.potAmount}</div>
              <div className="text-sm text-neutral-300">Won by {award.winnerName}</div>
            </div>
          ))}
        </div>

        {/* Rankings Breakdown */}
        <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-2">
          {results.rankings.map((playerScore, idx) => (
            <div 
              key={playerScore.playerId} 
              className={`bg-neutral-950 border ${idx === 0 ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-neutral-800'} rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center`}
              style={{ animation: `fadeInUp 0.4s ease-out ${0.9 + idx * 0.15}s both` }}
            >
              <div className="flex flex-col items-center min-w-[100px]">
                <div className={`text-4xl font-black ${idx === 0 ? 'text-amber-500' : 'text-neutral-600'}`}>
                  #{playerScore.rank}
                </div>
                <div className="font-bold text-lg text-white mt-1">{playerScore.playerName}</div>
              </div>

              <div className="flex-1 flex gap-4 overflow-x-auto pb-2 items-center justify-center">
                {playerScore.hand.map((card, i) => (
                  <div key={i} className="scale-75 origin-center">
                    <Card card={card} dealDelay={1000 + idx * 200 + i * 100} />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Raw Score:</span>
                  <span className="font-mono text-white">{playerScore.rawScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Reduction:</span>
                  <span className="font-mono text-emerald-400">-{playerScore.reduction}</span>
                </div>
                <div className="h-px bg-neutral-800 my-1"></div>
                <div className="flex justify-between font-bold">
                  <span className="text-neutral-300">Final:</span>
                  <span className={`font-mono ${idx === 0 ? 'text-amber-400 text-xl' : 'text-white'}`}>
                    {playerScore.finalScore}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 text-right">
                  Distance: {playerScore.distanceFrom11} | Eff. Cards: {playerScore.effectiveCardCount}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Countdown Bar */}
        <div className="mt-6 relative">
          <div className="text-center text-sm text-neutral-500 mb-2">
            Next match in <span className="text-amber-400 font-bold">{countdown}</span>s
          </div>
          <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(countdown / 5) * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #10b981)',
              }}
            />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes victorySlideUp {
          from { opacity: 0; transform: translateY(50px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes trophyBounce {
          0% { opacity: 0; transform: scale(0) rotate(-20deg); }
          60% { transform: scale(1.3) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes titleGlow {
          from { opacity: 0; letter-spacing: 0.5em; }
          to { opacity: 1; letter-spacing: 0.25em; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes particle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
