import React, { useState, useEffect } from 'react';
import { GameRoom, Player } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { Check, X, Flame, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { formatScore, formatTimeTaken } from '../../utils/scoring';
import { PlayerPostGameSummary } from './PlayerPostGameSummary';

interface PlayerGameProps {
  room: GameRoom;
  player: Player;
  onSubmitAnswer: (optionIndex: number) => boolean;
  isConnected?: boolean;
  answerError?: string | null;
  onLeave: () => void;
}

const OPTION_STYLES = [
  {
    bg: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 border-rose-500',
    selectedBg: 'bg-rose-700 border-rose-300 ring-4 ring-rose-400/40',
    shape: '▲',
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-blue-500',
    selectedBg: 'bg-blue-700 border-blue-300 ring-4 ring-blue-400/40',
    shape: '◆',
  },
  {
    bg: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border-amber-500',
    selectedBg: 'bg-amber-700 border-amber-300 ring-4 ring-amber-400/40',
    shape: '●',
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-500',
    selectedBg: 'bg-emerald-700 border-emerald-300 ring-4 ring-emerald-400/40',
    shape: '■',
  },
];

export const PlayerGame: React.FC<PlayerGameProps> = ({
  room,
  player,
  onSubmitAnswer,
  isConnected = true,
  answerError,
  onLeave,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lockedTime, setLockedTime] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(room.timeLimit);
  const [podiumTab, setPodiumTab] = useState<'summary' | 'podium'>('summary');

  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  const myAnswer = room.answers[player.id];

  // Reset local state when a new question starts
  useEffect(() => {
    setSelectedOption(null);
    setLockedTime(null);
  }, [room.currentQuestionIndex, room.questionStartedAt]);

  useEffect(() => {
    if (answerError) { setSelectedOption(null); setLockedTime(null); }
  }, [answerError]);

  // Sync timer during QUESTION phase
  useEffect(() => {
    if (room.status !== 'QUESTION') return;

    const updateTimer = () => {
      const elapsed = Date.now() + (room.serverClockOffsetMs || 0) - room.questionStartedAt;
      const left = Math.max(0, room.timeLimit - elapsed / 1000);
      setSecondsRemaining(left);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [room.status, room.questionStartedAt, room.timeLimit, room.serverClockOffsetMs]);

  const handleSelectOption = (idx: number) => {
    if (!isConnected || secondsRemaining <= 0 || selectedOption !== null || myAnswer) return;
    if (!onSubmitAnswer(idx)) return;

    const timeTaken = Date.now() + (room.serverClockOffsetMs || 0) - room.questionStartedAt;
    setSelectedOption(idx);
    setLockedTime(timeTaken);

    sound.playSelect();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

  };

  // 1. LOBBY STATE
  if (room.status === 'LOBBY') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/50 flex items-center justify-center text-5xl shadow-xl shadow-indigo-500/10">
          {player.avatar}
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            ✓ You&apos;re Connected!
          </span>
          <h1 className="text-3xl font-black font-display text-white mt-1">
            {player.nickname}
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Look at the host screen! Game will start soon.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full text-xs text-slate-400 flex items-center justify-between">
          <span>Room PIN</span>
          <span className="font-mono font-bold text-white text-sm">{room.code}</span>
        </div>

        <button
          onClick={onLeave}
          className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          Leave Game
        </button>
      </div>
    );
  }

  // 2. ACTIVE QUESTION STATE
  if (room.status === 'QUESTION') {
    const hasAnswered = selectedOption !== null || myAnswer !== undefined;

    return (
      <div className="max-w-md mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Top Mini HUD */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Q{room.currentQuestionIndex + 1}</span>
            <span className="text-slate-400">of {room.quiz.questions.length}</span>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-bold tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.ceil(secondsRemaining)}s</span>
          </div>

          <div className="text-right">
            <span className="font-extrabold text-white tabular-nums">
              {formatScore(player.score)}
            </span>{' '}
            <span className="text-slate-400">pts</span>
          </div>
        </div>

        {/* Question Text & Optional Image */}
        {currentQ && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center flex flex-col gap-3">
            {currentQ.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-48 flex items-center justify-center">
                <img
                  src={currentQ.imageUrl}
                  alt="Question graphic"
                  className="max-h-48 w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <p className="text-base sm:text-lg font-bold text-white leading-snug">
              {currentQ.text}
            </p>
          </div>
        )}

        {/* Answer Status / Feedback */}
        {hasAnswered ? (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-pulse" />
            <h3 className="text-lg font-extrabold text-white">{myAnswer ? 'Answer Locked In!' : 'Sending answer…'}</h3>
            <p className="text-xs text-slate-400">
              {myAnswer ? 'Confirmed at ' : 'Selected at '}
              <strong className="text-amber-400 font-mono">
                {formatTimeTaken(lockedTime || myAnswer?.timeTakenMs || 1000)}
              </strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Waiting for remaining participants...
            </p>
          </div>
        ) : (
          <div className="text-center text-xs text-amber-400 font-medium">
            ⚡ Tap fast! The quicker you answer, the higher your score.
          </div>
        )}

        {answerError && <p role="alert" className="text-sm text-rose-300 text-center">{answerError}</p>}
        {!isConnected && <p role="status" className="text-sm text-amber-200 text-center">Reconnecting… Wait before answering.</p>}
        {/* 4 Big Mobile Touch Buttons */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ?.options.map((option, idx) => {
            const style = OPTION_STYLES[idx % OPTION_STYLES.length];
            const isChosen = selectedOption === idx || myAnswer?.optionIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                disabled={hasAnswered || !isConnected || secondsRemaining <= 0}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-2xl border text-white font-bold text-left flex items-center gap-3.5 shadow-lg transition-all active:scale-95 disabled:active:scale-100 ${
                  isChosen
                    ? style.selectedBg
                    : hasAnswered
                    ? 'opacity-40 bg-slate-800 border-slate-700'
                    : `${style.bg} cursor-pointer`
                }`}
              >
                <span className="w-10 h-10 rounded-xl bg-black/25 flex items-center justify-center text-lg font-bold shrink-0">
                  {style.shape}
                </span>
                <span className="text-base font-bold tracking-tight leading-snug flex-1">
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. REVEAL STATE (Result of this round)
  if (room.status === 'REVEAL') {
    const isCorrect = myAnswer?.isCorrect ?? false;
    const pointsEarned = myAnswer?.pointsEarned ?? 0;
    const timeTaken = myAnswer?.timeTakenMs ?? 0;

    return (
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-4 text-center">
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-xl flex flex-col items-center gap-3 ${
            isCorrect
              ? 'bg-emerald-950/60 border-emerald-500/60 text-white'
              : 'bg-rose-950/60 border-rose-500/60 text-white'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${
              isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            {isCorrect ? <Check className="w-8 h-8 stroke-[3]" /> : <X className="w-8 h-8" />}
          </div>

          <h2 className="text-2xl font-black font-display">
            {isCorrect ? 'CORRECT!' : 'INCORRECT!'}
          </h2>

          {isCorrect ? (
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold text-amber-400 tabular-nums">
                +{formatScore(pointsEarned)} pts
              </span>
              <span className="text-xs text-emerald-300">
                Speed: {formatTimeTaken(timeTaken)} · Faster answers scored higher
              </span>
            </div>
          ) : (
            <p className="text-xs text-rose-300">
              No points earned this round. Get ready for the next one!
            </p>
          )}

          {player.streak >= 2 && (
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 text-xs font-bold">
              <Flame className="w-4 h-4 fill-current" />
              <span>{player.streak}x Answer Streak Bonus!</span>
            </div>
          )}
        </div>

        {/* Current Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-300">
          <span>Your Total Score</span>
          <span className="text-lg font-black text-white tabular-nums">
            {formatScore(player.score)} pts
          </span>
        </div>
      </div>
    );
  }

  // 4. LEADERBOARD STATE
  if (room.status === 'LEADERBOARD') {
    const sorted = Object.values(room.players).sort((a, b) => b.score - a.score);
    const topFive = sorted.slice(0, 5);
    const isPlayerInTopFive = topFive.some((p) => p.id === player.id);

    return (
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center flex flex-col items-center gap-2 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-2xl">
            🏆
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Leaderboard · Round {room.currentQuestionIndex + 1} of {room.quiz.questions.length}
          </span>
          <h2 className="text-2xl font-black font-display text-white">
            {player.rank ? `You're in #${player.rank} Place!` : 'Leaderboard Updated'}
          </h2>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
            <span>
              Total Score: <strong className="text-amber-400 font-mono text-sm">{formatScore(player.score)}</strong>
            </span>
            {player.streak >= 2 && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" /> {player.streak}x Streak
              </span>
            )}
          </div>
        </div>

        {/* Live Top Standings List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5 shadow-lg">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Top Room Competitors</span>
            <span>Points</span>
          </div>
          {topFive.map((p, idx) => {
            const isMe = p.id === player.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  isMe
                    ? 'bg-indigo-600/30 border border-indigo-500/60 font-bold text-white'
                    : 'bg-slate-950/60 border border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                  <span className="text-base shrink-0">{p.avatar}</span>
                  <span className="truncate max-w-[130px] font-semibold text-white">
                    {p.nickname} {isMe && '(You)'}
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {formatScore(p.score)}
                </span>
              </div>
            );
          })}

          {!isPlayerInTopFive && (
            <>
              <div className="text-center text-slate-600 text-xs py-0.5">···</div>
              <div className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-indigo-600/20 border border-indigo-500/50 text-white font-bold">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 font-bold text-indigo-300 tabular-nums">#{player.rank || '-'}</span>
                  <span className="text-base shrink-0">{player.avatar}</span>
                  <span className="truncate max-w-[130px] font-semibold text-white">
                    {player.nickname} (You)
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {formatScore(player.score)}
                </span>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Get ready for the next round!
        </p>
      </div>
    );
  }

  // 5. PODIUM STATE (Final)
  if (room.status === 'PODIUM') {
    const isWinner = player.rank === 1;
    const isPodium = (player.rank ?? 99) <= 3;

    return (
      <div className="max-w-md mx-auto px-4 py-4 flex flex-col gap-3">
        {/* Top Tab Switcher */}
        <div className="flex items-center justify-center p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setPodiumTab('summary')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              podiumTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Summary
          </button>
          <button
            onClick={() => setPodiumTab('podium')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              podiumTab === 'podium'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Podium Standings
          </button>
        </div>

        {podiumTab === 'summary' ? (
          <PlayerPostGameSummary
            player={player}
            room={room}
            onViewPodium={() => setPodiumTab('podium')}
            onLeave={onLeave}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-xl">
            <div className="text-5xl">{isWinner ? '👑' : isPodium ? '🥇' : '🎉'}</div>

            <h2 className="text-2xl font-black font-display text-white">
              {isWinner ? 'Victory Champion!' : isPodium ? 'Podium Finish!' : 'Game Complete!'}
            </h2>

            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Final Place: #{player.rank || '-'}
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 w-full flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Final Points</span>
                <strong className="text-white text-sm tabular-nums">
                  {formatScore(player.score)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Highest Streak</span>
                <strong className="text-amber-400">{player.highestStreak}x</strong>
              </div>
            </div>

            <button
              onClick={() => setPodiumTab('summary')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Check My Performance Stats →
            </button>

            <button
              onClick={onLeave}
              className="w-full py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Leave Game
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};
