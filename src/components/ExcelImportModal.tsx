import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Check,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Download,
  Eye,
  Layers,
  Calendar,
  Smile,
  Target,
  BookOpen,
  Lock,
  Unlock,
  HelpCircle,
  TableProperties,
  CheckSquare,
  Square,
  Info,
  ShieldAlert,
  ArrowRight,
  Database,
} from 'lucide-react';
import {
  parseExcelFile,
  downloadExcelTemplate,
  ExcelImportSummary,
  SheetImportStats,
  SupportedTableName,
  RELATIONAL_TABLES,
  ValidationIssue,
  FullExportData,
} from '../utils/excel';
import { api, EDIT_PASSWORD } from '../api';
import { useProtectedAction } from '../context/ProtectedActionContext';
import { localStorageService } from '../services/localStorageService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: ExcelImportSummary) => void;
  existingData?: Partial<FullExportData>;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);
  const [parseError, setParseError] = useState<string>('');

  // Import Modes: 'merge' | 'replace' | 'selected'
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'selected'>('merge');
  const [selectedTablesToImport, setSelectedTablesToImport] = useState<Record<string, boolean>>({});
  const [confirmReplace, setConfirmReplace] = useState(false);

  const [activePreviewTab, setActivePreviewTab] = useState<string>('habits');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importResultCounts, setImportResultCounts] = useState<Record<string, number> | null>(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { isUnlocked } = useProtectedAction();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError('');
    setSummary(null);
    setImportSuccess(false);
    setImportResultCounts(null);

    try {
      const parsed = await parseExcelFile(selectedFile, existingData);
      setSummary(parsed);

      // Default all detected tables to checked for 'selected' mode
      const initialSelected: Record<string, boolean> = {};
      Object.keys(parsed.sheetStats).forEach((key) => {
        initialSelected[key] = true;
      });
      setSelectedTablesToImport(initialSelected);

      if (parsed.totalRows === 0 && parsed.warnings.length > 0) {
        setParseError(parsed.warnings[0]);
      } else {
        // Pick first tab that has rows
        const firstTab = Object.keys(parsed.sheetStats).find(
          (k) => parsed.sheetStats[k].totalRows > 0
        );
        if (firstTab) setActivePreviewTab(firstTab);
      }
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      setParseError(err?.message || 'Unable to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileProcess(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx') && !droppedFile.name.endsWith('.xls')) {
        setParseError('Please drop an Excel workbook file (.xlsx or .xls)');
        return;
      }
      handleFileProcess(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTablesToImport((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  // Dependency validation check for Selected Tables mode
  const getDependencyWarnings = (): string[] => {
    if (importMode !== 'selected' || !summary) return [];
    const warnings: string[] = [];

    // If habit_entries is selected, habits should ideally be selected too
    if (selectedTablesToImport.habit_entries && !selectedTablesToImport.habits) {
      const hasUnmatched = summary.parsedData.habit_entries.some((e) => {
        const habitId = e.habit_id;
        const inExisting = existingData?.habits?.some((h) => h.id === habitId);
        return !inExisting;
      });
      if (hasUnmatched) {
        warnings.push(
          "You selected 'habit_entries' without 'habits', but some check-ins reference habits that are not yet in your database. Please select 'habits' as well to prevent orphaned entries."
        );
      }
    }

    return warnings;
  };

  const handlePerformImport = async () => {
    if (!summary || summary.totalRows === 0) return;

    // Block import if critical primary key errors exist
    const hasCriticalErrors = summary.errors.some((err) =>
      err.message.includes('Duplicate primary key') || err.message.includes('Missing required')
    );

    if (hasCriticalErrors) {
      setParseError('Cannot import workbook with unresolved primary key errors. Please review the errors below.');
      return;
    }

    const runImport = async () => {
      setIsImporting(true);
      setPasswordError('');
      setParseError('');

      try {
        // Filter payload based on mode
        let payload: any = { ...summary.parsedData };

        if (importMode === 'replace') {
          if (!confirmReplace) {
            setParseError('Destructive action required: please confirm replacing your data.');
            return;
          }
          payload.mode = 'replace';
          payload.confirm_replace = true;
        } else if (importMode === 'selected') {
          const chosen = Object.keys(selectedTablesToImport).filter((k) => selectedTablesToImport[k]);
          payload = { mode: 'selected', selected_tables: chosen };
          if (selectedTablesToImport.habits) payload.habits = summary.parsedData.habits;
          if (selectedTablesToImport.habit_entries) payload.habit_entries = summary.parsedData.habit_entries;
          if (selectedTablesToImport.goals) payload.goals = summary.parsedData.goals;
          if (selectedTablesToImport.mood_tracker) payload.mood_tracker = summary.parsedData.mood_tracker;
          if (selectedTablesToImport.daily_journal) payload.daily_journal = summary.parsedData.daily_journal;
          if (selectedTablesToImport.weekly_plans) payload.weekly_plans = summary.parsedData.weekly_plans;
          if (selectedTablesToImport.weekly_reviews) payload.weekly_reviews = summary.parsedData.weekly_reviews;
          if (selectedTablesToImport.reflections || selectedTablesToImport.monthly_reflections) payload.reflections = summary.parsedData.reflections;
          if (selectedTablesToImport.habit_categories || selectedTablesToImport.categories) payload.habit_categories = summary.parsedData.habit_categories;
          if (selectedTablesToImport.affirmations) payload.affirmations = summary.parsedData.affirmations;
          if (selectedTablesToImport.tasks) payload.tasks = summary.parsedData.tasks;
          if (selectedTablesToImport.notes) payload.notes = summary.parsedData.notes;
          if (selectedTablesToImport.settings) payload.settings = summary.parsedData.settings;
        } else {
          payload.mode = 'merge';
        }

        const res = await api.importData(payload);

        // Also persist imported tasks and notes in client storage
        if (payload.tasks && Array.isArray(payload.tasks) && payload.tasks.length > 0) {
          try {
            if (importMode === 'replace') {
              localStorageService.saveTasks(payload.tasks);
            } else {
              const existing = localStorageService.getTasks();
              const merged = [...existing];
              payload.tasks.forEach((t: any) => {
                const idx = merged.findIndex((m) => m.id === t.id);
                if (idx >= 0) merged[idx] = { ...merged[idx], ...t };
                else merged.push(t);
              });
              localStorageService.saveTasks(merged);
            }
          } catch (e) {
            console.warn('Could not sync tasks to localStorage:', e);
          }
        }

        if (payload.notes && Array.isArray(payload.notes) && payload.notes.length > 0) {
          try {
            if (importMode === 'replace') {
              localStorageService.saveNotes(payload.notes);
            } else {
              const existing = localStorageService.getNotes();
              const merged = [...existing];
              payload.notes.forEach((n: any) => {
                const idx = merged.findIndex((m) => m.id === n.id);
                if (idx >= 0) merged[idx] = { ...merged[idx], ...n };
                else merged.push(n);
              });
              localStorageService.saveNotes(merged);
            }
          } catch (e) {
            console.warn('Could not sync notes to localStorage:', e);
          }
        }

        setImportSuccess(true);
        setImportResultCounts(res.counts || {});

        setTimeout(() => {
          onSuccess(summary);
          onClose();
        }, 1500);
      } catch (err: any) {
        console.error('Import failed:', err);
        setParseError(err?.message || 'Failed to import Excel data into database');
      } finally {
        setIsImporting(false);
      }
    };

    if (isUnlocked) {
      await runImport();
    } else {
      if (passwordInput.trim() !== EDIT_PASSWORD) {
        setPasswordError('Incorrect editing password (required: 9500)');
        return;
      }
      try {
        await api.verifyPassword(passwordInput.trim());
        await runImport();
      } catch (e: any) {
        setPasswordError(e?.message || 'Verification failed');
      }
    }
  };

  const resetSelection = () => {
    setFile(null);
    setSummary(null);
    setParseError('');
    setImportSuccess(false);
    setPasswordError('');
    setConfirmReplace(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const dependencyWarnings = getDependencyWarnings();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4.5 border-b border-[#ECE6DC] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5]/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#3D6B4E] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800/80 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-2">
                Relational Excel Database Importer
                <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  Schema v3.0
                </span>
              </h3>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                Imports multi-sheet workbooks with schema validation and foreign-key integrity
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* STEP 1: Upload or drag drop */}
          {!summary ? (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isParsing
                    ? 'border-[#5B8266] bg-[#FAF8F5] dark:bg-slate-800/50'
                    : 'border-[#D9D2C7] dark:border-slate-700 hover:border-[#5B8266] dark:hover:border-emerald-500 bg-[#FAF8F5]/60 dark:bg-slate-800/30 hover:bg-[#F5EFE6]/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#3D6B4E] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  {isParsing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-[#5B8266]" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <h4 className="text-sm font-bold text-[#2D2A26] dark:text-white">
                  {isParsing ? 'Validating database schema and foreign keys...' : 'Choose an Excel file or drag & drop here'}
                </h4>
                <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Upload an Excel workbook (.xlsx) containing relational sheets for habits, habit_entries, goals, mood_tracker, daily_journal, etc.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#4A453E] dark:text-slate-300 shadow-2xs">
                    Browse Excel files (.xlsx)
                  </span>
                </div>
              </div>

              {parseError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">File Parsing Notice:</span> {parseError}
                  </div>
                </div>
              )}

              {/* Template download helper */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#2D2A26] dark:text-white">Need the Relational Excel template?</h5>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400">
                      Download the official multi-sheet template with README guide, foreign keys, and sample rows.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadExcelTemplate()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#4A453E] dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Relational Template</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Validation Preview & Confirmation */
            <div className="space-y-4.5">
              {/* File Info & Summary Stats */}
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 truncate">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-[#2D2A26] dark:text-white truncate">
                      {file?.name || 'Uploaded Workbook'}
                    </p>
                    <p className="text-[10px] text-[#7D766C] dark:text-slate-400">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : ''} • {summary.detectedSheets.length} worksheets detected • {summary.totalRows} records found
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {summary.validRowsCount} Valid
                  </span>
                  {summary.errors.length > 0 && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {summary.errors.length} Errors
                    </span>
                  )}
                  {summary.warnings.length > 0 && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {summary.warnings.length} Warnings
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={resetSelection}
                    className="text-xs font-semibold text-[#8C8377] hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Change file
                  </button>
                </div>
              </div>

              {/* Detected Tables & Record Counts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[#7D766C] dark:text-slate-400">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A453E] dark:text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Detected Relational Tables</span>
                  </h4>
                  <span className="text-[11px]">
                    Schema: <strong>{summary.schemaVersion}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.entries(summary.sheetStats) as [string, SheetImportStats][]).map(([key, stat]) => {
                    const isChecked = selectedTablesToImport[key] ?? true;
                    return (
                      <div
                        key={key}
                        onClick={() => {
                          if (importMode === 'selected') toggleTableSelection(key);
                        }}
                        className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                          isChecked
                            ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700/80'
                            : 'bg-[#FAF8F5]/50 dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-800 opacity-60'
                        } ${importMode === 'selected' ? 'cursor-pointer hover:border-emerald-500' : ''}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#2D2A26] dark:text-white truncate">
                          <span className="truncate">{stat.displayName}</span>
                          {importMode === 'selected' && (
                            <div>
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                            {stat.validRows}
                          </span>
                          <span className="text-[10px] text-[#7D766C] dark:text-slate-400">
                            rows
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A453E] dark:text-slate-300 mb-2">
                  Choose Import Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Mode 1: Merge */}
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border-[#5B8266] dark:border-emerald-500 ring-2 ring-[#5B8266]/20'
                        : 'bg-[#FFFFFF] dark:bg-slate-800 border-[#ECE6DC] dark:border-slate-700 hover:border-[#D5CFC5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">1. Merge & Update</span>
                      {importMode === 'merge' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1 leading-snug">
                      Preserves existing data. Adds new records and updates matching IDs. (Recommended)
                    </p>
                  </button>

                  {/* Mode 2: Replace */}
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-600 dark:border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-[#FFFFFF] dark:bg-slate-800 border-[#ECE6DC] dark:border-slate-700 hover:border-[#D5CFC5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">2. Replace All</span>
                      {importMode === 'replace' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1 leading-snug">
                      Overwrites current data with the exact records from this workbook.
                    </p>
                  </button>

                  {/* Mode 3: Selected Tables */}
                  <button
                    type="button"
                    onClick={() => setImportMode('selected')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      importMode === 'selected'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-[#FFFFFF] dark:bg-slate-800 border-[#ECE6DC] dark:border-slate-700 hover:border-[#D5CFC5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">3. Import Selected</span>
                      {importMode === 'selected' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1 leading-snug">
                      Import only selected worksheets with automated dependency validation.
                    </p>
                  </button>
                </div>
              </div>

              {/* Replace Mode Destructive Confirmation Banner */}
              {importMode === 'replace' && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start gap-3 animate-in fade-in duration-200">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <div>
                      <h5 className="font-bold text-xs text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
                        <span>Destructive Action Confirmation Required</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                          Replace Mode
                        </span>
                      </h5>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                        Replace mode replaces current records for the worksheets included in this workbook. Tables not in this file will be preserved. This operation cannot be automatically undone.
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmReplace}
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                        I understand this is destructive and confirm replacing existing records for these worksheets.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Dependency Warning */}
              {dependencyWarnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Dependency Notice:</span>
                    {dependencyWarnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] leading-relaxed">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview & Issues Section */}
              <div className="border border-[#ECE6DC] dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
                {/* Preview Tabs */}
                <div className="px-3 py-2 bg-[#FAF8F5] dark:bg-slate-800/80 border-b border-[#ECE6DC] dark:border-slate-700 flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {Object.keys(summary.sheetStats).map((tbl) => {
                      const stat = summary.sheetStats[tbl];
                      return (
                        <button
                          key={tbl}
                          type="button"
                          onClick={() => setActivePreviewTab(tbl)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            activePreviewTab === tbl
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-700 text-[#5C554B] dark:text-slate-300 hover:text-[#2D2A26]'
                          }`}
                        >
                          {stat.displayName} ({stat.validRows})
                        </button>
                      );
                    })}
                  </div>

                  {summary.issues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOnlyIssues(!showOnlyIssues)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                        showOnlyIssues
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}
                    >
                      {showOnlyIssues ? 'Show All Rows' : `View Issues (${summary.issues.length})`}
                    </button>
                  )}
                </div>

                {/* Table Preview Body */}
                <div className="p-3 max-h-48 overflow-y-auto">
                  {showOnlyIssues ? (
                    /* Issue List */
                    <div className="space-y-1.5">
                      {summary.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl text-[11px] flex items-start gap-2 border ${
                            issue.type === 'error'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {issue.type === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                          )}
                          <div className="leading-snug">
                            <strong>[{issue.sheet}]</strong> Row {issue.rowNumber}: {issue.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Tab Data Preview */
                    <div className="space-y-1">
                      {activePreviewTab === 'habits' && (
                        summary.parsedData.habits.slice(0, 6).map((h, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[180px]">{h.name}</span>
                            <span className="text-[#7D766C] dark:text-slate-400 capitalize">{h.category} • {h.frequency}</span>
                            <span className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">PK: {h.id.slice(0, 8)}...</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] uppercase">{h.status}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'habit_entries' && (
                        summary.parsedData.habit_entries.slice(0, 6).map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-mono text-[#4A453E] dark:text-slate-300 font-bold">{e.date}</span>
                            <span className="text-[#7D766C] dark:text-slate-400 font-mono text-[10px] truncate max-w-[160px]">FK: {e.habit_id.slice(0, 8)}...</span>
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${e.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {e.completed ? 'COMPLETED' : 'MISSED'}
                            </span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'goals' && (
                        summary.parsedData.goals.slice(0, 5).map((g, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[180px]">{g.title}</span>
                            <span className="text-[#7D766C] dark:text-slate-400">{g.progress}% progress</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] uppercase">{g.status}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'mood_tracker' && (
                        summary.parsedData.mood_tracker.slice(0, 5).map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-mono text-[#4A453E] dark:text-slate-300 font-bold">{m.date}</span>
                            <span className="capitalize font-semibold text-[#2D2A26] dark:text-white">{m.mood} ({m.mood_score}/6)</span>
                            <span className="text-[#7D766C] dark:text-slate-400 truncate max-w-[160px]">{m.note || 'No note'}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'daily_journal' && (
                        summary.parsedData.daily_journal.slice(0, 5).map((j, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-mono text-[#4A453E] dark:text-slate-300">{j.date}</span>
                            <span className="text-[#2D2A26] dark:text-white truncate max-w-[250px]">{j.content}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'weekly_plans' && (
                        summary.parsedData.weekly_plans.slice(0, 4).map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[180px]">{p.main_goal}</span>
                            <span className="text-[#7D766C] dark:text-slate-400">Target: {p.target_percentage}%</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'weekly_reviews' && (
                        summary.parsedData.weekly_reviews.slice(0, 4).map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[200px]">{r.went_well || r.next_focus}</span>
                            <span className="text-[#7D766C] dark:text-slate-400">Week {r.week_number}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'monthly_reflections' && (
                        summary.parsedData.reflections.slice(0, 4).map((rf, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-mono text-[#7D766C] dark:text-slate-400">{rf.year}-{String(rf.month).padStart(2, '0')}</span>
                            <span className="text-[#2D2A26] dark:text-white truncate max-w-[260px]">{rf.content}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'categories' && (
                        summary.parsedData.habit_categories?.slice(0, 6).map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-bold text-[#2D2A26] dark:text-white">{c.icon} {c.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">PK: {c.id || 'auto'}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'settings' && (
                        Object.entries(summary.parsedData.settings || {}).slice(0, 6).map(([k, v], i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-mono font-semibold text-[#2D2A26] dark:text-white">{k}</span>
                            <span className="text-[#7D766C] dark:text-slate-400 truncate max-w-[180px]">{String(v)}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'tasks' && (
                        (summary.parsedData.tasks || []).slice(0, 6).map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[180px]">{t.title || t.name}</span>
                            <span className="text-[#7D766C] dark:text-slate-400 capitalize">{t.category || 'general'} • {t.priority || 'Medium'}</span>
                            <span className="font-mono text-[10px] text-slate-500">{t.date || t.due_date || 'No due date'}</span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] uppercase font-semibold">{t.status || (t.completed ? 'Completed' : 'Pending')}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'notes' && (
                        (summary.parsedData.notes || []).slice(0, 6).map((n: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-semibold text-[#2D2A26] dark:text-white truncate max-w-[180px]">{n.title}</span>
                            <span className="text-[#7D766C] dark:text-slate-400 truncate max-w-[200px]">{n.content || (n.checklist ? `${n.checklist.length} items` : 'Empty note')}</span>
                            <span className="font-mono text-[10px] text-slate-500">Type: {n.type || 'note'}</span>
                          </div>
                        ))
                      )}

                      {activePreviewTab === 'affirmations' && (
                        (summary.parsedData.affirmations || []).slice(0, 5).map((a: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#ECE6DC] dark:border-slate-800">
                            <span className="font-medium italic text-[#2D2A26] dark:text-white truncate max-w-[280px]">"{a.quote}"</span>
                            <span className="text-[#7D766C] dark:text-slate-400">— {a.author || 'Anonymous'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Password prompt if locked */}
              {!isUnlocked && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Protected Action: Edit Password Required
                    </label>
                    <span className="text-[10px] text-[#7D766C] dark:text-slate-400 font-mono">Password: 9500</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter edit password (9500)"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePerformImport();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#D5CFC5] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266]"
                  />
                  {passwordError && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      {passwordError}
                    </p>
                  )}
                </div>
              )}

              {/* Success Notification */}
              {importSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">
                    Relational workbook data successfully imported and committed to database!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#5C554B] dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {summary && (
            <button
              type="button"
              onClick={handlePerformImport}
              disabled={isImporting || importSuccess || summary.validRowsCount === 0 || (importMode === 'replace' && !confirmReplace)}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-[#5B8266] hover:bg-[#4E7057] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Relational Records...</span>
                </>
              ) : importSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Import Complete!</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Confirm & Import ({summary.validRowsCount} records)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
