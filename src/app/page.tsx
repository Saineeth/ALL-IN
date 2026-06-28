"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../hooks/useGame';

export default function Home() {
  const router = useRouter();
  const { state, actions } = useGame();
  
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');

  // When the server confirms game creation, navigate to the room
  useEffect(() => {
    if (state.gameId && state.phase === 'lobby' && state.players.length > 0) {
      router.push(`/game/${state.gameId}`);
    }
  }, [state.gameId, state.phase, state.players.length, router]);

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    actions.createGame(playerName);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !gameCode.trim()) return;
    // Navigate to the game page with the name in the URL so the page can join via socket
    router.push(`/game/${gameCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-[128px]"></div>
      </div>

      <div className="z-10 w-full max-w-md space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-emerald-400 to-emerald-700 bg-clip-text text-transparent drop-shadow-sm">
            ALL IN
          </h1>
          <p className="text-neutral-400 font-medium tracking-wide">
            The Ultimate Number 11 Card Game
          </p>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs text-neutral-500">{state.isConnected ? 'Connected to server' : 'Connecting...'}</span>
        </div>

        {state.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
            {state.error}
          </div>
        )}

        <div className="grid gap-8">
          {/* Create Game Section */}
          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">1</span>
              Host a Game
            </h2>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Maverick"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!playerName.trim() || !state.isConnected}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isConnected ? 'Create Game' : 'Connecting...'}
              </button>
            </form>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative bg-neutral-950 px-4 text-sm text-neutral-500 font-medium">OR</div>
          </div>

          {/* Join Game Section */}
          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">2</span>
              Join a Game
            </h2>
            <form onSubmit={handleJoinGame} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="e.g. Goose"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">Room Code</label>
                  <input
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors uppercase tracking-widest font-mono"
                    placeholder="e.g. X7K9A2"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!playerName.trim() || !gameCode.trim() || !state.isConnected}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isConnected ? 'Join Game' : 'Connecting...'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
