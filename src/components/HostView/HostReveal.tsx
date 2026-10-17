import React, { useEffect } from 'react';
import { GameRoom } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { Check, X, ArrowRight, Zap, Info } from 'lucide-react';
import { formatTimeTaken } from '../../utils/scoring';

interface HostRevealProps {
  room: GameRoom;
  onShowLeaderboard: () => void;
}

const OPTION_STYLES = [
  { shape: '▲', colorName: 'Red', barBg: 'bg-rose-500' },
  { shape: '◆', colorName: 'Blue', barBg: 'bg-blue-500' },
  { shape: '●', colorName: 'Yellow', barBg: 'bg-amber-500' },
  { shape: '■', colorName: 'Green', barBg: 'bg-emerald-500' },
];

export const HostReveal: React.FC<HostRevealProps> = ({ room, onShowLeaderboard }) => {
  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  const answers = Object.values(room.answers);
  const totalAnswers = answers.length;
  const [secondsUntilLeaderboard, setSecondsUntilLeaderboard] = React.useState<number>(5);
  const [isPaused, setIsPaused] = React.useState<boolean>(false);

  useEffect(() => {
    sound.playCorrect();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setSecondsUntilLeaderboard((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onShowLeaderboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onShowLeaderboard]);

  if (!currentQ) return null;

  // Compute distribution
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  answers.forEach((ans) => {
    counts[ans.optionIndex] = (counts[ans.optionIndex] || 0) + 1;
  });

  // Find fastest correct answer
  const correctAnswers = Object.entries(room.answers)
    .filter(([_, a]) => a.isCorrect)
    .sort((a, b) => a[1].timeTakenMs - b[1].timeTakenMs);

  const fastestPlayerId = correctAnswers[0]?.[0];
  const fastestAnswerData = correctAnswers[0]?.[1];
  const fastestPlayer = fastestPlayerId ? room.players[fastestPlayerId] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Banner with Auto-Advance Progress */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-4">
          {currentQ.imageUrl && (
            <img
              src={currentQ.imageUrl}
              alt="Question graphic"
              className="w-16 h-16 rounded-xl object-contain bg-slate-950 border border-slate-700 shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Results Breakdown · Question {room.currentQuestionIndex + 1} of {room.quiz.questions.length}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {currentQ.text}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {isPaused ? 'Resume Timer' : `Leaderboard in ${secondsUntilLeaderboard}s`}
          </button>

          <button
            onClick={() => {
              sound.playSelect();
              onShowLeaderboard();
            }}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>View Leaderboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Speed Highlight Banner */}
      {fastestPlayer && fastestAnswerData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Fastest Reflex Spotlight
              </p>
              <p className="text-sm font-bold text-white">
                <span className="text-base mr-1">{fastestPlayer.avatar}</span>
                {fastestPlayer.nickname} answered correctly in just{' '}
                <strong className="text-amber-300 font-mono">
                  {formatTimeTaken(fastestAnswerData.timeTakenMs)}
                </strong>
                !
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Awarded</span>
            <p className="text-lg font-extrabold text-amber-400 tabular-nums">
              +{fastestAnswerData.pointsEarned} pts
            </p>
          </div>
        </div>
      )}

      {/* Answer Distribution & Reveal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentQ.options.map((option, idx) => {
          const isCorrect = idx === currentQ.correctOptionIndex;
          const count = counts[idx] || 0;
          const percentage = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];

          return (
            <div
              key={idx}
              className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all ${
                isCorrect
                  ? 'bg-emerald-950/60 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {style.shape}
                  </span>
                  <span className={`text-base font-bold ${isCorrect ? 'text-white' : 'text-slate-300'}`}>
                    {option}
                  </span>
                </div>

                {isCorrect ? (
                  <span className="p-1.5 rounded-full bg-emerald-500 text-white shrink-0 shadow-md">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-full bg-slate-800 text-slate-500 shrink-0">
                    <X className="w-4 h-4" />
                  </span>
                )}
              </div>

              {/* Vote Count Histogram Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{count} votes</span>
                  <span className="font-mono tabular-nums">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCorrect ? 'bg-emerald-500' : style.barBg
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation / Fact Box */}
      {currentQ.explanation && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Did you know?
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{currentQ.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
