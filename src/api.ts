import {
  Habit,
  HabitEntry,
  Reflection,
  WeeklyReview,
  VisualAffirmation,
  StreakInfo,
  HabitCategory,
  HabitFrequency,
  HabitStatus,
  HabitPriority,
  AppSettings,
  HabitCategoryItem,
  Goal,
  DailyJournal,
  WeeklyPlan,
  MoodType,
  MoodTrackerEntry,
  MoodTrackerValue,
  MOOD_TRACKER_MAP,
  KnowledgeNote,
  HRTask,
} from './types';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// In-memory + sessionStorage token management for protected actions
let currentAuthToken: string | null = null;
let unauthorizedCallback: (() => void) | null = null;

export type MutationListener = (info: { url: string; method?: string }) => void;
const mutationListeners = new Set<MutationListener>();

export function onDataMutated(listener: MutationListener): () => void {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
}

export function notifyDataMutated(info: { url: string; method?: string }): void {
  mutationListeners.forEach((listener) => {
    try {
      listener(info);
    } catch (e) {
      console.warn('Error in mutation listener:', e);
    }
  });
}

export const EDIT_SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const EDIT_PASSWORD = '9500';

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('vignesh_edit_token', token);
      sessionStorage.setItem('vignesh_edit_expires', (Date.now() + EDIT_SESSION_DURATION_MS).toString());
    } else {
      sessionStorage.removeItem('vignesh_edit_token');
      sessionStorage.removeItem('vignesh_edit_expires');
      sessionStorage.removeItem('vignesh_edit_pin');
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const expiresStr = sessionStorage.getItem('vignesh_edit_expires');
    if (expiresStr && Date.now() > Number(expiresStr)) {
      currentAuthToken = null;
      sessionStorage.removeItem('vignesh_edit_token');
      sessionStorage.removeItem('vignesh_edit_expires');
      return null;
    }
    if (!currentAuthToken) {
      currentAuthToken = sessionStorage.getItem('vignesh_edit_token');
    }
  }
  return currentAuthToken;
}

export function touchAuthToken(): void {
  if (typeof window !== 'undefined' && getAuthToken()) {
    sessionStorage.setItem('vignesh_edit_expires', (Date.now() + EDIT_SESSION_DURATION_MS).toString());
  }
}

export function setUnauthorizedCallback(cb: (() => void) | null): void {
  unauthorizedCallback = cb;
}

async function request<T>(url: string, options?: RequestInit, retryCount = 0): Promise<T> {
  const isAuthRequest = url.includes('/api/auth');
  const isMutation = !isAuthRequest && options?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
  const defaultNetworkError = isAuthRequest
    ? 'Unable to connect to server to verify password. Please check your connection.'
    : isMutation
    ? 'Unable to reach server. Please check your internet connection.'
    : 'Unable to connect to server. Please check your internet connection.';

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['x-edit-token'] = token;
    headers['x-edit-password'] = EDIT_PASSWORD;
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 502/503/504 transient server reloads / cold starts
    if (!res.ok && [502, 503, 504].includes(res.status) && retryCount < 2) {
      const delayMs = (retryCount + 1) * 400;
      await new Promise((r) => setTimeout(r, delayMs));
      return request<T>(url, options, retryCount + 1);
    }

    if (!res.ok) {
      let errorMsg = defaultNetworkError;

      try {
        const errorData = await res.json();
        if (errorData.error) errorMsg = errorData.error;
        else if (errorData.message) errorMsg = errorData.message;

        if (res.status === 401 && errorData.requiresAuth) {
          setAuthToken(null);
          if (unauthorizedCallback) {
            unauthorizedCallback();
          }
        }
      } catch {
        if (res.statusText) {
          errorMsg = `${res.statusText} (${res.status})`;
        }
      }

      throw new ApiError(errorMsg, res.status);
    }

    if (token) {
      touchAuthToken();
    }

    const data = await res.json();

    // Notify listeners if a mutation occurred (excluding internal sync calls)
    if (isMutation && !url.includes('/api/google-sheets') && !url.includes('/api/auth')) {
      const bodyStr = typeof options?.body === 'string' ? options.body : '';
      if (!bodyStr.includes('google_sheets_last_synced') && !bodyStr.includes('google_sheets_last_pushed')) {
        notifyDataMutated({ url, method: options?.method });
      }
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;

    // Retry transient network failures (TypeError: Failed to fetch, network timeout)
    const isNetworkFetchError = err?.message === 'Failed to fetch' || err?.name === 'TypeError';
    if (isNetworkFetchError && retryCount < 2) {
      const delayMs = (retryCount + 1) * 350;
      await new Promise((r) => setTimeout(r, delayMs));
      return request<T>(url, options, retryCount + 1);
    }

    const finalMessage = isNetworkFetchError ? defaultNetworkError : (err?.message || defaultNetworkError);
    throw new ApiError(finalMessage);
  }
}

export const api = {
  // Status
  async getStatus(): Promise<{ status: string; dbStatus: string; isSupabase?: boolean; primaryDatabase?: string; message: string }> {
    return request('/api/status');
  },

  // Password / PIN Verification (Verified directly in application code: 9500)
  async verifyPassword(password: string): Promise<{ success: boolean; token: string; expiresIn: number; message: string }> {
    const trimmed = password.trim();
    if (trimmed !== EDIT_PASSWORD) {
      throw new Error('Incorrect editing password');
    }
    try {
      const res = await request<{ success: boolean; token: string; expiresIn: number; message: string }>('/api/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    } catch {
      // Direct application verification for 9500 in serverless / offline / static mode
      const clientToken = 'edit_session_' + Date.now();
      setAuthToken(clientToken);
      return {
        success: true,
        token: clientToken,
        expiresIn: 900,
        message: 'Editing unlocked',
      };
    }
  },

  // PIN Verification (Verified directly in application code: 9500)
  async verifyPin(pin: string): Promise<{ success: boolean; token?: string; expiresIn?: number; message: string }> {
    const trimmed = pin.trim();
    if (trimmed !== EDIT_PASSWORD) {
      throw new Error('Incorrect editing password');
    }
    try {
      const res = await request<{ success: boolean; token?: string; expiresIn?: number; message: string }>('/api/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: trimmed }),
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    } catch {
      const clientToken = 'edit_session_' + Date.now();
      setAuthToken(clientToken);
      return {
        success: true,
        token: clientToken,
        expiresIn: 900,
        message: 'Editing unlocked',
      };
    }
  },

  // Lock session
  async lock(): Promise<void> {
    const token = getAuthToken();
    setAuthToken(null);
    try {
      await fetch('/api/auth/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-edit-token': token, Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // ignore
    }
  },

  // Habits
  async getHabits(includeArchived = false): Promise<{ habits: Habit[] }> {
    return request(`/api/habits?include_archived=${includeArchived}`);
  },

  async addHabit(params: {
    name: string;
    category?: HabitCategory;
    frequency?: HabitFrequency;
    priority?: HabitPriority;
    goal_id?: string | null;
    target_count?: number;
    schedule_days?: string[];
    status?: HabitStatus;
  }): Promise<{ habit: Habit }> {
    return request('/api/habits', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async editHabit(
    id: string,
    params: {
      name?: string;
      category?: HabitCategory;
      frequency?: HabitFrequency;
      priority?: HabitPriority;
      goal_id?: string | null;
      target_count?: number;
      schedule_days?: string[];
      status?: HabitStatus;
      archived_at?: string | null;
    }
  ): Promise<{ habit: Habit }> {
    return request(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  async updateHabit(
    id: string,
    params: {
      name?: string;
      category?: HabitCategory;
      frequency?: HabitFrequency;
      priority?: HabitPriority;
      goal_id?: string | null;
      target_count?: number;
      schedule_days?: string[];
      status?: HabitStatus;
      archived_at?: string | null;
    }
  ): Promise<{ habit: Habit }> {
    return this.editHabit(id, params);
  },

  async duplicateHabit(id: string): Promise<{ habit: Habit }> {
    return request(`/api/habits/${id}/duplicate`, {
      method: 'POST',
    });
  },

  async archiveHabit(id: string): Promise<{ habit: Habit; success: boolean }> {
    return request(`/api/habits/${id}`, {
      method: 'DELETE',
    });
  },

  async restoreHabit(id: string): Promise<{ habit: Habit }> {
    return request(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active', archived_at: null }),
    });
  },

  async pauseHabit(id: string): Promise<{ habit: Habit }> {
    return request(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'paused' }),
    });
  },

  async resumeHabit(id: string): Promise<{ habit: Habit }> {
    return request(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active' }),
    });
  },

  async deleteHabit(id: string, permanent = false): Promise<{ success: boolean }> {
    return request(`/api/habits/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    });
  },

  async deleteHabitPermanently(id: string): Promise<{ success: boolean }> {
    return this.deleteHabit(id, true);
  },

  // Habit Entries
  async getHabitEntries(year: number, month?: number): Promise<{ entries: HabitEntry[] }> {
    const url = month ? `/api/habit-entries?year=${year}&month=${month}` : `/api/habit-entries?year=${year}`;
    return request(url);
  },

  async toggleHabitEntry(habit_id: string, date: string, completed: boolean): Promise<{ entry: HabitEntry }> {
    return request('/api/habit-entries/toggle', {
      method: 'POST',
      body: JSON.stringify({ habit_id, date, completed }),
    });
  },

  // Goals
  async getGoals(): Promise<{ goals: Goal[] }> {
    return request('/api/goals');
  },

  async addGoal(params: {
    title: string;
    description?: string;
    category?: HabitCategory;
    target_date?: string;
    progress?: number;
    status?: 'active' | 'completed' | 'paused';
  }): Promise<{ goal: Goal }> {
    return request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async editGoal(
    id: string,
    params: {
      title?: string;
      description?: string;
      category?: HabitCategory;
      target_date?: string;
      progress?: number;
      status?: 'active' | 'completed' | 'paused';
    }
  ): Promise<{ goal: Goal }> {
    return request(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  async deleteGoal(id: string): Promise<{ success: boolean }> {
    return request(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  },

  // Daily Journal & Mood
  async getJournal(params?: {
    date?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ journal: DailyJournal[] }> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.month) query.set('month', String(params.month));
    if (params?.year) query.set('year', String(params.year));
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request(`/api/journal${qs ? `?${qs}` : ''}`);
  },

  async saveJournal(
    dateOrPayload:
      | string
      | {
          date?: string;
          content?: string;
          notes?: string;
          mood?: MoodType;
          energy_level?: number;
        },
    content?: string,
    mood?: MoodType,
    energy_level?: number
  ): Promise<{ entry: DailyJournal; journal: DailyJournal }> {
    let bodyObj: any;
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (typeof dateOrPayload === 'object' && dateOrPayload !== null) {
      let d = (dateOrPayload as any).date || defaultDate;
      if (typeof d === 'string' && d.includes('T')) d = d.split('T')[0];
      bodyObj = {
        id: (dateOrPayload as any).id,
        title: (dateOrPayload as any).title,
        date: d,
        content: (dateOrPayload as any).notes !== undefined ? (dateOrPayload as any).notes : (dateOrPayload as any).content,
        mood: (dateOrPayload as any).mood,
        energy_level: (dateOrPayload as any).energy_level,
        productivity: (dateOrPayload as any).productivity,
        highlights: (dateOrPayload as any).highlights,
        gratitude: (dateOrPayload as any).gratitude,
        wins: (dateOrPayload as any).wins,
        challenges: (dateOrPayload as any).challenges,
        priorities: (dateOrPayload as any).priorities,
        tags: (dateOrPayload as any).tags,
        linked_notes: (dateOrPayload as any).linked_notes,
      };
    } else {
      let d = (typeof dateOrPayload === 'string' && dateOrPayload.trim()) ? dateOrPayload.trim() : defaultDate;
      if (d.includes('T')) d = d.split('T')[0];
      bodyObj = { date: d, content, mood, energy_level };
    }
    const res = await request<{ entry: DailyJournal }>('/api/journal', {
      method: 'POST',
      body: JSON.stringify(bodyObj),
    });
    return { entry: res.entry, journal: res.entry };
  },

  async deleteJournal(idOrDate: string): Promise<{ success: boolean }> {
    return request(`/api/journal/${encodeURIComponent(idOrDate)}`, {
      method: 'DELETE',
    });
  },

  // Knowledge Management & Obsidian Notes
  async getNotes(params?: {
    category?: string;
    tag?: string;
    search?: string;
    archived?: boolean | 'all';
  }): Promise<{ notes: KnowledgeNote[] }> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.search) query.set('search', params.search);
    if (params?.archived !== undefined) query.set('archived', String(params.archived));
    const qs = query.toString();
    return request(`/api/notes${qs ? `?${qs}` : ''}`);
  },

  async createNote(note: Partial<KnowledgeNote>): Promise<{ note: KnowledgeNote }> {
    return request('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },

  async updateNote(id: string, note: Partial<KnowledgeNote>): Promise<{ note: KnowledgeNote }> {
    return request(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  },

  async deleteNote(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async duplicateNote(id: string): Promise<{ note: KnowledgeNote }> {
    return request(`/api/notes/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
    });
  },

  async renameNoteCascade(id: string, oldTitle: string, newTitle: string): Promise<{ note: KnowledgeNote; referencesUpdated: number }> {
    return request('/api/notes/rename', {
      method: 'PATCH',
      body: JSON.stringify({ id, oldTitle, newTitle }),
    });
  },

  // Tasks Management
  async getTasks(params?: {
    status?: string;
    category?: string;
    priority?: string;
    date?: string;
    search?: string;
    include_archived?: boolean;
  }): Promise<{ tasks: HRTask[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.date) query.set('date', params.date);
    if (params?.search) query.set('search', params.search);
    if (params?.include_archived !== undefined) query.set('include_archived', String(params.include_archived));
    const qs = query.toString();
    return request(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  async createTask(task: Partial<HRTask>): Promise<{ task: HRTask }> {
    return request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTask(id: string, updates: Partial<HRTask>): Promise<{ task: HRTask }> {
    return request(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean; id: string; message: string }> {
    return request(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async toggleTaskStatus(id: string): Promise<{ task: HRTask }> {
    return request(`/api/tasks/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
    });
  },

  async saveTasksBatch(tasks: HRTask[]): Promise<{ success: boolean; count: number; tasks: HRTask[] }> {
    return request('/api/tasks/batch', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  },

  // Weekly Plans
  async getWeeklyPlans(year?: number, month?: number): Promise<{ plans: WeeklyPlan[] }> {
    const query = new URLSearchParams();
    if (year) query.set('year', String(year));
    if (month) query.set('month', String(month));
    const qs = query.toString();
    return request(`/api/weekly-plans${qs ? `?${qs}` : ''}`);
  },

  async saveWeeklyPlan(params: {
    year: number;
    month: number;
    week_number: number;
    main_goal: string;
    priority_1: string;
    priority_2: string;
    priority_3: string;
    target_percentage?: number;
  }): Promise<{ plan: WeeklyPlan }> {
    return request('/api/weekly-plans', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Reflection
  async getReflection(year: number, month: number): Promise<{ reflection: Reflection | null }> {
    return request(`/api/reflections?year=${year}&month=${month}`);
  },

  async saveReflection(year: number, month: number, content: string): Promise<{ reflection: Reflection }> {
    return request('/api/reflections', {
      method: 'POST',
      body: JSON.stringify({ year, month, content }),
    });
  },

  // Weekly Reviews
  async getWeeklyReviews(year: number, month: number): Promise<{ reviews: WeeklyReview[] }> {
    return request(`/api/weekly-reviews?year=${year}&month=${month}`);
  },

  async saveWeeklyReview(params: {
    year: number;
    month: number;
    week_number: number;
    went_well: string;
    improve: string;
    next_focus: string;
  }): Promise<{ review: WeeklyReview }> {
    return request('/api/weekly-reviews', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Visual Affirmation
  async getAffirmation(): Promise<{ affirmation: VisualAffirmation }> {
    return request('/api/affirmation');
  },

  async saveAffirmation(params: {
    quote: string;
    author?: string;
    image_url?: string;
    active?: boolean;
  }): Promise<{ affirmation: VisualAffirmation }> {
    return request('/api/affirmation', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Streak
  async getStreak(): Promise<StreakInfo> {
    return request('/api/streak');
  },

  // Settings
  async getSettings(): Promise<{ settings: AppSettings }> {
    return request('/api/settings');
  },

  async saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<{ success: boolean }> {
    return request('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ setting_key: key, setting_value: value }),
    });
  },

  // Habit Categories
  async getCategories(): Promise<{ categories: HabitCategoryItem[] }> {
    return request('/api/habit-categories');
  },

  async addCategory(name: string, icon = '✨'): Promise<{ category: HabitCategoryItem }> {
    return request('/api/habit-categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon }),
    });
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    return request(`/api/habit-categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Backup Import
  async importBackup(data: any, mode: 'merge' | 'replace' = 'merge'): Promise<{ success: boolean; message: string; summary: any }> {
    return request('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify({ data, mode }),
    });
  },

  // Mood Tracker (public.mood_tracker)
  async getMoods(): Promise<{ moods: MoodTrackerEntry[] }> {
    return request('/api/moods');
  },

  async getMoodById(id: string): Promise<{ mood: MoodTrackerEntry }> {
    return request(`/api/moods/${id}`);
  },

  async saveMood(payload: {
    date: string;
    mood: MoodTrackerValue;
    mood_score?: number;
    energy_level?: number;
    note?: string;
  }): Promise<{ mood: MoodTrackerEntry; created?: boolean; updated?: boolean }> {
    if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      throw new Error('Valid date (YYYY-MM-DD) is required.');
    }
    const score = payload.mood_score ?? MOOD_TRACKER_MAP[payload.mood]?.score ?? 4;
    const body = {
      date: payload.date,
      mood: payload.mood,
      mood_score: score,
      energy_level: payload.energy_level ?? 3,
      note: payload.note ?? '',
    };
    console.log('[Mood Tracker] Saving:', body);
    return request('/api/moods', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateMood(
    id: string,
    payload: {
      date?: string;
      mood?: MoodTrackerValue;
      mood_score?: number;
      energy_level?: number;
      note?: string;
    }
  ): Promise<{ mood: MoodTrackerEntry }> {
    if (payload.date && !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      throw new Error('Valid date (YYYY-MM-DD) is required.');
    }
    const body: Record<string, any> = { ...payload };
    if (payload.mood && payload.mood_score === undefined) {
      body.mood_score = MOOD_TRACKER_MAP[payload.mood]?.score ?? 4;
    }
    console.log('[Mood Tracker] Saving:', { id, ...body });
    return request(`/api/moods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteMood(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/moods/${id}`, {
      method: 'DELETE',
    });
  },

  // Import full JSON backup
  async importData(data: any): Promise<{ success: boolean; message: string; counts?: any }> {
    return request('/api/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Google Sheets Apps Script integration
  async testGoogleSheets(scriptUrl: string): Promise<{ success: boolean; message: string }> {
    return request('/api/google-sheets/test', {
      method: 'POST',
      body: JSON.stringify({ script_url: scriptUrl }),
    });
  },

  async syncGoogleSheets(scriptUrl: string, data?: any): Promise<{ success: boolean; message: string; summary?: any; timestamp?: string }> {
    return request('/api/google-sheets/sync', {
      method: 'POST',
      body: JSON.stringify({ script_url: scriptUrl, data }),
    });
  },

  async pullGoogleSheets(scriptUrl: string, applyImport: boolean = false): Promise<{ success: boolean; data: any; message?: string }> {
    return request('/api/google-sheets/pull', {
      method: 'POST',
      body: JSON.stringify({ script_url: scriptUrl, apply_import: applyImport }),
    });
  },

  onDataMutated,
  notifyDataMutated,
};
