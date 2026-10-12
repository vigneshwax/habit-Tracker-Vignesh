import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  Lock,
  X,
  Sparkles,
  Cloud,
  Code,
  Link as LinkIcon,
  Download,
  Upload,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  CheckCircle2,
  TableProperties,
  Layers,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  DEFAULT_APPS_SCRIPT_URL,
  pullRelationalDataFromGoogleSheets,
  pushRelationalDataToGoogleSheets,
  extractSpreadsheetId,
} from '../utils/googleAppsScript';
import {
  CENTRAL_DATA_SCHEMA,
  ORDERED_TABLE_NAMES,
  SupportedTableName,
  SCHEMA_VERSION,
  ValidationIssue,
  ValidationSummary,
  FullExportData,
} from '../utils/dataSchema';
import { api, EDIT_PASSWORD } from '../api';
import { useProtectedAction } from '../context/ProtectedActionContext';
import { downloadExcelWorkbook } from '../utils/excel';
import { AppSettings } from '../types';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  habitsCount: number;
  entriesCount: number;
  moodsCount: number;
  goalsCount: number;
  journalsCount: number;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onRefreshData: () => void;
  fullExportData?: FullExportData;
}

type TabType = 'sync' | 'import' | 'schema' | 'guide';
type ImportMode = 'merge' | 'replace' | 'selected';

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  habitsCount = 0,
  entriesCount = 0,
  moodsCount = 0,
  goalsCount = 0,
  journalsCount = 0,
  onUpdateSetting,
  onRefreshData,
  fullExportData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('sync');
  const [scriptUrl, setScriptUrl] = useState(
    settings?.google_sheets_script_url || DEFAULT_APPS_SCRIPT_URL
  );
  const [connectionMethod, setConnectionMethod] = useState<'apps_script' | 'api_key'>('apps_script');
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync operations state
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pushMessage, setPushMessage] = useState('');

  // Pull / Import preview state
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pullMessage, setPullMessage] = useState('');
  const [importedData, setImportedData] = useState<FullExportData | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<SupportedTableName, number> | null>(null);

  // Mode and table selection in Import tab
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [selectedTables, setSelectedTables] = useState<Record<SupportedTableName, boolean>>(() => {
    const map: Record<string, boolean> = {};
    ORDERED_TABLE_NAMES.forEach((tbl) => {
      map[tbl] = true;
    });
    return map as Record<SupportedTableName, boolean>;
  });
  const [previewActiveTable, setPreviewActiveTable] = useState<SupportedTableName>('habits');
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [applyReceipt, setApplyReceipt] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { isUnlocked, unlock } = useProtectedAction();

  useEffect(() => {
    if (settings?.google_sheets_script_url) {
      setScriptUrl(settings.google_sheets_script_url);
    }
  }, [settings?.google_sheets_script_url]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSaveUrl = () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed) return;
    onUpdateSetting('google_sheets_script_url', trimmed);
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 2500);
  };

  const handleDisconnect = () => {
    setScriptUrl('');
    onUpdateSetting('google_sheets_script_url', '');
    setTestResult(null);
    setPushStatus('idle');
    setPullStatus('idle');
  };

  const handleLoadDemoSheet = () => {
    setScriptUrl(DEFAULT_APPS_SCRIPT_URL);
    onUpdateSetting('google_sheets_script_url', DEFAULT_APPS_SCRIPT_URL);
    setTestResult({
      success: true,
      message: 'Demo Cloud Sheet Web App loaded! Ready to push & pull live relational data.',
    });
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Google Apps Script Web App URL (starts with https://)',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testGoogleSheets(trimmed);
      setTestResult({
        success: true,
        message: res.message || 'Connected successfully to Google Apps Script Database Engine!',
      });
      onUpdateSetting('google_sheets_script_url', trimmed);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to connect. Check your deployment settings.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Push (App -> Google Sheet)
  const handlePushData = async () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      setPushStatus('error');
      setPushMessage('Please provide your Google Apps Script Web App URL first.');
      return;
    }

    const runPush = async () => {
      setIsPushing(true);
      setPushStatus('idle');
      setPushMessage('');
      try {
        const res = await api.syncGoogleSheets(trimmed, fullExportData);
        setPushStatus('success');
        setPushMessage(
          res.message || 'Successfully saved records into your Google Sheet relational database!'
        );
        onUpdateSetting('google_sheets_script_url', trimmed);
        const nowIso = new Date().toISOString();
        onUpdateSetting('google_sheets_last_synced', res.timestamp || nowIso);
        onUpdateSetting('google_sheets_last_pushed', res.timestamp || nowIso);
      } catch (err: any) {
        setPushStatus('error');
        setPushMessage(
          err?.message || 'Push failed. Ensure Web App is deployed with "Anyone" access.'
        );
      } finally {
        setIsPushing(false);
      }
    };

    if (isUnlocked) {
      await runPush();
    } else {
      if (passwordInput.trim() !== EDIT_PASSWORD) {
        setPasswordError('Incorrect edit password (required: 9500)');
        return;
      }
      try {
        await api.verifyPassword(passwordInput.trim());
        unlock();
        setPasswordError('');
        await runPush();
      } catch (e: any) {
        setPasswordError(e?.message || 'Verification failed');
      }
    }
  };

  // Inspect & Pull (Google Sheet -> App)
  const handleFetchForInspection = async () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      setPullStatus('error');
      setPullMessage('Please provide your Google Apps Script Web App URL first.');
      return;
    }

    setIsPulling(true);
    setPullStatus('idle');
    setPullMessage('');
    try {
      const res = await pullRelationalDataFromGoogleSheets(trimmed);
      setImportedData(res.data);
      setValidationSummary(res.validation.summary);
      setTableCounts(res.validation.counts);
      setPullStatus('success');
      setPullMessage(res.message || 'Successfully inspected Google Sheet database!');
      setActiveTab('import');
    } catch (err: any) {
      setPullStatus('error');
      setPullMessage(
        err?.message ||
          'Inspection failed. Make sure your Apps Script contains the doGet function and is deployed as Anyone.'
      );
    } finally {
      setIsPulling(false);
    }
  };

  // Direct Pull & Apply into Website
  const handleDirectPullAndApply = async () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      setPullStatus('error');
      setPullMessage('Please provide your Google Apps Script Web App URL first.');
      return;
    }

    const runDirectPull = async () => {
      setIsPulling(true);
      setPullStatus('idle');
      setPullMessage('');
      try {
        const pullRes = await api.pullGoogleSheets(trimmed);
        if (pullRes?.data) {
          await api.importData({
            ...pullRes.data,
            mode: 'merge',
          });
          onRefreshData();
          setPullStatus('success');
          setPullMessage(pullRes.message || 'Successfully pulled and updated current website data from Google Sheets!');
        }
      } catch (err: any) {
        setPullStatus('error');
        setPullMessage(err?.message || 'Direct pull failed. Ensure Web App is deployed as Anyone.');
      } finally {
        setIsPulling(false);
      }
    };

    if (isUnlocked) {
      await runDirectPull();
    } else {
      if (passwordInput.trim() !== EDIT_PASSWORD) {
        setPasswordError('Incorrect edit password (required: 9500)');
        return;
      }
      try {
        await api.verifyPassword(passwordInput.trim());
        unlock();
        setPasswordError('');
        await runDirectPull();
      } catch (e: any) {
        setPasswordError(e?.message || 'Verification failed');
      }
    }
  };

  // Confirm and Apply Import into Database
  const handleConfirmImport = async () => {
    if (!importedData) return;

    const runImport = async () => {
      setIsApplyingImport(true);
      setPasswordError('');
      try {
        // Filter data if mode is 'selected'
        const payloadToImport: any = {};
        if (importMode === 'selected') {
          for (const tbl of ORDERED_TABLE_NAMES) {
            if (selectedTables[tbl]) {
              if (tbl === 'categories') {
                payloadToImport.habit_categories = (importedData as any).categories || importedData.habit_categories;
              } else if (tbl === 'monthly_reflections') {
                payloadToImport.reflections = importedData.reflections;
              } else {
                payloadToImport[tbl] = (importedData as any)[tbl];
              }
            }
          }
        } else {
          Object.assign(payloadToImport, importedData);
        }

        const res = await api.importData({
          ...payloadToImport,
          mode: importMode,
        });

        const nowIso = new Date().toISOString();
        onUpdateSetting('google_sheets_last_synced', nowIso);
        onUpdateSetting('google_sheets_last_pulled', nowIso);
        setApplyReceipt(res.message || 'Data successfully imported from Google Sheet!');
        onRefreshData();
      } catch (err: any) {
        setPasswordError(err?.message || 'Failed to apply import.');
      } finally {
        setIsApplyingImport(false);
      }
    };

    if (isUnlocked) {
      await runImport();
    } else {
      if (passwordInput.trim() !== EDIT_PASSWORD) {
        setPasswordError('Incorrect edit password (required: 9500)');
        return;
      }
      try {
        await api.verifyPassword(passwordInput.trim());
        unlock();
        setPasswordError('');
        await runImport();
      } catch (e: any) {
        setPasswordError(e?.message || 'Verification failed');
      }
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch('/api/export?format=json');
      if (res.ok) {
        const data = await res.json();
        downloadExcelWorkbook(data);
      } else {
        window.open('/api/export?format=xlsx', '_blank');
      }
    } catch {
      window.open('/api/export?format=xlsx', '_blank');
    }
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const sheetId = extractSpreadsheetId(scriptUrl);
  const isConnected = !!(scriptUrl && scriptUrl.startsWith('https://'));

  // Selected tables dependency check
  const hasDependencyWarning =
    importMode === 'selected' &&
    selectedTables.habit_entries &&
    !selectedTables.habits;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-sheets-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-[#ECE6DC] dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ECE6DC] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5]/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="google-sheets-modal-title"
                  className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white"
                >
                  Google Sheet Database Center
                </h3>
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Two-Way Live Database
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                Store and retrieve habits, check-ins, mood logs, and vision goals directly using your Google Sheet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8C8377] hover:text-[#2D2A26] dark:text-slate-400 dark:hover:text-white hover:bg-[#F2ECE4] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tabs */}
        <div className="px-5 sm:px-6 pt-2.5 border-b border-[#ECE6DC] dark:border-slate-800 flex items-center gap-2 bg-[#FAF8F5]/40 dark:bg-slate-900/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sync & Actions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (importedData) {
                setActiveTab('import');
              } else {
                handleFetchForInspection();
              }
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Import Preview & Modes</span>
            {tableCounts && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                {Object.values(tableCounts).reduce((a: number, b: number) => a + b, 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Sheet Format & Schema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Setup & Code Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: SYNC & ACTIONS */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Connection Status Card */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        {isConnected ? 'Connected to Google Sheet Database' : 'Disconnected'}
                      </span>
                      {isConnected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          v{SCHEMA_VERSION} Relational Engine
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                      Connects directly without OAuth using your Google Apps Script Web App.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDemoSheet}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#D5CFC5] dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Demo Cloud Sheet</span>
                  </button>

                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#D5CFC5] dark:border-slate-700 text-xs font-bold text-[#4A453E] dark:text-slate-300 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>sheets.new</span>
                  </a>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              {/* Web App URL Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1">
                    Google Apps Script Web App URL <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Need the script? Setup guide
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-[#8C8377] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={scriptUrl}
                      onChange={(e) => {
                        setScriptUrl(e.target.value);
                        setTestResult(null);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D5CFC5] dark:border-slate-700 text-xs font-mono text-[#2D2A26] dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSaveUrl}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {isUrlSaved ? 'Saved ✓' : 'Save'}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#D5CFC5] dark:border-slate-700 text-xs font-bold text-[#4A453E] dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test'}</span>
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`mt-2 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 text-[11px] text-[#5C554B] dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>
                  <span>Auto-download on refresh:</span>{' '}
                  <span className="font-bold">
                    {settings?.google_sheets_auto_download_on_refresh ? 'ON' : 'OFF'}
                  </span>
                  <span className="mx-1 text-[#C4BCB0]">·</span>
                  <span>Auto-push:</span>{' '}
                  <span className="font-bold">
                    {settings?.google_sheets_auto_sync !== false ? 'ON' : 'OFF'}
                  </span>
                  <span className="mx-1 text-[#C4BCB0]">·</span>
                  <span>Auto-reflect:</span>{' '}
                  <span className="font-bold">
                    {settings?.google_sheets_auto_pull !== false ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-[#8C8377] dark:text-slate-400 font-mono text-[10px]">
                  Push: {formatDateTime(settings?.google_sheets_last_pushed || settings?.google_sheets_last_synced)} · Pull: {formatDateTime(settings?.google_sheets_last_pulled || settings?.google_sheets_last_synced)}
                </div>
              </div>

              {/* Auto Sync Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        Auto-Push Changes (App → Google Sheet)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                      Automatically pushes data to your Google Sheet whenever you add, edit, or complete tasks & notes in the app.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = settings?.google_sheets_auto_sync === false || settings?.google_sheets_auto_push === false ? true : false;
                      onUpdateSetting('google_sheets_auto_sync', nextVal);
                      onUpdateSetting('google_sheets_auto_push', nextVal);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settings?.google_sheets_auto_sync !== false && settings?.google_sheets_auto_push !== false
                        ? 'bg-emerald-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        settings?.google_sheets_auto_sync !== false && settings?.google_sheets_auto_push !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        Auto-Reflect Changes (Google Sheet → App)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                      Automatically reflects any row, status, or note edits you make in Google Sheet back into this app (on tab switch & every 30s).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = settings?.google_sheets_auto_pull === false || settings?.google_sheets_auto_reflect === false ? true : false;
                      onUpdateSetting('google_sheets_auto_pull', nextVal);
                      onUpdateSetting('google_sheets_auto_reflect', nextVal);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settings?.google_sheets_auto_pull !== false && settings?.google_sheets_auto_reflect !== false
                        ? 'bg-emerald-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        settings?.google_sheets_auto_pull !== false && settings?.google_sheets_auto_reflect !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Password gate for non-unlocked users */}
              {!isUnlocked && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold">Edit Password Required (9500)</span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-400">
                        Enter passcode 9500 to push or pull changes directly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="9500"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    {passwordError && (
                      <span className="text-[10px] text-rose-600 font-bold">{passwordError}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Push & Pull Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* PUSH CARD */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                        <ArrowUpFromLine className="w-4 h-4 text-emerald-600" />
                        Push to Google Sheet (Save)
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                        Live Database
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400 leading-relaxed">
                      Uploads all 10 relational tables (README, habits, habit_entries, categories, goals, mood_tracker, daily_journal, weekly_plans, weekly_reviews, monthly_reflections, settings) into your Google Sheet.
                    </p>

                    <div className="text-[10px] text-[#5C554B] dark:text-slate-300 font-mono space-y-0.5 pt-1">
                      <div>• {habitsCount} Habits</div>
                      <div>• {entriesCount} Habit Entries (Check-ins)</div>
                      <div>• {moodsCount} Mood Logs · {goalsCount} Goals</div>
                    </div>
                  </div>

                  {pushMessage && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] ${
                        pushStatus === 'success'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {pushMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePushData}
                    disabled={isPushing}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <ArrowUpFromLine className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Saving to Google Sheet...' : 'Push Data to Sheet'}</span>
                  </button>
                </div>

                {/* PULL CARD */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                        <ArrowDownToLine className="w-4 h-4 text-blue-600" />
                        Pull from Google Sheet (Inspect & Load)
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                        Preview & Verify
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400 leading-relaxed">
                      Fetches live records from your Google Sheet, validates foreign keys and column schemas, and lets you review rows before confirming.
                    </p>

                    <div className="text-[10px] text-[#5C554B] dark:text-slate-300 pt-1">
                      Last Synced:{' '}
                      <span className="font-mono">
                        {settings?.google_sheets_last_synced
                          ? formatDateTime(settings.google_sheets_last_synced)
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {pullMessage && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] ${
                        pullStatus === 'success'
                          ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {pullMessage}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDirectPullAndApply}
                      disabled={isPulling}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <ArrowDownToLine className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
                      <span>{isPulling ? 'Syncing...' : 'Pull & Apply to Website'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchForInspection}
                      disabled={isPulling}
                      className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 text-[#4A453E] dark:text-slate-200 border border-[#D5CFC5] dark:border-slate-600 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect First</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Excel for Google Sheets */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                      Direct Excel for Google Sheets
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                    Downloads a multi-sheet relational .xlsx file ready to open in Google Sheets via File → Import → Upload.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#D5CFC5] dark:border-slate-700 text-xs font-bold text-[#4A453E] dark:text-slate-300 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                  >
                    <span>sheets.new</span>
                    <ExternalLink className="w-3 h-3 text-[#8C8377]" />
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .xlsx</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT PREVIEW & MODES */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {!importedData ? (
                <div className="p-8 text-center rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-dashed border-[#ECE6DC] dark:border-slate-700 space-y-3">
                  <Database className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#2D2A26] dark:text-white">
                      No Google Sheet Data Loaded Yet
                    </h4>
                    <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-md mx-auto">
                      Click below to pull and inspect the live data from your Google Sheet before applying any changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchForInspection}
                    disabled={isPulling}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>{isPulling ? 'Fetching...' : 'Fetch from Google Sheet'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                          Pre-Import Inspection Summary
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            validationSummary?.isValid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {validationSummary?.isValid ? '✓ Schema Valid' : '⚠️ Issues Found'}
                        </span>
                      </div>

                      <div className="text-xs text-[#7D766C] dark:text-slate-400 font-mono">
                        Source: Google Sheets Relational Engine
                      </div>
                    </div>

                    {/* Counts grid */}
                    {tableCounts && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                        {ORDERED_TABLE_NAMES.map((tbl) => (
                          <div
                            key={tbl}
                            onClick={() => setPreviewActiveTable(tbl)}
                            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                              previewActiveTable === tbl
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                                : 'bg-[#FAF8F5] dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-700 hover:border-emerald-300'
                            }`}
                          >
                            <div className="text-[10px] text-[#7D766C] dark:text-slate-400 capitalize">
                              {tbl.replace('_', ' ')}
                            </div>
                            <div className="text-sm font-bold text-[#2D2A26] dark:text-white font-mono">
                              {tableCounts[tbl]}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Validation issues warning */}
                    {validationSummary && validationSummary.issues.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-1 max-h-36 overflow-y-auto">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            Validation Report ({validationSummary.totalErrors} errors, {validationSummary.totalWarnings} warnings):
                          </span>
                        </div>
                        {validationSummary.issues.slice(0, 10).map((issue, idx) => (
                          <div key={idx} className="text-[11px] font-mono">
                            • [{issue.sheet} Row {issue.rowNumber}]: {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 space-y-3">
                    <span className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      Select Import Mode
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-600'
                            : 'bg-[#FAF8F5] dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                            Mode 1: Merge & Update
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
                          Adds new records and updates matched IDs. Preserves existing local records.
                        </p>
                      </div>

                      <div
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-600 ring-1 ring-rose-600'
                            : 'bg-[#FAF8F5] dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                            Mode 2: Replace All
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                            Caution
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
                          Replaces all tracker records with Google Sheet records.
                        </p>
                      </div>

                      <div
                        onClick={() => setImportMode('selected')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'selected'
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-[#FAF8F5] dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                            Mode 3: Selected Tables
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                            Custom
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
                          Choose specific worksheets to import while preserving others.
                        </p>
                      </div>
                    </div>

                    {/* Table checkboxes if Mode 3 */}
                    {importMode === 'selected' && (
                      <div className="pt-2 border-t border-[#ECE6DC] dark:border-slate-700 space-y-2">
                        <span className="text-[11px] font-bold text-[#4A453E] dark:text-slate-300">
                          Check Worksheets to Import:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ORDERED_TABLE_NAMES.map((tbl) => (
                            <label
                              key={tbl}
                              className="flex items-center gap-2 text-xs text-[#2D2A26] dark:text-white cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={!!selectedTables[tbl]}
                                onChange={(e) =>
                                  setSelectedTables((prev) => ({
                                    ...prev,
                                    [tbl]: e.target.checked,
                                  }))
                                }
                                className="rounded text-emerald-600"
                              />
                              <span className="capitalize">{tbl.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>

                        {hasDependencyWarning && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              <strong>Dependency alert:</strong> 'habit_entries' references 'habits'. We recommend selecting both tables to maintain foreign key integrity.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Worksheet Data Table Viewer */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                        <TableProperties className="w-3.5 h-3.5 text-emerald-600" />
                        Preview Worksheet: <code className="text-emerald-600">{previewActiveTable}</code>
                      </span>
                      <span className="text-[11px] text-[#7D766C] dark:text-slate-400 font-mono">
                        {tableCounts ? `${tableCounts[previewActiveTable]} rows` : ''}
                      </span>
                    </div>

                    <div className="border border-[#ECE6DC] dark:border-slate-700 rounded-xl overflow-x-auto max-h-56">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-slate-900 text-white font-bold sticky top-0">
                          <tr>
                            {CENTRAL_DATA_SCHEMA[previewActiveTable].columns.map((c) => (
                              <th key={c.name} className="px-3 py-2 border-r border-slate-700 whitespace-nowrap">
                                {c.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE6DC] dark:divide-slate-700">
                          {((importedData as any)[previewActiveTable] || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={CENTRAL_DATA_SCHEMA[previewActiveTable].columns.length}
                                className="px-3 py-4 text-center text-[#7D766C] dark:text-slate-400 italic"
                              >
                                No records found in this worksheet.
                              </td>
                            </tr>
                          ) : (
                            ((importedData as any)[previewActiveTable] || [])
                              .slice(0, 10)
                              .map((row: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50">
                                  {CENTRAL_DATA_SCHEMA[previewActiveTable].columns.map((c) => (
                                    <td
                                      key={c.name}
                                      className="px-3 py-1.5 border-r border-[#ECE6DC] dark:border-slate-700 whitespace-nowrap max-w-xs truncate font-mono text-[10px]"
                                    >
                                      {c.type === 'boolean'
                                        ? row[c.name] ? 'TRUE' : 'FALSE'
                                        : typeof row[c.name] === 'object'
                                        ? JSON.stringify(row[c.name])
                                        : String(row[c.name] ?? '')}
                                    </td>
                                  ))}
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Apply Receipt */}
                  {applyReceipt && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{applyReceipt}</span>
                    </div>
                  )}

                  {/* Commit Action Footer */}
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        Ready to Commit Import?
                      </div>
                      <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                        {importMode === 'merge'
                          ? 'Records will be merged into the website and persistent local database with UUID stability.'
                          : importMode === 'replace'
                          ? 'Existing application records will be replaced with workbook data.'
                          : 'Selected worksheets will be updated.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isApplyingImport}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CheckCheck className={`w-3.5 h-3.5 ${isApplyingImport ? 'animate-spin' : ''}`} />
                      <span>{isApplyingImport ? 'Applying Import...' : 'Confirm & Commit Import'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHEET FORMAT & SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <h4 className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <TableProperties className="w-4 h-4 text-emerald-600" />
                  100% Relational Schema Parity (Google Sheets ⟷ Excel ⟷ Website)
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Both your Excel (.xlsx) workbook and Google Sheet follow the exact same relational database schema. Every worksheet represents one logical database table with navy headers (<code>#0F172A</code>), frozen top row, and standard UUID primary/foreign keys.
                </p>
              </div>

              {/* README Sheet Guide */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between font-bold text-[#2D2A26] dark:text-white">
                  <span>0. README Worksheet</span>
                  <span className="text-[10px] text-slate-500 font-mono">Documentation Tab</span>
                </div>
                <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                  Explains database metadata, schema version (<code>v{SCHEMA_VERSION}</code>), column definitions, primary keys, foreign keys, and synchronization guide.
                </p>
              </div>

              {/* 10 Relational Tables */}
              <div className="space-y-2.5">
                {ORDERED_TABLE_NAMES.map((tbl, idx) => {
                  const def = CENTRAL_DATA_SCHEMA[tbl];
                  return (
                    <div
                      key={tbl}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-[#2D2A26] dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-mono">{idx + 1}.</span>
                          <span>{def.displayName}</span>
                          <code className="text-[11px] bg-[#FAF8F5] dark:bg-slate-900 px-1.5 py-0.5 rounded text-emerald-700 font-mono">
                            {def.name}
                          </code>
                        </div>
                        <div className="text-[10px] font-mono text-[#8C8377] flex items-center gap-2">
                          <span>PK: {def.primaryKey}</span>
                          <span>·</span>
                          <span>FK: {def.foreignKeyDescription}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                        {def.description}
                      </p>

                      <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono bg-[#FAF8F5] dark:bg-slate-900/50 p-2 rounded-xl flex flex-wrap gap-1.5">
                        {def.columns.map((c) => (
                          <span
                            key={c.name}
                            className={`px-1.5 py-0.5 rounded ${
                              c.isPrimaryKey
                                ? 'bg-amber-100 text-amber-900 font-bold'
                                : c.isForeignKey
                                ? 'bg-blue-100 text-blue-900 font-bold'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {c.name} ({c.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SETUP & CODE GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <h4 className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  How to Setup Your Google Apps Script (2 Minutes)
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Follow these 5 simple steps to turn your Google Sheet into a live two-way relational database without OAuth:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div>
                    <strong>Create a Blank Google Sheet:</strong> Open{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      sheets.new <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    in your browser.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div>
                    <strong>Open Apps Script:</strong> In your Google Sheet, click on <strong>Extensions &gt; Apps Script</strong>.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div>
                    <strong>Paste the Script:</strong> Delete any code in <code>Code.gs</code>, paste the script below, and click <strong>Save</strong> (disk icon).
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </span>
                  <div>
                    <strong>Deploy as Web App:</strong> Click <strong>Deploy &gt; New deployment</strong>. Select type <strong>Web app</strong>. Under "Who has access", select <strong>Anyone</strong>. Then click <strong>Deploy</strong>.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    5
                  </span>
                  <div>
                    <strong>Copy Web App URL:</strong> Copy the URL ending in <code>/exec</code> and paste it into the Web App URL box in Tab 1!
                  </div>
                </div>
              </div>

              {/* Code Box */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2D2A26] dark:text-white">
                    Google Apps Script Code (Code.gs - v{SCHEMA_VERSION})
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Apps Script Code'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto border border-slate-800 select-all">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-[#7D766C] dark:text-slate-400">
            Last database sync: {settings?.google_sheets_last_synced ? formatDateTime(settings.google_sheets_last_synced) : 'Never'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#5C554B] dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
