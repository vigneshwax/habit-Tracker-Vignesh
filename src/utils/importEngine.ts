/**
 * Relational Import & Restoration Engine
 * Vignesh Habit Tracker
 * 
 * Provides transactional, rollback-capable data import with:
 * - Pre-commit validation (duplicate IDs, malformed rows, invalid dates, missing required fields)
 * - Foreign-key relationship dependency checks (e.g. habit_entries -> habits)
 * - Merge mode: Idempotent matching by stable ID and natural composite keys to prevent duplicate records
 * - Replace mode: Replaces only intended datasets with explicit confirmation required
 * - Selected-table mode: Imports only designated tables while strictly preserving unselected data
 * - Atomic rollback: Zero data loss on validation or execution failures
 */

export interface ImportHabit {
  id?: string;
  name: string;
  category?: string;
  frequency?: string;
  status?: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportHabitEntry {
  id?: string;
  habit_id: string;
  date: string;
  completed?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportGoal {
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  target_date?: string;
  progress?: number;
  status?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportMood {
  id?: string;
  date: string;
  mood?: string;
  mood_score?: number;
  energy_level?: number;
  note?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportJournal {
  id?: string;
  date: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportWeeklyPlan {
  id?: string;
  year: number;
  month: number;
  week_number: number;
  main_goal?: string;
  target_percentage?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportWeeklyReview {
  id?: string;
  year: number;
  month: number;
  week_number: number;
  went_well?: string;
  challenges?: string;
  next_focus?: string;
  score?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportReflection {
  id?: string;
  year: number;
  month: number;
  content: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportCategory {
  id?: string;
  name: string;
  icon?: string;
  created_at?: string;
  [key: string]: any;
}

export interface ImportAffirmation {
  id?: string;
  quote: string;
  author?: string;
  active?: boolean;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ImportTask {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  date?: string;
  time?: string;
  assigned_to?: string;
  assignedTo?: string;
  notes?: string;
  follow_up_date?: string;
  followUpDate?: string;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  habit_id?: string;
  [key: string]: any;
}

export interface ImportNote {
  id?: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  type?: 'note' | 'journal' | 'checklist';
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  color?: string;
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface DatabaseSnapshot {
  habits: ImportHabit[];
  habit_entries: ImportHabitEntry[];
  goals: ImportGoal[];
  mood_tracker: ImportMood[];
  daily_journal: ImportJournal[];
  weekly_plans: ImportWeeklyPlan[];
  weekly_reviews: ImportWeeklyReview[];
  reflections: ImportReflection[];
  habit_categories: ImportCategory[];
  affirmations: ImportAffirmation[];
  settings: Record<string, any>;
  tasks: ImportTask[];
  notes: ImportNote[];
  [key: string]: any;
}

export interface ImportPayload {
  habits?: ImportHabit[];
  habit_entries?: ImportHabitEntry[];
  goals?: ImportGoal[];
  mood_tracker?: ImportMood[];
  daily_journal?: ImportJournal[];
  weekly_plans?: ImportWeeklyPlan[];
  weekly_reviews?: ImportWeeklyReview[];
  reflections?: ImportReflection[];
  monthly_reflections?: ImportReflection[];
  habit_categories?: ImportCategory[];
  categories?: ImportCategory[];
  affirmations?: ImportAffirmation[];
  settings?: Record<string, any>;
  tasks?: ImportTask[];
  notes?: ImportNote[];
  mode?: 'merge' | 'replace' | 'selected';
  selected_tables?: string[];
  confirm_replace?: boolean;
}

export interface ProcessedTelemetryStats {
  tasks_restored: number;
  journal_restored: number;
  notes_restored: number;
  total_records: number;
  failed_records: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  newDb: DatabaseSnapshot;
  counts: Record<string, number>;
  stats: ProcessedTelemetryStats;
}

/**
 * Sanitizes error messages to ensure passwords (e.g. 9500), bearer tokens,
 * or sensitive query credentials are never exposed in user-facing feedback.
 */
export function sanitizeErrorMessage(msg: any): string {
  if (!msg) return 'An unexpected error occurred';
  let str = typeof msg === 'string' ? msg : (msg?.message || String(msg));
  str = str.replace(/9500/g, '****');
  str = str.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  str = str.replace(/([?&](?:key|token|auth|secret|password)=)[^&]+/gi, '$1[REDACTED]');
  return str;
}

/**
 * Validates whether a date string is in valid format and corresponds to a real calendar day.
 */
export function isValidDateValue(val: any): boolean {
  if (!val) return true;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const testDate = new Date(y, m - 1, d);
    return testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d;
  }
  const parsed = new Date(trimmed);
  return !isNaN(parsed.getTime());
}

/**
 * Generate a UUID-like identifier if crypto is not globally available in all environments
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Executes atomic pre-commit validation and commits imports into a fresh candidate database.
 * If any error or validation issue occurs, throws an Error and leaves original data untouched.
 */
export function processDataImport(
  currentDb: DatabaseSnapshot,
  payload: ImportPayload
): ImportResult {
  if (!currentDb || typeof currentDb !== 'object') {
    throw new Error('Current database snapshot is invalid.');
  }

  // Deep clone to isolate candidate changes during validation & staging
  const candidateDb: DatabaseSnapshot = {
    habits: Array.isArray(currentDb.habits) ? JSON.parse(JSON.stringify(currentDb.habits)) : [],
    habit_entries: Array.isArray(currentDb.habit_entries) ? JSON.parse(JSON.stringify(currentDb.habit_entries)) : [],
    goals: Array.isArray(currentDb.goals) ? JSON.parse(JSON.stringify(currentDb.goals)) : [],
    mood_tracker: Array.isArray(currentDb.mood_tracker) ? JSON.parse(JSON.stringify(currentDb.mood_tracker)) : [],
    daily_journal: Array.isArray(currentDb.daily_journal) ? JSON.parse(JSON.stringify(currentDb.daily_journal)) : [],
    weekly_plans: Array.isArray(currentDb.weekly_plans) ? JSON.parse(JSON.stringify(currentDb.weekly_plans)) : [],
    weekly_reviews: Array.isArray(currentDb.weekly_reviews) ? JSON.parse(JSON.stringify(currentDb.weekly_reviews)) : [],
    reflections: Array.isArray(currentDb.reflections) ? JSON.parse(JSON.stringify(currentDb.reflections)) : [],
    habit_categories: Array.isArray(currentDb.habit_categories) ? JSON.parse(JSON.stringify(currentDb.habit_categories)) : [],
    affirmations: Array.isArray(currentDb.affirmations) ? JSON.parse(JSON.stringify(currentDb.affirmations)) : [],
    settings: currentDb.settings ? JSON.parse(JSON.stringify(currentDb.settings)) : {},
    tasks: Array.isArray(currentDb.tasks) ? JSON.parse(JSON.stringify(currentDb.tasks)) : [],
    notes: Array.isArray(currentDb.notes) ? JSON.parse(JSON.stringify(currentDb.notes)) : [],
  };

  const {
    habits,
    habit_entries,
    goals,
    mood_tracker,
    daily_journal,
    weekly_plans,
    weekly_reviews,
    reflections,
    monthly_reflections,
    habit_categories,
    categories,
    affirmations,
    settings,
    tasks,
    notes,
    mode = 'merge',
    selected_tables,
    confirm_replace,
  } = payload || {};

  // 1. Explicit confirmation check for Replace mode
  if (mode === 'replace' && confirm_replace !== true) {
    throw new Error(
      "Replace mode is a destructive operation and requires explicit confirmation ('confirm_replace: true')."
    );
  }

  // 2. Validate input types for all supplied tables
  const rawPayloads: Record<string, any> = {
    habits,
    habit_entries,
    goals,
    mood_tracker,
    daily_journal,
    weekly_plans,
    weekly_reviews,
    reflections: reflections || monthly_reflections,
    habit_categories: habit_categories || categories,
    affirmations,
    tasks,
    notes,
  };

  for (const [key, val] of Object.entries(rawPayloads)) {
    if (val !== undefined && !Array.isArray(val)) {
      throw new Error(`Table '${key}' must be an array of records.`);
    }
  }

  if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
    throw new Error("Field 'settings' must be a valid key-value object.");
  }

  // Determine active tables (Selected-table mode support)
  const isSelectedMode = mode === 'selected' || (Array.isArray(selected_tables) && selected_tables.length > 0);
  const selectedSet = isSelectedMode && Array.isArray(selected_tables)
    ? new Set(selected_tables.map((s: string) => String(s).toLowerCase().trim()))
    : null;

  function isTableSelected(name: string): boolean {
    if (!selectedSet) return true;
    if (name === 'categories') return selectedSet.has('categories') || selectedSet.has('habit_categories');
    if (name === 'habit_categories') return selectedSet.has('habit_categories') || selectedSet.has('categories');
    if (name === 'monthly_reflections') return selectedSet.has('monthly_reflections') || selectedSet.has('reflections');
    if (name === 'reflections') return selectedSet.has('reflections') || selectedSet.has('monthly_reflections');
    return selectedSet.has(name);
  }

  // 3. Validate duplicate IDs within incoming batch for each table
  for (const [key, rows] of Object.entries(rawPayloads)) {
    if (Array.isArray(rows) && isTableSelected(key)) {
      const seenBatchIds = new Set<string>();
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        if (!row || typeof row !== 'object') {
          throw new Error(`Table '${key}' row ${idx + 1} is malformed or invalid.`);
        }
        if (row.id) {
          const idStr = String(row.id).trim();
          if (idStr) {
            if (seenBatchIds.has(idStr)) {
              throw new Error(
                `Validation error: Duplicate primary key ID '${idStr}' found in table '${key}' at row ${idx + 1}.`
              );
            }
            seenBatchIds.add(idStr);
          }
        }
      }
    }
  }

  // 4. Validate Required Fields & Dates
  // a) habits
  if (Array.isArray(habits) && isTableSelected('habits')) {
    for (let i = 0; i < habits.length; i++) {
      const h = habits[i];
      if (!h.name || !String(h.name).trim()) {
        throw new Error(`Validation error: 'habits' row ${i + 1} missing required 'name'.`);
      }
    }
  }

  // b) habit_entries
  if (Array.isArray(habit_entries) && isTableSelected('habit_entries')) {
    for (let i = 0; i < habit_entries.length; i++) {
      const e = habit_entries[i];
      if (!e.habit_id || !String(e.habit_id).trim()) {
        throw new Error(`Validation error: 'habit_entries' row ${i + 1} missing required 'habit_id'.`);
      }
      if (!e.date || !String(e.date).trim()) {
        throw new Error(`Validation error: 'habit_entries' row ${i + 1} missing required 'date'.`);
      }
      if (!isValidDateValue(e.date)) {
        throw new Error(
          `Validation error: 'habit_entries' row ${i + 1} has invalid date '${e.date}'. Expected YYYY-MM-DD.`
        );
      }
    }

    // Foreign Key Dependency Check: habit_entries -> habits
    const availableHabitIds = new Set<string>(candidateDb.habits.map((h: any) => h.id));
    if (Array.isArray(habits) && isTableSelected('habits')) {
      habits.forEach((h: any) => {
        if (h.id) availableHabitIds.add(String(h.id).trim());
      });
    }

    for (let i = 0; i < habit_entries.length; i++) {
      const e = habit_entries[i];
      const hId = String(e.habit_id).trim();
      if (!availableHabitIds.has(hId)) {
        throw new Error(
          `Dependency validation error: 'habit_entries' row ${i + 1} references missing parent habit_id '${hId}'. Please include parent habits in the selected tables.`
        );
      }
    }
  }

  // c) tasks
  if (Array.isArray(tasks) && isTableSelected('tasks')) {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const title = (t.title || t.name || '').trim();
      if (!title) {
        throw new Error(`Validation error: 'tasks' row ${i + 1} missing required 'title'.`);
      }
      if (t.date && !isValidDateValue(t.date)) {
        throw new Error(`Validation error: 'tasks' row ${i + 1} has invalid due date '${t.date}'.`);
      }
      if (t.due_date && !isValidDateValue(t.due_date)) {
        throw new Error(`Validation error: 'tasks' row ${i + 1} has invalid due date '${t.due_date}'.`);
      }
      if (t.follow_up_date && !isValidDateValue(t.follow_up_date)) {
        throw new Error(`Validation error: 'tasks' row ${i + 1} has invalid follow-up date '${t.follow_up_date}'.`);
      }
      if (t.followUpDate && !isValidDateValue(t.followUpDate)) {
        throw new Error(`Validation error: 'tasks' row ${i + 1} has invalid follow-up date '${t.followUpDate}'.`);
      }
    }
  }

  // d) daily_journal
  if (Array.isArray(daily_journal) && isTableSelected('daily_journal')) {
    for (let i = 0; i < daily_journal.length; i++) {
      const j = daily_journal[i];
      if (!j.date || !String(j.date).trim()) {
        throw new Error(`Validation error: 'daily_journal' row ${i + 1} missing required 'date'.`);
      }
      if (!isValidDateValue(j.date)) {
        throw new Error(`Validation error: 'daily_journal' row ${i + 1} has invalid date '${j.date}'.`);
      }
    }
  }

  // e) mood_tracker
  if (Array.isArray(mood_tracker) && isTableSelected('mood_tracker')) {
    for (let i = 0; i < mood_tracker.length; i++) {
      const m = mood_tracker[i];
      if (!m.date || !String(m.date).trim()) {
        throw new Error(`Validation error: 'mood_tracker' row ${i + 1} missing required 'date'.`);
      }
      if (!isValidDateValue(m.date)) {
        throw new Error(`Validation error: 'mood_tracker' row ${i + 1} has invalid date '${m.date}'.`);
      }
    }
  }

  // f) goals
  if (Array.isArray(goals) && isTableSelected('goals')) {
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      const title = (g.title || g.name || '').trim();
      if (!title) {
        throw new Error(`Validation error: 'goals' row ${i + 1} missing required 'title'.`);
      }
      if (g.target_date && !isValidDateValue(g.target_date)) {
        throw new Error(`Validation error: 'goals' row ${i + 1} has invalid target_date '${g.target_date}'.`);
      }
    }
  }

  // g) notes
  if (Array.isArray(notes) && isTableSelected('notes')) {
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (!n.title && n.content === undefined) {
        throw new Error(`Validation error: 'notes' row ${i + 1} missing title or content.`);
      }
    }
  }

  const cats = Array.isArray(categories) ? categories : (Array.isArray(habit_categories) ? habit_categories : undefined);
  const refls = Array.isArray(monthly_reflections) ? monthly_reflections : (Array.isArray(reflections) ? reflections : undefined);

  // ----------------------------------------------------
  // EXECUTE COMMIT (Replace vs Merge)
  // ----------------------------------------------------
  if (mode === 'replace') {
    // Replace ONLY the intended dataset. Tables not provided in payload or unselected in selected_tables are strictly preserved!
    if (Array.isArray(habits) && isTableSelected('habits')) {
      candidateDb.habits = habits.map((h: any) => ({
        ...h,
        id: h.id || generateId(),
        status: h.status || 'active',
        created_at: h.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(habit_entries) && isTableSelected('habit_entries')) {
      candidateDb.habit_entries = habit_entries.map((e: any) => ({
        ...e,
        id: e.id || generateId(),
        completed: Boolean(e.completed),
        created_at: e.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(goals) && isTableSelected('goals')) {
      candidateDb.goals = goals.map((g: any) => ({
        ...g,
        id: g.id || generateId(),
        status: g.status || 'active',
        progress: Number(g.progress || 0),
        created_at: g.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(mood_tracker) && isTableSelected('mood_tracker')) {
      candidateDb.mood_tracker = mood_tracker.map((m: any) => ({
        ...m,
        id: m.id || generateId(),
        mood_score: Number(m.mood_score || 4),
        energy_level: Number(m.energy_level || 3),
        created_at: m.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(daily_journal) && isTableSelected('daily_journal')) {
      candidateDb.daily_journal = daily_journal.map((j: any) => ({
        ...j,
        id: j.id || generateId(),
        created_at: j.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(weekly_plans) && isTableSelected('weekly_plans')) {
      candidateDb.weekly_plans = weekly_plans.map((p: any) => ({
        ...p,
        id: p.id || generateId(),
        year: Number(p.year || new Date().getFullYear()),
        month: Number(p.month || 1),
        week_number: Number(p.week_number || 1),
        target_percentage: Number(p.target_percentage || 80),
        created_at: p.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(weekly_reviews) && isTableSelected('weekly_reviews')) {
      candidateDb.weekly_reviews = weekly_reviews.map((r: any) => ({
        ...r,
        id: r.id || generateId(),
        year: Number(r.year || new Date().getFullYear()),
        month: Number(r.month || 1),
        week_number: Number(r.week_number || 1),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(refls) && (isTableSelected('reflections') || isTableSelected('monthly_reflections'))) {
      candidateDb.reflections = refls.map((rf: any) => ({
        ...rf,
        id: rf.id || generateId(),
        month: Number(rf.month || 1),
        year: Number(rf.year || new Date().getFullYear()),
        created_at: rf.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(cats) && (isTableSelected('habit_categories') || isTableSelected('categories'))) {
      candidateDb.habit_categories = cats.map((c: any) => ({
        ...c,
        id: c.id || generateId(),
        name: String(c.name || '').trim(),
        icon: c.icon || '🎯',
        created_at: c.created_at || new Date().toISOString(),
      }));
    }

    if (Array.isArray(affirmations) && isTableSelected('affirmations')) {
      candidateDb.affirmations = affirmations.map((a: any) => ({
        ...a,
        id: a.id || generateId(),
        active: a.active !== false,
        created_at: a.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (Array.isArray(tasks) && isTableSelected('tasks')) {
      candidateDb.tasks = tasks.map((t: any) => {
        const isCompleted = t.completed !== undefined ? Boolean(t.completed) : (String(t.status || '').toLowerCase() === 'completed');
        return {
          ...t,
          id: t.id || generateId(),
          title: t.title || t.name,
          name: t.title || t.name,
          status: isCompleted ? 'Completed' : (t.status || 'Pending'),
          completed: isCompleted,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
    }

    if (Array.isArray(notes) && isTableSelected('notes')) {
      candidateDb.notes = notes.map((n: any) => ({
        ...n,
        id: n.id || generateId(),
        title: n.title || 'Untitled Note',
        content: n.content !== undefined ? String(n.content) : '',
        created_at: n.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    if (settings && typeof settings === 'object' && isTableSelected('settings')) {
      candidateDb.settings = { ...candidateDb.settings, ...settings };
    }
  } else {
    // ----------------------------------------------------
    // MERGE MODE: Stable ID & Natural Composite Key Matching
    // Prevents duplicates on repeated backup imports
    // ----------------------------------------------------
    if (Array.isArray(habits) && isTableSelected('habits')) {
      habits.forEach((h: any) => {
        if (!h || !h.name) return;
        const targetId = h.id ? String(h.id).trim() : null;
        let idx = targetId ? candidateDb.habits.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1 && h.name) {
          idx = candidateDb.habits.findIndex(
            (item: any) => item.name.toLowerCase().trim() === String(h.name).toLowerCase().trim()
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.habits[idx] : {}),
          ...h,
          id: targetId || (idx >= 0 ? candidateDb.habits[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.habits[idx] = mergedItem;
        else candidateDb.habits.push(mergedItem);
      });
    }

    if (Array.isArray(habit_entries) && isTableSelected('habit_entries')) {
      habit_entries.forEach((e: any) => {
        if (!e || !e.habit_id || !e.date) return;
        const targetId = e.id ? String(e.id).trim() : null;
        let idx = targetId ? candidateDb.habit_entries.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.habit_entries.findIndex(
            (item: any) => item.habit_id === e.habit_id && item.date === e.date
          );
        }
        const isComp = e.completed !== undefined ? Boolean(e.completed) : false;
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.habit_entries[idx] : {}),
          ...e,
          id: targetId || (idx >= 0 ? candidateDb.habit_entries[idx].id : generateId()),
          completed: isComp,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.habit_entries[idx] = mergedItem;
        else candidateDb.habit_entries.push(mergedItem);
      });
    }

    if (Array.isArray(goals) && isTableSelected('goals')) {
      goals.forEach((g: any) => {
        if (!g || !g.title) return;
        const targetId = g.id ? String(g.id).trim() : null;
        let idx = targetId ? candidateDb.goals.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.goals.findIndex(
            (item: any) => item.title.toLowerCase().trim() === String(g.title).toLowerCase().trim()
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.goals[idx] : {}),
          ...g,
          id: targetId || (idx >= 0 ? candidateDb.goals[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.goals[idx] = mergedItem;
        else candidateDb.goals.push(mergedItem);
      });
    }

    if (Array.isArray(mood_tracker) && isTableSelected('mood_tracker')) {
      mood_tracker.forEach((m: any) => {
        if (!m || !m.date) return;
        const targetId = m.id ? String(m.id).trim() : null;
        let idx = targetId ? candidateDb.mood_tracker.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.mood_tracker.findIndex((item: any) => item.date === m.date);
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.mood_tracker[idx] : {}),
          ...m,
          id: targetId || (idx >= 0 ? candidateDb.mood_tracker[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.mood_tracker[idx] = mergedItem;
        else candidateDb.mood_tracker.push(mergedItem);
      });
    }

    if (Array.isArray(daily_journal) && isTableSelected('daily_journal')) {
      daily_journal.forEach((j: any) => {
        if (!j || !j.date) return;
        const targetId = j.id ? String(j.id).trim() : null;
        let idx = targetId ? candidateDb.daily_journal.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.daily_journal.findIndex((item: any) => item.date === j.date);
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.daily_journal[idx] : {}),
          ...j,
          id: targetId || (idx >= 0 ? candidateDb.daily_journal[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.daily_journal[idx] = mergedItem;
        else candidateDb.daily_journal.push(mergedItem);
      });
    }

    if (Array.isArray(weekly_plans) && isTableSelected('weekly_plans')) {
      weekly_plans.forEach((p: any) => {
        if (!p) return;
        const targetId = p.id ? String(p.id).trim() : null;
        let idx = targetId ? candidateDb.weekly_plans.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.weekly_plans.findIndex(
            (item: any) => item.year === p.year && item.month === p.month && item.week_number === p.week_number
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.weekly_plans[idx] : {}),
          ...p,
          id: targetId || (idx >= 0 ? candidateDb.weekly_plans[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.weekly_plans[idx] = mergedItem;
        else candidateDb.weekly_plans.push(mergedItem);
      });
    }

    if (Array.isArray(weekly_reviews) && isTableSelected('weekly_reviews')) {
      weekly_reviews.forEach((r: any) => {
        if (!r) return;
        const targetId = r.id ? String(r.id).trim() : null;
        let idx = targetId ? candidateDb.weekly_reviews.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.weekly_reviews.findIndex(
            (item: any) => item.year === r.year && item.month === r.month && item.week_number === r.week_number
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.weekly_reviews[idx] : {}),
          ...r,
          id: targetId || (idx >= 0 ? candidateDb.weekly_reviews[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.weekly_reviews[idx] = mergedItem;
        else candidateDb.weekly_reviews.push(mergedItem);
      });
    }

    if (Array.isArray(refls) && (isTableSelected('reflections') || isTableSelected('monthly_reflections'))) {
      refls.forEach((rf: any) => {
        if (!rf) return;
        const targetId = rf.id ? String(rf.id).trim() : null;
        let idx = targetId ? candidateDb.reflections.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.reflections.findIndex((item: any) => item.year === rf.year && item.month === rf.month);
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.reflections[idx] : {}),
          ...rf,
          id: targetId || (idx >= 0 ? candidateDb.reflections[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.reflections[idx] = mergedItem;
        else candidateDb.reflections.push(mergedItem);
      });
    }

    if (Array.isArray(cats) && (isTableSelected('habit_categories') || isTableSelected('categories'))) {
      cats.forEach((c: any) => {
        if (!c || !c.name) return;
        const targetId = c.id ? String(c.id).trim() : null;
        let idx = targetId ? candidateDb.habit_categories.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.habit_categories.findIndex(
            (item: any) => item.name.toLowerCase().trim() === String(c.name).toLowerCase().trim()
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.habit_categories[idx] : {}),
          ...c,
          id: targetId || (idx >= 0 ? candidateDb.habit_categories[idx].id : generateId()),
        };
        if (idx >= 0) candidateDb.habit_categories[idx] = mergedItem;
        else candidateDb.habit_categories.push(mergedItem);
      });
    }

    if (Array.isArray(affirmations) && isTableSelected('affirmations')) {
      affirmations.forEach((a: any) => {
        if (!a || !a.quote) return;
        const targetId = a.id ? String(a.id).trim() : null;
        let idx = targetId ? candidateDb.affirmations.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          idx = candidateDb.affirmations.findIndex(
            (item: any) => item.quote.toLowerCase().trim() === String(a.quote).toLowerCase().trim()
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.affirmations[idx] : {}),
          ...a,
          id: targetId || (idx >= 0 ? candidateDb.affirmations[idx].id : generateId()),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.affirmations[idx] = mergedItem;
        else candidateDb.affirmations.push(mergedItem);
      });
    }

    if (Array.isArray(tasks) && isTableSelected('tasks')) {
      tasks.forEach((t: any) => {
        if (!t || (!t.title && !t.name)) return;
        const taskTitle = (t.title || t.name || '').trim();
        const targetId = t.id ? String(t.id).trim() : null;
        let idx = targetId ? candidateDb.tasks.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1) {
          const taskDate = t.date || t.due_date || '';
          idx = candidateDb.tasks.findIndex(
            (item: any) =>
              (item.title || item.name || '').toLowerCase().trim() === taskTitle.toLowerCase() &&
              (item.date || item.due_date || '') === taskDate
          );
        }
        const isCompleted = t.completed !== undefined ? Boolean(t.completed) : (String(t.status || '').toLowerCase() === 'completed');
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.tasks[idx] : {}),
          ...t,
          id: targetId || (idx >= 0 ? candidateDb.tasks[idx].id : generateId()),
          title: taskTitle,
          name: taskTitle,
          date: t.date || t.due_date,
          due_date: t.due_date || t.date,
          status: isCompleted ? 'Completed' : (t.status || 'Pending'),
          completed: isCompleted,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.tasks[idx] = mergedItem;
        else candidateDb.tasks.push(mergedItem);
      });
    }

    if (Array.isArray(notes) && isTableSelected('notes')) {
      notes.forEach((n: any) => {
        if (!n || (!n.title && n.content === undefined)) return;
        const targetId = n.id ? String(n.id).trim() : null;
        let idx = targetId ? candidateDb.notes.findIndex((item: any) => item.id === targetId) : -1;
        if (idx === -1 && n.title) {
          idx = candidateDb.notes.findIndex(
            (item: any) => item.title.toLowerCase().trim() === String(n.title).toLowerCase().trim()
          );
        }
        const mergedItem = {
          ...(idx >= 0 ? candidateDb.notes[idx] : {}),
          ...n,
          id: targetId || (idx >= 0 ? candidateDb.notes[idx].id : generateId()),
          title: n.title || (idx >= 0 ? candidateDb.notes[idx].title : 'Untitled Note'),
          content: n.content !== undefined ? String(n.content) : (idx >= 0 ? candidateDb.notes[idx].content : ''),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) candidateDb.notes[idx] = mergedItem;
        else candidateDb.notes.push(mergedItem);
      });
    }

    if (settings && typeof settings === 'object' && isTableSelected('settings')) {
      candidateDb.settings = { ...candidateDb.settings, ...settings };
    }
  }

  const tasksRestored = Array.isArray(tasks) && isTableSelected('tasks') ? tasks.length : 0;
  const journalRestored = Array.isArray(daily_journal) && isTableSelected('daily_journal') ? daily_journal.length : 0;
  const notesRestored = Array.isArray(notes) && isTableSelected('notes') ? notes.length : 0;

  let totalProcessed = 0;
  for (const [key, rows] of Object.entries(rawPayloads)) {
    if (Array.isArray(rows) && isTableSelected(key)) {
      totalProcessed += rows.length;
    }
  }

  const counts: Record<string, number> = {
    habits: candidateDb.habits.length,
    habit_entries: candidateDb.habit_entries.length,
    goals: candidateDb.goals.length,
    mood_tracker: candidateDb.mood_tracker.length,
    daily_journal: candidateDb.daily_journal.length,
    weekly_plans: candidateDb.weekly_plans.length,
    weekly_reviews: candidateDb.weekly_reviews.length,
    reflections: candidateDb.reflections.length,
    categories: candidateDb.habit_categories.length,
    affirmations: candidateDb.affirmations.length,
    tasks: candidateDb.tasks.length,
    notes: candidateDb.notes.length,
  };

  const stats: ProcessedTelemetryStats = {
    tasks_restored: tasksRestored,
    journal_restored: journalRestored,
    notes_restored: notesRestored,
    total_records: totalProcessed,
    failed_records: 0,
  };

  return {
    success: true,
    message: `Data successfully imported (${mode} mode): ${totalProcessed} records processed`,
    newDb: candidateDb,
    counts,
    stats,
  };
}
