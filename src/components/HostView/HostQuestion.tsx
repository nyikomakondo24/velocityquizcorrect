import React, { useEffect, useState, useRef } from 'react';
import { GameRoom } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { Users, FastForward, Clock, QrCode } from 'lucide-react';
import { JoinQRCode } from '../JoinQRCode';

interface HostQuestionProps {
  room: GameRoom;
  onRevealQuestion: () => void;
}

const OPTION_STYLES = [
  {
    bg: 'bg-rose-600/90 hover:bg-rose-600 border-rose-500/50',
    shape: '▲',
    shapeBg: 'bg-rose-900/60 text-rose-200',
    name: 'Red',
  },
  {
    bg: 'bg-blue-600/90 hover:bg-blue-600 border-blue-500/50',
    shape: '◆',
    shapeBg: 'bg-blue-900/60 text-blue-200',
    name: 'Blue',
  },
  {
    bg: 'bg-amber-600/90 hover:bg-amber-600 border-amber-500/50',
    shape: '●',
    shapeBg: 'bg-amber-900/60 text-amber-200',
    name: 'Yellow',
  },
  {
    bg: 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/50',
    shape: '■',
    shapeBg: 'bg-emerald-900/60 text-emerald-200',
    name: 'Green',
  },
];

export const HostQuestion: React.FC<HostQuestionProps> = ({ room, onRevealQuestion }) => {
  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  const timeLimit = currentQ?.timeLimit || 15;
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const totalPlayers = Object.keys(room.players).length;
  const answeredCount = Object.keys(room.answers).length;
  const answeredPercentage = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  const [showQR, setShowQR] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Synchronize countdown based on room.questionStartedAt
    const interval = setInterval(() => {
      const elapsedMs = Date.now() + (room.serverClockOffsetMs || 0) - room.questionStartedAt;
      const remainingSec = Math.max(0, timeLimit - elapsedMs / 1000);
      setTimeLeft(remainingSec);

      // Audio feedback
      if (remainingSec <= 5 && remainingSec > 0.1) {
        sound.playUrgentTick();
      } else if (remainingSec > 5) {
        sound.playTick();
      }

      if (remainingSec <= 0) {
        clearInterval(interval);
        // The server reveals on expiry; the host button is only for ending early.
      }
    }, 250);

    timerRef.current = interval;

    return () => clearInterval(interval);
  }, [room.questionStartedAt, timeLimit, room.serverClockOffsetMs]);

  if (!currentQ) return null;

  const progressFraction = Math.max(0, timeLeft / timeLimit);
  const isUrgent = timeLeft <= 5;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Header: Question Counter & Timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold uppercase tracking-wider">
            Question {room.currentQuestionIndex + 1} of {room.quiz.questions.length}
          </span>
          {currentQ.category && (
            <span className="text-xs text-slate-400">· {currentQ.category}</span>
          )}
        </div>

        {/* Live Incoming Answers Count */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="font-bold tabular-nums">
              {answeredCount} / {totalPlayers} Answered
            </span>
          </div>

          {/* Quick QR Code for Late Joiners */}
          <button
            onClick={() => {
              sound.playSelect();
              setShowQR(!showQR);
            }}
            title="Show Room Join QR Code"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">QR PIN</span>
          </button>

          {/* Skip Button for Host */}
          <button
            onClick={() => {
              sound.playSelect();
              // The server reveals on expiry; the host button is only for ending early.
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>End Question</span>
          </button>
        </div>
      </div>

      {/* Floating QR Modal if open */}
      {showQR && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <JoinQRCode roomCode={room.code} size={220} />
          </div>
        </div>
      )}

      {/* Main Question Display */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
        {/* Full-width countdown timer bar at top of question card */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-slate-800">
          <div
            className={`h-full transition-all duration-200 ease-linear ${
              isUrgent ? 'bg-rose-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progressFraction * 100}%` }}
          />
        </div>

        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          {currentQ.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 max-h-60 shadow-lg">
              <img
                src={currentQ.imageUrl}
                alt="Question visual clue"
                className="max-h-60 w-auto object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight [text-wrap:balance]">
            {currentQ.text}
          </h2>
        </div>

        {/* Big Circular Timer Center Badge */}
        <div className="mt-6 flex items-center gap-2">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center font-display font-black text-2xl tabular-nums shadow-lg border-2 transition-colors ${
              isUrgent
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
            }`}
          >
            {Math.ceil(timeLeft)}
          </div>
          <div className="text-left text-xs text-slate-400">
            <div className="flex items-center gap-1 text-slate-300 font-semibold">
              <Clock className="w-3 h-3" />
              <span>Seconds Left</span>
            </div>
            <p className="text-[11px] text-amber-400">Faster answers = More points</p>
          </div>
        </div>
      </div>

      {/* 4 Choices Grid (Full Width, Vibrant Colors & Shapes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentQ.options.map((option, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];
          return (
            <div
              key={idx}
              className={`${style.bg} border rounded-2xl p-5 sm:p-6 text-white flex items-center gap-4 shadow-lg transition-transform`}
            >
              <div
                className={`w-12 h-12 rounded-xl ${style.shapeBg} flex items-center justify-center text-xl font-bold shrink-0 shadow-inner`}
              >
                {style.shape}
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white/95 leading-snug">
                {option}
              </span>
            </div>
          );
        })}
      </div>

      {/* Answer Progress Indicator */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400">Submissions received</span>
        <div className="flex-1 max-w-md bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${answeredPercentage}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-200 tabular-nums">
          {Math.round(answeredPercentage)}%
        </span>
      </div>
    </div>
  );
};
