import React, { useState, useEffect } from 'react';
import {
  Table,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Clipboard,
  Check,
  X,
  FileSpreadsheet,
  Sparkles,
  ArrowDown,
  ArrowRight,
  Columns,
} from 'lucide-react';
import {
  ColumnAlignment,
  MarkdownTableData,
  formatTableToMarkdown,
  parseSpreadsheetPaste,
  parseMarkdownTableLines,
} from '../../utils/markdownUtils';

interface TableEditorModalProps {
  isOpen: boolean;
  initialMarkdown?: string;
  onClose: () => void;
  onInsertTable: (markdown: string) => void;
}

const PRESET_TABLES: Array<{
  name: string;
  description: string;
  data: MarkdownTableData;
}> = [
  {
    name: 'Employee Directory',
    description: 'Example from prompt (Employee, Department, Status)',
    data: {
      headers: ['Employee', 'Department', 'Status'],
      alignments: ['left', 'left', 'center'],
      rows: [
        ['Arun', 'HR', 'Active'],
        ['Priya', 'Finance', 'Active'],
        ['Kumar', 'IT', 'Inactive'],
      ],
    },
  },
  {
    name: 'Weekly Habit Matrix',
    description: 'Track daily habits across Monday to Sunday',
    data: {
      headers: ['Habit', 'Target', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      alignments: ['left', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center'],
      rows: [
        ['Deep Work (2h)', '5/wk', '✓', '✓', '✓', '✓', '✓', '-', '-'],
        ['Hydration (3L)', '7/wk', '✓', '✓', '✓', '✓', '✓', '✓', '✓'],
        ['Workout / Run', '4/wk', '✓', '-', '✓', '-', '✓', '✓', '-'],
      ],
    },
  },
  {
    name: 'Project Milestones',
    description: 'Features, priority, owner, and deadline tracking',
    data: {
      headers: ['Feature / Task', 'Priority', 'Owner', 'Due Date', 'Status'],
      alignments: ['left', 'center', 'left', 'center', 'center'],
      rows: [
        ['Obsidian Note Linking', 'High', 'Vignesh', '2026-10-15', 'Completed'],
        ['Markdown Table Editor', 'High', 'Vignesh', '2026-10-18', 'In Progress'],
        ['Knowledge Graph Sync', 'Medium', 'Vignesh', '2026-10-22', 'Planned'],
      ],
    },
  },
  {
    name: 'Pros & Cons',
    description: 'Two-column decision making table',
    data: {
      headers: ['Factor', 'Pros', 'Cons', 'Weight'],
      alignments: ['left', 'left', 'left', 'center'],
      rows: [
        ['Option A', 'Fast execution, low cost', 'Limited scaling', 'High'],
        ['Option B', 'Robust architecture, extensible', 'Requires setup time', 'High'],
      ],
    },
  },
];

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
  isOpen,
  initialMarkdown,
  onClose,
  onInsertTable,
}) => {
  const [headers, setHeaders] = useState<string[]>(['Column 1', 'Column 2', 'Column 3']);
  const [alignments, setAlignments] = useState<ColumnAlignment[]>(['left', 'left', 'left']);
  const [rows, setRows] = useState<string[][]>([
    ['Cell 1-1', 'Cell 1-2', 'Cell 1-3'],
    ['Cell 2-1', 'Cell 2-2', 'Cell 2-3'],
  ]);

  // Tab view inside modal: 'visual' | 'paste' | 'preview'
  const [activeTab, setActiveTab] = useState<'visual' | 'paste' | 'preview'>('visual');
  const [pasteInput, setPasteInput] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Initialize from existing table markdown if provided
  useEffect(() => {
    if (initialMarkdown && initialMarkdown.trim()) {
      const lines = initialMarkdown.trim().split('\n');
      const parsed = parseMarkdownTableLines(lines);
      if (parsed) {
        setHeaders(parsed.headers);
        setAlignments(parsed.alignments);
        setRows(parsed.rows);
      }
    } else {
      // Default 3x3 table
      setHeaders(['Column 1', 'Column 2', 'Column 3']);
      setAlignments(['left', 'left', 'left']);
      setRows([
        ['', '', ''],
        ['', '', ''],
      ]);
    }
  }, [initialMarkdown, isOpen]);

  if (!isOpen) return null;

  // Formatting current table data
  const currentMarkdown = formatTableToMarkdown({ headers, alignments, rows });

  // Column operations
  const addColumn = (atIndex?: number) => {
    const newIdx = atIndex !== undefined ? atIndex + 1 : headers.length;
    const newHeaders = [...headers];
    newHeaders.splice(newIdx, 0, `Col ${newHeaders.length + 1}`);

    const newAlign = [...alignments];
    newAlign.splice(newIdx, 0, 'left');

    const newRows = rows.map((r) => {
      const copy = [...r];
      copy.splice(newIdx, 0, '');
      return copy;
    });

    setHeaders(newHeaders);
    setAlignments(newAlign);
    setRows(newRows);
  };

  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIdx));
    setAlignments(alignments.filter((_, i) => i !== colIdx));
    setRows(rows.map((r) => r.filter((_, i) => i !== colIdx)));
  };

  const toggleAlignment = (colIdx: number) => {
    const cur = alignments[colIdx] || 'left';
    const next: ColumnAlignment = cur === 'left' ? 'center' : cur === 'center' ? 'right' : 'left';
    const updated = [...alignments];
    updated[colIdx] = next;
    setAlignments(updated);
  };

  // Row operations
  const addRow = (atIndex?: number) => {
    const newIdx = atIndex !== undefined ? atIndex + 1 : rows.length;
    const newRow = headers.map(() => '');
    const updated = [...rows];
    updated.splice(newIdx, 0, newRow);
    setRows(updated);
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) {
      setRows([headers.map(() => '')]);
      return;
    }
    setRows(rows.filter((_, i) => i !== rowIdx));
  };

  // Cell edits
  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const updated = rows.map((r, rI) => {
      if (rI !== rowIdx) return r;
      const newRow = [...r];
      newRow[colIdx] = value;
      return newRow;
    });
    setRows(updated);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    const updated = [...headers];
    updated[colIdx] = value;
    setHeaders(updated);
  };

  // Apply spreadsheet paste
  const handleApplyPaste = () => {
    if (!pasteInput.trim()) return;
    const parsed = parseSpreadsheetPaste(pasteInput);
    setHeaders(parsed.headers);
    setAlignments(parsed.alignments);
    setRows(parsed.rows);
    setPasteInput('');
    setActiveTab('visual');
  };

  // Load Preset
  const handleLoadPreset = (preset: typeof PRESET_TABLES[0]) => {
    setHeaders([...preset.data.headers]);
    setAlignments([...preset.data.alignments]);
    setRows(preset.data.rows.map((r) => [...r]));
  };

  // Insert into note
  const handleInsert = () => {
    onInsertTable(currentMarkdown);
    onClose();
  };

  // Copy Markdown
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(currentMarkdown);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-400 flex items-center justify-center">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1A1815] dark:text-white">
                Interactive Markdown Table Editor
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Design tables, paste spreadsheet data from Excel or Google Sheets, and insert into note
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-navigation tabs & Preset bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-stone-50/70 dark:bg-slate-800/40 border-b border-stone-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-stone-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-[#EBF3EE] dark:bg-emerald-950 text-[#2E5A39] dark:text-emerald-300 font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              Visual Grid ({rows.length} × {headers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-[#EBF3EE] dark:bg-emerald-950 text-[#2E5A39] dark:text-emerald-300 font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Paste Excel / Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#EBF3EE] dark:bg-emerald-950 text-[#2E5A39] dark:text-emerald-300 font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              Markdown Code
            </button>
          </div>

          {/* Quick Presets dropdown or chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-stone-400 uppercase font-mono font-semibold">Presets:</span>
            {PRESET_TABLES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'visual' && (
            <div className="space-y-4">
              {/* Grid Control Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addRow()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-stone-100 border border-stone-200 dark:border-slate-700 font-medium text-stone-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Row</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addColumn()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-stone-100 border border-stone-200 dark:border-slate-700 font-medium text-stone-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Column</span>
                  </button>
                </div>

                <div className="text-[11px] text-stone-400 dark:text-slate-500 font-mono">
                  Tip: Click alignment icon on header to toggle Left / Center / Right
                </div>
              </div>

              {/* Interactive Table Grid */}
              <div className="overflow-x-auto border border-stone-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  {/* Table Headers */}
                  <thead>
                    <tr className="bg-[#FAF8F5] dark:bg-slate-800/90 border-b border-stone-200 dark:border-slate-700">
                      <th className="w-12 px-2 py-2 text-center text-xs font-mono text-stone-400 border-r border-stone-200 dark:border-slate-800">
                        #
                      </th>
                      {headers.map((header, colIdx) => (
                        <th
                          key={colIdx}
                          className="p-2 border-r border-stone-200 dark:border-slate-800 relative group min-w-[140px]"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                              placeholder={`Column ${colIdx + 1}`}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            {/* Alignment Button */}
                            <button
                              type="button"
                              onClick={() => toggleAlignment(colIdx)}
                              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-500 dark:text-slate-400 cursor-pointer"
                              title={`Current: ${alignments[colIdx]}. Click to change alignment`}
                            >
                              {alignments[colIdx] === 'center' ? (
                                <AlignCenter className="w-3.5 h-3.5 text-emerald-600" />
                              ) : alignments[colIdx] === 'right' ? (
                                <AlignRight className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <AlignLeft className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                            {/* Delete Column Button */}
                            {headers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeColumn(colIdx)}
                                className="p-1 rounded hover:bg-red-100 text-stone-400 hover:text-red-500 cursor-pointer"
                                title="Delete column"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => addColumn()}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          title="Add column to end"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-stone-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Row Number & Delete Row */}
                        <td className="px-2 py-1.5 text-center text-xs font-mono text-stone-400 border-r border-stone-200 dark:border-slate-800 bg-stone-50/40 dark:bg-slate-900/40">
                          <div className="flex items-center justify-center gap-1">
                            <span>{rowIdx + 1}</span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRow(rowIdx)}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-stone-300 p-0.5 cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Row Cells */}
                        {row.map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-1.5 border-r border-stone-200 dark:border-slate-800"
                          >
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                              placeholder="..."
                              className={`w-full px-2 py-1 bg-transparent border border-transparent hover:border-stone-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 rounded-lg text-xs text-stone-800 dark:text-slate-200 focus:outline-none transition-all ${
                                alignments[colIdx] === 'center'
                                  ? 'text-center'
                                  : alignments[colIdx] === 'right'
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            />
                          </td>
                        ))}

                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(rowIdx)}
                            className="text-stone-300 hover:text-red-500 p-1 cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom add row button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => addRow()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-stone-300 dark:border-slate-700 hover:border-emerald-500 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Row Below</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-[#2E5A39] dark:text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Paste Tab-Delimited Data from Excel or Google Sheets</span>
                </div>
                <p>
                  Copy any block of cells in Excel or Google Sheets (Ctrl+C / Cmd+C) and paste below. The editor will automatically convert the clipboard into a Markdown table with matching columns and rows.
                </p>
              </div>

              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder={`Paste here...\n\nExample:\nEmployee\tDepartment\tStatus\nArun\tHR\tActive\nPriya\tFinance\tActive\nKumar\tIT\tInactive`}
                rows={10}
                className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasteInput('')}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApplyPaste}
                  disabled={!pasteInput.trim()}
                  className="px-5 py-2 rounded-xl bg-[#2E5A39] hover:bg-[#23462C] text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Parse & Convert to Table
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-stone-500 dark:text-slate-400">
                  Formatted Markdown Table Code:
                </span>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-slate-300 text-xs font-mono cursor-pointer"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                {currentMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-900/80">
          <div className="text-xs text-stone-500 dark:text-slate-400">
            {headers.length} columns • {rows.length} rows
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 rounded-xl bg-[#2E5A39] hover:bg-[#23462C] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Insert Table Into Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
