import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sound } from '../utils/sound';

interface NavbarProps {
  currentView: 'home' | 'host' | 'player' | 'builder' | 'split';
  onNavigate: (view: 'home' | 'host' | 'player' | 'builder' | 'split') => void;
  onOpenQuickDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  useEffect(() => {
    setIsMuted(sound.isMuted());
  }, []);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      sound.playTick();
    }
  };

  return (
    <header className="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:gap-8">
        {/* Zone 1: Brand title, single line */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left text-lg sm:text-xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-violet-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-base">
            ⚡
          </span>
          <span className="font-display hidden min-[360px]:inline">VelocityQuiz</span>
        </button>

        {/* Zone 2: 4-5 nav links, 1-2 word labels, single line */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
              currentView === 'home' ? 'text-indigo-400' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('host')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
              currentView === 'host' ? 'text-indigo-400' : ''
            }`}
          >
            Host Arena
          </button>
          <button
            onClick={() => onNavigate('player')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
              currentView === 'player' ? 'text-indigo-400' : ''
            }`}
          >
            Join Game
          </button>
          <button
            onClick={() => onNavigate('builder')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
              currentView === 'builder' ? 'text-indigo-400' : ''
            }`}
          >
            Quiz Creator
          </button>
          <button
            onClick={() => onNavigate('split')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
              currentView === 'split' ? 'text-indigo-400' : ''
            }`}
          >
            Dual Simulator
          </button>
        </nav>

        {/* Zone 3: 1 primary action + sound toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute game sounds' : 'Mute game sounds'}
            title={isMuted ? 'Sound muted' : 'Sound active'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors border border-slate-800"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {currentView !== 'host' ? (
            <button
              onClick={() => onNavigate('host')}
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-lg shadow-sm shadow-indigo-600/30 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Host Live Game</span><span className="sm:hidden">Host</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('player')}
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg border border-slate-700 transition-all whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">Join As Player</span><span className="sm:hidden">Join</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
