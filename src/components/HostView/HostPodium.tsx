import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameRoom, Player } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { Trophy, RotateCcw, Zap, Flame, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { formatScore, formatTimeTaken } from '../../utils/scoring';

interface HostPodiumProps {
  room: GameRoom;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export const HostPodium: React.FC<HostPodiumProps> = ({ room, onRestart, onNewQuiz }) => {
  const [showFullTable, setShowFullTable] = useState(false);

  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  // Find Speed Demon Award (fastest average answer time with at least 1 answer)
  const playersWithAnswers = sortedPlayers.filter((p) => p.answersCount > 0);
  const speedDemon = [...playersWithAnswers].sort((a, b) => {
    const avgA = a.totalAnswerTimeMs / a.answersCount;
    const avgB = b.totalAnswerTimeMs / b.answersCount;
    return avgA - avgB;
  })[0];

  // Find Streak Champion
  const streakMaster = [...sortedPlayers].sort(
    (a, b) => b.highestStreak - a.highestStreak
  )[0];

  const triggerCelebrationConfetti = () => {
    // 1. Double Cannon blast from sides
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.75 },
      colors: ['#6366f1', '#eab308', '#10b981', '#f43f5e', '#38bdf8'],
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.75 },
      colors: ['#6366f1', '#eab308', '#10b981', '#f43f5e', '#38bdf8'],
    });

    // 2. High-altitude Golden fireworks burst above winner's crown
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { x: 0.5, y: 0.35 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff'],
        shapes: ['circle', 'square'],
        scalar: 1.2,
      });
    }, 400);

    // 3. Trailing celebration shower
    const end = Date.now() + 3500;
    const interval: NodeJS.Timeout = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: ['#6366f1', '#eab308', '#10b981', '#f43f5e'],
      });
    }, 300);
  };

  useEffect(() => {
    sound.playFanfare();
    triggerCelebrationConfetti();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Top Victory Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Championship Grand Finale
        </span>
        <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
          Quiz Victory Podium
        </h1>
        <p className="text-sm text-slate-400">
          {room.quiz.title} · {sortedPlayers.length} Total Competitors
        </p>
      </div>

      {/* 3D Olympic Podium Steps */}
      <div className="pt-12 pb-6 px-4 flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto w-full">
        {/* 2nd Place (Silver) */}
        {second ? (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-1">{second.avatar}</div>
            <p className="text-xs sm:text-sm font-bold text-white text-center truncate max-w-[100px]">
              {second.nickname}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mb-2 tabular-nums">
              {formatScore(second.score)} pts
            </p>
            <div className="w-full bg-slate-800 border-t-4 border-slate-300 rounded-t-xl h-36 flex flex-col items-center justify-start pt-3 shadow-lg">
              <span className="text-2xl font-black font-display text-slate-300">2</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Silver</span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* 1st Place (Gold Champion) */}
        {first && (
          <div className="flex-1 flex flex-col items-center relative -mt-8">
            <div className="absolute -top-10 text-3xl animate-bounce">👑</div>
            <div className="text-4xl mb-1">{first.avatar}</div>
            <p className="text-sm sm:text-base font-extrabold text-amber-300 text-center truncate max-w-[120px]">
              {first.nickname}
            </p>
            <p className="text-xs font-bold text-amber-400 mb-2 tabular-nums">
              {formatScore(first.score)} pts
            </p>
            <div className="w-full bg-gradient-to-b from-amber-500/20 to-slate-900 border-t-4 border-amber-400 rounded-t-xl h-48 flex flex-col items-center justify-start pt-3 shadow-2xl shadow-amber-500/10">
              <span className="text-3xl font-black font-display text-amber-400">1</span>
              <span className="text-[10px] uppercase font-black text-amber-300 tracking-wider">
                Winner
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {third ? (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-1">{third.avatar}</div>
            <p className="text-xs sm:text-sm font-bold text-white text-center truncate max-w-[100px]">
              {third.nickname}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mb-2 tabular-nums">
              {formatScore(third.score)} pts
            </p>
            <div className="w-full bg-slate-800 border-t-4 border-amber-700 rounded-t-xl h-28 flex flex-col items-center justify-start pt-3 shadow-lg">
              <span className="text-2xl font-black font-display text-amber-700">3</span>
              <span className="text-[10px] uppercase font-bold text-amber-800">Bronze</span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Special Category Awards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {speedDemon && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Speed Demon Trophy
              </span>
              <p className="text-sm font-bold text-white">
                <span className="mr-1">{speedDemon.avatar}</span> {speedDemon.nickname}
              </p>
              <p className="text-xs text-slate-400">
                Avg reaction time:{' '}
                <strong className="text-amber-300 font-mono">
                  {formatTimeTaken(speedDemon.totalAnswerTimeMs / speedDemon.answersCount)}
                </strong>
              </p>
            </div>
          </div>
        )}

        {streakMaster && streakMaster.highestStreak > 1 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Streak Master Trophy
              </span>
              <p className="text-sm font-bold text-white">
                <span className="mr-1">{streakMaster.avatar}</span> {streakMaster.nickname}
              </p>
              <p className="text-xs text-slate-400">
                Highest streak:{' '}
                <strong className="text-rose-400 font-mono">
                  {streakMaster.highestStreak} in a row
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Rankings Drawer for Up to 60 Players */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowFullTable(!showFullTable)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Complete Arena Rankings ({sortedPlayers.length} Players)
            </span>
          </div>
          {showFullTable ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showFullTable && (
          <div className="border-t border-slate-800 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Rank</th>
                  <th className="py-2.5 px-4">Player</th>
                  <th className="py-2.5 px-4 text-right">Avg Time</th>
                  <th className="py-2.5 px-4 text-right">Max Streak</th>
                  <th className="py-2.5 px-4 text-right">Final Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedPlayers.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-bold tabular-nums">#{idx + 1}</td>
                    <td className="py-2 px-4 font-medium flex items-center gap-1.5">
                      <span>{p.avatar}</span>
                      <span className="truncate max-w-[140px] text-white">{p.nickname}</span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-400">
                      {p.answersCount > 0
                        ? formatTimeTaken(p.totalAnswerTimeMs / p.answersCount)
                        : '-'}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-slate-400">
                      {p.highestStreak}x
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-white tabular-nums">
                      {formatScore(p.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => {
            sound.playSelect();
            triggerCelebrationConfetti();
          }}
          className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Trigger Confetti Blast</span>
        </button>

        <button
          onClick={() => {
            sound.playSelect();
            onRestart();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again with Same Roster</span>
        </button>

        <button
          onClick={() => {
            sound.playSelect();
            onNewQuiz();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Choose Another Quiz</span>
        </button>
      </div>
    </div>
  );
};
