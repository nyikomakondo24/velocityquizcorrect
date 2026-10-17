/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useQuizSocket } from './hooks/useQuizSocket';
import { Quiz, GameRoom } from './types/quiz';
import { DEFAULT_QUIZZES } from './data/defaultQuizzes';
import { Navbar } from './components/Navbar';
const HomeHero = lazy(() => import('./components/HomeHero').then(module => ({ default: module.HomeHero })));
const HostLobby = lazy(() => import('./components/HostView/HostLobby').then(module => ({ default: module.HostLobby })));
const HostQuestion = lazy(() => import('./components/HostView/HostQuestion').then(module => ({ default: module.HostQuestion })));
const HostReveal = lazy(() => import('./components/HostView/HostReveal').then(module => ({ default: module.HostReveal })));
const HostLeaderboard = lazy(() => import('./components/HostView/HostLeaderboard').then(module => ({ default: module.HostLeaderboard })));
const HostPodium = lazy(() => import('./components/HostView/HostPodium').then(module => ({ default: module.HostPodium })));
import { PlayerJoin } from './components/PlayerView/PlayerJoin';
const PlayerGame = lazy(() => import('./components/PlayerView/PlayerGame').then(module => ({ default: module.PlayerGame })));
const QuizEditorModal = lazy(() => import('./components/QuizBuilder/QuizEditorModal').then(module => ({ default: module.QuizEditorModal })));
const DualSimulator = lazy(() => import('./components/DualSimulator').then(module => ({ default: module.DualSimulator })));
import { sound } from './utils/sound';

type ViewMode = 'home' | 'host' | 'player' | 'builder' | 'split';

export default function App() {
  const [view, setView] = useState<ViewMode>(() => new URLSearchParams(location.search).has('pin') ? 'player' : 'home');
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    try {
      const saved = localStorage.getItem('velocity_custom_quizzes');
      if (saved) {
        const parsed: Quiz[] = JSON.parse(saved);
        return [...parsed, ...DEFAULT_QUIZZES];
      }
    } catch {
      // fallback
    }
    return DEFAULT_QUIZZES;
  });

  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [initialJoinPin, setInitialJoinPin] = useState(() => new URLSearchParams(location.search).get('pin')?.toUpperCase() || '');

  const {
    room,
    player,
    leaveRoom,
    isConnected,
    isPending,
    role,
    answerError,
    connectionError,
    setConnectionError,
    sendMessage,
  } = useQuizSocket();

  // Restore the appropriate screen after a refresh or recovered connection.
  useEffect(() => {
    if (room && role) setView(current => current === 'split' && role === 'host' ? current : role === 'host' ? 'host' : 'player');
  }, [room?.code, role]);

  const handleHostQuiz = (quizToHost: Quiz) => {
    if (room) leaveRoom();
    sendMessage({
      type: 'HOST_CREATE_ROOM',
      quiz: quizToHost,
    });
    setView('host');
  };

  const handleJoinWithPin = (pin: string) => {
    setInitialJoinPin(pin.toUpperCase());
    setView('player');
  };

  const handlePlayerJoin = (roomCode: string, nickname: string, avatar: string) => {
    setConnectionError(null);
    sendMessage({
      type: 'PLAYER_JOIN',
      roomCode,
      nickname,
      avatar,
    });
  };

  const handlePlayerSubmitAnswer = (optionIndex: number) => {
    if (!room || !player) return false;
    return sendMessage({
      type: 'PLAYER_SUBMIT_ANSWER',
      roomCode: room.code,
      playerId: player.id,
      questionId: room.quiz.questions[room.currentQuestionIndex]?.id,
      optionIndex,
      clientTimestamp: Date.now(),
    });
  };

  const handleSaveQuiz = (newQuiz: Quiz) => {
    const updated = [newQuiz, ...quizzes.filter((q) => q.id !== newQuiz.id)];
    setQuizzes(updated);
    try {
      const customOnly = updated.filter((q) => q.isCustom);
      localStorage.setItem('velocity_custom_quizzes', JSON.stringify(customOnly));
    } catch {
      setConnectionError('The quiz is available for this session, but this browser could not save it. Keep your original spreadsheet as a backup.');
    }
    setEditingQuiz(null);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      <Navbar currentView={view} onNavigate={setView} />

      {(!isConnected || isPending || connectionError) && (
        <div role="status" aria-live="polite" className="px-4 py-3 text-center text-sm bg-slate-900 border-b border-slate-700 text-amber-200">
          {connectionError || (!isConnected
            ? 'Connecting to the quiz server… Your place will be restored after reconnecting.'
            : isPending ? 'Waiting for the server to confirm…' : '')}
        </div>
      )}
      <Suspense fallback={<div role="status" className="p-12 text-center text-slate-300">Loading quiz screen…</div>}>
      <main className="flex-1 w-full pb-16">
        {/* VIEW: HOME OVERVIEW */}
        {view === 'home' && (
          <HomeHero
            quizzes={quizzes}
            onHostQuiz={handleHostQuiz}
            onJoinWithPin={handleJoinWithPin}
            onCreateQuiz={() => {
              setEditingQuiz(null);
              setView('builder');
            }}
          />
        )}

        {/* VIEW: HOST ARENA */}
        {view === 'host' && (
          <div className="w-full">
            {!room ? (
              <div className="max-w-md mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-3xl">
                  ⚡
                </div>
                <h2 className="text-2xl font-bold font-display text-white">Select a Quiz to Host</h2>
                <p className="text-xs text-slate-400">
                  Pick any pre-loaded quiz or your custom quiz to launch a live room with a room PIN code for up to 60 players.
                </p>
                <div className="flex flex-col gap-2.5 w-full mt-4">
                  {quizzes.slice(0, 3).map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleHostQuiz(q)}
                      className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{q.title}</p>
                        <p className="text-xs text-slate-400">{q.questions.length} Questions</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">Launch →</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {room.status === 'LOBBY' && (
                  <HostLobby
                    room={room}
                    onStartGame={() =>
                      sendMessage({ type: 'HOST_START_GAME', roomCode: room.code })
                    }
                    onAddBots={(count) =>
                      sendMessage({ type: 'HOST_ADD_BOTS', roomCode: room.code, count })
                    }
                    onRemoveBots={() =>
                      sendMessage({ type: 'HOST_REMOVE_BOTS', roomCode: room.code })
                    }
                    onKickPlayer={(playerId) =>
                      sendMessage({ type: 'HOST_KICK_PLAYER', roomCode: room.code, playerId })
                    }
                  />
                )}

                {room.status === 'QUESTION' && (
                  <HostQuestion
                    room={room}
                    onRevealQuestion={() =>
                      sendMessage({ type: 'HOST_REVEAL_QUESTION', roomCode: room.code })
                    }
                  />
                )}

                {room.status === 'REVEAL' && (
                  <HostReveal
                    room={room}
                    onShowLeaderboard={() =>
                      sendMessage({ type: 'HOST_SHOW_LEADERBOARD', roomCode: room.code })
                    }
                  />
                )}

                {room.status === 'LEADERBOARD' && (
                  <HostLeaderboard
                    room={room}
                    onNextQuestion={() =>
                      sendMessage({ type: 'HOST_NEXT_QUESTION', roomCode: room.code })
                    }
                    onShowPodium={() =>
                      sendMessage({ type: 'HOST_SHOW_PODIUM', roomCode: room.code })
                    }
                  />
                )}

                {room.status === 'PODIUM' && (
                  <HostPodium
                    room={room}
                    onRestart={() =>
                      sendMessage({ type: 'HOST_RESTART_GAME', roomCode: room.code })
                    }
                    onNewQuiz={() => {
                      leaveRoom();
                      setView('home');
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW: PLAYER CONTROLLER */}
        {view === 'player' && (
          <div className="w-full">
            {player && room ? (
              <PlayerGame
                room={room}
                player={player}
                onSubmitAnswer={handlePlayerSubmitAnswer}
                isConnected={isConnected}
                answerError={answerError}
                onLeave={() => {
                  leaveRoom();
                  setView('home');
                }}
              />
            ) : (
              <PlayerJoin
                initialPin={initialJoinPin}
                onJoin={handlePlayerJoin}
                error={connectionError}
                isPending={isPending}
              />
            )}
          </div>
        )}

        {/* VIEW: QUIZ BUILDER & CREATOR */}
        {view === 'builder' && (
          <QuizEditorModal
            initialQuiz={editingQuiz}
            onSaveQuiz={handleSaveQuiz}
            onCancel={() => setView('home')}
          />
        )}

        {/* VIEW: DUAL SIMULATOR (Host + Player side by side for instant 1-screen testing) */}
        {view === 'split' && (
          <div className="w-full">
            {!room ? (
              <div className="max-w-md mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold font-display text-white">
                  Launch Dual Simulator
                </h2>
                <p className="text-xs text-slate-400">
                  Dual simulator opens the Host Arena and a Player Controller in a split screen. Pick a quiz to start:
                </p>
                <button
                  onClick={() => { handleHostQuiz(quizzes[0]); setView('split'); }}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Start Simulator with &quot;{quizzes[0]?.title}&quot;
                </button>
              </div>
            ) : (
              <DualSimulator
                room={room}
                player={player}
                onStartGame={() =>
                  sendMessage({ type: 'HOST_START_GAME', roomCode: room.code })
                }
                onAddBots={(count) =>
                  sendMessage({ type: 'HOST_ADD_BOTS', roomCode: room.code, count })
                }
                onRemoveBots={() =>
                  sendMessage({ type: 'HOST_REMOVE_BOTS', roomCode: room.code })
                }
                onKickPlayer={(playerId) =>
                  sendMessage({ type: 'HOST_KICK_PLAYER', roomCode: room.code, playerId })
                }
                onRevealQuestion={() =>
                  sendMessage({ type: 'HOST_REVEAL_QUESTION', roomCode: room.code })
                }
                onShowLeaderboard={() =>
                  sendMessage({ type: 'HOST_SHOW_LEADERBOARD', roomCode: room.code })
                }
                onNextQuestion={() =>
                  sendMessage({ type: 'HOST_NEXT_QUESTION', roomCode: room.code })
                }
                onShowPodium={() =>
                  sendMessage({ type: 'HOST_SHOW_PODIUM', roomCode: room.code })
                }
                onRestart={() =>
                  sendMessage({ type: 'HOST_RESTART_GAME', roomCode: room.code })
                }
                onNewQuiz={() => {
                  leaveRoom();
                  setView('home');
                }}
                onPlayerJoin={handlePlayerJoin}
                onSubmitAnswer={handlePlayerSubmitAnswer}
                onPlayerLeave={leaveRoom}
              />
            )}
          </div>
        )}
      </main>
      </Suspense>
    </div>
  );
}
