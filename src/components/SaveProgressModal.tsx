import React from 'react';
import { Cloud, CheckCircle, AlertCircle, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { formatBytes } from '../utils/imageCompressor';

export interface UploadProgressInfo {
  percent: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  remainingBytes: number;
  phase: 'preparing' | 'uploading' | 'processing_gas' | 'completed' | 'error';
  statusText: string;
  error?: string;
}

interface SaveProgressModalProps {
  isOpen: boolean;
  progress: UploadProgressInfo;
  recordCode: string;
  onClose: () => void;
}

export const SaveProgressModal: React.FC<SaveProgressModalProps> = ({
  isOpen,
  progress,
  recordCode,
  onClose,
}) => {
  if (!isOpen) return null;

  // SVG Circular progress math
  const radius = 46;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, progress.percent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const isComplete = progress.phase === 'completed';
  const isError = progress.phase === 'error';

  return (
    <div
      id="save-progress-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
    >
      <div
        id="save-progress-modal-card"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#D1D1C7] text-center relative overflow-hidden"
      >
        {/* Close button if completed or error */}
        {(isComplete || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#64746B] hover:text-[#134E4A] hover:bg-[#F5F5F0] transition"
            aria-label="Tancar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Title & Badge */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#134E4A] mb-1">
          <Cloud className="w-4 h-4 text-[#134E4A]" />
          <span>Sincronització Google Apps Script</span>
        </div>

        <h3 className="text-lg sm:text-xl font-serif font-bold text-[#134E4A] mt-1">
          {isComplete
            ? 'Registre Pujat i Sincronitzat'
            : isError
            ? 'Incidència en la Pujada'
            : `Pujant fitxa: ${recordCode}`}
        </h3>

        {/* Roda d'Evolució (Circular SVG Progress Wheel) */}
        <div className="relative my-6 flex items-center justify-center">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background track circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-[#E9E9E0]"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className={`transition-all duration-300 ease-out ${
                isError
                  ? 'stroke-rose-600'
                  : isComplete
                  ? 'stroke-emerald-600'
                  : 'stroke-[#134E4A]'
              }`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Info inside the Evolution Wheel */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {isComplete ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-600 animate-in zoom-in duration-300" />
                <span className="text-xs font-bold text-emerald-800 mt-1">100%</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center">
                <AlertCircle className="w-10 h-10 text-rose-600 animate-in zoom-in duration-300" />
                <span className="text-xs font-bold text-rose-700 mt-1">Error</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#134E4A] tracking-tight">
                  {clampedPercent}%
                </span>
                <span className="text-[10px] font-mono text-[#64746B] uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <ArrowUpCircle className="w-3 h-3 text-[#134E4A] animate-pulse" />
                  Upload
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Metrics Box (Showing remaining upload data) */}
        <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-3.5 text-left space-y-2 mb-4 text-xs font-sans">
          <div className="flex items-center justify-between font-mono text-[#134E4A]">
            <span className="text-[#64746B]">Dades transferides:</span>
            <span className="font-bold">
              {formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono">
            <span className="text-[#64746B]">Upload restant:</span>
            <span className={`font-bold ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isComplete
                ? '0 B (Completat)'
                : `${formatBytes(progress.remainingBytes)} (${Math.max(0, 100 - clampedPercent)}% pendent)`}
            </span>
          </div>

          {/* Visual Mini Progress Bar */}
          <div className="w-full bg-[#E5E5DF] h-2 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isError
                  ? 'bg-rose-600'
                  : isComplete
                  ? 'bg-emerald-600'
                  : 'bg-[#134E4A]'
              }`}
              style={{ width: `${clampedPercent}%` }}
            />
          </div>
        </div>

        {/* Status Phase Description */}
        <p className="text-xs text-[#4A5D52] font-medium leading-relaxed min-h-[36px] flex items-center justify-center">
          {progress.statusText}
        </p>

        {/* Action button if complete or error */}
        {(isComplete || isError) && (
          <div className="mt-5 pt-3 border-t border-[#E5E5DF]">
            <button
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs ${
                isError
                  ? 'bg-rose-700 hover:bg-rose-800 text-white'
                  : 'bg-[#134E4A] hover:bg-[#0E3B38] text-white'
              }`}
            >
              {isError ? 'Tancar i continuar' : 'D\'acord (Registre desat)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
