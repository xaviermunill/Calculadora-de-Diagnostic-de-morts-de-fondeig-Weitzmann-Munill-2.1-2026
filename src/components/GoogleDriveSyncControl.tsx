import React, { useState } from 'react';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HardDriveDownload,
  HardDriveUpload,
  ShieldCheck,
  Folder,
} from 'lucide-react';
import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
  GOOGLE_APPS_SCRIPT_WEBHOOK_URL,
  INVENTORY_FILE_NAME,
} from '../utils/googleDriveService';

interface GoogleDriveSyncControlProps {
  isConnected: boolean;
  userEmail?: string;
  isSyncing: boolean;
  autoSync: boolean;
  lastSyncTime?: string;
  error?: string | null;
  recordsCount: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onManualSync: () => void;
  onPullFromDrive: () => void;
  onPushToDrive: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onSetManualToken?: (token: string) => void;
  variant?: 'banner' | 'card' | 'compact';
}

export const GoogleDriveSyncControl: React.FC<GoogleDriveSyncControlProps> = ({
  isConnected = true,
  userEmail = 'xaviermunill@bufalvent.net',
  isSyncing,
  autoSync = true,
  lastSyncTime,
  error,
  recordsCount,
  onConnect,
  onDisconnect,
  onManualSync,
  onPullFromDrive,
  onPushToDrive,
  onToggleAutoSync,
  variant = 'card',
}) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-[#E8F5E9] text-[#1B5E20] px-2.5 py-1 rounded-full border border-[#C8E6C9] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
          <Cloud className="w-3.5 h-3.5" />
          <span>Sincronitzat amb Drive</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left info & status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sincronització Permanent Activa</span>
            </div>

            <span className="text-xs text-[#5C6B5E] font-medium bg-[#E9E9E0] px-2.5 py-1 rounded-md border border-[#D1D1C7]/60">
              {userEmail}
            </span>

            <span className="text-[11px] font-mono text-[#0E7490] bg-[#E0F2FE] px-2 py-0.5 rounded border border-[#BAE6FD]">
              Google Apps Script Webhook v2.3 (HD Drive)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#5C6B5E] flex-wrap">
            <span className="font-semibold text-[#134E4A] flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-[#0E7490]" /> Sincronitzat amb Google Sheets / Drive:
            </span>
            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-medium text-[#0E7490] hover:text-[#083344] underline flex items-center gap-1 bg-[#F0F9FF] px-2.5 py-0.5 rounded-md border border-[#BAE6FD] hover:bg-[#E0F2FE] transition"
              title="Obrir directament la carpeta a Google Drive"
            >
              <span>{GOOGLE_DRIVE_FOLDER_ID}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-[#888]">• Fitxer: <code className="text-[#134E4A] font-semibold">{INVENTORY_FILE_NAME}</code></span>
            <span className="text-[#888]">• Versió: <code className="text-[#134E4A] font-semibold">2.2</code></span>
          </div>

          {lastSyncTime ? (
            <p className="text-[11px] text-[#5C6B5E] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              Darrera sincronització correcta: <strong className="text-[#134E4A]">{lastSyncTime}</strong> ({recordsCount} registres al núvol)
            </p>
          ) : (
            <p className="text-[11px] text-[#5C6B5E] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              Total de registres assegurats al núvol: <strong className="text-[#134E4A]">{recordsCount}</strong>
            </p>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-[#134E4A] hover:bg-[#0E3B38] text-white text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
            title="Forçar sincronització immediata"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronitzant...' : 'Sincronitzar ara'}</span>
          </button>

          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#D1D1C7] transition shadow-2xs"
            title="Obrir la carpeta a Google Drive"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0E7490]" />
            <span>Obrir Drive</span>
          </a>

          <button
            onClick={onPushToDrive}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-medium px-3 py-2 rounded-xl border border-[#D1D1C7] transition disabled:opacity-50"
            title="Forçar actualització de còpia a Drive"
          >
            <HardDriveUpload className="w-3.5 h-3.5 text-[#0E7490]" />
            <span>Desar còpia</span>
          </button>
        </div>
      </div>

      {/* Real-time auto sync bar */}
      <div className="mt-3.5 pt-3 border-t border-[#E9E9E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5C6B5E]">
        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[#134E4A]">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => onToggleAutoSync(e.target.checked)}
            className="rounded border-[#D1D1C7] text-[#134E4A] focus:ring-[#134E4A] h-4 w-4"
          />
          <span>Sincronització automàtica en segon pla activa (cada alta, modificació o baixa es guarda directament)</span>
        </label>

        <span className="text-[11px] text-[#7A8A80] font-mono">
          ID: 1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq
        </span>
      </div>
    </div>
  );
};
