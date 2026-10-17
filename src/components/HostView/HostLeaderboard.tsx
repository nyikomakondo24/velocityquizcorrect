import React from 'react';
import { GameRoom } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { Trophy, ArrowRight, Flame, Award } from 'lucide-react';
import { formatScore } from '../../utils/scoring';

interface HostLeaderboardProps {
  room: GameRoom;
  onNextQuestion: () => void;
  onShowPodium: () => void;
}

export const HostLeaderboard: React.FC<HostLeaderboardProps> = ({
  room,
  onNextQuestion,
  onShowPodium,
}) => {
  const isFinalQuestion = room.currentQuestionIndex >= room.quiz.questions.length - 1;

  // Sort players descending by score
  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);
  const topPlayers = sortedPlayers.slice(0, 8);

  const handleAdvance = () => {
    sound.playSelect();
    if (isFinalQuestion) {
      onShowPodium();
    } else {
      onNextQuestion();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-display text-white tracking-tight">
              Leaderboard Standings
            </h2>
            <p className="text-xs text-slate-400">
              Round {room.currentQuestionIndex + 1} of {room.quiz.questions.length} complete
            </p>
          </div>
        </div>

        <button
          onClick={handleAdvance}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <span>{isFinalQuestion ? 'Reveal Final Podium' : 'Next Question'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Leaderboard Cards */}
      <div className="flex flex-col gap-2.5">
        {topPlayers.map((player, idx) => {
          const isTopThree = idx < 3;
          const medalColors = [
            'bg-amber-400/20 text-amber-300 border-amber-400/40',
            'bg-slate-300/20 text-slate-200 border-slate-300/40',
            'bg-amber-700/20 text-amber-600 border-amber-700/40',
          ];

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isTopThree
                  ? 'bg-slate-900/90 border-slate-700 shadow-md'
                  : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Rank Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 border ${
                    isTopThree ? medalColors[idx] : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  #{idx + 1}
                </div>

                {/* Avatar & Name */}
                <span className="text-2xl shrink-0 select-none">{player.avatar}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base truncate">
                      {player.nickname}
                    </span>
                    {player.streak >= 2 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{player.streak}x</span>
                      </span>
                    )}
                  </div>
                  {player.lastAnswer && (
                    <span className="text-[11px] text-slate-400">
                      Last answer:{' '}
                      {player.lastAnswer.isCorrect ? (
                        <span className="text-emerald-400 font-semibold">
                          +{player.lastAnswer.pointsEarned} pts ({(player.lastAnswer.timeTakenMs / 1000).toFixed(2)}s)
                        </span>
                      ) : (
                        <span className="text-rose-400">0 pts</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Total Score */}
              <div className="text-right shrink-0">
                <span className="text-lg sm:text-xl font-black font-display text-white tabular-nums">
                  {formatScore(player.score)}
                </span>
                <span className="text-xs text-slate-500 block">points</span>
              </div>
            </div>
          );
        })}
      </div>

      {sortedPlayers.length > 8 && (
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 py-2">
          <Award className="w-3.5 h-3.5 text-slate-400" />
          <span>And {sortedPlayers.length - 8} more competitors in the arena</span>
        </div>
      )}
    </div>
  );
};
