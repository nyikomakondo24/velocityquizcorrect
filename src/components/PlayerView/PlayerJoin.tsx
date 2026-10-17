import React, { useState } from 'react';
import { FUN_AVATARS } from '../../data/defaultQuizzes';
import { sound } from '../../utils/sound';
import { LogIn, AlertCircle } from 'lucide-react';

interface PlayerJoinProps {
  initialPin?: string;
  onJoin: (roomCode: string, nickname: string, avatar: string) => void;
  error?: string | null;
  isPending?: boolean;
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({ initialPin = '', onJoin, error, isPending = false }) => {
  const [pin, setPin] = useState(initialPin.toUpperCase());
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(FUN_AVATARS[0]);

  React.useEffect(() => {
    if (initialPin) {
      setPin(initialPin.toUpperCase());
    }
  }, [initialPin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !nickname.trim()) return;

    sound.playSelect();
    onJoin(pin.trim().toUpperCase(), nickname.trim(), selectedAvatar);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-400 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            ⚡
          </div>
          <h1 className="text-2xl font-black font-display text-white tracking-tight">
            Join Velocity Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fastest fingers score maximum points
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Room PIN Code
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="e.g. 792415"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-black tracking-widest text-white placeholder-slate-600 uppercase text-center focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              maxLength={16}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. TurboSpeedster"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Pick Your Avatar
            </label>
            <div className="grid grid-cols-6 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto">
              {FUN_AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => {
                    sound.playSelect();
                    setSelectedAvatar(av);
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                    selectedAvatar === av
                      ? 'bg-indigo-600 scale-110 shadow-md shadow-indigo-600/40 border border-indigo-400'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !pin.trim() || !nickname.trim()}
            className="mt-2 w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            <span>{isPending ? 'Connecting...' : 'Join Game Now'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
