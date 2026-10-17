import React, { useState } from 'react';
import { Quiz } from '../types/quiz';
import { Play, Plus, Zap, Users, Trophy, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { sound } from '../utils/sound';
import heroImage from '../assets/images/quiz-hero.webp';

interface HomeHeroProps {
  quizzes: Quiz[];
  onHostQuiz: (quiz: Quiz) => void;
  onJoinWithPin: (pin: string) => void;
  onCreateQuiz: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  quizzes,
  onHostQuiz,
  onJoinWithPin,
  onCreateQuiz,
}) => {
  const [quickPin, setQuickPin] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPin.trim()) {
      sound.playSelect();
      onJoinWithPin(quickPin.trim().toUpperCase());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-12">
      {/* Hero Section with Cinematic Arena Banner & Anti-Slop Discipline */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            width={1376}
            height={768}
            decoding="async"
            alt="VelocityQuiz Live Championship Arena"
            className="w-full h-full object-cover opacity-25 filter brightness-90"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-12 lg:p-16 flex flex-col items-center text-center max-w-4xl mx-auto gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Speed-Scaled Real-Time Multiplayer Quiz Arena</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display text-white tracking-tight leading-tight [text-wrap:balance]">
            The faster you answer, <br className="hidden sm:inline" />
            the more points you score.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Host live high-energy multiplayer quizzes for up to 60 players. Featuring instant speed bonuses, streak multipliers, live response histograms, and Olympic podium celebrations.
          </p>

          {/* Quick Actions: Host or Join */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-2">
            <button
              onClick={() => {
                sound.playSelect();
                onHostQuiz(quizzes[0]);
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Host Instant Game</span>
            </button>

            {/* Quick PIN Join Form */}
            <form onSubmit={handleQuickJoin} className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN"
                maxLength={8}
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value.toUpperCase())}
                className="bg-slate-950/90 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 tracking-wider text-center focus:outline-none focus:border-indigo-400 w-full sm:w-44"
              />
              <button
                type="submit"
                disabled={!quickPin.trim()}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 border border-slate-700 text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Key Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 max-w-3xl">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dynamic Speed Bonus</p>
                <p className="text-[11px] text-slate-400">Up to 50% extra points for reflex answers</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Up to 60 Competitors</p>
                <p className="text-[11px] text-slate-400">Real-time room sync + 1-click crowd test</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Live Podium & Stats</p>
                <p className="text-[11px] text-slate-400">Olympic steps, confetti & speed awards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Library Header & Cards */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-white">
              Available Quiz Roster
            </h2>
            <p className="text-xs text-slate-400">
              Select any pre-made quiz or create custom timed rounds for your audience
            </p>
          </div>

          <button
            onClick={() => {
              sound.playSelect();
              onCreateQuiz();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Create Custom Quiz</span>
          </button>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-indigo-500/5 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    {quiz.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    {quiz.questions.length} Questions · ~{quiz.questions[0]?.timeLimit || 12}s each
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {quiz.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {quiz.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs font-semibold text-slate-500">
                  {quiz.isCustom ? 'Custom Created' : 'Official Preset'}
                </span>

                <button
                  onClick={() => {
                    sound.playSelect();
                    onHostQuiz(quiz);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Host Arena</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
