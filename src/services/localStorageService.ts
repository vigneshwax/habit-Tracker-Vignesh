import { HRTask, HRNote, HRTaskPriority, HRTaskStatus, GoogleSheetsConfig } from '../types';
import { api } from '../api';

export const STORAGE_KEYS = {
  TASKS: 'hr_daily_tasks_records_v1',
  NOTES: 'hr_daily_note_records_v1',
  USER_NAME: 'hr_tracker_user_name',
  USER_THEME: 'hr_tracker_theme',
  GOOGLE_DB_URL: 'google_sheets_database_url_v1',
  GOOGLE_SHEET_URL: 'google_sheets_sheet_url_v1',
  GOOGLE_LAST_SYNC: 'google_sheets_last_sync_time_v1',
  GOOGLE_LAST_PULL: 'google_sheets_last_pull_time_v1',
  // Local entries cache for grid/calendar matrix
  ENTRIES: 'hr_daily_entries_cache_v1',
  JOURNALS: 'hr_daily_journals_cache_v1',
  REVIEWS: 'hr_weekly_reviews_cache_v1',
  REFLECTIONS: 'hr_monthly_reflections_cache_v1',
  GOALS: 'hr_goals_cache_v1',
} as const;

// Default initial tasks if completely empty (matching Vignesh Habit Tracker core set)
const DEFAULT_INITIAL_TASKS: HRTask[] = [
  {
    id: 'habit-1-workout',
    title: 'Morning Workout & Stretch',
    name: 'Morning Workout & Stretch',
    category: 'health',
    frequency: 'daily',
    priority: 'High',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    time: '07:00',
    description: '30-45 minutes physical workout, cardio or yoga routine',
    notes: 'Focus on posture and core strength',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-2-deep-work',
    title: 'Deep Work & Code Focus',
    name: 'Deep Work & Code Focus',
    category: 'career',
    frequency: 'daily',
    priority: 'High',
    status: 'In Progress',
    date: new Date().toISOString().split('T')[0],
    time: '09:30',
    description: 'High-impact engineering, architecture design, and critical priorities',
    notes: 'Zero notification distraction block',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-3-reading',
    title: 'Read 20 Pages',
    name: 'Read 20 Pages',
    category: 'learning',
    frequency: 'daily',
    priority: 'Medium',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    time: '21:00',
    description: 'Non-fiction books on engineering, psychology, or leadership',
    notes: 'Keep notebook open for highlights',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-4-hydration',
    title: 'Hydration Goal (3L Water)',
    name: 'Hydration Goal (3L Water)',
    category: 'health',
    frequency: 'daily',
    priority: 'Low',
    status: 'In Progress',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    description: 'Drink at least 3 liters of fresh water throughout the day',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-5-evening-review',
    title: 'Evening Journal & Review',
    name: 'Evening Journal & Review',
    category: 'personal',
    frequency: 'daily',
    priority: 'Medium',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    time: '22:00',
    description: 'Review day accomplishments, plan next day priorities',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_INITIAL_NOTES: HRNote[] = [
  {
    id: 'note-welcome-1',
    title: 'Welcome to My Journal',
    content: 'All your reflections, thoughts, and personal checklists are stored directly in your browser with zero server dependency. Works 100% offline and syncs safely!',
    type: 'text',
    category: 'Daily Journal',
    pinned: true,
    color: '#10B981',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-checklist-1',
    title: 'Daily High-Priority Focus',
    content: 'Key priorities for productive days',
    type: 'checklist',
    checklistItems: [
      { id: 'item-1', text: 'Morning workout & mindfulness', completed: true },
      { id: 'item-2', text: 'Deep focus work block without distractions', completed: false },
      { id: 'item-3', text: 'Evening review and reflection', completed: true },
    ],
    category: 'Checklists',
    pinned: false,
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class LocalStorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Safe JSON parse with fallback
  private getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const val = localStorage.getItem(key);
      if (val === null || val === undefined) return fallback;
      return JSON.parse(val) as T;
    } catch (err) {
      console.warn(`[LocalStorageService] Error reading key "${key}":`, err);
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[LocalStorageService] Error writing key "${key}":`, err);
    }
  }

  // ==========================================
  // BACKWARD COMPATIBILITY & MIGRATION
  // ==========================================
  public initializeData(): void {
    if (!this.isBrowser()) return;

    // Check if new primary tasks key exists
    const existingTasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!existingTasksJson) {
      // Look for legacy keys (e.g. vignesh_habits or habits)
      const legacyHabits = this.getItem<any[]>('vignesh_habits', []) || this.getItem<any[]>('habits', []);
      if (Array.isArray(legacyHabits) && legacyHabits.length > 0) {
        const migrated: HRTask[] = legacyHabits.map((item) => this.normalizeTask(item));
        this.setItem(STORAGE_KEYS.TASKS, migrated);
      } else {
        // Seed default initial tasks
        this.setItem(STORAGE_KEYS.TASKS, DEFAULT_INITIAL_TASKS);
      }
    } else {
      // Normalize existing tasks to ensure all required fields are present
      try {
        const currentTasks = JSON.parse(existingTasksJson);
        if (Array.isArray(currentTasks)) {
          const normalized = currentTasks.map((t) => this.normalizeTask(t));
          this.setItem(STORAGE_KEYS.TASKS, normalized);
        }
      } catch {
        // preserve as is
      }
    }

    // Check if notes key exists
    const existingNotesJson = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!existingNotesJson) {
      const legacyNotes = this.getItem<any[]>('vignesh_notes', []) || this.getItem<any[]>('notes', []);
      if (Array.isArray(legacyNotes) && legacyNotes.length > 0) {
        const migratedNotes: HRNote[] = legacyNotes.map((n) => this.normalizeNote(n));
        this.setItem(STORAGE_KEYS.NOTES, migratedNotes);
      } else {
        this.setItem(STORAGE_KEYS.NOTES, DEFAULT_INITIAL_NOTES);
      }
    }

    // Migrate theme if present under old key
    if (!localStorage.getItem(STORAGE_KEYS.USER_THEME)) {
      const oldTheme = localStorage.getItem('vignesh_theme');
      if (oldTheme) {
        localStorage.setItem(STORAGE_KEYS.USER_THEME, oldTheme);
      }
    }
  }

  // Helper to ensure task objects conform to HRTask specifications
  public normalizeTask(raw: any): HRTask {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const id = raw.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const title = String(raw.title || raw.name || raw.Task || raw['Task Name'] || raw.Activity || raw.Subject || 'Untitled Task').trim();
    const name = title;

    let priority: HRTaskPriority = 'Medium';
    const rawPriority = String(raw.priority || '').toLowerCase();
    if (rawPriority === 'high' || rawPriority === 'urgent') priority = 'High';
    else if (rawPriority === 'low') priority = 'Low';

    let status: HRTaskStatus = 'Pending';
    const rawStatus = String(raw.status || '').toLowerCase();
    if (rawStatus === 'completed' || rawStatus === 'done') status = 'Completed';
    else if (rawStatus === 'in progress' || rawStatus === 'in-progress' || rawStatus === 'active') status = 'In Progress';
    else if (rawStatus === 'deferred' || rawStatus === 'paused') status = 'Deferred';

    const date = raw.date || (raw.Due_Date ? String(raw.Due_Date).split('T')[0] : today);
    const time = raw.time || '09:00';

    return {
      id,
      title,
      name,
      date,
      time,
      description: raw.description || raw.Description || '',
      category: raw.category || raw.Category || 'general',
      priority,
      status,
      assignedTo: raw.assignedTo || raw.assigned_to || raw.Owner || raw['Assigned To'] || 'Vignesh',
      notes: raw.notes || raw.Notes || '',
      followUpDate: raw.followUpDate || raw.follow_up_date || undefined,
      createdAt: raw.createdAt || raw.created_at || now,
      updatedAt: raw.updatedAt || raw.updated_at || now,
      created_at: raw.created_at || raw.createdAt || now,
      updated_at: raw.updated_at || raw.updatedAt || now,
      frequency: raw.frequency || 'daily',
      goal_id: raw.goal_id || null,
      target_count: raw.target_count || undefined,
      target_days: raw.target_days || undefined,
      schedule_days: raw.schedule_days || undefined,
      archived_at: raw.archived_at || undefined,
    };
  }

  public normalizeNote(raw: any): HRNote {
    const now = new Date().toISOString();
    const id = raw.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return {
      id,
      title: String(raw.title || raw.Title || 'Untitled Note').trim(),
      content: String(raw.content || raw.Content || '').trim(),
      type: raw.type === 'checklist' ? 'checklist' : 'text',
      checklistItems: Array.isArray(raw.checklistItems)
        ? raw.checklistItems.map((item: any, idx: number) => ({
            id: item.id || `item_${idx}_${Date.now()}`,
            text: String(item.text || item.title || '').trim(),
            completed: Boolean(item.completed),
          }))
        : undefined,
      category: raw.category || raw.Category || 'General',
      pinned: Boolean(raw.pinned),
      color: raw.color || undefined,
      createdAt: raw.createdAt || raw.created_at || now,
      updatedAt: raw.updatedAt || raw.updated_at || now,
    };
  }

  // ==========================================
  // TASKS CRUD (hr_daily_tasks_records_v1)
  // ==========================================
  public getTasks(): HRTask[] {
    const tasks = this.getItem<HRTask[]>(STORAGE_KEYS.TASKS, []);
    if (!tasks || tasks.length === 0) {
      this.initializeData();
      return this.getItem<HRTask[]>(STORAGE_KEYS.TASKS, DEFAULT_INITIAL_TASKS);
    }
    return tasks;
  }

  public saveTasks(tasks: HRTask[]): void {
    const normalized = tasks.map((t) => this.normalizeTask(t));
    this.setItem(STORAGE_KEYS.TASKS, normalized);
  }

  public createTask(input: Partial<HRTask>): HRTask {
    const tasks = this.getTasks();
    const newTask = this.normalizeTask({
      ...input,
      id: input.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    try {
      api.createTask(newTask).catch((e) => console.warn('[localStorageService] async backend createTask notice:', e));
    } catch {
      // safe fallback
    }
    return newTask;
  }

  public updateTask(id: string, updates: Partial<HRTask>): HRTask {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    const updatedTask = this.normalizeTask({
      ...tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tasks[idx] = updatedTask;
    this.saveTasks(tasks);
    try {
      api.updateTask(id, updatedTask).catch((e) => console.warn('[localStorageService] async backend updateTask notice:', e));
    } catch {
      // safe fallback
    }
    return updatedTask;
  }

  public deleteTask(id: string): void {
    const tasks = this.getTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    this.saveTasks(filtered);

    // Also clean up any cached entries for this task
    const entries = this.getEntries();
    let hasChanges = false;
    for (const key of Object.keys(entries)) {
      if (key.startsWith(`${id}_`)) {
        delete entries[key];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.setItem(STORAGE_KEYS.ENTRIES, entries);
    }

    try {
      api.deleteTask(id).catch((e) => console.warn('[localStorageService] async backend deleteTask notice:', e));
    } catch {
      // safe fallback
    }
  }

  public archiveTask(id: string): HRTask {
    return this.updateTask(id, {
      archived_at: new Date().toISOString(),
      status: 'Deferred',
    });
  }

  public restoreTask(id: string): HRTask {
    return this.updateTask(id, {
      archived_at: null,
      status: 'Pending',
    });
  }

  // ==========================================
  // NOTES CRUD (hr_daily_note_records_v1)
  // ==========================================
  public getNotes(): HRNote[] {
    const notes = this.getItem<HRNote[]>(STORAGE_KEYS.NOTES, []);
    if (!notes || notes.length === 0) {
      this.initializeData();
      return this.getItem<HRNote[]>(STORAGE_KEYS.NOTES, DEFAULT_INITIAL_NOTES);
    }
    return notes;
  }

  public saveNotes(notes: HRNote[]): void {
    const normalized = notes.map((n) => this.normalizeNote(n));
    this.setItem(STORAGE_KEYS.NOTES, normalized);
  }

  public createNote(input: Partial<HRNote>): HRNote {
    const notes = this.getNotes();
    const newNote = this.normalizeNote({
      ...input,
      id: input.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    notes.unshift(newNote);
    this.saveNotes(notes);
    try {
      api.createNote({
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        category: newNote.category,
        type: newNote.type as any,
        pinned: newNote.pinned,
        color: newNote.color,
        checklist: newNote.checklistItems,
      }).catch((e) => console.warn('[localStorageService] async backend createNote notice:', e));
    } catch {
      // safe fallback
    }
    return newNote;
  }

  public updateNote(id: string, updates: Partial<HRNote>): HRNote {
    const notes = this.getNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      throw new Error(`Note with id ${id} not found`);
    }

    const updatedNote = this.normalizeNote({
      ...notes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    notes[idx] = updatedNote;
    this.saveNotes(notes);
    try {
      api.updateNote(id, {
        title: updatedNote.title,
        content: updatedNote.content,
        category: updatedNote.category,
        type: updatedNote.type as any,
        pinned: updatedNote.pinned,
        color: updatedNote.color,
        checklist: updatedNote.checklistItems,
      }).catch((e) => console.warn('[localStorageService] async backend updateNote notice:', e));
    } catch {
      // safe fallback
    }
    return updatedNote;
  }

  public deleteNote(id: string): void {
    const notes = this.getNotes();
    const filtered = notes.filter((n) => n.id !== id);
    this.saveNotes(filtered);
    try {
      api.deleteNote(id).catch((e) => console.warn('[localStorageService] async backend deleteNote notice:', e));
    } catch {
      // safe fallback
    }
  }

  // ==========================================
  // HABIT ENTRIES MATRIX (Local caching)
  // ==========================================
  public getEntries(): Record<string, boolean> {
    return this.getItem<Record<string, boolean>>(STORAGE_KEYS.ENTRIES, {});
  }

  public toggleEntry(habitId: string, date: string, completed?: boolean): boolean {
    const entries = this.getEntries();
    const key = `${habitId}_${date}`;
    const newStatus = completed !== undefined ? completed : !entries[key];
    entries[key] = newStatus;
    this.setItem(STORAGE_KEYS.ENTRIES, entries);

    // If entry date matches task's assigned date, also update task's status
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === habitId);
    if (task && task.date === date) {
      this.updateTask(habitId, {
        status: newStatus ? 'Completed' : 'Pending',
      });
    }

    return newStatus;
  }

  public saveEntries(entries: Record<string, boolean>): void {
    this.setItem(STORAGE_KEYS.ENTRIES, entries);
  }

  // ==========================================
  // DAILY JOURNALS CACHING
  // ==========================================
  public getJournals(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.JOURNALS, []);
  }

  public saveJournal(entry: any): void {
    const journals = this.getJournals();
    const idx = journals.findIndex((j) => j.date === entry.date || (entry.id && j.id === entry.id));
    if (idx >= 0) {
      journals[idx] = { ...journals[idx], ...entry, updatedAt: new Date().toISOString() };
    } else {
      journals.push({ ...entry, createdAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.JOURNALS, journals);
  }

  // ==========================================
  // USER PREFERENCES
  // ==========================================
  public getUserPreferences(): { name: string; theme: string } {
    if (!this.isBrowser()) return { name: 'Vignesh', theme: 'light' };
    const name = localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Vignesh';
    const theme = localStorage.getItem(STORAGE_KEYS.USER_THEME) || localStorage.getItem('vignesh_theme') || 'light';
    return { name, theme };
  }

  public saveUserPreferences(name?: string, theme?: string): void {
    if (!this.isBrowser()) return;
    if (name !== undefined) {
      localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    }
    if (theme !== undefined) {
      localStorage.setItem(STORAGE_KEYS.USER_THEME, theme);
      localStorage.setItem('vignesh_theme', theme);
    }
  }

  // ==========================================
  // GOOGLE SHEETS CONFIGURATION & SYNC INFO
  // ==========================================
  public getGoogleConfig(): GoogleSheetsConfig {
    if (!this.isBrowser()) {
      return { databaseUrl: '', sheetUrl: '', lastSyncTime: undefined, lastPullTime: undefined };
    }
    const databaseUrl = localStorage.getItem(STORAGE_KEYS.GOOGLE_DB_URL) || '';
    const sheetUrl = localStorage.getItem(STORAGE_KEYS.GOOGLE_SHEET_URL) || '';
    const lastSyncTime = localStorage.getItem(STORAGE_KEYS.GOOGLE_LAST_SYNC) || undefined;
    const lastPullTime = localStorage.getItem(STORAGE_KEYS.GOOGLE_LAST_PULL) || undefined;
    return { databaseUrl, sheetUrl, lastSyncTime, lastPullTime };
  }

  public saveGoogleConfig(config: Partial<GoogleSheetsConfig>): void {
    if (!this.isBrowser()) return;
    if (config.databaseUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_DB_URL, config.databaseUrl.trim());
    }
    if (config.sheetUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_URL, config.sheetUrl.trim());
    }
    if (config.lastSyncTime !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_LAST_SYNC, config.lastSyncTime);
    }
    if (config.lastPullTime !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_LAST_PULL, config.lastPullTime);
    }
  }

  public setLastSyncTime(time: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_LAST_SYNC, time);
  }

  public setLastPullTime(time: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_LAST_PULL, time);
  }
}

export const localStorageService = new LocalStorageService();
