"use client";

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGame } from '../../../hooks/useGame';
import { getSocket } from '../../../lib/socket';
import { PlayerSeat } from '../../../components/PlayerSeat';
import { CommunityCards } from '../../../components/CommunityCards';
import { PotDisplay } from '../../../components/PotDisplay';
import { BettingControls } from '../../../components/BettingControls';
import { ShowdownResults } from '../../../components/ShowdownResults';
import { MatchHistory } from '../../../components/MatchHistory';
import { PlayerStats } from '../../../components/PlayerStats';
import { HandSelection } from '../../../components/HandSelection';

export default function GameRoom({ params }: { params: Promise<{ gameId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, actions } = useGame();
  
  const [hasJoined, setHasJoined] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const socket = getSocket();

  // Handle joining: only join if we arrived via "Join a Game" flow (has ?name= param)
  const nameFromUrl = searchParams.get('name');
  
  useEffect(() => {
    if (nameFromUrl && !hasJoined && state.isConnected) {
      actions.joinGame(resolvedParams.gameId, nameFromUrl);
      setHasJoined(true);
      router.replace(`/game/${resolvedParams.gameId}`);
    }
  }, [nameFromUrl, hasJoined, state.isConnected, resolvedParams.gameId, actions, router]);

  // Auto-rejoin on refresh: no ?name= param, but we have a saved name in localStorage
  useEffect(() => {
    if (!nameFromUrl && !hasJoined && state.isConnected) {
      actions.rejoinGame(resolvedParams.gameId);
      setHasJoined(true);
    }
  }, [nameFromUrl, hasJoined, state.isConnected, resolvedParams.gameId, actions]);

  // Show results modal whenever new showdown results arrive
  useEffect(() => {
    if (state.showdownResults) setShowResultsModal(true);
  }, [state.showdownResults]);



  const myPlayer = state.players.find(p => p.id === socket?.id);
  // Spectator = folded with 0 chips (started the match broke). All-in players still have totalBet > 0 and are NOT spectators.
  const isSpectator = myPlayer && myPlayer.chipTotal === 0 && myPlayer.folded && state.phase !== 'lobby';

  // Loading state
  if (!state.isConnected) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-neutral-400">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-red-400">Error</h2>
          <p className="text-neutral-300">{state.error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // GAME OVER VIEW
  if (state.phase === 'game_over') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/30 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px]"></div>
        </div>

        <div className="z-10 w-full max-w-xl bg-neutral-900/80 backdrop-blur-md border border-amber-500/30 rounded-3xl p-10 shadow-2xl text-center space-y-6">
          <div className="text-6xl">👑</div>
          <h1 className="text-5xl font-black bg-gradient-to-br from-amber-300 to-amber-600 bg-clip-text text-transparent">
            GAME OVER
          </h1>
          <p className="text-neutral-400 text-lg">
            {state.gameOverWinner?.name || 'Unknown'} takes it all!
          </p>
          <div className="bg-neutral-950 border border-amber-500/20 rounded-2xl p-6">
            <p className="text-amber-400 text-sm font-bold uppercase tracking-wider mb-2">Tournament Champion</p>
            <p className="text-4xl font-black text-white">{state.gameOverWinner?.name}</p>
            <p className="text-neutral-500 mt-2">{state.matchHistory.length} matches played</p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // LOBBY VIEW
  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[128px]"></div>
        </div>

        <div className="z-10 w-full max-w-2xl bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold">Game Lobby</h1>
            <div className="flex items-center justify-center gap-3">
              <span className="text-neutral-400">Room Code:</span>
              <span className="font-mono text-2xl tracking-widest text-emerald-400 bg-emerald-400/10 px-4 py-1 rounded-lg border border-emerald-400/20">
                {state.gameId || resolvedParams.gameId}
              </span>
            </div>
          </div>

          <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800/50 mb-8">
            <h2 className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wider">
              Players ({state.players.length}/8)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {state.players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 bg-neutral-900 p-3 rounded-xl">
                  <div className={`w-3 h-3 rounded-full ${player.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium text-neutral-200">
                    {player.name}
                    {player.id === socket?.id && <span className="text-emerald-400 text-xs ml-1">(You)</span>}
                  </span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 8 - state.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 border border-dashed border-neutral-800 p-3 rounded-xl opacity-50">
                  <div className="w-3 h-3 rounded-full bg-neutral-800"></div>
                  <span className="font-medium text-neutral-600">Waiting...</span>
                </div>
              ))}
            </div>
          </div>

          {socket?.id === state.hostId ? (
            <button
              onClick={actions.startGame}
              disabled={state.players.length < 2}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
            </button>
          ) : (
            <div className="w-full bg-neutral-800 text-neutral-400 font-bold py-4 rounded-xl text-center border border-neutral-700">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // GAME BOARD VIEW
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-[120px]"></div>
      </div>



      {/* Header Info */}
      <div className="p-4 flex justify-between items-center z-10">
        <div className="flex gap-3 flex-wrap">
          <div className="bg-neutral-900/80 px-4 py-2 rounded-lg border border-neutral-800 text-sm">
            <span className="text-neutral-500">Room:</span> <span className="font-mono text-emerald-400">{state.gameId || resolvedParams.gameId}</span>
          </div>
          {state.matchNumber > 0 && (
            <div className="bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20 text-sm">
              <span className="text-amber-400 font-bold">Match #{state.matchNumber}</span>
            </div>
          )}
          <div className="bg-neutral-900/80 px-4 py-2 rounded-lg border border-neutral-800 text-sm">
            <span className="text-neutral-500">Phase:</span> <span className="text-amber-400 uppercase tracking-wider">{state.phase}</span>
          </div>
          {state.currentRound > 0 && (
            <div className="bg-neutral-900/80 px-4 py-2 rounded-lg border border-neutral-800 text-sm">
              <span className="text-neutral-500">Round:</span> <span className="text-neutral-200">{state.currentRound}/6</span>
            </div>
          )}
        </div>

        {/* Spectator Badge */}
        {isSpectator && (
          <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg text-sm text-red-400 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            SPECTATING
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-4 gap-4">
        
        {/* Left Side — Player Stats */}
        <div className="hidden lg:block flex-shrink-0 -ml-8 mr-4">
          <PlayerStats 
            player={myPlayer}
            currentBet={state.currentBet}
            matchHistory={state.matchHistory}
            players={state.players}
            pots={state.pots}
          />
        </div>

        {/* Hand Selection Modal */}
        {state.phase === 'hand_selection' && myPlayer && !myPlayer.folded && (
          <HandSelection
            communityCards={state.communityCards}
            myHand={state.myHand}
            onSubmit={actions.submitHandSelection}
          />
        )}

        {/* The Poker Table */}
        <div className="relative w-full max-w-5xl h-[600px] bg-emerald-950 rounded-[200px] border-[16px] border-neutral-800 shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
          
          {/* Table Felt Inner */}
          <div className="absolute inset-4 rounded-[180px] border border-emerald-800/30"></div>
          
          {/* Center Area (Community Cards & Pot) */}
          <div className="flex flex-col items-center gap-6">
            <PotDisplay 
              pots={state.pots}
              players={state.players}
              matchNumber={state.matchNumber}
              currentRound={state.currentRound}
            />
            <CommunityCards cards={state.communityCards} />
          </div>

          {/* Opponents (Positioned around table — hide spectators) */}
          {state.players
            .filter(p => p.id !== socket?.id)
            .filter(p => !(p.chipTotal === 0 && p.folded && state.phase !== 'lobby'))
            .map((player, idx, arr) => {
            const total = arr.length;
            const positions = getOpponentPositions(total);
            const pos = positions[idx] || positions[0];

            return (
              <div key={player.id} className={pos.className}>
                <PlayerSeat 
                  player={player} 
                  isMe={false} 
                  isCurrentTurn={state.currentTurnId === player.id} 
                  foldedHand={state.foldedHands[player.id]}
                  position={pos.position}
                />
              </div>
            );
          })}

          {/* My Seat (Bottom Center) — hide if spectating */}
          {myPlayer && !isSpectator && (
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2">
              <PlayerSeat 
                player={myPlayer} 
                isMe={true} 
                isCurrentTurn={state.currentTurnId === socket?.id} 
                myHand={state.myHand}
                position="bottom"
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls Area */}
      {!isSpectator && (
        <BettingControls 
          myChips={state.myChips}
          actions={state.availableActions}
          isMyTurn={state.currentTurnId === socket?.id || state.availableActions.length > 0}
          phase={state.phase}
          onBet={actions.placeBet}
          onFold={actions.fold}
          onForceShowdown={actions.forceShowdown}
          onAllIn={actions.allIn}
          onDrawCard={actions.drawCard}
          onSkipDraw={actions.skipDraw}
        />
      )}

      {/* Spectator Controls */}
      {isSpectator && state.phase !== 'finished' && (
        <div className="bg-neutral-900 border-t border-neutral-800 p-4 sticky bottom-0 left-0 right-0 z-50">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-neutral-500 text-sm">You have no chips remaining. Watching the game...</p>
          </div>
        </div>
      )}

      {/* Match History Sidebar */}
      <MatchHistory 
        matches={state.matchHistory} 
        isOpen={historyOpen} 
        onToggle={() => setHistoryOpen(!historyOpen)} 
      />

      {/* Showdown Results Modal */}
      {state.phase === 'finished' && state.showdownResults && showResultsModal && (
        <ShowdownResults 
          results={state.showdownResults} 
          onNextMatch={() => {
            setShowResultsModal(false);
            actions.nextMatch();
          }}
        />
      )}
    </div>
  );
}

// Helper: Calculate positions for opponents around the table
function getOpponentPositions(count: number): { className: string; position: 'left' | 'right' | 'top' | 'top-left' | 'top-right' }[] {
  if (count === 1) {
    return [{ className: 'absolute -top-20 left-1/2 -translate-x-1/2', position: 'top' }];
  }
  if (count === 2) {
    return [
      { className: 'absolute top-1/2 -left-16 -translate-y-1/2', position: 'left' },
      { className: 'absolute top-1/2 -right-16 -translate-y-1/2', position: 'right' },
    ];
  }
  if (count === 3) {
    return [
      { className: 'absolute top-1/2 -left-16 -translate-y-1/2', position: 'left' },
      { className: 'absolute -top-20 left-1/2 -translate-x-1/2', position: 'top' },
      { className: 'absolute top-1/2 -right-16 -translate-y-1/2', position: 'right' },
    ];
  }
  // 4+
  return [
    { className: 'absolute top-1/2 -left-16 -translate-y-1/2', position: 'left' },
    { className: 'absolute -top-20 left-1/3 -translate-x-1/2', position: 'top-left' },
    { className: 'absolute -top-20 left-2/3 -translate-x-1/2', position: 'top-right' },
    { className: 'absolute top-1/2 -right-16 -translate-y-1/2', position: 'right' },
    { className: 'absolute top-1/4 -left-16', position: 'left' },
    { className: 'absolute top-1/4 -right-16', position: 'right' },
    { className: 'absolute top-3/4 -left-16', position: 'left' },
  ];
}
