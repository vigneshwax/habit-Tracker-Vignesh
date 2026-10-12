import React, { useState } from 'react';
import { GoogleSheetsConfig, SyncState } from '../types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../services/googleSheets';
import {
  Cloud,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Key,
} from 'lucide-react';

interface GoogleSheetsSyncViewProps {
  config: GoogleSheetsConfig;
  syncState: SyncState;
  onSaveConfig: (updated: Partial<GoogleSheetsConfig>) => void;
  onManualPush: () => void;
  onManualPull: () => void;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({
  config,
  syncState,
  onSaveConfig,
  onManualPush,
  onManualPull,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [databaseUrl, setDatabaseUrl] = useState(config.databaseUrl);
  const [sheetUrl, setSheetUrl] = useState(config.sheetUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleSaveUrls = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    onSaveConfig({
      databaseUrl: databaseUrl.trim(),
      sheetUrl: sheetUrl.trim(),
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const isConfigured = Boolean(config.databaseUrl && config.databaseUrl.trim());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-white/20 rounded-xl backdrop-blur-xs">
              <Cloud className="w-8 h-8 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Google Sheets Live Cloud Sync (Tier 2 Database)
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Two-way automated mirroring powered by Google Apps Script Web App Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onManualPull}
              disabled={!isConfigured || syncState.status === 'syncing'}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition disabled:opacity-50"
            >
              <ArrowDownLeft className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
              Pull from Sheet
            </button>
            <button
              type="button"
              onClick={onManualPush}
              disabled={!isConfigured || syncState.status === 'syncing'}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-xs disabled:opacity-50"
            >
              <ArrowUpRight className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
              Push to Sheet
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Connection Status
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-2">
            {isConfigured ? 'Connected & Live' : 'Not Configured'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isConfigured
              ? 'Auto-sync active (25s interval & tab focus)'
              : 'Add your Web App URL below to connect'}
          </div>
        </div>

        {/* Last Push */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Last Push (App → Sheet)
            </span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-2">
            {config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleTimeString() : 'Never'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleDateString() : 'Pending first upload'}
          </div>
        </div>

        {/* Last Pull */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Last Pull (Sheet → App)
            </span>
            <RefreshCw className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-2">
            {config.lastPullTime ? new Date(config.lastPullTime).toLocaleTimeString() : 'Never'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {config.lastPullTime ? new Date(config.lastPullTime).toLocaleDateString() : 'Auto-pulls on tab focus'}
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Endpoint & Spreadsheet Settings
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Changes require password 9500 to edit. Public users can browse in read-only mode.
        </p>

        <form onSubmit={handleSaveUrls} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Google Apps Script Web App Deployment URL
            </label>
            <input
              type="url"
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Google Sheet Direct Spreadsheet Link (Optional)</span>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                >
                  Open in Google Sheets <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiM.../edit"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {!isUnlocked ? (
              <button
                type="button"
                onClick={onRequestUnlock}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <Key className="w-3.5 h-3.5" /> Unlock Settings with Password (9500)
              </button>
            ) : (
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Editing Unlocked
              </div>
            )}

            <div className="flex items-center gap-3">
              {saveFeedback && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Settings Saved!
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Copyable Google Apps Script Code Box */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Google Apps Script Source Code (Code.gs)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              copiedCode
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copied to Clipboard!' : 'Copy Script Code'}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Paste this script into your Google Spreadsheet (Extensions &gt; Apps Script), deploy as a Web App with access set to "Anyone", and paste the resulting URL above.
        </p>

        <div className="relative">
          <pre className="max-h-64 overflow-y-auto p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed border border-slate-800">
            {GOOGLE_APPS_SCRIPT_TEMPLATE}
          </pre>
        </div>
      </div>
    </div>
  );
};
