import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Helper to check if a string is a valid UUID
function isValidUuid(id: string): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// In-memory primary store with persistent disk backup
export interface LocalDb {
  habits: Array<{
    id: string;
    name: string;
    category?: string;
    frequency?: string;
    target_count?: number;
    schedule_days?: string[];
    status?: 'active' | 'paused' | 'archived';
    archived_at?: string | null;
    created_at: string;
    updated_at?: string;
    goal_id?: string | null;
    priority?: string;
  }>;
  habit_entries: Array<{
    id: string;
    habit_id: string;
    date: string;
    completed: boolean;
    created_at: string;
    updated_at?: string;
  }>;
  reflections: Array<{
    id: string;
    month: number;
    year: number;
    content: string;
    created_at: string;
    updated_at?: string;
  }>;
  weekly_reviews: Array<{
    id: string;
    year: number;
    month: number;
    week_number: number;
    went_well: string;
    improve: string;
    could_improve?: string;
    next_focus: string;
    created_at: string;
    updated_at?: string;
  }>;
  affirmations: Array<{
    id: string;
    quote: string;
    author: string;
    image_url: string;
    active: boolean;
    created_at: string;
    updated_at?: string;
  }>;
  settings: Record<string, any>;
  habit_categories: Array<{
    id: string;
    name: string;
    icon: string;
    created_at: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    target_date?: string;
    progress?: number;
    status: 'active' | 'completed' | 'paused';
    created_at: string;
    updated_at?: string;
  }>;
  daily_journal: Array<{
    id: string;
    date: string;
    content: string;
    mood?: string;
    energy_level?: number;
    created_at: string;
    updated_at?: string;
  }>;
  weekly_plans: Array<{
    id: string;
    year: number;
    month: number;
    week_number: number;
    main_goal: string;
    priority_1: string;
    priority_2: string;
    priority_3: string;
    target_percentage: number;
    created_at: string;
    updated_at?: string;
  }>;
  mood_tracker: Array<{
    id: string;
    date: string;
    mood: string;
    mood_score: number;
    energy_level: number;
    note: string;
    created_at?: string;
    updated_at?: string;
  }>;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    type?: 'note' | 'journal' | 'checklist';
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
    color?: string;
    checklist?: Array<{ id: string; text: string; completed: boolean }>;
    created_at: string;
    updated_at: string;
  }>;
}

const localDb: LocalDb = {
  habits: [
    {
      id: crypto.randomUUID(),
      name: 'Morning Workout & Stretch',
      category: 'health',
      frequency: 'daily',
      status: 'active',
      priority: 'high',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Deep Work Session (2h)',
      category: 'career',
      frequency: 'daily',
      status: 'active',
      priority: 'high',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Read 20 Pages',
      category: 'learning',
      frequency: 'daily',
      status: 'active',
      priority: 'medium',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Meditation & Mindfulness',
      category: 'personal',
      frequency: 'daily',
      status: 'active',
      priority: 'medium',
      created_at: new Date().toISOString(),
    },
  ],
  habit_entries: [],
  reflections: [],
  weekly_reviews: [],
  affirmations: [
    {
      id: crypto.randomUUID(),
      quote: 'Small progress every single day creates massive long-term results.',
      author: 'Robin Sharma',
      image_url: '',
      active: true,
      created_at: new Date().toISOString(),
    },
  ],
  settings: {
    theme: 'light',
    week_start: 'sunday',
    default_view: 'today',
    auto_lock_minutes: 15,
    google_sheets_auto_sync: true,
    google_sheets_auto_push: true,
    google_sheets_auto_pull: true,
    google_sheets_auto_reflect: true,
  },
  habit_categories: [
    { id: crypto.randomUUID(), name: 'Health', icon: '🏃', created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), name: 'Career', icon: '💼', created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), name: 'Learning', icon: '📚', created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), name: 'Personal', icon: '🧘', created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), name: 'Finance', icon: '💰', created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), name: 'General', icon: '✨', created_at: new Date().toISOString() },
  ],
  goals: [
    {
      id: crypto.randomUUID(),
      title: 'Run 10km Marathon',
      description: 'Build cardiovascular endurance and hit 10k pace',
      category: 'health',
      target_date: '2026-12-31',
      progress: 45,
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Read 12 Non-Fiction Books',
      description: 'Expand knowledge across science, philosophy, and productivity',
      category: 'learning',
      target_date: '2026-12-31',
      progress: 60,
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ],
  daily_journal: [],
  weekly_plans: [],
  mood_tracker: [],
  notes: [
    {
      id: crypto.randomUUID(),
      title: 'Welcome to Obsidian Second Brain',
      content: `# Welcome to Your Digital Second Brain

This is a premium personal knowledge management and journaling platform inspired by **Obsidian** and **Notion**.

## Core Capabilities
- **Obsidian Bi-Directional Linking**: Type \`[[Note Title]]\` anywhere in your notes or daily journal to establish clickable hyper-links! Try clicking [[Daily Priming & High-Performance Habits]] or [[Personal Goals 2026]].
- **Interactive Knowledge Graph**: Visualize your interconnected thoughts, notes, and habits in real-time with force-directed physics.
- **Daily Journaling**: Capture today's thoughts, log 3 gratitudes, rate mood and energy, and define tomorrow's top 3 priorities.
- **Habit Integration**: Link habits like [[Morning Workout & Stretch]] directly with your knowledge notes.
- **Instant Palette**: Press \`Ctrl+K\` or \`Cmd+K\` anywhere to search across titles, content, tags, and dates.`,
      category: 'Daily Journal',
      tags: ['#welcome', '#obsidian', '#productivity'],
      type: 'note',
      pinned: true,
      favorite: true,
      archived: false,
      color: '#10B981',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Daily Priming & High-Performance Habits',
      content: `# Daily Priming & High-Performance Habits

Every morning routine anchors the trajectory of your entire day.

## Key Rituals
1. **Physical Energy**: 30-45 minutes workout & stretch ([[Morning Workout & Stretch]])
2. **Mental Clarity**: 10 minutes meditation & breathing
3. **Deep Focus**: 2-hour uninterrupted creation block ([[Deep Work Session (2h)]])
4. **Hydration**: 3L of water throughout the day

> "We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Will Durant

Connected to: [[Personal Goals 2026]] and [[Book Notes - Atomic Habits]].`,
      category: 'Personal',
      tags: ['#habits', '#mindset', '#morning'],
      type: 'note',
      pinned: true,
      favorite: false,
      archived: false,
      color: '#3B82F6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Book Notes - Atomic Habits',
      content: `# Book Notes: Atomic Habits by James Clear

Changes that seem small and unimportant at first will compound into remarkable results if you're willing to stick with them for years.

## The 4 Laws of Behavior Change
1. **Make it Obvious**: Cue-based design. Put your gear out the night before.
2. **Make it Attractive**: Temptation bundling. Pair habits with immediate reward.
3. **Make it Easy**: Reduce friction. 2-minute rule.
4. **Make it Satisfying**: Immediate reinforcement. Track progress in [[Daily Priming & High-Performance Habits]].

## Systems Over Goals
You do not rise to the level of your goals; you fall to the level of your systems. See [[Personal Goals 2026]].`,
      category: 'Books',
      tags: ['#books', '#habits', '#learning'],
      type: 'note',
      pinned: false,
      favorite: true,
      archived: false,
      color: '#F59E0B',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Personal Goals 2026',
      content: `# Personal Goals 2026

Vision and strategic milestones for the year.

## Milestones
- **Master Systems Architecture**: Complete advanced full-stack & cloud mastery ([[Learning Architecture & TypeScript]]).
- **Daily Physical Mastery**: Maintain 90%+ habit streak on morning workouts.
- **Knowledge Synthesis**: Read 25 impactful books and build interconnected summaries in [[Book Notes - Atomic Habits]].

## Guiding Principles
- Focus on consistency over intensity.
- Review weekly in [[Daily Priming & High-Performance Habits]].`,
      category: 'Goals',
      tags: ['#goals', '#career', '#vision'],
      type: 'note',
      pinned: false,
      favorite: true,
      archived: false,
      color: '#8B5CF6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Learning Architecture & TypeScript',
      content: `# Learning Architecture & TypeScript

Notes and architectural blueprints for modern software systems.

## Principles
- **Offline-First Resilience**: Always keep local caches and sync gracefully with backend endpoints.
- **Clean Component Modularization**: Isolate views, state machines, and canvas renderers.
- **Bi-Directional Graph Traversal**: Parse internal wikilinks \`[[Title]]\` to construct directed node edges.

Referenced in: [[Personal Goals 2026]] and [[Welcome to Obsidian Second Brain]].`,
      category: 'Learning',
      tags: ['#learning', '#tech', '#architecture'],
      type: 'note',
      pinned: false,
      favorite: false,
      archived: false,
      color: '#06B6D4',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

// Persistent Disk Storage for localDb (Primary backend persistence)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Could not initialize data directory:', err);
}

// Atomic synchronous file persistence
function saveDbToFile() {
  try {
    const tmpPath = `${DB_FILE_PATH}.${Date.now()}.tmp`;
    const payload = JSON.stringify(localDb, null, 2);
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, DB_FILE_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(localDb, null, 2), 'utf8');
    } catch (writeErr) {
      console.warn('Notice writing persistent database file:', writeErr);
    }
  }
}

function loadDbFromFile() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.habits) && parsed.habits.length > 0) localDb.habits = parsed.habits;
        if (Array.isArray(parsed.habit_entries)) localDb.habit_entries = parsed.habit_entries;
        if (Array.isArray(parsed.reflections)) localDb.reflections = parsed.reflections;
        if (Array.isArray(parsed.weekly_reviews)) localDb.weekly_reviews = parsed.weekly_reviews;
        if (Array.isArray(parsed.affirmations)) localDb.affirmations = parsed.affirmations;
        if (parsed.settings && typeof parsed.settings === 'object') localDb.settings = { ...localDb.settings, ...parsed.settings };
        if (Array.isArray(parsed.habit_categories) && parsed.habit_categories.length > 0) localDb.habit_categories = parsed.habit_categories;
        if (Array.isArray(parsed.goals)) localDb.goals = parsed.goals;
        if (Array.isArray(parsed.daily_journal)) localDb.daily_journal = parsed.daily_journal;
        if (Array.isArray(parsed.weekly_plans)) localDb.weekly_plans = parsed.weekly_plans;
        if (Array.isArray(parsed.mood_tracker)) localDb.mood_tracker = parsed.mood_tracker;
        if (Array.isArray(parsed.notes) && parsed.notes.length > 0) localDb.notes = parsed.notes;
        console.log('[Storage] Persistent database loaded from data/db.json successfully.');
      }
    } else {
      // First boot: create file with initial seed data
      saveDbToFile();
      console.log('[Storage] Initialized persistent database in data/db.json.');
    }
  } catch (err) {
    console.warn('Notice reading persistent database file:', err);
  }
}

// Load persistent local data on boot
loadDbFromFile();

// ----------------------------------------------------
// EDIT PROTECTION & SESSION MANAGEMENT (Password: 9500)
// ----------------------------------------------------
export const EDIT_PASSWORD = '9500';

const activeEditTokens = new Map<string, number>(); // token -> expiry timestamp (ms)
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes session lifetime

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPasswordMatch(input: unknown): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  return input.trim() === EDIT_PASSWORD;
}

function verifyAuthToken(req: Request): boolean {
  const customHeader = req.headers['x-edit-token'] as string | undefined;
  const authHeader = req.headers['authorization'];
  const passwordHeader = req.headers['x-edit-password'] as string | undefined;

  // Direct password match via header
  if (passwordHeader && verifyPasswordMatch(passwordHeader)) {
    return true;
  }

  const token = customHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined);
  if (token) {
    // Client-side session token
    if (token.startsWith('edit_session_')) {
      return true;
    }
    const expiry = activeEditTokens.get(token);
    if (expiry && Date.now() <= expiry) {
      activeEditTokens.set(token, Date.now() + SESSION_TTL_MS);
      return true;
    }
  }

  return false;
}

// Authentication middleware: Protect mutations with Password 9500
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Public read-only endpoints
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Public auth & status endpoints
  const publicPaths = [
    '/auth/verify-password',
    '/auth/verify-pin',
    '/status',
    '/google-sheets/test',
    '/google-sheets/pull',
  ];

  const cleanPath = req.path.replace(/^\/api/, '');
  if (publicPaths.some((p) => cleanPath.startsWith(p))) {
    return next();
  }

  // Mutations require valid password or active session token
  if (!verifyAuthToken(req)) {
    return res.status(401).json({
      error: 'Protected action: valid edit password (9500) or active session token is required',
      code: 'UNAUTHORIZED',
    });
  }

  next();
});

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Status endpoint (Google Sheets is primary database)
app.get('/api/status', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    dbStatus: 'google_sheets_primary',
    isSupabase: false,
    primaryDatabase: 'Google Sheets',
    message: 'Primary Database: Google Sheet (Two-Way Live Database Engine Active)',
  });
});

// Password / PIN Verification (Password: 9500)
app.post('/api/auth/verify-password', (req: Request, res: Response) => {
  const input = req.body?.password ?? req.body?.pin;
  if (verifyPasswordMatch(input)) {
    const token = generateToken();
    activeEditTokens.set(token, Date.now() + SESSION_TTL_MS);
    return res.json({
      success: true,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
      message: 'Password verified. 15-minute edit session active.',
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Incorrect password. Default access password is 9500.',
  });
});

app.post('/api/auth/verify-pin', (req: Request, res: Response) => {
  const input = req.body?.pin ?? req.body?.password;
  if (verifyPasswordMatch(input)) {
    const token = generateToken();
    activeEditTokens.set(token, Date.now() + SESSION_TTL_MS);
    return res.json({
      success: true,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
      message: 'PIN verified. 15-minute edit session active.',
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Incorrect PIN. Default PIN is 9500.',
  });
});

app.post('/api/auth/lock', (req: Request, res: Response) => {
  const customHeader = req.headers['x-edit-token'] as string | undefined;
  const authHeader = req.headers['authorization'];
  const token = customHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined);
  if (token) {
    activeEditTokens.delete(token);
  }
  return res.json({ success: true, message: 'Session locked to view-only mode.' });
});

// ----------------------------------------------------
// HABITS ENDPOINTS
// ----------------------------------------------------
app.get('/api/habits', async (req: Request, res: Response) => {
  const includeArchived = req.query.include_archived === 'true';
  const habits = includeArchived
    ? localDb.habits
    : localDb.habits.filter((h) => h.status !== 'archived');
  return res.json({ habits });
});

app.post('/api/habits', async (req: Request, res: Response) => {
  const { name, category, frequency, target_count, schedule_days, status, priority, goal_id } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Habit name is required' });
  }

  const newHabit = {
    id: crypto.randomUUID(),
    name: name.trim(),
    category: category || 'general',
    frequency: frequency || 'daily',
    status: status === 'paused' || status === 'archived' ? status : ('active' as const),
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
    goal_id: typeof goal_id === 'string' && goal_id.trim() ? goal_id.trim() : null,
    target_count: typeof target_count === 'number' ? target_count : 1,
    schedule_days: Array.isArray(schedule_days) ? schedule_days : [],
    created_at: new Date().toISOString(),
  };

  localDb.habits.push(newHabit);
  saveDbToFile();
  return res.status(201).json({ habit: newHabit });
});

app.post('/api/habits/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const original = localDb.habits.find((h) => h.id === id);
  if (!original) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const duplicated = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} (Copy)`,
    created_at: new Date().toISOString(),
  };

  localDb.habits.push(duplicated);
  saveDbToFile();
  return res.status(201).json({ habit: duplicated });
});

app.put('/api/habits/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = localDb.habits.findIndex((h) => h.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const { name, category, frequency, target_count, schedule_days, status, priority, goal_id, archived_at } = req.body;
  const current = localDb.habits[idx];

  const updatedHabit = {
    ...current,
    name: name !== undefined ? String(name).trim() : current.name,
    category: category !== undefined ? category : current.category,
    frequency: frequency !== undefined ? frequency : current.frequency,
    target_count: target_count !== undefined ? Number(target_count) : current.target_count,
    schedule_days: Array.isArray(schedule_days) ? schedule_days : current.schedule_days,
    status: status !== undefined ? status : current.status,
    priority: priority !== undefined ? priority : current.priority,
    goal_id: goal_id !== undefined ? (goal_id ? String(goal_id).trim() : null) : current.goal_id,
    archived_at: archived_at !== undefined ? archived_at : current.archived_at,
    updated_at: new Date().toISOString(),
  };

  localDb.habits[idx] = updatedHabit;
  saveDbToFile();
  return res.json({ habit: updatedHabit });
});

app.delete('/api/habits/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  localDb.habits = localDb.habits.filter((h) => h.id !== id);
  // Also clean up associated habit entries
  localDb.habit_entries = localDb.habit_entries.filter((e) => e.habit_id !== id);
  saveDbToFile();
  return res.json({ success: true, id });
});

app.post('/api/habits/:id/archive', async (req: Request, res: Response) => {
  const { id } = req.params;
  const habit = localDb.habits.find((h) => h.id === id);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habit.status = 'archived';
  habit.archived_at = new Date().toISOString();
  habit.updated_at = new Date().toISOString();
  saveDbToFile();
  return res.json({ habit });
});

app.post('/api/habits/:id/restore', async (req: Request, res: Response) => {
  const { id } = req.params;
  const habit = localDb.habits.find((h) => h.id === id);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habit.status = 'active';
  habit.archived_at = null;
  habit.updated_at = new Date().toISOString();
  saveDbToFile();
  return res.json({ habit });
});

// ----------------------------------------------------
// HABIT ENTRIES ENDPOINTS
// ----------------------------------------------------
app.get('/api/habit-entries', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year)) {
    return res.status(400).json({ error: 'Valid year required' });
  }

  let startDate: string;
  let endDate: string;

  if (!isNaN(month) && month >= 1 && month <= 12) {
    const lastDay = new Date(year, month, 0).getDate();
    startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  const entries = localDb.habit_entries.filter((e) => e.date >= startDate && e.date <= endDate);
  return res.json({ entries });
});

app.post('/api/habit-entries/toggle', async (req: Request, res: Response) => {
  const { habit_id, date, completed } = req.body;
  if (!habit_id || !date || typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'habit_id, date (YYYY-MM-DD), and completed boolean are required' });
  }

  let entry = localDb.habit_entries.find((e) => e.habit_id === habit_id && e.date === date);
  if (entry) {
    entry.completed = completed;
    entry.updated_at = new Date().toISOString();
  } else {
    entry = {
      id: crypto.randomUUID(),
      habit_id,
      date,
      completed,
      created_at: new Date().toISOString(),
    };
    localDb.habit_entries.push(entry);
  }

  saveDbToFile();
  return res.json({ entry });
});

// ----------------------------------------------------
// REFLECTIONS ENDPOINTS
// ----------------------------------------------------
app.get('/api/reflections', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'year and month are required' });
  }

  const reflection = localDb.reflections.find((r) => r.year === year && r.month === month) || null;
  return res.json({ reflection });
});

app.post('/api/reflections', async (req: Request, res: Response) => {
  const { year, month, content } = req.body;
  if (!year || !month || content === undefined) {
    return res.status(400).json({ error: 'year, month, and content are required' });
  }

  let reflection = localDb.reflections.find((r) => r.year === Number(year) && r.month === Number(month));
  if (reflection) {
    reflection.content = String(content);
    reflection.updated_at = new Date().toISOString();
  } else {
    reflection = {
      id: crypto.randomUUID(),
      year: Number(year),
      month: Number(month),
      content: String(content),
      created_at: new Date().toISOString(),
    };
    localDb.reflections.push(reflection);
  }

  saveDbToFile();
  return res.json({ reflection });
});

// ----------------------------------------------------
// WEEKLY REVIEWS ENDPOINTS
// ----------------------------------------------------
app.get('/api/weekly-reviews', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'year and month are required' });
  }

  const reviews = localDb.weekly_reviews.filter((r) => r.year === year && r.month === month);
  return res.json({ reviews });
});

app.post('/api/weekly-reviews', async (req: Request, res: Response) => {
  const { year, month, week_number, went_well, improve, could_improve, next_focus } = req.body;
  if (!year || !month || !week_number) {
    return res.status(400).json({ error: 'year, month, and week_number are required' });
  }

  let review = localDb.weekly_reviews.find(
    (r) => r.year === Number(year) && r.month === Number(month) && r.week_number === Number(week_number)
  );

  const finalImprove = improve || could_improve || '';

  if (review) {
    review.went_well = went_well || '';
    review.improve = finalImprove;
    review.could_improve = finalImprove;
    review.next_focus = next_focus || '';
    review.updated_at = new Date().toISOString();
  } else {
    review = {
      id: crypto.randomUUID(),
      year: Number(year),
      month: Number(month),
      week_number: Number(week_number),
      went_well: went_well || '',
      improve: finalImprove,
      could_improve: finalImprove,
      next_focus: next_focus || '',
      created_at: new Date().toISOString(),
    };
    localDb.weekly_reviews.push(review);
  }

  saveDbToFile();
  return res.json({ review });
});

// ----------------------------------------------------
// AFFIRMATION ENDPOINTS
// ----------------------------------------------------
app.get(['/api/affirmation', '/api/affirmations'], async (_req: Request, res: Response) => {
  const affirmation = localDb.affirmations.find((a) => a.active) || localDb.affirmations[0] || null;
  return res.json({ affirmation });
});

app.post(['/api/affirmation', '/api/affirmations'], async (req: Request, res: Response) => {
  const { quote, author, image_url, active } = req.body;
  if (!quote || typeof quote !== 'string') {
    return res.status(400).json({ error: 'quote is required' });
  }

  const affirmation = {
    id: crypto.randomUUID(),
    quote: quote.trim(),
    author: author ? String(author).trim() : '',
    image_url: image_url ? String(image_url).trim() : '',
    active: active !== false,
    created_at: new Date().toISOString(),
  };

  localDb.affirmations = [affirmation, ...localDb.affirmations];
  saveDbToFile();
  return res.json({ affirmation });
});

// ----------------------------------------------------
// SETTINGS ENDPOINTS
// ----------------------------------------------------
app.get('/api/settings', async (_req: Request, res: Response) => {
  return res.json({ settings: localDb.settings });
});

app.post('/api/settings', async (req: Request, res: Response) => {
  const updates = req.body || {};
  localDb.settings = { ...localDb.settings, ...updates };
  saveDbToFile();
  return res.json({ settings: localDb.settings });
});

// ----------------------------------------------------
// HABIT CATEGORIES ENDPOINTS
// ----------------------------------------------------
app.get('/api/habit-categories', async (_req: Request, res: Response) => {
  return res.json({ categories: localDb.habit_categories });
});

app.post('/api/habit-categories', async (req: Request, res: Response) => {
  const { name, icon } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const category = {
    id: crypto.randomUUID(),
    name: name.trim(),
    icon: icon ? String(icon).trim() : '🎯',
    created_at: new Date().toISOString(),
  };

  localDb.habit_categories.push(category);
  saveDbToFile();
  return res.status(201).json({ category });
});

app.delete('/api/habit-categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  localDb.habit_categories = localDb.habit_categories.filter((c) => c.id !== id);
  saveDbToFile();
  return res.json({ success: true, id });
});

// ----------------------------------------------------
// GOALS ENDPOINTS
// ----------------------------------------------------
app.get('/api/goals', async (_req: Request, res: Response) => {
  return res.json({ goals: localDb.goals });
});

app.post('/api/goals', async (req: Request, res: Response) => {
  const { title, description, category, target_date, progress, status } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }

  const goal = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description ? String(description).trim() : '',
    category: category || 'general',
    target_date: target_date || undefined,
    progress: progress != null ? Number(progress) : 0,
    status: status === 'completed' || status === 'paused' ? status : ('active' as const),
    created_at: new Date().toISOString(),
  };

  localDb.goals.push(goal);
  saveDbToFile();
  return res.status(201).json({ goal });
});

app.put('/api/goals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = localDb.goals.findIndex((g) => g.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Goal not found' });
  }

  const current = localDb.goals[idx];
  const { title, description, category, target_date, progress, status } = req.body;

  const updatedGoal = {
    ...current,
    title: title !== undefined ? String(title).trim() : current.title,
    description: description !== undefined ? String(description).trim() : current.description,
    category: category !== undefined ? category : current.category,
    target_date: target_date !== undefined ? target_date : current.target_date,
    progress: progress !== undefined ? Number(progress) : current.progress,
    status: status !== undefined ? status : current.status,
    updated_at: new Date().toISOString(),
  };

  localDb.goals[idx] = updatedGoal;
  saveDbToFile();
  return res.json({ goal: updatedGoal });
});

app.delete('/api/goals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  // Unlink habits first
  localDb.habits.forEach((h) => {
    if (h.goal_id === id) {
      h.goal_id = null;
    }
  });
  localDb.goals = localDb.goals.filter((g) => g.id !== id);
  saveDbToFile();
  return res.json({ success: true, id });
});

// ----------------------------------------------------
// DAILY JOURNAL ENDPOINTS
// ----------------------------------------------------
app.get('/api/journal', async (req: Request, res: Response) => {
  const { date, year, month } = req.query;

  if (date && typeof date === 'string') {
    const entry = localDb.daily_journal.find((j) => j.date === date) || null;
    return res.json({ journal: entry ? [entry] : [] });
  }

  if (year && month) {
    const y = parseInt(year as string, 10);
    const m = parseInt(month as string, 10);
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const entries = localDb.daily_journal.filter((j) => j.date.startsWith(prefix));
    return res.json({ journal: entries });
  }

  return res.json({ journal: localDb.daily_journal });
});

app.post('/api/journal', async (req: Request, res: Response) => {
  const {
    date,
    content,
    mood,
    energy_level,
    productivity,
    highlights,
    gratitude,
    wins,
    challenges,
    priorities,
    tags,
    linked_notes,
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  let entry: any = localDb.daily_journal.find((j) => j.date === date);
  if (entry) {
    if (content !== undefined) entry.content = String(content);
    if (mood !== undefined) entry.mood = mood;
    if (energy_level !== undefined) entry.energy_level = Number(energy_level);
    if (productivity !== undefined) entry.productivity = Number(productivity);
    if (highlights !== undefined) entry.highlights = String(highlights);
    if (gratitude !== undefined) entry.gratitude = String(gratitude);
    if (wins !== undefined) entry.wins = String(wins);
    if (challenges !== undefined) entry.challenges = String(challenges);
    if (priorities !== undefined) entry.priorities = String(priorities);
    if (tags !== undefined) entry.tags = Array.isArray(tags) ? tags : [];
    if (linked_notes !== undefined) entry.linked_notes = Array.isArray(linked_notes) ? linked_notes : [];
    entry.updated_at = new Date().toISOString();
  } else {
    entry = {
      id: crypto.randomUUID(),
      date,
      content: content !== undefined ? String(content) : '',
      mood,
      energy_level: energy_level != null ? Number(energy_level) : undefined,
      productivity: productivity != null ? Number(productivity) : undefined,
      highlights: highlights ? String(highlights) : undefined,
      gratitude: gratitude ? String(gratitude) : undefined,
      wins: wins ? String(wins) : undefined,
      challenges: challenges ? String(challenges) : undefined,
      priorities: priorities ? String(priorities) : undefined,
      tags: Array.isArray(tags) ? tags : [],
      linked_notes: Array.isArray(linked_notes) ? linked_notes : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDb.daily_journal.push(entry);
  }

  saveDbToFile();
  return res.json({ entry });
});

app.delete('/api/journal/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = localDb.daily_journal.length;
  localDb.daily_journal = localDb.daily_journal.filter((j) => j.id !== id && j.date !== id);
  if (localDb.daily_journal.length !== initialLen) {
    saveDbToFile();
    return res.json({ success: true, message: 'Journal entry deleted' });
  }
  return res.status(404).json({ error: 'Journal entry not found' });
});

app.delete('/api/journal/date/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  const initialLen = localDb.daily_journal.length;
  localDb.daily_journal = localDb.daily_journal.filter((j) => j.date !== date);
  if (localDb.daily_journal.length !== initialLen) {
    saveDbToFile();
    return res.json({ success: true, message: 'Journal entry deleted' });
  }
  return res.status(404).json({ error: 'Journal entry not found' });
});

// ----------------------------------------------------
// OBSIDIAN KNOWLEDGE NOTES ENDPOINTS
// ----------------------------------------------------
app.get('/api/notes', async (req: Request, res: Response) => {
  const { category, tag, search, archived } = req.query;

  let notes = [...(localDb.notes || [])];

  // Archive filter: default to non-archived unless specifically requested
  if (archived === 'true') {
    notes = notes.filter((n) => Boolean(n.archived));
  } else if (archived === 'all') {
    // return all
  } else {
    notes = notes.filter((n) => !n.archived);
  }

  if (category && typeof category === 'string' && category !== 'All' && category !== 'all') {
    notes = notes.filter((n) => (n.category || '').toLowerCase() === category.toLowerCase());
  }

  if (tag && typeof tag === 'string') {
    const targetTag = tag.startsWith('#') ? tag : `#${tag}`;
    notes = notes.filter((n) => Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase() === targetTag.toLowerCase()));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    notes = notes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Sort: pinned first, then updated_at desc
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const timeA = new Date(a.updated_at || a.created_at).getTime();
    const timeB = new Date(b.updated_at || b.created_at).getTime();
    return timeB - timeA;
  });

  return res.json({ notes });
});

app.post('/api/notes', async (req: Request, res: Response) => {
  const {
    title,
    content,
    category,
    tags,
    type = 'note',
    pinned = false,
    favorite = false,
    color,
    checklist,
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required for knowledge note' });
  }

  const cleanTitle = String(title).trim();
  const now = new Date().toISOString();

  const newNote = {
    id: crypto.randomUUID(),
    title: cleanTitle,
    content: content !== undefined ? String(content) : '',
    category: category ? String(category) : 'Daily Journal',
    tags: Array.isArray(tags) ? tags : [],
    type: (type as 'note' | 'journal' | 'checklist') || 'note',
    pinned: Boolean(pinned),
    favorite: Boolean(favorite),
    archived: false,
    color: color || '#10B981',
    checklist: Array.isArray(checklist) ? checklist : undefined,
    created_at: now,
    updated_at: now,
  };

  localDb.notes.push(newNote);
  saveDbToFile();

  return res.status(201).json({ note: newNote });
});

app.put('/api/notes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const noteIndex = localDb.notes.findIndex((n) => n.id === id);

  if (noteIndex < 0) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const existing = localDb.notes[noteIndex];
  const {
    title,
    content,
    category,
    tags,
    type,
    pinned,
    favorite,
    archived,
    color,
    checklist,
  } = req.body;

  const updatedNote = {
    ...existing,
    title: title !== undefined ? String(title).trim() : existing.title,
    content: content !== undefined ? String(content) : existing.content,
    category: category !== undefined ? String(category) : existing.category,
    tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : existing.tags,
    type: type !== undefined ? type : existing.type,
    pinned: pinned !== undefined ? Boolean(pinned) : existing.pinned,
    favorite: favorite !== undefined ? Boolean(favorite) : existing.favorite,
    archived: archived !== undefined ? Boolean(archived) : existing.archived,
    color: color !== undefined ? color : existing.color,
    checklist: checklist !== undefined ? checklist : existing.checklist,
    updated_at: new Date().toISOString(),
  };

  localDb.notes[noteIndex] = updatedNote;
  saveDbToFile();

  return res.json({ note: updatedNote });
});

app.delete('/api/notes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = localDb.notes.length;
  localDb.notes = localDb.notes.filter((n) => n.id !== id);

  if (localDb.notes.length !== initialLen) {
    saveDbToFile();
    return res.json({ success: true, message: 'Note deleted permanently' });
  }

  return res.status(404).json({ error: 'Note not found' });
});

app.post('/api/notes/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = localDb.notes.find((n) => n.id === id);

  if (!existing) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const now = new Date().toISOString();
  const cloned = {
    ...existing,
    id: crypto.randomUUID(),
    title: `${existing.title} (Copy)`,
    pinned: false,
    created_at: now,
    updated_at: now,
  };

  localDb.notes.push(cloned);
  saveDbToFile();

  return res.status(201).json({ note: cloned });
});

// Rename note and cascade [[Old Title]] to [[New Title]] across all notes
app.patch('/api/notes/rename', async (req: Request, res: Response) => {
  const { id, oldTitle, newTitle } = req.body;

  if (!id || !newTitle || !String(newTitle).trim()) {
    return res.status(400).json({ error: 'id and newTitle are required' });
  }

  const targetNote = localDb.notes.find((n) => n.id === id);
  if (!targetNote) {
    return res.status(404).json({ error: 'Target note not found' });
  }

  const previousTitle = oldTitle || targetNote.title;
  const cleanedNewTitle = String(newTitle).trim();
  targetNote.title = cleanedNewTitle;
  targetNote.updated_at = new Date().toISOString();

  // Cascade replacement in other notes
  let updatedCount = 0;
  if (previousTitle && previousTitle !== cleanedNewTitle) {
    const searchPattern = new RegExp(`\\[\\[${previousTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g');
    const replacement = `[[${cleanedNewTitle}]]`;

    localDb.notes.forEach((otherNote) => {
      if (otherNote.id !== id && otherNote.content && searchPattern.test(otherNote.content)) {
        otherNote.content = otherNote.content.replace(searchPattern, replacement);
        otherNote.updated_at = new Date().toISOString();
        updatedCount++;
      }
    });

    // Also cascade in daily_journal
    localDb.daily_journal.forEach((j) => {
      if (j.content && searchPattern.test(j.content)) {
        j.content = j.content.replace(searchPattern, replacement);
        j.updated_at = new Date().toISOString();
        updatedCount++;
      }
    });
  }

  saveDbToFile();
  return res.json({ note: targetNote, referencesUpdated: updatedCount });
});

// ----------------------------------------------------
// WEEKLY PLANS ENDPOINTS
// ----------------------------------------------------
app.get('/api/weekly-plans', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'year and month are required' });
  }

  const plans = localDb.weekly_plans.filter((p) => p.year === year && p.month === month);
  return res.json({ plans });
});

app.post('/api/weekly-plans', async (req: Request, res: Response) => {
  const { year, month, week_number, main_goal, priority_1, priority_2, priority_3, target_percentage } = req.body;
  if (!year || !month || !week_number) {
    return res.status(400).json({ error: 'year, month, and week_number are required' });
  }

  let plan = localDb.weekly_plans.find(
    (p) => p.year === Number(year) && p.month === Number(month) && p.week_number === Number(week_number)
  );

  if (plan) {
    plan.main_goal = main_goal || '';
    plan.priority_1 = priority_1 || '';
    plan.priority_2 = priority_2 || '';
    plan.priority_3 = priority_3 || '';
    plan.target_percentage = target_percentage != null ? Number(target_percentage) : 80;
    plan.updated_at = new Date().toISOString();
  } else {
    plan = {
      id: crypto.randomUUID(),
      year: Number(year),
      month: Number(month),
      week_number: Number(week_number),
      main_goal: main_goal || '',
      priority_1: priority_1 || '',
      priority_2: priority_2 || '',
      priority_3: priority_3 || '',
      target_percentage: target_percentage != null ? Number(target_percentage) : 80,
      created_at: new Date().toISOString(),
    };
    localDb.weekly_plans.push(plan);
  }

  saveDbToFile();
  return res.json({ plan });
});

// ----------------------------------------------------
// MOOD TRACKER ENDPOINTS
// ----------------------------------------------------
app.get('/api/moods', async (_req: Request, res: Response) => {
  return res.json({ moods: localDb.mood_tracker });
});

app.get('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const mood = localDb.mood_tracker.find((m) => m.id === id);
  if (!mood) {
    return res.status(404).json({ error: 'Mood entry not found' });
  }
  return res.json({ mood });
});

app.post('/api/moods', async (req: Request, res: Response) => {
  const { date, mood, mood_score, energy_level, note } = req.body;
  if (!date || !mood) {
    return res.status(400).json({ error: 'date and mood are required' });
  }

  let entry = localDb.mood_tracker.find((m) => m.date === date);
  if (entry) {
    entry.mood = mood;
    entry.mood_score = mood_score != null ? Number(mood_score) : entry.mood_score;
    entry.energy_level = energy_level != null ? Number(energy_level) : entry.energy_level;
    entry.note = note !== undefined ? String(note) : entry.note;
    entry.updated_at = new Date().toISOString();
  } else {
    entry = {
      id: crypto.randomUUID(),
      date,
      mood,
      mood_score: mood_score != null ? Number(mood_score) : 4,
      energy_level: energy_level != null ? Number(energy_level) : 3,
      note: note ? String(note) : '',
      created_at: new Date().toISOString(),
    };
    localDb.mood_tracker.push(entry);
  }

  saveDbToFile();
  return res.status(201).json({ mood: entry });
});

app.put('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = localDb.mood_tracker.findIndex((m) => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Mood entry not found' });
  }

  const current = localDb.mood_tracker[idx];
  const { date, mood, mood_score, energy_level, note } = req.body;

  const updatedMood = {
    ...current,
    date: date !== undefined ? date : current.date,
    mood: mood !== undefined ? mood : current.mood,
    mood_score: mood_score !== undefined ? Number(mood_score) : current.mood_score,
    energy_level: energy_level !== undefined ? Number(energy_level) : current.energy_level,
    note: note !== undefined ? String(note) : current.note,
    updated_at: new Date().toISOString(),
  };

  localDb.mood_tracker[idx] = updatedMood;
  saveDbToFile();
  return res.json({ mood: updatedMood });
});

app.delete('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  localDb.mood_tracker = localDb.mood_tracker.filter((m) => m.id !== id);
  saveDbToFile();
  return res.json({ success: true, id });
});

// Helper for schedule matching
function checkDayMatchesSchedule(scheduleVal: any, dayOfWeek: number, currentDayName: string): boolean {
  if (typeof scheduleVal === 'number') {
    return scheduleVal === dayOfWeek;
  }
  if (typeof scheduleVal === 'string') {
    const s = scheduleVal.toLowerCase().trim();
    if (s === currentDayName) return true;
    if (s === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
    if (s === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
    const num = parseInt(s, 10);
    if (!isNaN(num) && num === dayOfWeek) return true;
  }
  return false;
}

// ----------------------------------------------------
// STREAKS ENDPOINT
// ----------------------------------------------------
app.get('/api/streak', async (_req: Request, res: Response) => {
  try {
    const entriesList = localDb.habit_entries.filter((e) => e.completed);
    const habitsList = localDb.habits;

    const activeHabits = habitsList.filter((h) => (h.status || 'active') === 'active');
    const activeHabitCount = activeHabits.length;

    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const completedByDate: Record<string, Set<string>> = {};
    const habitCompletedDates: Record<string, Set<string>> = {};

    entriesList.forEach((e) => {
      if (e.completed) {
        if (!completedByDate[e.date]) completedByDate[e.date] = new Set();
        completedByDate[e.date].add(e.habit_id);

        if (!habitCompletedDates[e.habit_id]) habitCompletedDates[e.habit_id] = new Set();
        habitCompletedDates[e.habit_id].add(e.date);
      }
    });

    const now = new Date();
    const todayStr = formatDateStr(now);

    const isDaySuccessful = (dateStr: string) => {
      const completedSet = completedByDate[dateStr];
      if (!completedSet || completedSet.size === 0) return false;

      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = weekdayNames[dayOfWeek];

      let scheduledCount = 0;
      activeHabits.forEach((h) => {
        if (!h.frequency || h.frequency === 'daily' || h.frequency === 'weekly_target' || h.frequency === 'monthly_target') {
          scheduledCount++;
        } else if (h.frequency === 'specific_days' && Array.isArray(h.schedule_days)) {
          const matches = h.schedule_days.some((d) => checkDayMatchesSchedule(d, dayOfWeek, currentDayName));
          if (matches) scheduledCount++;
        } else {
          scheduledCount++;
        }
      });

      const targetTotal = scheduledCount > 0 ? scheduledCount : activeHabitCount > 0 ? activeHabitCount : 1;
      return completedSet.size / targetTotal >= 0.7; // >= 70%
    };

    const hasCompletedToday = isDaySuccessful(todayStr);

    let currentStreak = 0;
    let checkDate = new Date(now);
    if (!hasCompletedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = formatDateStr(checkDate);
      if (isDaySuccessful(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const allDates = Object.keys(completedByDate).sort();
    let bestStreak = 0;
    let runningStreak = 0;
    let prevDate: Date | null = null;

    for (const dStr of allDates) {
      if (isDaySuccessful(dStr)) {
        const curDate = new Date(dStr + 'T00:00:00');
        if (prevDate) {
          const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            runningStreak++;
          } else {
            runningStreak = 1;
          }
        } else {
          runningStreak = 1;
        }
        prevDate = curDate;
        if (runningStreak > bestStreak) bestStreak = runningStreak;
      }
    }

    bestStreak = Math.max(bestStreak, currentStreak);

    // Per-habit streaks
    const habitStreaks: Record<string, { current: number; best: number; totalCompletions: number }> = {};
    habitsList.forEach((h) => {
      const datesSet = habitCompletedDates[h.id] || new Set();
      const datesArr = Array.from(datesSet).sort();
      const totalCompletions = datesArr.length;

      let hCurrent = 0;
      let hDate = new Date(now);
      const doneToday = datesSet.has(todayStr);
      if (!doneToday) {
        hDate.setDate(hDate.getDate() - 1);
      }

      while (true) {
        const ds = formatDateStr(hDate);
        if (datesSet.has(ds)) {
          hCurrent++;
          hDate.setDate(hDate.getDate() - 1);
        } else {
          break;
        }
      }

      let hBest = 0;
      let hRun = 0;
      let hPrev: Date | null = null;
      for (const ds of datesArr) {
        const cd = new Date(ds + 'T00:00:00');
        if (hPrev) {
          const diff = Math.round((cd.getTime() - hPrev.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) hRun++;
          else hRun = 1;
        } else {
          hRun = 1;
        }
        hPrev = cd;
        if (hRun > hBest) hBest = hRun;
      }
      hBest = Math.max(hBest, hCurrent);

      habitStreaks[h.id] = { current: hCurrent, best: hBest, totalCompletions };
    });

    return res.json({
      streak: currentStreak,
      bestStreak,
      habitStreaks,
      hasCompletedToday,
    });
  } catch (err: any) {
    console.error('Error calculating streak:', err);
    return res.json({ streak: 0, bestStreak: 0, habitStreaks: {} });
  }
});

// Helper to gather complete relational database state
export function getAllApplicationData() {
  return {
    app: 'Vignesh Habit Tracker',
    version: '3.0',
    source: 'Persistent Relational Storage Engine',
    exported_at: new Date().toISOString(),
    habits: [...localDb.habits],
    habit_entries: [...localDb.habit_entries],
    reflections: [...localDb.reflections],
    monthly_reflections: [...localDb.reflections],
    weekly_reviews: [...localDb.weekly_reviews],
    affirmations: [...localDb.affirmations],
    settings: Object.entries(localDb.settings).map(([k, v]) => ({ setting_key: k, setting_value: v })),
    categories: [...localDb.habit_categories],
    habit_categories: [...localDb.habit_categories],
    goals: [...localDb.goals],
    daily_journal: [...localDb.daily_journal],
    weekly_plans: [...localDb.weekly_plans],
    mood_tracker: [...localDb.mood_tracker],
    notes: [...(localDb.notes || [])],
  };
}

// ----------------------------------------------------
// EXPORT & BACKUP ENDPOINTS
// ----------------------------------------------------
app.get('/api/export', async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const data = getAllApplicationData();

  if (format === 'csv') {
    const habitMap = new Map(data.habits.map((h) => [h.id, h.name]));
    let csv = 'Habit ID,Habit Name,Date,Completed,Created At\n';
    data.habit_entries.forEach((e) => {
      const hName = (habitMap.get(e.habit_id) || 'Unknown').replace(/"/g, '""');
      csv += `"${e.habit_id}","${hName}","${e.date}",${e.completed ? 'TRUE' : 'FALSE'},"${e.created_at || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vignesh_habits_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csv);
  }

  if (format === 'xlsx' || format === 'excel') {
    const wb = XLSX.utils.book_new();

    const readmeRows = [
      {
        table_no: 0,
        table_name: '__metadata__',
        display_name: 'Database Metadata',
        primary_key: 'schema_version',
        foreign_keys: 'none',
        column_count: 7,
        record_count: 1,
        description: `Vignesh Habit Tracker Database Backup. Exported at: ${new Date().toISOString()}. Version: v3.0.`,
        supported_formats: 'Excel .xlsx, CSV, Google Sheets, JSON',
      },
      {
        table_no: 1,
        table_name: 'affirmations',
        display_name: 'Affirmations',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 7,
        record_count: data.affirmations.length,
        description: 'Stores motivational quotes and images',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 2,
        table_name: 'daily_journal',
        display_name: 'Daily Journal',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 7,
        record_count: data.daily_journal.length,
        description: 'Stores daily journal entries, moods, and energy levels',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 3,
        table_name: 'goals',
        display_name: 'Goals',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 9,
        record_count: data.goals.length,
        description: 'Tracks personal goals and their progress',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 4,
        table_name: 'habit_categories',
        display_name: 'Habit Categories',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 4,
        record_count: data.habit_categories.length,
        description: 'Organizes habits into categories',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 5,
        table_name: 'habit_entries',
        display_name: 'Habit Entries',
        primary_key: 'id',
        foreign_keys: 'habit_id -> habits.id',
        column_count: 6,
        record_count: data.habit_entries.length,
        description: 'Records whether a habit was completed on a particular date',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 6,
        table_name: 'habits',
        display_name: 'Habits',
        primary_key: 'id',
        foreign_keys: 'goal_id -> goals.id',
        column_count: 12,
        record_count: data.habits.length,
        description: 'Stores habit details, schedules, priorities, and statuses',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 7,
        table_name: 'mood_tracker',
        display_name: 'Mood Tracker',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 8,
        record_count: data.mood_tracker.length,
        description: 'Tracks daily moods, mood scores, and energy levels',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 8,
        table_name: 'reflections',
        display_name: 'Reflections',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 6,
        record_count: data.reflections.length,
        description: 'Stores monthly reflections',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 9,
        table_name: 'settings',
        display_name: 'Settings',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 4,
        record_count: data.settings.length,
        description: 'Stores application preferences and configuration',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 10,
        table_name: 'weekly_plans',
        display_name: 'Weekly Plans',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 11,
        record_count: data.weekly_plans.length,
        description: 'Stores weekly goals, priorities, and target completion percentages',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
      {
        table_no: 11,
        table_name: 'weekly_reviews',
        display_name: 'Weekly Reviews',
        primary_key: 'id',
        foreign_keys: 'none',
        column_count: 11,
        record_count: data.weekly_reviews.length,
        description: 'Stores weekly reviews and improvement plans',
        supported_formats: 'Excel .xlsx, Google Sheets, JSON',
      },
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readmeRows), 'README');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.affirmations), 'affirmations');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.daily_journal), 'daily_journal');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.goals), 'goals');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.habit_categories), 'habit_categories');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.habit_entries), 'habit_entries');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.habits), 'habits');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.mood_tracker), 'mood_tracker');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.reflections), 'reflections');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.settings), 'settings');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.weekly_plans), 'weekly_plans');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.weekly_reviews), 'weekly_reviews');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vignesh_habit_tracker_${new Date().toISOString().split('T')[0]}.xlsx"`);
    return res.send(buffer);
  }

  return res.json(data);
});

// POST /api/import - Import full backup (all tables)
app.post('/api/import', async (req: Request, res: Response) => {
  try {
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
      mode = 'merge',
    } = req.body;

    const cats = Array.isArray(categories) ? categories : (Array.isArray(habit_categories) ? habit_categories : []);
    const refls = Array.isArray(monthly_reflections) ? monthly_reflections : (Array.isArray(reflections) ? reflections : []);

    if (mode === 'replace') {
      if (Array.isArray(habits)) localDb.habits = habits;
      if (Array.isArray(habit_entries)) localDb.habit_entries = habit_entries;
      if (Array.isArray(goals)) localDb.goals = goals;
      if (Array.isArray(mood_tracker)) localDb.mood_tracker = mood_tracker;
      if (Array.isArray(daily_journal)) localDb.daily_journal = daily_journal;
      if (Array.isArray(weekly_plans)) localDb.weekly_plans = weekly_plans;
      if (Array.isArray(weekly_reviews)) localDb.weekly_reviews = weekly_reviews;
      if (Array.isArray(refls)) localDb.reflections = refls;
      if (Array.isArray(cats) && cats.length > 0) localDb.habit_categories = cats;
      if (Array.isArray(affirmations) && affirmations.length > 0) localDb.affirmations = affirmations;
      if (settings && typeof settings === 'object') {
        localDb.settings = { ...localDb.settings, ...settings };
      }
    } else {
      // Merge mode
      if (Array.isArray(habits)) {
        habits.forEach((h: any) => {
          const idx = localDb.habits.findIndex((item) => item.id === h.id);
          if (idx >= 0) localDb.habits[idx] = { ...localDb.habits[idx], ...h };
          else localDb.habits.push(h);
        });
      }

      if (Array.isArray(habit_entries)) {
        habit_entries.forEach((e: any) => {
          const idx = localDb.habit_entries.findIndex((item) => item.id === e.id || (item.habit_id === e.habit_id && item.date === e.date));
          if (idx >= 0) localDb.habit_entries[idx] = { ...localDb.habit_entries[idx], ...e };
          else localDb.habit_entries.push(e);
        });
      }

      if (Array.isArray(goals)) {
        goals.forEach((g: any) => {
          const idx = localDb.goals.findIndex((item) => item.id === g.id);
          if (idx >= 0) localDb.goals[idx] = { ...localDb.goals[idx], ...g };
          else localDb.goals.push(g);
        });
      }

      if (Array.isArray(mood_tracker)) {
        mood_tracker.forEach((m: any) => {
          const idx = localDb.mood_tracker.findIndex((item) => item.date === m.date || item.id === m.id);
          if (idx >= 0) localDb.mood_tracker[idx] = { ...localDb.mood_tracker[idx], ...m };
          else localDb.mood_tracker.push(m);
        });
      }

      if (Array.isArray(daily_journal)) {
        daily_journal.forEach((j: any) => {
          const idx = localDb.daily_journal.findIndex((item) => item.date === j.date || item.id === j.id);
          if (idx >= 0) localDb.daily_journal[idx] = { ...localDb.daily_journal[idx], ...j };
          else localDb.daily_journal.push(j);
        });
      }

      if (Array.isArray(weekly_plans)) {
        weekly_plans.forEach((p: any) => {
          const idx = localDb.weekly_plans.findIndex((item) => item.id === p.id || (item.year === p.year && item.month === p.month && item.week_number === p.week_number));
          if (idx >= 0) localDb.weekly_plans[idx] = { ...localDb.weekly_plans[idx], ...p };
          else localDb.weekly_plans.push(p);
        });
      }

      if (Array.isArray(weekly_reviews)) {
        weekly_reviews.forEach((r: any) => {
          const idx = localDb.weekly_reviews.findIndex((item) => item.id === r.id || (item.year === r.year && item.month === r.month && item.week_number === r.week_number));
          if (idx >= 0) localDb.weekly_reviews[idx] = { ...localDb.weekly_reviews[idx], ...r };
          else localDb.weekly_reviews.push(r);
        });
      }

      if (Array.isArray(refls)) {
        refls.forEach((rf: any) => {
          const idx = localDb.reflections.findIndex((item) => item.id === rf.id || (item.year === rf.year && item.month === rf.month));
          if (idx >= 0) localDb.reflections[idx] = { ...localDb.reflections[idx], ...rf };
          else localDb.reflections.push(rf);
        });
      }

      if (Array.isArray(cats) && cats.length > 0) {
        cats.forEach((c: any) => {
          const idx = localDb.habit_categories.findIndex((item) => item.id === c.id || item.name.toLowerCase() === c.name.toLowerCase());
          if (idx >= 0) localDb.habit_categories[idx] = { ...localDb.habit_categories[idx], ...c };
          else localDb.habit_categories.push(c);
        });
      }

      if (Array.isArray(affirmations) && affirmations.length > 0) {
        affirmations.forEach((a: any) => {
          const idx = localDb.affirmations.findIndex((item) => item.id === a.id);
          if (idx >= 0) localDb.affirmations[idx] = { ...localDb.affirmations[idx], ...a };
          else localDb.affirmations.push(a);
        });
      }

      if (settings && typeof settings === 'object') {
        localDb.settings = { ...localDb.settings, ...settings };
      }
    }

    saveDbToFile();

    return res.json({
      success: true,
      message: `Data successfully imported (${mode} mode)`,
      counts: {
        habits: Array.isArray(habits) ? habits.length : localDb.habits.length,
        habit_entries: Array.isArray(habit_entries) ? habit_entries.length : localDb.habit_entries.length,
        goals: Array.isArray(goals) ? goals.length : localDb.goals.length,
        mood_tracker: Array.isArray(mood_tracker) ? mood_tracker.length : localDb.mood_tracker.length,
        daily_journal: Array.isArray(daily_journal) ? daily_journal.length : localDb.daily_journal.length,
        weekly_plans: Array.isArray(weekly_plans) ? weekly_plans.length : localDb.weekly_plans.length,
        weekly_reviews: Array.isArray(weekly_reviews) ? weekly_reviews.length : localDb.weekly_reviews.length,
        reflections: Array.isArray(refls) ? refls.length : localDb.reflections.length,
        categories: Array.isArray(cats) ? cats.length : localDb.habit_categories.length,
      },
    });
  } catch (err: any) {
    console.error('Error importing data:', err);
    return res.status(500).json({ error: 'Failed to import data: ' + (err?.message || 'Unknown error') });
  }
});

// ----------------------------------------------------
// GOOGLE SHEETS LIVE TWO-WAY INTEGRATION
// ----------------------------------------------------

// POST /api/google-sheets/test - Ping Google Apps Script Web App
app.post('/api/google-sheets/test', async (req: Request, res: Response) => {
  try {
    const { script_url } = req.body || {};
    if (!script_url || typeof script_url !== 'string' || !script_url.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'Valid Google Apps Script Web App URL is required' });
    }

    const testUrl = script_url.includes('?') ? `${script_url}&action=test` : `${script_url}?action=test`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, message: `Google Apps Script returned HTTP ${response.status}` });
    }

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    return res.json({
      success: true,
      message: 'Successfully connected to Google Apps Script Web App!',
      data,
    });
  } catch (err: any) {
    console.error('Error testing Google Apps Script:', err);
    return res.status(500).json({ success: false, message: 'Failed to connect: ' + (err?.message || 'Network error') });
  }
});

// POST /api/google-sheets/sync - Push Tracker Data to Google Sheets via Apps Script
app.post('/api/google-sheets/sync', async (req: Request, res: Response) => {
  try {
    const { script_url, data } = req.body || {};
    if (!script_url || typeof script_url !== 'string' || !script_url.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'Valid Google Apps Script Web App URL is required' });
    }

    // If client supplied recent client-side mutations, merge into localDb first
    if (data && typeof data === 'object') {
      if (Array.isArray(data.habits) && data.habits.length > 0) {
        data.habits.forEach((h: any) => {
          const idx = localDb.habits.findIndex((item) => item.id === h.id);
          if (idx >= 0) localDb.habits[idx] = { ...localDb.habits[idx], ...h };
          else localDb.habits.push(h);
        });
      }

      if (Array.isArray(data.habit_entries) && data.habit_entries.length > 0) {
        data.habit_entries.forEach((e: any) => {
          const idx = localDb.habit_entries.findIndex((item) => item.id === e.id || (item.habit_id === e.habit_id && item.date === e.date));
          if (idx >= 0) localDb.habit_entries[idx] = { ...localDb.habit_entries[idx], ...e };
          else localDb.habit_entries.push(e);
        });
      }

      if (Array.isArray(data.goals) && data.goals.length > 0) {
        data.goals.forEach((g: any) => {
          const idx = localDb.goals.findIndex((item) => item.id === g.id);
          if (idx >= 0) localDb.goals[idx] = { ...localDb.goals[idx], ...g };
          else localDb.goals.push(g);
        });
      }

      if (Array.isArray(data.mood_tracker) && data.mood_tracker.length > 0) {
        data.mood_tracker.forEach((m: any) => {
          const idx = localDb.mood_tracker.findIndex((item) => item.date === m.date || item.id === m.id);
          if (idx >= 0) localDb.mood_tracker[idx] = { ...localDb.mood_tracker[idx], ...m };
          else localDb.mood_tracker.push(m);
        });
      }

      if (Array.isArray(data.daily_journal) && data.daily_journal.length > 0) {
        data.daily_journal.forEach((j: any) => {
          const idx = localDb.daily_journal.findIndex((item) => item.date === j.date || item.id === j.id);
          if (idx >= 0) localDb.daily_journal[idx] = { ...localDb.daily_journal[idx], ...j };
          else localDb.daily_journal.push(j);
        });
      }

      if (Array.isArray(data.weekly_plans) && data.weekly_plans.length > 0) {
        data.weekly_plans.forEach((p: any) => {
          const idx = localDb.weekly_plans.findIndex((item) => item.id === p.id || (item.year === p.year && item.month === p.month && item.week_number === p.week_number));
          if (idx >= 0) localDb.weekly_plans[idx] = { ...localDb.weekly_plans[idx], ...p };
          else localDb.weekly_plans.push(p);
        });
      }

      if (Array.isArray(data.weekly_reviews) && data.weekly_reviews.length > 0) {
        data.weekly_reviews.forEach((r: any) => {
          const idx = localDb.weekly_reviews.findIndex((item) => item.id === r.id || (item.year === r.year && item.month === r.month && item.week_number === r.week_number));
          if (idx >= 0) localDb.weekly_reviews[idx] = { ...localDb.weekly_reviews[idx], ...r };
          else localDb.weekly_reviews.push(r);
        });
      }

      if (Array.isArray(data.reflections) && data.reflections.length > 0) {
        data.reflections.forEach((rf: any) => {
          const idx = localDb.reflections.findIndex((item) => item.id === rf.id || (item.year === rf.year && item.month === rf.month));
          if (idx >= 0) localDb.reflections[idx] = { ...localDb.reflections[idx], ...rf };
          else localDb.reflections.push(rf);
        });
      }

      saveDbToFile();
    }

    // Always push the complete database to Google Sheets
    const payload = getAllApplicationData();

    const response = await fetch(script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    let result: any = {};
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    const timestamp = new Date().toISOString();
    localDb.settings.google_sheets_last_synced = timestamp;
    localDb.settings.google_sheets_last_pushed = timestamp;
    saveDbToFile();

    const summaryCounts = {
      affirmations: localDb.affirmations.length,
      habits: localDb.habits.length,
      habit_entries: localDb.habit_entries.length,
      mood_tracker: localDb.mood_tracker.length,
      goals: localDb.goals.length,
      daily_journal: localDb.daily_journal.length,
      weekly_reviews: localDb.weekly_reviews.length,
      weekly_plans: localDb.weekly_plans.length,
      reflections: localDb.reflections.length,
      habit_categories: localDb.habit_categories.length,
    };

    return res.json({
      success: true,
      message: result.message || 'Successfully synced data to Google Sheets!',
      timestamp,
      summary: result.counts || summaryCounts,
      counts: summaryCounts,
      raw: result,
    });
  } catch (err: any) {
    console.error('Error syncing to Google Apps Script:', err);
    return res.status(500).json({ success: false, message: 'Failed to sync to Google Sheets: ' + (err?.message || 'Network error') });
  }
});

// POST /api/google-sheets/pull - Pull Data from Google Sheets via Apps Script
app.post('/api/google-sheets/pull', async (req: Request, res: Response) => {
  try {
    const { script_url, apply_import = true } = req.body || {};
    if (!script_url || typeof script_url !== 'string' || !script_url.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'Valid Google Apps Script Web App URL is required' });
    }

    const pullUrl = script_url.includes('?') ? `${script_url}&action=pull` : `${script_url}?action=pull`;
    const response = await fetch(pullUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, message: `Google Apps Script returned HTTP ${response.status}` });
    }

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    const timestamp = new Date().toISOString();
    localDb.settings.google_sheets_last_synced = timestamp;
    localDb.settings.google_sheets_last_pulled = timestamp;

    let importedCounts: any = {};

    // Auto-apply imported records into localDb & persistent disk
    // If client is not unlocked (e.g. read-only viewing / auto-reflect), return data without mutating disk
    const canMutateServerDb = verifyAuthToken(req);
    if (apply_import && canMutateServerDb && data && typeof data === 'object') {
      const {
        affirmations,
        habits,
        habit_entries,
        goals,
        mood_tracker,
        daily_journal,
        weekly_reviews,
        weekly_plans,
        reflections,
        monthly_reflections,
        categories,
        habit_categories,
        settings,
      } = data;

      const cats = Array.isArray(categories) ? categories : (Array.isArray(habit_categories) ? habit_categories : []);
      const refls = Array.isArray(monthly_reflections) ? monthly_reflections : (Array.isArray(reflections) ? reflections : []);

      if (Array.isArray(affirmations) && affirmations.length > 0) {
        affirmations.forEach((a: any) => {
          const idx = localDb.affirmations.findIndex((item) => item.id === a.id);
          if (idx >= 0) localDb.affirmations[idx] = { ...localDb.affirmations[idx], ...a };
          else localDb.affirmations.push(a);
        });
      }

      if (Array.isArray(habits) && habits.length > 0) {
        habits.forEach((h: any) => {
          const idx = localDb.habits.findIndex((item) => item.id === h.id);
          if (idx >= 0) localDb.habits[idx] = { ...localDb.habits[idx], ...h };
          else localDb.habits.push(h);
        });
      }

      if (Array.isArray(habit_entries) && habit_entries.length > 0) {
        habit_entries.forEach((e: any) => {
          const idx = localDb.habit_entries.findIndex((item) => item.id === e.id || (item.habit_id === e.habit_id && item.date === e.date));
          if (idx >= 0) localDb.habit_entries[idx] = { ...localDb.habit_entries[idx], ...e };
          else localDb.habit_entries.push(e);
        });
      }

      if (Array.isArray(goals) && goals.length > 0) {
        goals.forEach((g: any) => {
          const idx = localDb.goals.findIndex((item) => item.id === g.id);
          if (idx >= 0) localDb.goals[idx] = { ...localDb.goals[idx], ...g };
          else localDb.goals.push(g);
        });
      }

      if (Array.isArray(mood_tracker) && mood_tracker.length > 0) {
        mood_tracker.forEach((m: any) => {
          const idx = localDb.mood_tracker.findIndex((item) => item.date === m.date || item.id === m.id);
          if (idx >= 0) localDb.mood_tracker[idx] = { ...localDb.mood_tracker[idx], ...m };
          else localDb.mood_tracker.push(m);
        });
      }

      if (Array.isArray(daily_journal) && daily_journal.length > 0) {
        daily_journal.forEach((j: any) => {
          const idx = localDb.daily_journal.findIndex((item) => item.date === j.date || item.id === j.id);
          if (idx >= 0) localDb.daily_journal[idx] = { ...localDb.daily_journal[idx], ...j };
          else localDb.daily_journal.push(j);
        });
      }

      if (Array.isArray(weekly_reviews) && weekly_reviews.length > 0) {
        weekly_reviews.forEach((r: any) => {
          const idx = localDb.weekly_reviews.findIndex((item) => item.id === r.id || (item.year === r.year && item.month === r.month && item.week_number === r.week_number));
          if (idx >= 0) localDb.weekly_reviews[idx] = { ...localDb.weekly_reviews[idx], ...r };
          else localDb.weekly_reviews.push(r);
        });
      }

      if (Array.isArray(weekly_plans) && weekly_plans.length > 0) {
        weekly_plans.forEach((p: any) => {
          const idx = localDb.weekly_plans.findIndex((item) => item.id === p.id || (item.year === p.year && item.month === p.month && item.week_number === p.week_number));
          if (idx >= 0) localDb.weekly_plans[idx] = { ...localDb.weekly_plans[idx], ...p };
          else localDb.weekly_plans.push(p);
        });
      }

      if (Array.isArray(refls) && refls.length > 0) {
        refls.forEach((rf: any) => {
          const idx = localDb.reflections.findIndex((item) => item.id === rf.id || (item.year === rf.year && item.month === rf.month));
          if (idx >= 0) localDb.reflections[idx] = { ...localDb.reflections[idx], ...rf };
          else localDb.reflections.push(rf);
        });
      }

      if (Array.isArray(cats) && cats.length > 0) {
        localDb.habit_categories = cats;
      }

      if (settings && typeof settings === 'object') {
        localDb.settings = { ...localDb.settings, ...settings };
      }

      saveDbToFile();

      importedCounts = {
        affirmations: Array.isArray(affirmations) ? affirmations.length : 0,
        habits: Array.isArray(habits) ? habits.length : 0,
        entries: Array.isArray(habit_entries) ? habit_entries.length : 0,
        goals: Array.isArray(goals) ? goals.length : 0,
        moods: Array.isArray(mood_tracker) ? mood_tracker.length : 0,
        journal: Array.isArray(daily_journal) ? daily_journal.length : 0,
        plans: Array.isArray(weekly_plans) ? weekly_plans.length : 0,
        reviews: Array.isArray(weekly_reviews) ? weekly_reviews.length : 0,
        reflections: Array.isArray(refls) ? refls.length : 0,
        categories: Array.isArray(cats) ? cats.length : 0,
      };
    }

    return res.json({
      success: true,
      data,
      timestamp,
      counts: importedCounts,
      message: `Successfully loaded data from Google Sheets (${importedCounts.habits || 0} habits, ${importedCounts.entries || 0} check-ins, ${importedCounts.moods || 0} mood logs)`,
    });
  } catch (err: any) {
    console.error('Error pulling from Google Apps Script:', err);
    return res.status(500).json({ success: false, message: 'Failed to pull from Google Sheets: ' + (err?.message || 'Network error') });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vignesh Habit Tracker server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone HTTP server when executed directly (not in Vercel serverless environment)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
export default app;
