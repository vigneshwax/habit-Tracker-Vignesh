import React, { useState } from 'react';
import { HRTask, KeepNote, ImportPreviewResult } from '../types';
import { exportToMultiSheetExcel, exportTasksToCSV, parseExcelOrCsvFile } from '../services/excelEngine';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: HRTask[];
  notes: KeepNote[];
  onConfirmImport: (importedTasks: HRTask[], importedNotes: KeepNote[], mode: 'merge' | 'replace') => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
  onConfirmImport,
}) => {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSelectedFileName(file.name);
    setIsLoading(true);

    try {
      const result = await parseExcelOrCsvFile(file);
      if (result.tasks.length === 0 && result.notes.length === 0) {
        setErrorMsg('No valid tasks or notes could be found in the file. Please check column headers.');
        setPreview(null);
      } else {
        setPreview(result);
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      setErrorMsg(`Failed to parse file: ${err?.message || 'Unsupported format'}`);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!preview) return;
    onConfirmImport(preview.tasks, preview.notes, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Excel & CSV Engine (Tier 3 Storage)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-sheet workbook backup, disaster recovery, and data import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* SECTION 1: EXPORT OPTIONS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" /> Export Local Workspace
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => exportToMultiSheetExcel(tasks, notes)}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-left transition"
              >
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Multi-Sheet Excel (.xlsx)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Includes "HR Tasks" + "Notes" tabs with full metadata
                  </div>
                  <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                    {tasks.length} tasks • {notes.length} notes
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => exportTasksToCSV(tasks)}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition"
              >
                <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    HR Tasks CSV (.csv)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Plain CSV export suitable for data pipelines & reporting
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1">
                    {tasks.length} total tasks
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: IMPORT ENGINE */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-600" /> Import & Restore (.xlsx, .xls, .csv)
            </h3>

            {/* File upload drag area */}
            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {selectedFileName || 'Click to select or drag and drop spreadsheet'}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                Supports Excel (.xlsx, .xls) and CSV (.csv)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {isLoading && (
              <div className="flex items-center justify-center py-4 text-sm text-indigo-600 font-medium">
                Parsing spreadsheet data...
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 mt-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Preview Card */}
            {preview && (
              <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      File Parsed Successfully
                    </span>
                  </div>
                  <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {preview.tasks.length} Tasks • {preview.notes.length} Notes
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span>Merge with existing records</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-indigo-600"
                    />
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Replace existing records
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="w-full mt-2 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Confirm & Apply {importMode === 'merge' ? 'Merge' : 'Overwrite'} Import
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
