import React, { useState } from 'react';
import { HRTask, KeepNote } from '../types';
import { executeEmergencyExit } from '../services/excelEngine';
import { Power, FileSpreadsheet, AlertTriangle, ExternalLink, X } from 'lucide-react';

interface EmergencyExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: HRTask[];
  notes: KeepNote[];
}

export const EmergencyExitModal: React.FC<EmergencyExitModalProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmExit = () => {
    setIsExecuting(true);
    executeEmergencyExit(tasks, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-600 text-white rounded-lg">
              <Power className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-red-950 dark:text-red-200">
                Emergency Exit & Auto-Backup
              </h2>
              <p className="text-xs text-red-700 dark:text-red-300">
                Flow E: Safe close with dated Excel export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Before exiting, the system will instantly download a complete multi-sheet Excel (.xlsx) disaster-recovery backup containing all <strong>{tasks.length} HR tasks</strong> and <strong>{notes.length} keep notes</strong>.
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400">
            You will then be safely redirected to the official corporate portal:
            <div className="font-mono font-semibold text-slate-900 dark:text-slate-200 mt-1 flex items-center gap-1">
              <span>https://www.Vigneshhr.online</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isExecuting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExecuting}
              onClick={handleConfirmExit}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExecuting ? 'Exporting & Exiting...' : 'Backup & Exit Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
