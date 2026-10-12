import * as XLSX from 'xlsx';
import { HRTask, KeepNote, ImportPreviewResult } from '../types';

/**
 * Format today's date for filenames (e.g. 2026-10-08)
 */
function getFormattedDateStamp(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${mins}`;
}

/**
 * FLOW D1: Multi-Sheet Excel Export (.xlsx)
 * Sheet 1: "HR Tasks"
 * Sheet 2: "Notes"
 */
export function exportToMultiSheetExcel(tasks: HRTask[], notes: KeepNote[], filenamePrefix = 'HR_Command_Center'): void {
  const wb = XLSX.utils.book_new();

  // 1. Prepare HR Tasks Rows
  const taskRows = tasks.map((t) => ({
    'Task ID': t.id,
    'Date': t.date,
    'Time': t.time,
    'Task Title': t.title,
    'Category': t.category,
    'Priority': t.priority,
    'Status': t.status,
    'Assigned To': t.assignedTo || '',
    'Description': t.description || '',
    'Internal Notes': t.notes || '',
    'Follow-Up Date': t.followUpDate || '',
    'Created At': t.createdAt || '',
    'Updated At': t.updatedAt || '',
  }));

  const taskWs = XLSX.utils.json_to_sheet(taskRows);
  XLSX.utils.book_append_sheet(wb, taskWs, 'HR Tasks');

  // 2. Prepare Notes Rows
  const noteRows = notes.map((n) => {
    let checklistSummary = '';
    if (n.checklistItems && n.checklistItems.length > 0) {
      checklistSummary = n.checklistItems
        .map((item) => `[${item.completed ? 'x' : ' '}] ${item.text}`)
        .join(' | ');
    }

    return {
      'Note ID': n.id,
      'Title': n.title,
      'Content': n.content,
      'Type': n.type,
      'Checklist Progress': checklistSummary,
      'Category / Tag': n.category || '',
      'Pinned': n.pinned ? 'Yes' : 'No',
      'Color': n.color || 'amber',
      'Created At': n.createdAt,
      'Updated At': n.updatedAt,
    };
  });

  const noteWs = XLSX.utils.json_to_sheet(noteRows);
  XLSX.utils.book_append_sheet(wb, noteWs, 'Notes');

  // 3. Trigger Download
  const filename = `${filenamePrefix}_${getFormattedDateStamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * FLOW D2: Export Tasks as CSV
 */
export function exportTasksToCSV(tasks: HRTask[], filenamePrefix = 'HR_Tasks_Export'): void {
  const taskRows = tasks.map((t) => ({
    'Task ID': t.id,
    'Date': t.date,
    'Time': t.time,
    'Task Title': t.title,
    'Category': t.category,
    'Priority': t.priority,
    'Status': t.status,
    'Assigned To': t.assignedTo || '',
    'Description': t.description || '',
    'Internal Notes': t.notes || '',
    'Follow-Up Date': t.followUpDate || '',
  }));

  const ws = XLSX.utils.json_to_sheet(taskRows);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${getFormattedDateStamp()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes Excel dates (handles serial numbers like 45573, Date objects, or string dates)
 */
function normalizeDateValue(raw: any): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (typeof raw === 'number') {
    // Excel serial date to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + raw * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes time string (e.g. "10:30 AM")
 */
function normalizeTimeValue(raw: any): string {
  if (!raw) return '09:00 AM';
  const str = String(raw).trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(str)) {
    return str.toUpperCase();
  }
  return str || '09:00 AM';
}

/**
 * FLOW D3: Flexible Excel / CSV Import Parser
 * Parses multi-sheet workbooks or CSV files, mapping flexible header variations
 */
export async function parseExcelOrCsvFile(file: File): Promise<ImportPreviewResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const tasks: HRTask[] = [];
  const notes: KeepNote[] = [];
  let skippedCount = 0;
  let totalParsed = 0;

  // Search for Tasks sheet or parse first sheet if single-sheet
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

    const isNotesSheet = sheetName.toLowerCase().includes('note');

    if (isNotesSheet) {
      // Parse Notes sheet
      rawRows.forEach((row, idx) => {
        totalParsed++;
        const title = findFieldValue(row, ['note title', 'title', 'subject', 'headline', 'name']);
        const content = findFieldValue(row, ['content', 'description', 'body', 'text', 'notes']);

        if (!title && !content) {
          skippedCount++;
          return;
        }

        const id = findFieldValue(row, ['note id', 'id']) || `note-${Date.now()}-${idx}`;
        const typeRaw = findFieldValue(row, ['type', 'note type']) || 'text';
        const category = findFieldValue(row, ['category / tag', 'category', 'tag', 'department']) || 'General';
        const pinnedRaw = findFieldValue(row, ['pinned', 'pin', 'favorite']);
        const pinned = String(pinnedRaw).toLowerCase() === 'yes' || String(pinnedRaw).toLowerCase() === 'true';
        const color = findFieldValue(row, ['color', 'theme']) || 'amber';

        // Parse checklist if present
        const checklistRaw = findFieldValue(row, ['checklist progress', 'checklist items', 'checklist']);
        let checklistItems: { id: string; text: string; completed: boolean }[] | undefined = undefined;

        if (checklistRaw && String(checklistRaw).includes('|')) {
          checklistItems = String(checklistRaw)
            .split('|')
            .map((item, itemIdx) => {
              const trimmed = item.trim();
              const completed = trimmed.startsWith('[x]') || trimmed.startsWith('[X]');
              const text = trimmed.replace(/^\[[ xX]\]/, '').trim();
              return { id: `item-${itemIdx}`, text, completed };
            });
        }

        notes.push({
          id: String(id),
          title: String(title || 'Untitled Note'),
          content: String(content || ''),
          type: typeRaw.toLowerCase().includes('check') ? 'checklist' : 'text',
          checklistItems,
          category: String(category),
          pinned,
          color: String(color),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    } else {
      // Parse Tasks sheet
      rawRows.forEach((row, idx) => {
        totalParsed++;
        const title = findFieldValue(row, [
          'task title',
          'task name',
          'title',
          'activity',
          'activity summary',
          'subject',
          'task',
          'name',
        ]);

        if (!title) {
          skippedCount++;
          return;
        }

        const id = findFieldValue(row, ['task id', 'id', 'uuid']) || `task-${Date.now()}-${idx}`;
        const dateRaw = findFieldValue(row, ['date', 'due date', 'scheduled date', 'start date']);
        const timeRaw = findFieldValue(row, ['time', 'due time', 'display time', 'schedule time']);
        const category = findFieldValue(row, ['category', 'department', 'type', 'domain']) || 'General';
        const priorityRaw = findFieldValue(row, ['priority', 'urgency', 'level']) || 'Medium';
        const statusRaw = findFieldValue(row, ['status', 'state', 'stage']) || 'Pending';
        const assignedTo = findFieldValue(row, ['assigned to', 'assigned', 'owner', 'staff', 'hr officer', 'assignee']) || '';
        const description = findFieldValue(row, ['description', 'details', 'steps', 'summary']) || '';
        const internalNotes = findFieldValue(row, ['internal notes', 'notes', 'comments', 'updates']) || '';
        const followUpRaw = findFieldValue(row, ['follow-up date', 'follow up date', 'reminder date', 'alert date']) || '';

        // Priority normalization
        let priority: 'High' | 'Medium' | 'Low' = 'Medium';
        const pLower = String(priorityRaw).toLowerCase();
        if (pLower.includes('high') || pLower.includes('urgent')) priority = 'High';
        else if (pLower.includes('low')) priority = 'Low';

        // Status normalization
        let status: 'Pending' | 'In Progress' | 'Completed' | 'Deferred' = 'Pending';
        const sLower = String(statusRaw).toLowerCase();
        if (sLower.includes('comp') || sLower.includes('done')) status = 'Completed';
        else if (sLower.includes('prog') || sLower.includes('doing') || sLower.includes('active')) status = 'In Progress';
        else if (sLower.includes('defer') || sLower.includes('delay') || sLower.includes('hold')) status = 'Deferred';

        tasks.push({
          id: String(id),
          title: String(title),
          date: normalizeDateValue(dateRaw),
          time: normalizeTimeValue(timeRaw),
          category: String(category),
          priority,
          status,
          assignedTo: String(assignedTo),
          description: String(description),
          notes: String(internalNotes),
          followUpDate: followUpRaw ? normalizeDateValue(followUpRaw) : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }
  }

  return {
    tasks,
    notes,
    skippedCount,
    totalParsed,
  };
}

/**
 * Helper to match keys case-insensitively
 */
function findFieldValue(row: Record<string, any>, candidates: string[]): any {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const foundKey = rowKeys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return row[foundKey];
    }
  }
  return undefined;
}

/**
 * FLOW E: Emergency Exit & Auto-Backup on Close
 * 1. Generates multi-sheet Excel file snapshot (.xlsx).
 * 2. Triggers download to user's computer.
 * 3. Safely redirects to www.Vigneshhr.online.
 */
export function executeEmergencyExit(tasks: HRTask[], notes: KeepNote[]): void {
  try {
    // Generate snapshot export
    exportToMultiSheetExcel(tasks, notes, 'HR_Command_Center_Exit_Backup');
  } catch (err) {
    console.error('[Emergency Exit] Export notice:', err);
  }

  // Redirect to official portal
  setTimeout(() => {
    window.location.href = 'https://www.Vigneshhr.online';
  }, 900);
}
