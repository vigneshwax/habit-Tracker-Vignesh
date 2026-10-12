import { HRTask, KeepNote } from '../types';

export interface PushResult {
  success: boolean;
  tasksCount?: number;
  notesCount?: number;
  error?: string;
  timestamp: string;
}

export interface PullResult {
  success: boolean;
  tasks?: HRTask[];
  notes?: KeepNote[];
  error?: string;
  timestamp: string;
}

/**
 * Checks whether the user is actively typing into an input or textarea element.
 * Section 8: Prevents background pull from wiping active form state.
 */
export function isUserTyping(): boolean {
  if (typeof document === 'undefined') return false;
  const activeEl = document.activeElement;
  if (!activeEl) return false;
  const tag = activeEl.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((activeEl as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Compares remote vs local tasks & notes to check if remote data actually changed.
 */
export function hasGoogleSheetDataChanged(
  remoteTasks: HRTask[],
  localTasks: HRTask[],
  remoteNotes: KeepNote[],
  localNotes: KeepNote[]
): boolean {
  if (remoteTasks.length !== localTasks.length) return true;
  if (remoteNotes.length !== localNotes.length) return true;

  const localTaskMap = new Map(localTasks.map((t) => [t.id, t.updatedAt || t.createdAt || '']));
  for (const rt of remoteTasks) {
    const localStamp = localTaskMap.get(rt.id);
    if (localStamp === undefined) return true; // new task
    const remoteStamp = rt.updatedAt || rt.createdAt || '';
    if (remoteStamp !== localStamp) return true;
  }

  const localNoteMap = new Map(localNotes.map((n) => [n.id, n.updatedAt || n.createdAt || '']));
  for (const rn of remoteNotes) {
    const localStamp = localNoteMap.get(rn.id);
    if (localStamp === undefined) return true;
    const remoteStamp = rn.updatedAt || rn.createdAt || '';
    if (remoteStamp !== localStamp) return true;
  }

  return false;
}

/**
 * FLOW B: Push local tasks and notes to Google Sheets
 */
export async function pushToGoogleSheets(
  webAppUrl: string,
  tasks: HRTask[],
  notes: KeepNote[]
): Promise<PushResult> {
  const timestamp = new Date().toISOString();
  if (!webAppUrl || !webAppUrl.trim()) {
    return { success: false, error: 'Google Sheets Web App URL not configured', timestamp };
  }

  const payload = {
    action: 'push',
    tasks,
    notes,
    timestamp,
  };

  try {
    // Attempt 1: Direct fetch with text/plain (avoids CORS preflight in Google Apps Script)
    const directRes = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (directRes.ok) {
      const data = await directRes.json();
      return {
        success: data.status === 'success' || data.success === true,
        tasksCount: data.tasksCount ?? tasks.length,
        notesCount: data.notesCount ?? notes.length,
        timestamp,
      };
    }
  } catch (err: any) {
    console.warn('[Google Sheets Direct Push Notice] Attempting server proxy fallback...', err?.message || err);
  }

  // Attempt 2: Server-side proxy route to bypass browser restrictions
  try {
    const proxyRes = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webAppUrl.trim(),
        action: 'push',
        payload,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: data.status === 'success' || data.success === true,
        tasksCount: data.tasksCount ?? tasks.length,
        notesCount: data.notesCount ?? notes.length,
        timestamp,
      };
    }
    const errText = await proxyRes.text();
    return { success: false, error: `Proxy sync failed: ${errText}`, timestamp };
  } catch (proxyErr: any) {
    return {
      success: false,
      error: `Could not connect to Google Apps Script: ${proxyErr?.message || 'Network error'}`,
      timestamp,
    };
  }
}

/**
 * FLOW C: Pull remote tasks and notes from Google Sheets
 */
export async function pullFromGoogleSheets(webAppUrl: string): Promise<PullResult> {
  const timestamp = new Date().toISOString();
  if (!webAppUrl || !webAppUrl.trim()) {
    return { success: false, error: 'Google Sheets Web App URL not configured', timestamp };
  }

  const targetUrl = new URL(webAppUrl.trim());
  targetUrl.searchParams.set('action', 'pull');
  targetUrl.searchParams.set('_t', Date.now().toString());

  try {
    // Attempt 1: Direct GET fetch
    const directRes = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.status === 'success' || data.tasks || data.notes) {
        return {
          success: true,
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          notes: Array.isArray(data.notes) ? data.notes : [],
          timestamp,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Google Sheets Direct Pull Notice] Attempting server proxy fallback...', err?.message || err);
  }

  // Attempt 2: Server proxy fallback
  try {
    const proxyRes = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webAppUrl.trim(),
        action: 'pull',
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: true,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
        timestamp,
      };
    }
    const errText = await proxyRes.text();
    return { success: false, error: `Proxy pull failed: ${errText}`, timestamp };
  } catch (proxyErr: any) {
    return {
      success: false,
      error: `Could not pull from Google Apps Script: ${proxyErr?.message || 'Network error'}`,
      timestamp,
    };
  }
}

/**
 * PRODUCTION GOOGLE APPS SCRIPT CODE TEMPLATE
 * Designed to be pasted directly into user's Google Spreadsheet:
 * Extensions -> Apps Script -> Paste -> Deploy as Web App ("Execute as Me", "Who has access: Anyone")
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ============================================================================
 * HR TASK TRACKER & COMMAND CENTER - GOOGLE APPS SCRIPT WEB APP ENGINE
 * Generated for: vigneshwaran.ofcl@gmail.com
 * Two-way Live Cloud Sync Endpoint (Tier 2 Database)
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS (Takes ~1 minute):
 * 1. Open your Google Spreadsheet (e.g. "HR Task Tracker & Command Center").
 * 2. In top menu click: Extensions > Apps Script.
 * 3. Delete any default code and PASTE this entire script.
 * 4. Click the blue "Deploy" button (top right) > "New deployment".
 * 5. Select type: "Web app".
 * 6. Description: "HR Cloud Sync v1".
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone".
 * 9. Click "Deploy", authorize permissions, and COPY the Web app URL.
 * 10. Paste that URL into the app's Google Sheets Sync settings!
 */

const SHEET_NAME_TASKS = 'HR Tasks';
const SHEET_NAME_NOTES = 'Notes';

const TASK_HEADERS = [
  'ID',
  'Date',
  'Time',
  'Title',
  'Description',
  'Category',
  'Priority',
  'Status',
  'Assigned To',
  'Notes',
  'Follow-Up Date',
  'Created At',
  'Updated At'
];

const NOTE_HEADERS = [
  'ID',
  'Title',
  'Content',
  'Type',
  'Checklist Items',
  'Category',
  'Pinned',
  'Color',
  'Created At',
  'Updated At'
];

// Handles PULL requests (HTTP GET)
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'pull';
    if (action === 'pull') {
      const data = pullDataFromSheets();
      return jsonResponse({
        status: 'success',
        tasks: data.tasks,
        notes: data.notes,
        pulledAt: new Date().toISOString()
      });
    }
    return jsonResponse({ status: 'success', message: 'HR Command Center Sync Endpoint is Live' });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

// Handles PUSH & PULL requests (HTTP POST)
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = {};
      }
    }

    const action = payload.action || (e && e.parameter && e.parameter.action) || 'push';

    if (action === 'push') {
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
      const notes = Array.isArray(payload.notes) ? payload.notes : [];
      pushDataToSheets(tasks, notes);
      return jsonResponse({
        status: 'success',
        tasksCount: tasks.length,
        notesCount: notes.length,
        pushedAt: new Date().toISOString()
      });
    } else if (action === 'pull') {
      const data = pullDataFromSheets();
      return jsonResponse({
        status: 'success',
        tasks: data.tasks,
        notes: data.notes,
        pulledAt: new Date().toISOString()
      });
    }

    return jsonResponse({ status: 'error', error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function pushDataToSheets(tasks, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Write HR Tasks Tab
  let taskSheet = ss.getSheetByName(SHEET_NAME_TASKS);
  if (!taskSheet) {
    taskSheet = ss.insertSheet(SHEET_NAME_TASKS);
  }
  taskSheet.clear();

  // Style Header Row
  taskSheet.appendRow(TASK_HEADERS);
  const taskHeaderRange = taskSheet.getRange(1, 1, 1, TASK_HEADERS.length);
  taskHeaderRange.setFontWeight('bold');
  taskHeaderRange.setBackground('#1E293B');
  taskHeaderRange.setFontColor('#FFFFFF');

  if (tasks.length > 0) {
    const taskRows = tasks.map(function(t) {
      return [
        t.id || '',
        t.date || '',
        t.time || '',
        t.title || '',
        t.description || '',
        t.category || '',
        t.priority || 'Medium',
        t.status || 'Pending',
        t.assignedTo || '',
        t.notes || '',
        t.followUpDate || '',
        t.createdAt || '',
        t.updatedAt || ''
      ];
    });
    taskSheet.getRange(2, 1, taskRows.length, TASK_HEADERS.length).setValues(taskRows);
  }
  taskSheet.autoResizeColumns(1, TASK_HEADERS.length);

  // 2. Write Notes Tab
  let noteSheet = ss.getSheetByName(SHEET_NAME_NOTES);
  if (!noteSheet) {
    noteSheet = ss.insertSheet(SHEET_NAME_NOTES);
  }
  noteSheet.clear();

  noteSheet.appendRow(NOTE_HEADERS);
  const noteHeaderRange = noteSheet.getRange(1, 1, 1, NOTE_HEADERS.length);
  noteHeaderRange.setFontWeight('bold');
  noteHeaderRange.setBackground('#047857');
  noteHeaderRange.setFontColor('#FFFFFF');

  if (notes.length > 0) {
    const noteRows = notes.map(function(n) {
      return [
        n.id || '',
        n.title || '',
        n.content || '',
        n.type || 'text',
        n.checklistItems ? JSON.stringify(n.checklistItems) : '',
        n.category || '',
        n.pinned ? 'TRUE' : 'FALSE',
        n.color || 'amber',
        n.createdAt || '',
        n.updatedAt || ''
      ];
    });
    noteSheet.getRange(2, 1, noteRows.length, NOTE_HEADERS.length).setValues(noteRows);
  }
  noteSheet.autoResizeColumns(1, NOTE_HEADERS.length);
}

function pullDataFromSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Read Tasks
  const tasks = [];
  const taskSheet = ss.getSheetByName(SHEET_NAME_TASKS);
  if (taskSheet && taskSheet.getLastRowCount() > 1) {
    const data = taskSheet.getRange(2, 1, taskSheet.getLastRowCount() - 1, TASK_HEADERS.length).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[3]) continue; // Skip empty rows
      tasks.push({
        id: String(row[0] || ('task-' + Date.now() + '-' + i)),
        date: formatDate(row[1]),
        time: String(row[2] || ''),
        title: String(row[3] || 'Untitled Task'),
        description: String(row[4] || ''),
        category: String(row[5] || 'General'),
        priority: String(row[6] || 'Medium'),
        status: String(row[7] || 'Pending'),
        assignedTo: String(row[8] || ''),
        notes: String(row[9] || ''),
        followUpDate: formatDate(row[10]),
        createdAt: String(row[11] || new Date().toISOString()),
        updatedAt: String(row[12] || new Date().toISOString())
      });
    }
  }

  // Read Notes
  const notes = [];
  const noteSheet = ss.getSheetByName(SHEET_NAME_NOTES);
  if (noteSheet && noteSheet.getLastRowCount() > 1) {
    const data = noteSheet.getRange(2, 1, noteSheet.getLastRowCount() - 1, NOTE_HEADERS.length).getValues();
    for (var j = 0; j < data.length; j++) {
      var nRow = data[j];
      if (!nRow[0] && !nRow[1]) continue;
      var checklist = [];
      if (nRow[4]) {
        try {
          checklist = JSON.parse(String(nRow[4]));
        } catch (e) {
          checklist = [];
        }
      }
      notes.push({
        id: String(nRow[0] || ('note-' + Date.now() + '-' + j)),
        title: String(nRow[1] || 'Untitled Note'),
        content: String(nRow[2] || ''),
        type: String(nRow[3] || 'text'),
        checklistItems: Array.isArray(checklist) ? checklist : [],
        category: String(nRow[5] || ''),
        pinned: String(nRow[6]).toUpperCase() === 'TRUE',
        color: String(nRow[7] || 'amber'),
        createdAt: String(nRow[8] || new Date().toISOString()),
        updatedAt: String(nRow[9] || new Date().toISOString())
      });
    }
  }

  return { tasks: tasks, notes: notes };
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
