import * as XLSX from 'xlsx';
import { HRTask, HRNote, HRTaskPriority, HRTaskStatus } from '../types';
import { localStorageService } from './localStorageService';
import { googleSheetsService } from './googleSheetsService';

export interface ParsedImportPreview {
  tasks: HRTask[];
  notes: HRNote[];
  totalTasks: number;
  totalNotes: number;
  fileName: string;
}

class ExcelService {
  // ==========================================
  // EXPORT TO EXCEL WORKBOOK (.xlsx)
  // ==========================================
  public exportToExcel(customFilename?: string): void {
    const tasks = localStorageService.getTasks();
    const notes = localStorageService.getNotes();

    const wb = XLSX.utils.book_new();

    // 1. Format HR Tasks Sheet
    const taskRows = tasks.map((t) => ({
      ID: t.id,
      Date: t.date,
      Time: t.time || '09:00',
      'Task Name': t.title || t.name,
      Description: t.description || '',
      Category: t.category || 'general',
      Priority: t.priority || 'Medium',
      Status: t.status || 'Pending',
      'Assigned To': t.assignedTo || 'Vignesh',
      Notes: t.notes || '',
      'Follow Up Date': t.followUpDate || '',
      'Created At': t.createdAt || t.created_at || '',
      'Updated At': t.updatedAt || t.updated_at || '',
    }));

    const wsTasks = XLSX.utils.json_to_sheet(taskRows);
    XLSX.utils.book_append_sheet(wb, wsTasks, 'HR Tasks');

    // 2. Format Notes Sheet
    const noteRows = notes.map((n) => ({
      ID: n.id,
      Title: n.title,
      Content: n.content,
      Type: n.type,
      Checklist: n.checklistItems
        ? n.checklistItems.map((item) => `[${item.completed ? 'x' : ' '}] ${item.text}`).join('; ')
        : '',
      Category: n.category || 'General',
      Pinned: n.pinned ? 'Yes' : 'No',
      Color: n.color || '',
      'Created At': n.createdAt,
      'Updated At': n.updatedAt,
    }));

    const wsNotes = XLSX.utils.json_to_sheet(noteRows);
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Notes');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = customFilename || `HR_Tasks_Export_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // ==========================================
  // EXPORT TO CSV
  // ==========================================
  public exportToCSV(customFilename?: string): void {
    const tasks = localStorageService.getTasks();
    const taskRows = tasks.map((t) => ({
      ID: t.id,
      Date: t.date,
      Time: t.time || '09:00',
      'Task Name': t.title || t.name,
      Description: t.description || '',
      Category: t.category || 'general',
      Priority: t.priority || 'Medium',
      Status: t.status || 'Pending',
      'Assigned To': t.assignedTo || 'Vignesh',
      Notes: t.notes || '',
      'Follow Up Date': t.followUpDate || '',
    }));

    const ws = XLSX.utils.json_to_sheet(taskRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = customFilename || `HR_Tasks_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // READ AND PARSE EXCEL / CSV FILE (PREVIEW)
  // ==========================================
  public async parseFileForPreview(file: File): Promise<ParsedImportPreview> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    let rawTaskRows: any[] = [];
    let rawNoteRows: any[] = [];

    // Check sheet names
    const taskSheetName = wb.SheetNames.find(
      (name) =>
        name.toLowerCase().includes('hr task') ||
        name.toLowerCase().includes('task') ||
        name.toLowerCase().includes('habit')
    ) || wb.SheetNames[0];

    const noteSheetName = wb.SheetNames.find(
      (name) => name.toLowerCase().includes('note') || name.toLowerCase().includes('journal')
    );

    if (taskSheetName && wb.Sheets[taskSheetName]) {
      rawTaskRows = XLSX.utils.sheet_to_json(wb.Sheets[taskSheetName]);
    }

    if (noteSheetName && wb.Sheets[noteSheetName]) {
      rawNoteRows = XLSX.utils.sheet_to_json(wb.Sheets[noteSheetName]);
    }

    // Map common task column variations
    const parsedTasks: HRTask[] = rawTaskRows.map((row, index) => {
      const title =
        row['Task Name'] ||
        row['Task'] ||
        row['Activity'] ||
        row['Subject'] ||
        row['Title'] ||
        row['title'] ||
        row['name'] ||
        row['Name'] ||
        `Imported Task ${index + 1}`;

      const date =
        row['Date'] ||
        row['Due Date'] ||
        row['Due_Date'] ||
        row['Target Date'] ||
        row['date'] ||
        new Date().toISOString().split('T')[0];

      let priority: HRTaskPriority = 'Medium';
      const rawPrio = String(row['Priority'] || row['priority'] || '').toLowerCase();
      if (rawPrio.includes('high') || rawPrio.includes('urgent')) priority = 'High';
      else if (rawPrio.includes('low')) priority = 'Low';

      let status: HRTaskStatus = 'Pending';
      const rawStat = String(row['Status'] || row['status'] || '').toLowerCase();
      if (rawStat.includes('complete') || rawStat.includes('done')) status = 'Completed';
      else if (rawStat.includes('progress') || rawStat.includes('active')) status = 'In Progress';
      else if (rawStat.includes('defer') || rawStat.includes('pause') || rawStat.includes('archive')) status = 'Deferred';

      return localStorageService.normalizeTask({
        id: row['ID'] || row['id'] || `task_import_${Date.now()}_${index}`,
        title: String(title).trim(),
        name: String(title).trim(),
        date: String(date).trim(),
        time: String(row['Time'] || row['time'] || '09:00').trim(),
        description: row['Description'] || row['description'] || row['Details'] || '',
        category: row['Category'] || row['category'] || 'general',
        priority,
        status,
        assignedTo: row['Assigned To'] || row['Owner'] || row['assignedTo'] || 'Vignesh',
        notes: row['Notes'] || row['notes'] || row['Remarks'] || '',
        followUpDate: row['Follow Up Date'] || row['followUpDate'] || undefined,
        createdAt: row['Created At'] || row['createdAt'] || new Date().toISOString(),
        updatedAt: row['Updated At'] || row['updatedAt'] || new Date().toISOString(),
      });
    });

    // Map common note column variations
    const parsedNotes: HRNote[] = rawNoteRows.map((row, index) => {
      const title = row['Title'] || row['title'] || `Imported Note ${index + 1}`;
      const content = row['Content'] || row['content'] || row['Text'] || '';
      const type = String(row['Type'] || row['type'] || '').toLowerCase().includes('checklist')
        ? 'checklist'
        : 'text';

      let checklistItems: any[] | undefined = undefined;
      const rawChecklist = row['Checklist'] || row['checklist'];
      if (typeof rawChecklist === 'string' && rawChecklist.trim()) {
        checklistItems = rawChecklist.split(';').map((itemStr: string, idx: number) => {
          const trimmed = itemStr.trim();
          const isDone = trimmed.startsWith('[x]') || trimmed.startsWith('[X]');
          const text = trimmed.replace(/^\[[ xX]\]\s*/, '');
          return {
            id: `item_${index}_${idx}`,
            text,
            completed: isDone,
          };
        });
      }

      return localStorageService.normalizeNote({
        id: row['ID'] || row['id'] || `note_import_${Date.now()}_${index}`,
        title: String(title).trim(),
        content: String(content).trim(),
        type,
        checklistItems,
        category: row['Category'] || row['category'] || 'General',
        pinned: String(row['Pinned'] || row['pinned']).toLowerCase() === 'yes' || Boolean(row['pinned']),
        color: row['Color'] || row['color'] || undefined,
        createdAt: row['Created At'] || row['createdAt'] || new Date().toISOString(),
        updatedAt: row['Updated At'] || row['updatedAt'] || new Date().toISOString(),
      });
    });

    return {
      tasks: parsedTasks,
      notes: parsedNotes,
      totalTasks: parsedTasks.length,
      totalNotes: parsedNotes.length,
      fileName: file.name,
    };
  }

  // ==========================================
  // CONFIRM IMPORT (MERGE OR REPLACE)
  // ==========================================
  public confirmImport(
    preview: ParsedImportPreview,
    mode: 'merge' | 'replace'
  ): { taskCount: number; noteCount: number } {
    let finalTasks: HRTask[] = [];
    let finalNotes: HRNote[] = [];

    if (mode === 'replace') {
      finalTasks = preview.tasks;
      finalNotes = preview.notes.length > 0 ? preview.notes : localStorageService.getNotes();
    } else {
      // Merge: preserve existing, append or update by ID / Title
      const existingTasks = localStorageService.getTasks();
      const taskMap = new Map<string, HRTask>();
      existingTasks.forEach((t) => taskMap.set(t.id, t));
      preview.tasks.forEach((t) => taskMap.set(t.id, t));
      finalTasks = Array.from(taskMap.values());

      const existingNotes = localStorageService.getNotes();
      const noteMap = new Map<string, HRNote>();
      existingNotes.forEach((n) => noteMap.set(n.id, n));
      preview.notes.forEach((n) => noteMap.set(n.id, n));
      finalNotes = Array.from(noteMap.values());
    }

    // 1. Save to LocalStorage immediately
    localStorageService.saveTasks(finalTasks);
    if (finalNotes.length > 0) {
      localStorageService.saveNotes(finalNotes);
    }

    // 2. Sync to Google Sheets if configured
    googleSheetsService.triggerDebouncedPush();

    return {
      taskCount: finalTasks.length,
      noteCount: finalNotes.length,
    };
  }
}

export const excelService = new ExcelService();
