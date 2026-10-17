import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Maximize2, X, Check, Copy } from 'lucide-react';
import { sound } from '../utils/sound';

interface JoinQRCodeProps {
  roomCode: string;
  size?: number;
  showExpandButton?: boolean;
}

export const JoinQRCode: React.FC<JoinQRCodeProps> = ({
  roomCode,
  size = 140,
  showExpandButton = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}?pin=${encodeURIComponent(roomCode)}`;

  useEffect(() => {
    let isCurrent = true;
    QRCode.toDataURL(joinUrl, {
      width: size * 2, // high DPI
      margin: 1,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isCurrent) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [joinUrl, size]);

  const handleCopy = () => {
    sound.playSelect();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Inline QR Badge */}
      <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-md border border-slate-200">
        {dataUrl ? (
          <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
            <img
              src={dataUrl}
              alt={`Scan QR code to join room ${roomCode}`}
              width={size}
              height={size}
              className="rounded-xl block"
            />
            {showExpandButton && (
              <div className="absolute inset-0 bg-slate-950/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                <Maximize2 className="w-4 h-4" />
                <span>Enlarge</span>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-slate-100 rounded-xl animate-pulse text-slate-400"
          >
            <QrCode className="w-8 h-8" />
          </div>
        )}

        <div className="text-center">
          <p className="text-[11px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1">
            <QrCode className="w-3 h-3 text-indigo-600" />
            <span>Scan to Join</span>
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Auto-enters PIN</p>
        </div>
      </div>

      {/* Expanded Big Projector / Theater QR Code Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center gap-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
              aria-label="Close QR Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Quick Mobile Join
              </span>
              <h3 className="text-2xl font-black font-display text-white mt-0.5">
                Scan with Phone Camera
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Point any smartphone camera at this screen to jump right into the lobby.
              </p>
            </div>

            {/* High-res White Box for Projector Contrast */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/30">
              {dataUrl && (
                <img
                  src={dataUrl}
                  alt={`Scan QR code for room ${roomCode}`}
                  className="w-56 h-56 block rounded-xl"
                />
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 w-full flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Room PIN</span>
                <span className="text-lg font-black font-display text-white tracking-widest tabular-nums">
                  {roomCode}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
