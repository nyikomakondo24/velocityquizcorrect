import React from 'react';
import { GameRoom, Player } from '../../types/quiz';
import { formatScore, formatTimeTaken } from '../../utils/scoring';
import {
  Trophy,
  Zap,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PlayerPostGameSummaryProps {
  player: Player;
  room: GameRoom;
  onViewPodium?: () => void;
  onLeave: () => void;
}

export const PlayerPostGameSummary: React.FC<PlayerPostGameSummaryProps> = ({
  player,
  room,
  onViewPodium,
  onLeave,
}) => {
  const totalQuestions = room.quiz.questions.length;
  const answeredCount = player.answersCount || 1;
  const correctCount = player.correctAnswersCount || 0;

  // Player metrics
  const playerAccuracy = Math.round((correctCount / Math.max(1, answeredCount)) * 100);
  const playerAvgTimeMs =
    answeredCount > 0 ? Math.round(player.totalAnswerTimeMs / answeredCount) : 0;
  const playerScore = player.score;

  // Room average metrics (server computed or fallback from players)
  const roomAverages = room.roomAverages || (() => {
    const all = Object.values(room.players);
    const n = all.length || 1;
    const avgScore = Math.round(all.reduce((s, p) => s + p.score, 0) / n);
    const totalAns = all.reduce((s, p) => s + p.answersCount, 0) || 1;
    const totalCorr = all.reduce((s, p) => s + (p.correctAnswersCount || 0), 0);
    const avgAcc = Math.round((totalCorr / totalAns) * 100);
    const totalTime = all.reduce((s, p) => s + p.totalAnswerTimeMs, 0);
    const avgTime = Math.round(totalTime / totalAns);
    return {
      avgScore,
      avgAccuracy: avgAcc,
      avgResponseTimeMs: avgTime,
    };
  })();

  const roomAccuracy = roomAverages.avgAccuracy;
  const roomAvgTimeMs = roomAverages.avgResponseTimeMs;
  const roomAvgScore = roomAverages.avgScore;

  // Speed comparison
  const speedDiffMs = roomAvgTimeMs - playerAvgTimeMs;
  const isFaster = speedDiffMs > 0;
  const speedPercent =
    roomAvgTimeMs > 0 ? Math.round(Math.abs(speedDiffMs / roomAvgTimeMs) * 100) : 0;

  // Score comparison
  const scoreDiff = playerScore - roomAvgScore;
  const isScoreAbove = scoreDiff >= 0;

  // Performance tier
  let performanceTier = 'A Tier';
  let tierColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
  if (player.rank === 1) {
    performanceTier = 'Championship Tier 👑';
    tierColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (playerAccuracy >= 80 && isFaster) {
    performanceTier = 'S Tier (Elite Speedster)';
    tierColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  } else if (playerAccuracy >= 60) {
    performanceTier = 'A Tier (Sharp Reflexes)';
    tierColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
  } else {
    performanceTier = 'B Tier (Good Effort)';
    tierColor = 'text-slate-300 bg-slate-800 border-slate-700';
  }

  const history = player.answerHistory || [];

  return (
    <div className="max-w-md mx-auto px-4 py-4 flex flex-col gap-5 animate-fade-in">
      {/* Hero Performance Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-4xl shadow-inner">
          {player.avatar}
        </div>

        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${tierColor}`}>
            {performanceTier}
          </span>
          <h2 className="text-2xl font-black font-display text-white mt-1.5">
            {player.nickname}
          </h2>
          <p className="text-xs text-slate-400">
            {player.rank ? `Rank #${player.rank} of ${Object.keys(room.players).length} competitors` : 'Game Finished'}
          </p>
        </div>

        <div className="w-full bg-slate-950 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Score</span>
            <span className="text-xl font-black text-amber-400 font-display tabular-nums">
              {formatScore(playerScore)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Max Streak</span>
            <span className="text-xl font-black text-rose-400 font-display tabular-nums flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-current" />
              <span>{player.highestStreak}x</span>
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Metrics vs Room Average */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            Your Stats vs Room Average
          </span>
          <span className="text-slate-500">Benchmark</span>
        </div>

        {/* 1. Accuracy Metric */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Quiz Accuracy</p>
                <p className="text-[11px] text-slate-400">
                  {correctCount} of {answeredCount} correct answers
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-400 font-display tabular-nums">
                {playerAccuracy}%
              </span>
              <span className="text-[11px] text-slate-500 block">
                Room avg: {roomAccuracy}%
              </span>
            </div>
          </div>

          {/* Dual Comparative Bar */}
          <div className="flex flex-col gap-1 text-[10px] text-slate-400 pt-1">
            <div className="flex items-center justify-between">
              <span>You ({playerAccuracy}%)</span>
              <span>Room ({roomAccuracy}%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, playerAccuracy)}%` }}
              />
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex opacity-60">
              <div
                className="bg-slate-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, roomAccuracy)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Speed Reaction Metric */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Average Response Time</p>
                <p className="text-[11px] text-slate-400">
                  {isFaster ? (
                    <span className="text-amber-400 font-semibold">
                      ⚡ {speedPercent}% faster than room average!
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Standard reaction tempo
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-amber-400 font-mono tabular-nums">
                {formatTimeTaken(playerAvgTimeMs)}
              </span>
              <span className="text-[11px] text-slate-500 block font-mono">
                Room avg: {formatTimeTaken(roomAvgTimeMs)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Total Points Metric */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Points Efficiency</p>
                <p className="text-[11px] text-slate-400">
                  {isScoreAbove ? (
                    <span className="text-indigo-300 font-semibold">
                      +{formatScore(scoreDiff)} pts above room average
                    </span>
                  ) : (
                    <span>{formatScore(Math.abs(scoreDiff))} pts from room average</span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-indigo-300 font-display tabular-nums">
                {formatScore(playerScore)}
              </span>
              <span className="text-[11px] text-slate-500 block tabular-nums">
                Room mean: {formatScore(roomAvgScore)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Audit Review */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider px-1">
            Question-by-Question Audit ({history.length} Rounds)
          </span>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {history.map((rec, idx) => (
              <div
                key={rec.questionId || idx}
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  rec.isCorrect
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {rec.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold truncate text-white">
                      Q{idx + 1}: {rec.questionText || `Question ${idx + 1}`}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Reaction: {formatTimeTaken(rec.timeTakenMs)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`font-mono font-bold tabular-nums ${rec.isCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {rec.isCorrect ? `+${formatScore(rec.pointsEarned)}` : '0'} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Navigation */}
      <div className="flex flex-col gap-2 pt-2">
        {onViewPodium && (
          <button
            onClick={onViewPodium}
            className="w-full py-3.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>View Podium Standings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onLeave}
          className="w-full py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 border border-slate-700 transition-colors"
        >
          Exit to Lobby
        </button>
      </div>
    </div>
  );
};
