import React from 'react';
import { GameRoom, Player } from '../types/quiz';
import { HostLobby } from './HostView/HostLobby';
import { HostQuestion } from './HostView/HostQuestion';
import { HostReveal } from './HostView/HostReveal';
import { HostLeaderboard } from './HostView/HostLeaderboard';
import { HostPodium } from './HostView/HostPodium';
import { PlayerGame } from './PlayerView/PlayerGame';
import { PlayerJoin } from './PlayerView/PlayerJoin';
import { useQuizSocket } from '../hooks/useQuizSocket';

interface DualSimulatorProps {
  room: GameRoom;
  player: Player | null;
  onStartGame: () => void;
  onAddBots: (count: number) => void;
  onRemoveBots: () => void;
  onKickPlayer: (playerId: string) => void;
  onRevealQuestion: () => void;
  onShowLeaderboard: () => void;
  onNextQuestion: () => void;
  onShowPodium: () => void;
  onRestart: () => void;
  onNewQuiz: () => void;
  onPlayerJoin: (pin: string, nickname: string, avatar: string) => void;
  onSubmitAnswer: (optionIndex: number) => boolean;
  onPlayerLeave: () => void;
}

export const DualSimulator: React.FC<DualSimulatorProps> = ({
  room,
  onStartGame,
  onAddBots,
  onRemoveBots,
  onKickPlayer,
  onRevealQuestion,
  onShowLeaderboard,
  onNextQuestion,
  onShowPodium,
  onRestart,
  onNewQuiz,
}) => {
  // The simulated participant has its own connection and credentials.
  const { player, room: playerRoom, isConnected, isPending, answerError, connectionError, sendMessage, leaveRoom } = useQuizSocket('velocity_simulator_session_v1');
  const onPlayerJoin = (pin: string, nickname: string, avatar: string) => {
    sendMessage({ type: 'PLAYER_JOIN', roomCode: pin, nickname, avatar });
  };
  const onSubmitAnswer = (optionIndex: number) => {
    if (!player || !playerRoom) return false;
    return sendMessage({ type: 'PLAYER_SUBMIT_ANSWER', roomCode: playerRoom.code, playerId: player.id,
      questionId: playerRoom.quiz.questions[playerRoom.currentQuestionIndex]?.id, optionIndex, clientTimestamp: Date.now() });
  };
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 flex flex-col gap-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">Dual Live Simulator Mode</span>
          <span className="text-slate-400 hidden sm:inline">
            · Host View (Left) synced with Player Controller (Right) via WebSockets
          </span>
        </div>
        <span className="font-mono text-indigo-400 font-bold">Room: {room.code}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Host Side (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-3 shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 mb-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Host Arena Screen (Projector / Stream)</span>
            <span className="text-indigo-400">{room.status}</span>
          </div>

          {room.status === 'LOBBY' && (
            <HostLobby
              room={room}
              onStartGame={onStartGame}
              onAddBots={onAddBots}
              onRemoveBots={onRemoveBots}
              onKickPlayer={onKickPlayer}
            />
          )}

          {room.status === 'QUESTION' && (
            <HostQuestion room={room} onRevealQuestion={onRevealQuestion} />
          )}

          {room.status === 'REVEAL' && (
            <HostReveal room={room} onShowLeaderboard={onShowLeaderboard} />
          )}

          {room.status === 'LEADERBOARD' && (
            <HostLeaderboard
              room={room}
              onNextQuestion={onNextQuestion}
              onShowPodium={onShowPodium}
            />
          )}

          {room.status === 'PODIUM' && (
            <HostPodium room={room} onRestart={onRestart} onNewQuiz={onNewQuiz} />
          )}
        </div>

        {/* Player Mobile Side (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-3 shadow-xl">
          <div className="px-3 py-1.5 mb-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Player Controller View (Mobile / Participant)</span>
            <span className="text-emerald-400">{player ? player.nickname : 'Unconnected'}</span>
          </div>

          {player ? (
            <PlayerGame
              room={playerRoom || room}
              player={player}
              isConnected={isConnected}
              answerError={answerError}
              onSubmitAnswer={onSubmitAnswer}
              onLeave={leaveRoom}
            />
          ) : (
            <PlayerJoin
              initialPin={room.code}
              onJoin={(pin, nick, av) => onPlayerJoin(pin, nick, av)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
