import React, { useState } from 'react';
import { Users, Play, Copy, Check, UserPlus, UserMinus, X, Zap } from 'lucide-react';
import { GameRoom } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { JoinQRCode } from '../JoinQRCode';

interface HostLobbyProps {
  room: GameRoom;
  onStartGame: () => void;
  onAddBots: (count: number) => void;
  onRemoveBots: () => void;
  onKickPlayer: (playerId: string) => void;
}

export const HostLobby: React.FC<HostLobbyProps> = ({
  room,
  onStartGame,
  onAddBots,
  onRemoveBots,
  onKickPlayer,
}) => {
  const [copied, setCopied] = useState(false);
  const playersList = Object.values(room.players);
  const totalCount = playersList.length;
  const botCount = playersList.filter((p) => p.isSimulated).length;
  const humanCount = totalCount - botCount;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    sound.playSelect();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinUrl = `${window.location.origin}?pin=${room.code}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    sound.playSelect();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Top Banner: Big PIN & Instructions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400 mb-1">
            Join at {window.location.host}
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white tabular-nums">
              {room.code}
            </h1>
            <button
              onClick={handleCopyCode}
              title="Copy PIN Code"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 active:scale-95"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>Room Code: {room.code}</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={handleCopyLink}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Copy Direct Join Link
            </button>
          </div>
        </div>

        {/* High-visibility QR Code for live room scanning */}
        <div className="shrink-0">
          <JoinQRCode roomCode={room.code} size={110} />
        </div>

        {/* Quiz Info & Start CTA */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="text-right hidden md:block">
            <h2 className="text-lg font-bold text-white">{room.quiz.title}</h2>
            <div className="text-xs text-slate-400 flex items-center gap-2 justify-end mt-0.5">
              <span>{room.quiz.questions.length} Questions</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Zap className="w-3 h-3" /> Speed-Scaled Points
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playSelect();
              onStartGame();
            }}
            disabled={totalCount === 0}
            className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95 whitespace-nowrap ${
              totalCount > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{totalCount === 0 ? 'Waiting for Players...' : `Start Game (${totalCount})`}</span>
          </button>
        </div>
      </div>

      {/* Capacity & Crowd Management Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tabular-nums">
                {totalCount} / {room.maxPlayers} Players Connected
              </span>
              {botCount > 0 && (
                <span className="text-xs text-slate-400">
                  ({humanCount} real, {botCount} simulated)
                </span>
              )}
            </div>
            <div className="w-48 bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalCount / room.maxPlayers) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bot / Crowd simulation buttons for testing up to 60 players */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1 hidden lg:inline">Simulate Crowd:</span>
          <button
            onClick={() => {
              sound.playSelect();
              onAddBots(5);
            }}
            disabled={totalCount >= room.maxPlayers}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+5 Bots</span>
          </button>
          <button
            onClick={() => {
              sound.playSelect();
              onAddBots(15);
            }}
            disabled={totalCount >= room.maxPlayers}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+15 Bots</span>
          </button>
          <button
            onClick={() => {
              sound.playSelect();
              onAddBots(60 - totalCount);
            }}
            disabled={totalCount >= room.maxPlayers}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fill to 60</span>
          </button>
          {botCount > 0 && (
            <button
              onClick={() => {
                sound.playSelect();
                onRemoveBots();
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1 active:scale-95"
            >
              <UserMinus className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Bots</span>
            </button>
          )}
        </div>
      </div>

      {/* Players Grid (Handles up to 60 people cleanly) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Lobby Roster ({totalCount} participants)</span>
          <span>Hover a player to kick</span>
        </div>

        {totalCount === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl animate-pulse">
              📱
            </div>
            <p className="text-base font-semibold text-slate-300">No players connected yet</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Ask participants to enter PIN <strong className="text-indigo-400">{room.code}</strong> on their device, or click &quot;+15 Bots&quot; above to simulate a crowd!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[500px] overflow-y-auto p-1">
            {playersList.map((p) => (
              <div
                key={p.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center gap-2.5 transition-all shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-base shrink-0 select-none">
                  {p.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-200 truncate">{p.nickname}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {p.isSimulated ? 'Simulated Bot' : 'Live Player'}
                  </p>
                </div>
                <button
                  onClick={() => onKickPlayer(p.id)}
                  title={`Kick ${p.nickname}`}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
