import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Laptop,
  Calendar,
  Lock,
  Download,
  Upload,
  Database,
  Archive,
  RotateCcw,
  Trash2,
  Check,
  Shield,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  Palette,
  AlertCircle,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { AppSettings, Habit } from '../types';
import { useProtectedAction } from '../context/ProtectedActionContext';
import { api } from '../api';
import { downloadExcelTemplate } from '../utils/excel';
import { sanitizeErrorMessage } from '../utils/importEngine';

interface SettingsViewProps {
  settings: AppSettings;
  archivedHabits: Habit[];
  dbStatusMessage: string;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onRestoreHabit: (habit: Habit) => void;
  onPermanentlyDeleteHabit: (habit: Habit) => void;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  onImportSuccess?: () => void;
  onOpenExcelExport?: () => void;
  onOpenExcelImport?: () => void;
  onOpenGoogleSheetsSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  archivedHabits,
  dbStatusMessage,
  onUpdateSetting,
  onRestoreHabit,
  onPermanentlyDeleteHabit,
  onExport,
  onImportSuccess,
  onOpenExcelExport,
  onOpenExcelImport,
  onOpenGoogleSheetsSync,
}) => {
  const [selectedHabitToDelete, setSelectedHabitToDelete] = useState<Habit | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { isUnlocked, executeProtected } = useProtectedAction();

  const handleProtectedRestore = (habit: Habit) => {
    executeProtected(() => {
      onRestoreHabit(habit);
    }, `Restore habit: ${habit.name}`);
  };

  const handleProtectedDelete = (habit: Habit) => {
    executeProtected(() => {
      onPermanentlyDeleteHabit(habit);
      setSelectedHabitToDelete(null);
    }, `Permanently delete habit: ${habit.name}`);
  };

  const handleProtectedSettingUpdate = <K extends keyof AppSettings>(key: K, value: AppSettings[K], label: string) => {
    // Theme is visual only and can change immediately, while security/week_start can be protected
    if (key === 'theme') {
      onUpdateSetting(key, value);
    } else {
      executeProtected(() => {
        onUpdateSetting(key, value);
      }, `Update setting: ${label}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }

      executeProtected(async () => {
        setImportStatus('importing');
        setImportError('');
        try {
          const res = await api.importData(parsed);
          setImportStatus('success');
          if (onImportSuccess) {
            onImportSuccess();
          } else {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } catch (err: any) {
          setImportStatus('error');
          setImportError(err?.message || 'Import failed');
        }
      }, 'Import Data Backup');
    } catch (err: any) {
      setImportStatus('error');
      setImportError('Failed to parse backup file: ' + err.message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Never';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Never';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Never';
    }
  };

  const themeOptions = [
    {
      id: 'light' as const,
      label: 'Light Mode',
      desc: 'Crisp, high-contrast warm paper canvas for daylight focus',
      icon: Sun,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      id: 'dark' as const,
      label: 'Dark Mode',
      desc: 'Deep slate aesthetic tailored for low-light evening comfort',
      icon: Moon,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      id: 'system' as const,
      label: 'System Auto',
      desc: 'Synchronizes dynamically with your operating system preference',
      icon: Laptop,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
  ];

  return (
    <div className="space-y-8 mb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/50 text-[#3D6B4E] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800 flex items-center justify-center shadow-2xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white">Preferences & Settings</h2>
            <p className="text-xs text-[#7D766C] dark:text-slate-400">
              Customize appearance, calendar preferences, data backups, and security
            </p>
          </div>
        </div>
      </div>

      {/* 1. Appearance & Theme Selection */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          <Palette className="w-4 h-4 text-[#5B8266] dark:text-emerald-400" />
          <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
            Appearance & Theme
          </h3>
        </div>

        <div>
          <p className="text-xs text-[#7D766C] dark:text-slate-400 mb-4">
            Select your preferred visual style. Changes apply instantly across the entire interface.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {themeOptions.map((opt) => {
              const isSelected = settings.theme === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  id={`theme-select-${opt.id}`}
                  type="button"
                  onClick={() => onUpdateSetting('theme', opt.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-[#FAF8F5] dark:bg-slate-800 border-[#5B8266] dark:border-emerald-500 shadow-sm ring-2 ring-[#5B8266]/20 dark:ring-emerald-500/20'
                      : 'bg-[#FFFFFF] dark:bg-slate-900/60 border-[#ECE6DC] dark:border-slate-800 hover:border-[#D5CFC5] dark:hover:border-slate-700 hover:bg-[#FAF8F5]/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`w-9 h-9 rounded-xl ${opt.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#5B8266] dark:text-emerald-400 bg-[#EBF3EE] dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800/60">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D2A26] dark:text-white mb-1">
                      {opt.label}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-[#7D766C] dark:text-slate-400 font-normal">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Display & Scheduling Preferences */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6 transition-colors">
        <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          Display & Scheduling Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Week Start Day */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A453E] dark:text-slate-300 mb-1.5">
              Week Starts On
            </label>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mb-3">
              Choose the first day of the week in Calendar and grid displays.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSetting('week_start', 'sunday')}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  settings.week_start === 'sunday'
                    ? 'bg-[#5B8266] text-white border-[#5B8266] shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#5C554B] dark:text-slate-300 border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-700'
                }`}
              >
                Sunday (Default)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSetting('week_start', 'monday')}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  settings.week_start === 'monday'
                    ? 'bg-[#5B8266] text-white border-[#5B8266] shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#5C554B] dark:text-slate-300 border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-700'
                }`}
              >
                Monday
              </button>
            </div>
          </div>

          {/* Default Startup View */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A453E] dark:text-slate-300 mb-1.5">
              Default Startup View
            </label>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mb-3">
              The view that opens when you unlock the application.
            </p>
            <select
              value={settings.default_view || 'today'}
              onChange={(e) => onUpdateSetting('default_view', e.target.value as any)}
              className="w-full py-2.5 px-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266] dark:focus:border-emerald-500 cursor-pointer"
            >
              <option value="today">⚡ Today View (Recommended)</option>
              <option value="grid">📋 Month Grid View</option>
              <option value="calendar">📅 Calendar View</option>
              <option value="analytics">📊 Analytics & Trends</option>
              <option value="review">📝 Review & Reflect</option>
              <option value="mood">😊 Daily Mood View</option>
              <option value="goals">🎯 Vision & Goals View</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Security & PIN Access */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          <Shield className="w-4 h-4 text-[#5B8266] dark:text-emerald-400" />
          <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">Security & Privacy</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PIN Protection Info */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white">Protected Actions Mode</span>
                <span className="px-2.5 py-1 rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/60 border border-[#D5E5D9] dark:border-emerald-800 text-xs font-semibold text-[#5B8266] dark:text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> PIN Protected
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-2 leading-relaxed">
                The website is publicly viewable by default. Anyone can browse habits, grids, streaks, and reflections. All data write operations require PIN verification before taking effect.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#ECE6DC] dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#7D766C] dark:text-slate-400">
              <span>Status: <strong className={isUnlocked ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>{isUnlocked ? '🔓 Editing Unlocked' : '🔒 View-Only'}</strong></span>
              <span>Backend Enforced</span>
            </div>
          </div>

          {/* Auto-Lock Timer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A453E] dark:text-slate-300 mb-1.5">
              Auto-Lock Inactivity Timer
            </label>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mb-3">
              Automatically returns to View-Only mode after inactivity.
            </p>
            <select
              value={settings.auto_lock_minutes || 15}
              onChange={(e) => handleProtectedSettingUpdate('auto_lock_minutes', parseInt(e.target.value, 10), 'Auto-lock inactivity timer')}
              className="w-full py-2.5 px-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266] dark:focus:border-emerald-500 cursor-pointer"
            >
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes (Default)</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="0">Never (Stay Unlocked During Session)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Database & Cloud Synchronization */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          <Database className="w-4 h-4 text-[#5B8266] dark:text-emerald-400" />
          <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">Database & Cloud Storage</h3>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B8266]" />
              <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                {settings.google_sheets_script_url
                  ? 'Google Sheet Cloud Database (Two-Way Live Sync Active)'
                  : 'Persistent Local Storage Engine Active'}
              </span>
            </div>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1">{dbStatusMessage}</p>
          </div>

          <div className="text-xs text-[#5B8266] dark:text-emerald-400 font-semibold bg-[#EBF3EE] dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-[#D5E5D9] dark:border-emerald-800 self-start sm:self-auto">
            Schema v3.0 (Relational)
          </div>
        </div>
      </div>

      {/* 5. Data Backup & Export / Import */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          <Download className="w-4 h-4 text-[#5B8266] dark:text-emerald-400" />
          <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">Data Export & Backup</h3>
        </div>

        <p className="text-xs text-[#7D766C] dark:text-slate-400">
          Export your complete habit history, check-in logs, goals, and reflections directly to <strong>Microsoft Excel (.xlsx)</strong>, CSV, or full JSON backups, and import spreadsheets seamlessly with auto-mapping.
        </p>

        {/* Excel Workbooks (Primary) */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Excel Spreadsheet Suite (.xlsx)
              </h4>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Recommended
            </span>
          </div>

          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
            Multi-sheet Excel workbook containing organized tabs for Habits, Daily Check-in Entries, Vision Goals, Mood Tracker, Micro-Journal, Weekly Reviews, and Weekly Plans.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              id="settings-export-excel-btn"
              onClick={() => {
                if (onOpenExcelExport) onOpenExcelExport();
                else onExport('xlsx');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.01]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel Workbook (.xlsx)</span>
            </button>

            <button
              type="button"
              id="settings-import-excel-btn"
              onClick={() => {
                if (onOpenExcelImport) {
                  onOpenExcelImport();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import from Excel (.xlsx / .xls)</span>
            </button>

            <button
              type="button"
              id="settings-download-excel-template-btn"
              onClick={() => downloadExcelTemplate()}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-emerald-200/80 dark:border-slate-700 text-xs font-semibold text-[#4A453E] dark:text-slate-300 transition-colors cursor-pointer"
              title="Download pre-formatted Excel template with guidelines"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* Google Sheets Sync via Apps Script */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-[#2D2A26] dark:text-white">
                Google Sheets Live Sync (via Apps Script)
              </h4>
            </div>
            {settings.google_sheets_script_url ? (
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                Setup Available
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#7D766C] dark:text-slate-400 leading-relaxed">
            Automatically store and sync your habits, check-ins, mood logs, and goals directly into your personal Google Spreadsheet with clean formatted tabs.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              id="settings-google-sheets-sync-btn"
              onClick={onOpenGoogleSheetsSync}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.01]"
            >
              <Cloud className="w-4 h-4" />
              <span>{settings.google_sheets_script_url ? 'Sync to Google Sheet' : 'Setup Google Sheet Sync'}</span>
            </button>

            {settings.google_sheets_last_synced && (
              <span className="text-[11px] text-[#8C8377] dark:text-slate-400">
                Last synced: {new Date(settings.google_sheets_last_synced).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Other Formats (CSV & JSON) */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-2">
            Alternative Formats (CSV & JSON)
          </h4>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onExport('csv')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#4A453E] dark:text-slate-200 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5B8266] dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onExport('json')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#4A453E] dark:text-slate-200 transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>Export Full JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus === 'importing'}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#4A453E] dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {importStatus === 'importing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              )}
              <span>{importStatus === 'importing' ? 'Importing...' : 'Import JSON Backup'}</span>
            </button>
          </div>
        </div>

        {importStatus === 'success' && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Backup successfully imported into database!</span>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError || 'Failed to import backup'}</span>
          </div>
        )}

        {/* 5B. Backup & Synchronization Telemetry / Health Audit */}
        <div className="pt-4 border-t border-[#F0EBE1] dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#5B8266] dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D2A26] dark:text-white">
                Backup & Synchronization Telemetry
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Audit Engine Active
            </span>
          </div>

          {/* Timestamps Row - Strictly Separated Push vs Pull */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/70 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] font-bold text-[#7D766C] dark:text-slate-400 uppercase tracking-wider block mb-1">
                Last Successful Backup
              </span>
              <p className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                {formatTimestamp(settings.last_backup_time)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/70 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] font-bold text-[#7D766C] dark:text-slate-400 uppercase tracking-wider block mb-1">
                Last Google Sheets Upload (Push)
              </span>
              <p className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                {formatTimestamp(settings.google_sheets_last_pushed)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/70 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] font-bold text-[#7D766C] dark:text-slate-400 uppercase tracking-wider block mb-1">
                Last Google Sheets Download (Pull)
              </span>
              <p className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                {formatTimestamp(settings.google_sheets_last_pulled)}
              </p>
            </div>
          </div>

          {/* Processed Records Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] text-[#7D766C] dark:text-slate-400 block font-medium">Tasks</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_backup_stats?.tasks_count ?? settings.last_push_stats?.tasks_count ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  exported
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1 border-t border-[#ECE6DC]/60 dark:border-slate-700/60 pt-1">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_restore_stats?.tasks_restored ?? settings.last_pull_stats?.tasks_restored ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  restored
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] text-[#7D766C] dark:text-slate-400 block font-medium">Journal Entries</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_backup_stats?.journal_count ?? settings.last_push_stats?.journal_count ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  exported
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1 border-t border-[#ECE6DC]/60 dark:border-slate-700/60 pt-1">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_restore_stats?.journal_restored ?? settings.last_pull_stats?.journal_restored ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  restored
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] text-[#7D766C] dark:text-slate-400 block font-medium">Notes</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_backup_stats?.notes_count ?? settings.last_push_stats?.notes_count ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  exported
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1 border-t border-[#ECE6DC]/60 dark:border-slate-700/60 pt-1">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_restore_stats?.notes_restored ?? settings.last_pull_stats?.notes_restored ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  restored
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-[#ECE6DC] dark:border-slate-700">
              <span className="text-[10px] text-[#7D766C] dark:text-slate-400 block font-medium">Total / Failed</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#2D2A26] dark:text-white font-mono">
                  {settings.last_backup_stats?.total_records ?? settings.last_restore_stats?.total_records ?? settings.last_push_stats?.total_records ?? settings.last_pull_stats?.total_records ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  total
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1 border-t border-[#ECE6DC]/60 dark:border-slate-700/60 pt-1">
                <span className={`text-xs font-bold font-mono ${
                  (settings.last_backup_stats?.failed_records || settings.last_restore_stats?.failed_records || settings.last_push_stats?.failed_records || settings.last_pull_stats?.failed_records)
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {settings.last_backup_stats?.failed_records ?? settings.last_restore_stats?.failed_records ?? settings.last_push_stats?.failed_records ?? settings.last_pull_stats?.failed_records ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                  failed
                </span>
              </div>
            </div>
          </div>

          {/* Operation Status Messaging */}
          {(() => {
            const latestOp =
              settings.last_restore_stats ||
              settings.last_pull_stats ||
              settings.last_push_stats ||
              settings.last_backup_stats;
            if (!latestOp) return null;

            const isSuccess = latestOp.success !== false && Number(latestOp.failed_records || 0) === 0;
            return (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
                  isSuccess
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {isSuccess ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span className="font-medium">{sanitizeErrorMessage(latestOp.message)}</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 6. Archived Habits Section */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-800">
          <Archive className="w-4 h-4 text-[#8C8377] dark:text-slate-400" />
          <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
            Archived Habits ({archivedHabits.length})
          </h3>
        </div>

        {archivedHabits.length === 0 ? (
          <p className="text-xs text-[#8C8377] dark:text-slate-400 py-3">
            No habits have been archived. When you archive a habit, it will appear here without deleting its historical check-ins.
          </p>
        ) : (
          <div className="space-y-2.5">
            {archivedHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-[#ECE6DC] dark:border-slate-700"
              >
                <div>
                  <h4 className="text-xs font-semibold text-[#2D2A26] dark:text-white">{habit.name}</h4>
                  <p className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
                    Archived • Category: {habit.category || 'General'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleProtectedRestore(habit)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-800 border border-[#D5E5D9] dark:border-emerald-800 text-[#2C523A] dark:text-emerald-300 hover:bg-[#EBF3EE] dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedHabitToDelete(habit)}
                    className="p-1.5 rounded-xl text-[#C05746] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Permanently delete habit and entries"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {selectedHabitToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] dark:bg-rose-950/40 text-[#C05746] dark:text-rose-300 border border-[#F5D5D0] dark:border-rose-800 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">Permanently Delete Habit?</h3>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-2 mb-6">
              Are you sure you want to permanently erase <strong>"{selectedHabitToDelete.name}"</strong> and all its past history from the database? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedHabitToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#5C554B] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleProtectedDelete(selectedHabitToDelete)}
                className="flex-1 py-2 rounded-xl bg-[#C05746] text-white text-xs font-semibold hover:bg-[#A34333] transition-colors cursor-pointer shadow-2xs"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
