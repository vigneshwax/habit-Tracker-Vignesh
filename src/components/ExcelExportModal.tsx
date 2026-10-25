import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Check,
  CheckSquare,
  Square,
  Layers,
  Calendar,
  Smile,
  Target,
  BookOpen,
  Settings,
  HelpCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  TableProperties,
} from 'lucide-react';
import {
  FullExportData,
  SupportedTableName,
  RELATIONAL_TABLES,
  POSTGRESQL_SCHEMA_DICTIONARY,
  downloadExcelWorkbook,
  downloadExcelTemplate,
} from '../utils/excel';
import { localStorageService } from '../services/localStorageService';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportData: FullExportData;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  exportData,
}) => {
  const [exportMode, setExportMode] = useState<'all' | 'custom' | 'schema'>('all');
  const [activeExportData, setActiveExportData] = useState<FullExportData>(exportData);
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Record<SupportedTableName, boolean>>({
    affirmations: true,
    daily_journal: true,
    goals: true,
    habit_categories: true,
    habit_entries: true,
    habits: true,
    mood_tracker: true,
    notes: true,
    reflections: true,
    settings: true,
    tasks: true,
    weekly_plans: true,
    weekly_reviews: true,
    categories: true,
    monthly_reflections: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);

  // Fetch complete multi-month/historical database on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    const fetchFullDataset = async () => {
      setIsLoadingFullData(true);
      try {
        const res = await fetch('/api/export?format=json');
        if (res.ok) {
          const fullJson = await res.json();
          if (!isCancelled && fullJson && typeof fullJson === 'object') {
            // Also merge with client-side notes and tasks if present
            const localNotes = localStorageService.getNotes();
            const localTasks = localStorageService.getTasks();

            const combinedTasks = (fullJson.tasks && fullJson.tasks.length > 0)
              ? fullJson.tasks
              : localTasks;

            const combinedNotes = (fullJson.notes && fullJson.notes.length > 0)
              ? fullJson.notes
              : localNotes;

            setActiveExportData({
              ...exportData,
              ...fullJson,
              tasks: combinedTasks,
              notes: combinedNotes,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch full dataset for export, falling back to in-memory state:', err);
      } finally {
        if (!isCancelled) setIsLoadingFullData(false);
      }
    };

    fetchFullDataset();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, exportData]);

  if (!isOpen) return null;

  const tableList: SupportedTableName[] = [
    'affirmations',
    'daily_journal',
    'goals',
    'habit_categories',
    'habit_entries',
    'habits',
    'mood_tracker',
    'notes',
    'reflections',
    'settings',
    'tasks',
    'weekly_plans',
    'weekly_reviews',
  ];

  const getRecordCount = (tbl: SupportedTableName): number => {
    switch (tbl) {
      case 'affirmations':
        return activeExportData.affirmations?.length || 0;
      case 'daily_journal':
        return activeExportData.daily_journal?.length || 0;
      case 'goals':
        return activeExportData.goals?.length || 0;
      case 'habit_categories':
      case 'categories':
        return (activeExportData.habit_categories || activeExportData.categories)?.length || 0;
      case 'habit_entries':
        return activeExportData.habit_entries?.length || 0;
      case 'habits':
        return activeExportData.habits?.length || 0;
      case 'mood_tracker':
        return activeExportData.mood_tracker?.length || 0;
      case 'notes':
        return activeExportData.notes?.length || 0;
      case 'tasks':
        return activeExportData.tasks?.length || 0;
      case 'reflections':
      case 'monthly_reflections':
        return activeExportData.reflections?.length || 0;
      case 'settings':
        return activeExportData.settings ? Object.keys(activeExportData.settings).length : 0;
      case 'weekly_plans':
        return activeExportData.weekly_plans?.length || 0;
      case 'weekly_reviews':
        return activeExportData.weekly_reviews?.length || 0;
      default:
        return 0;
    }
  };

  const totalRecords = tableList.reduce((acc, t) => acc + getRecordCount(t), 0);
  const selectedCount = tableList.filter((t) => selectedTables[t]).length;
  const selectedRecordsCount = tableList
    .filter((t) => (exportMode === 'all' || exportMode === 'schema' ? true : selectedTables[t]))
    .reduce((acc, t) => acc + getRecordCount(t), 0);

  const toggleTable = (tbl: SupportedTableName) => {
    setSelectedTables((prev) => ({
      ...prev,
      [tbl]: !prev[tbl],
    }));
  };

  const selectAll = () => {
    const all: Record<SupportedTableName, boolean> = {} as any;
    tableList.forEach((t) => (all[t] = true));
    setSelectedTables(all);
  };

  const deselectAll = () => {
    const none: Record<SupportedTableName, boolean> = {} as any;
    tableList.forEach((t) => (none[t] = false));
    setSelectedTables(none);
  };

  const handleDownload = () => {
    setIsExporting(true);
    setExportedFilename(null);
    try {
      const activeTables = exportMode === 'custom' ? tableList.filter((t) => selectedTables[t]) : undefined;
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `vignesh_habits_relational_${dateStr}.xlsx`;

      downloadExcelWorkbook(activeExportData, filename, {
        selectedTables: activeTables,
      });

      setExportedFilename(filename);
      setTimeout(() => {
        setIsExporting(false);
      }, 800);
    } catch (err) {
      console.error('Failed to export relational workbook:', err);
      setIsExporting(false);
    }
  };

  const getTableIcon = (tbl: SupportedTableName) => {
    switch (tbl) {
      case 'affirmations':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'daily_journal':
        return <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case 'goals':
        return <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'habit_categories':
      case 'categories':
        return <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'habit_entries':
        return <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'habits':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'mood_tracker':
        return <Smile className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'reflections':
      case 'monthly_reflections':
        return <TableProperties className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case 'settings':
        return <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />;
      case 'weekly_plans':
        return <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'weekly_reviews':
        return <BookOpen className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
      case 'tasks':
        return <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'notes':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <TableProperties className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl border border-[#ECE6DC] dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4.5 border-b border-[#ECE6DC] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5]/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#3D6B4E] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800/80 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-2">
                Export Relational Excel
                <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  .xlsx (Multi-Sheet)
                </span>
              </h3>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                Database-structured workbook with foreign keys, primary keys, and auto-filters
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

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5 flex-1 text-xs">
          {/* Export Mode Toggle */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] dark:bg-slate-800/70 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setExportMode('all')}
              className={`py-2 px-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                exportMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-[#ECE6DC] dark:border-slate-700'
                  : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26]'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>All Tables ({tableList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setExportMode('custom')}
              className={`py-2 px-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                exportMode === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-[#ECE6DC] dark:border-slate-700'
                  : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26]'
              }`}
            >
              <span>Custom Select</span>
            </button>

            <button
              type="button"
              onClick={() => setExportMode('schema')}
              className={`py-2 px-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                exportMode === 'schema'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-[#ECE6DC] dark:border-slate-700'
                  : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26]'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>PostgreSQL Schema</span>
            </button>
          </div>

          {exportMode === 'schema' ? (
            /* PostgreSQL Database Structure Dictionary */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#7D766C] dark:text-slate-400">
                <span className="font-bold text-[#4A453E] dark:text-slate-300">
                  Database Structure (11 Tables • {POSTGRESQL_SCHEMA_DICTIONARY.length} Columns):
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Included in DATABASE_SCHEMA Sheet
                </span>
              </div>

              <div className="border border-[#ECE6DC] dark:border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="sticky top-0 bg-[#F5EFE6] dark:bg-slate-800 text-[#4A453E] dark:text-slate-200 border-b border-[#ECE6DC] dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-2.5 font-bold">Table</th>
                      <th className="py-2 px-2 font-bold">Column</th>
                      <th className="py-2 px-2 font-bold">Type</th>
                      <th className="py-2 px-2 font-bold">Null</th>
                      <th className="py-2 px-2 font-bold">Key</th>
                      <th className="py-2 px-2.5 font-bold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE6DC] dark:divide-slate-800 font-mono text-[10.5px]">
                    {POSTGRESQL_SCHEMA_DICTIONARY.map((col, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-1.5 px-2.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          {col.table_name}
                        </td>
                        <td className="py-1.5 px-2 text-[#2D2A26] dark:text-slate-100 font-bold">
                          {col.column}
                        </td>
                        <td className="py-1.5 px-2 text-indigo-600 dark:text-indigo-400">
                          {col.data_type}
                        </td>
                        <td className="py-1.5 px-2 text-[#7D766C] dark:text-slate-400">
                          {col.nullable}
                        </td>
                        <td className="py-1.5 px-2">
                          {col.primary_key === 'YES' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                              PK
                            </span>
                          ) : col.foreign_key !== 'none' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                              FK
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 font-sans text-[10.5px] text-[#5C554B] dark:text-slate-300">
                          {col.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Table Selection Checklist (Shown when all or custom) */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#7D766C] dark:text-slate-400">
                <span className="font-bold text-[#4A453E] dark:text-slate-300">
                  Worksheet Tables ({selectedRecordsCount} records total):
                </span>
                {exportMode === 'custom' && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {tableList.map((tbl) => {
                  const meta = RELATIONAL_TABLES[tbl];
                  const count = getRecordCount(tbl);
                  const isChecked = exportMode === 'all' ? true : selectedTables[tbl];

                  return (
                    <div
                      key={tbl}
                      onClick={() => {
                        if (exportMode === 'custom') toggleTable(tbl);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-[#FAF8F5]/60 dark:bg-slate-800/40 border-[#ECE6DC] dark:border-slate-800 opacity-60'
                      } ${exportMode === 'custom' ? 'cursor-pointer hover:border-emerald-400' : ''}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {exportMode === 'custom' && (
                          <div>
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        )}
                        {getTableIcon(tbl)}
                        <div className="truncate">
                          <span className="font-mono font-semibold text-[#2D2A26] dark:text-white">
                            {meta.name}
                          </span>
                          <div className="text-[10px] text-[#7D766C] dark:text-slate-400 truncate">
                            PK: {meta.primaryKey}
                            {meta.foreignKeys !== 'none' && ` • FK: ${meta.foreignKeys.split('->')[0].trim()}`}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 text-[#4A453E] dark:text-slate-300 shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Database Specs Banner */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#ECE6DC] dark:border-slate-700 text-[11px] space-y-1.5 leading-relaxed text-[#5C554B] dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-[#2D2A26] dark:text-white">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Strict Relational Formatting:</span>
            </div>
            <div>
              • <strong>Row 1 Headers:</strong> Strictly column names matching database schema with zero decorative or merged rows.
            </div>
            <div>
              • <strong>README Sheet:</strong> Included automatically with table definitions, foreign keys, and date format standards.
            </div>
            <div>
              • <strong>Ready for Excel & Google Sheets:</strong> Freeze panes and auto-filters configured for immediate data filtering.
            </div>
          </div>

          {/* Export Success receipt */}
          {exportedFilename && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Successfully downloaded <strong>{exportedFilename}</strong>!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => downloadExcelTemplate()}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>Download Blank Template</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#5C554B] dark:text-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || (exportMode === 'custom' && selectedCount === 0)}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.01] disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Workbook...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx ({selectedRecordsCount} rows)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
