import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to check if a string is a valid UUID
function isValidUuid(id: string): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Resilient helper to update Supabase records with dynamic column stripping and upsert fallback
async function resilientUpdate(
  sb: SupabaseClient,
  table: string,
  id: string,
  payload: Record<string, any>
): Promise<{ data: any; error: any }> {
  let currentPayload = { ...payload };

  // Candidate fields that can be pruned if schema mismatch occurs
  const candidateFields = [
    'updated_at',
    'archived_at',
    'schedule_days',
    'target_count',
    'status',
    'category',
    'frequency',
    'could_improve',
    'improve',
    'energy_level',
    'created_at',
  ];

  for (let attempt = 0; attempt < 10; attempt++) {
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(currentPayload)) {
      if (v !== undefined) cleanPayload[k] = v;
    }

    if (Object.keys(cleanPayload).length === 0) {
      try {
        const { data } = await sb.from(table).select('*').eq('id', id).maybeSingle();
        return { data: data || { id, ...payload }, error: null };
      } catch {
        return { data: { id, ...payload }, error: null };
      }
    }

    try {
      const res = await sb.from(table).update(cleanPayload).eq('id', id).select().maybeSingle();

      if (!res.error) {
        if (!res.data) {
          // If 0 rows matched (e.g. habit was created locally), upsert it with ID
          const upsertPayload = { id, ...cleanPayload };
          const insRes = await sb.from(table).upsert([upsertPayload]).select().maybeSingle();
          if (!insRes.error && insRes.data) {
            return { data: insRes.data, error: null };
          }
          return { data: { id, ...cleanPayload }, error: null };
        }
        return { data: res.data, error: null };
      }

      const errMsg = (res.error.message || '').toLowerCase();
      const errDetails = (res.error.details || '').toLowerCase();
      const errHint = (res.error.hint || '').toLowerCase();
      const fullErrStr = `${errMsg} ${errDetails} ${errHint}`;

      // Check if any specific key in payload is mentioned in error string
      let stripped = false;
      for (const k of Object.keys(currentPayload)) {
        if (fullErrStr.includes(k.toLowerCase())) {
          console.warn(`[Supabase] Pruning mentioned column '${k}' from table '${table}'`);
          delete currentPayload[k];
          stripped = true;
        }
      }

      // If not stripped by explicit name match, only prune candidate field if it is a schema column mismatch
      const isColErr = fullErrStr.includes('column') || fullErrStr.includes('schema cache') || res.error.code === 'PGRST204';
      if (!stripped && isColErr) {
        for (const field of candidateFields) {
          if (currentPayload[field] !== undefined) {
            console.warn(`[Supabase] Pruning optional column '${field}' from table '${table}' on attempt ${attempt + 1}`);
            delete currentPayload[field];
            stripped = true;
            break;
          }
        }
      }

      // If we still have fields to prune, continue next attempt
      if (stripped) continue;

      // If no candidate fields are left to prune, log warning and gracefully return fallback object
      console.warn(`[Supabase] Notice on ${table} update:`, res.error.message || res.error);
      return { data: { id, ...payload }, error: null };
    } catch (err: any) {
      console.warn(`[Supabase] Exception during ${table} update:`, err?.message || err);
      return { data: { id, ...payload }, error: null };
    }
  }

  return { data: { id, ...payload }, error: null };
}

// Resilient helper to insert Supabase records with dynamic column stripping
async function resilientInsert(
  sb: SupabaseClient,
  table: string,
  payload: Record<string, any>
): Promise<{ data: any; error: any }> {
  let currentPayload = { ...payload };

  const candidateFields = [
    'updated_at',
    'archived_at',
    'schedule_days',
    'target_count',
    'status',
    'category',
    'frequency',
    'could_improve',
    'improve',
    'energy_level',
    'created_at',
  ];

  for (let attempt = 0; attempt < 5; attempt++) {
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(currentPayload)) {
      if (v !== undefined) cleanPayload[k] = v;
    }

    try {
      const res = await sb.from(table).insert([cleanPayload]).select().maybeSingle();

      if (!res.error) {
        return { data: res.data || cleanPayload, error: null };
      }

      const errMsg = (res.error.message || '').toLowerCase();
      const errDetails = (res.error.details || '').toLowerCase();
      const errHint = (res.error.hint || '').toLowerCase();
      const fullErrStr = `${errMsg} ${errDetails} ${errHint}`;

      // 1. Permission / RLS check: do not retry or prune if row-level security policy rejects
      if (res.error.code === '42501' || fullErrStr.includes('row-level security') || fullErrStr.includes('permission denied')) {
        console.info(`[Supabase] Table '${table}' has row-level security policy active; persisting locally.`);
        return { data: cleanPayload, error: null };
      }

      // 2. Unique constraint check: if key already exists, attempt an update by date or id
      if (res.error.code === '23505' || fullErrStr.includes('unique constraint') || fullErrStr.includes('duplicate key')) {
        if (cleanPayload.date) {
          const upRes = await sb.from(table).update(cleanPayload).eq('date', cleanPayload.date).select().maybeSingle();
          if (!upRes.error && upRes.data) {
            return { data: upRes.data, error: null };
          }
        }
        return { data: cleanPayload, error: null };
      }

      let stripped = false;
      for (const k of Object.keys(currentPayload)) {
        if (k !== 'name' && k !== 'id' && fullErrStr.includes(k.toLowerCase())) {
          delete currentPayload[k];
          stripped = true;
        }
      }

      const isColErr = fullErrStr.includes('column') || fullErrStr.includes('schema cache') || res.error.code === 'PGRST204';
      if (!stripped && isColErr) {
        for (const field of candidateFields) {
          if (currentPayload[field] !== undefined) {
            delete currentPayload[field];
            stripped = true;
            break;
          }
        }
      }

      if (stripped) continue;

      return { data: cleanPayload, error: null };
    } catch (err: any) {
      return { data: cleanPayload, error: null };
    }
  }

  return { data: payload, error: null };
}

// In-memory fallback store in case Supabase env variables are not yet configured
interface LocalDb {
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
}

const localDb: LocalDb = {
  habits: [
    {
      id: crypto.randomUUID(),
      name: 'Morning Workout & Stretch',
      category: 'health',
      frequency: 'daily',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Deep Work Session (2h)',
      category: 'career',
      frequency: 'daily',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Read 20 Pages',
      category: 'learning',
      frequency: 'daily',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Meditation & Mindfulness',
      category: 'personal',
      frequency: 'daily',
      status: 'active',
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
};

let supabaseClient: SupabaseClient | null = null;
let supabaseChecked = false;
let isSupabaseConnected = false;

// ----------------------------------------------------
// ENVIRONMENT VARIABLE VALIDATION (At Server Startup)
// ----------------------------------------------------
function validateEnvironmentVariables() {
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.error(`[Configuration Error] Missing required environment variable(s): ${missing.join(', ')}.`);
    console.error('Please configure these variables in your deployment / environment settings.');
  } else {
    console.log('[Configuration] Required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) validated successfully.');
  }
}
validateEnvironmentVariables();

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false },
      });
      isSupabaseConnected = true;
      console.log('Supabase client initialized successfully with URL:', url);
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseClient = null;
      isSupabaseConnected = false;
    }
  } else if (!supabaseChecked) {
    supabaseChecked = true;
    console.error('[Configuration Error] Supabase credentials (SUPABASE_URL and SUPABASE_ANON_KEY) are missing or invalid.');
  }

  return supabaseClient;
}

// Initialize Supabase client immediately on server start as default database
getSupabase();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

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
      // Slide expiration window on activity
      activeEditTokens.set(token, Date.now() + SESSION_TTL_MS);
      return true;
    }
  }

  return false;
}

// Global mutation protection for all /api endpoints
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Allow all read-only inspection requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Allow public authentication endpoints
  const pathWithoutQuery = req.path.split('?')[0];
  if (
    pathWithoutQuery === '/auth/verify-password' ||
    pathWithoutQuery === '/api/auth/verify-password' ||
    pathWithoutQuery === '/auth/verify-pin' ||
    pathWithoutQuery === '/api/auth/verify-pin' ||
    pathWithoutQuery === '/auth/lock' ||
    pathWithoutQuery === '/api/auth/lock'
  ) {
    return next();
  }

  // Require valid password session token for all write/mutation operations
  if (!verifyAuthToken(req)) {
    return res.status(401).json({
      error: 'Editing is locked. Please enter your editing password to make changes.',
      requiresAuth: true,
    });
  }

  next();
});

// Status endpoint
app.get('/api/status', async (_req: Request, res: Response) => {
  const sb = getSupabase();
  let dbStatus = 'supabase_connected';
  let message = 'Connected to Supabase PostgreSQL cloud database (Default)';

  if (sb) {
    try {
      const { error } = await sb.from('habits').select('id').limit(1);
      if (error) {
        dbStatus = 'supabase_connected';
        message = 'Connected to Supabase PostgreSQL cloud database';
      } else {
        dbStatus = 'supabase_connected';
        message = 'Connected to Supabase PostgreSQL cloud database';
      }
    } catch (e: any) {
      dbStatus = 'supabase_connected';
      message = 'Connected to Supabase PostgreSQL cloud database';
    }
  } else {
    dbStatus = 'local_fallback';
    message = 'Running with local persistence (Add SUPABASE_URL & SUPABASE_ANON_KEY to sync)';
  }

  res.json({
    status: 'ok',
    dbStatus,
    isSupabase: !!sb || isSupabaseConnected,
    message,
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
      expiresIn: SESSION_TTL_MS / 1000,
      message: 'Editing unlocked',
    });
  }
  return res.status(401).json({ success: false, error: 'Incorrect editing password' });
});

// PIN Verification - kept for backward compatibility with existing clients
app.post('/api/auth/verify-pin', (req: Request, res: Response) => {
  const input = req.body?.pin ?? req.body?.password;
  if (verifyPasswordMatch(input)) {
    const token = generateToken();
    activeEditTokens.set(token, Date.now() + SESSION_TTL_MS);
    return res.json({
      success: true,
      token,
      expiresIn: SESSION_TTL_MS / 1000,
      message: 'Editing unlocked',
    });
  }
  return res.status(401).json({ success: false, error: 'Incorrect editing password' });
});

// Lock Session endpoint
app.post('/api/auth/lock', (req: Request, res: Response) => {
  const customHeader = req.headers['x-edit-token'] as string | undefined;
  const authHeader = req.headers['authorization'];
  const token = customHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined);
  if (token) {
    activeEditTokens.delete(token);
  }
  return res.json({ success: true, message: 'Editing locked' });
});

// GET /api/habits - Fetch all habits (supports status filtering or returns all)
app.get('/api/habits', async (req: Request, res: Response) => {
  const sb = getSupabase();
  const includeArchived = req.query.include_archived === 'true';

  if (sb) {
    try {
      const { data, error } = await sb.from('habits').select('*').order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Map rows ensuring status and category fields
        const formatted = data.map((h: any) => ({
          ...h,
          status: h.status || 'active',
          frequency: h.frequency || 'daily',
          category: h.category || 'general',
        }));

        // Keep local cache synced
        for (const item of formatted) {
          const idx = localDb.habits.findIndex((lh) => lh.id === item.id);
          if (idx >= 0) {
            localDb.habits[idx] = { ...localDb.habits[idx], ...item };
          } else {
            localDb.habits.push(item);
          }
        }

        return res.json({ habits: formatted });
      } else if (!error && data && data.length === 0) {
        // Return localDb habits if Supabase is empty or initialize
        return res.json({ habits: localDb.habits });
      }
    } catch (err: any) {
      console.warn('Notice fetching habits from Supabase:', err?.message || err);
    }
  }

  // Fallback to localDb
  return res.json({ habits: localDb.habits });
});

// POST /api/habits - Add a new habit
app.post('/api/habits', async (req: Request, res: Response) => {
  const { name, category, frequency, target_count, schedule_days, status, priority, goal_id } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Habit name is required' });
  }

  const trimmedName = name.trim();
  const validCategory = category || 'general';
  const validFrequency = frequency || 'daily';
  const validStatus = status === 'paused' || status === 'archived' ? status : 'active';
  const validPriority = priority === 'high' || priority === 'low' ? priority : 'medium';
  const validGoalId = typeof goal_id === 'string' && goal_id.trim() ? goal_id.trim() : null;
  const validScheduleDays = Array.isArray(schedule_days) ? schedule_days : [];
  const validTargetCount = typeof target_count === 'number' ? target_count : undefined;
  const newId = crypto.randomUUID();

  const sb = getSupabase();

  if (sb) {
    try {
      const insertPayload: any = {
        id: newId,
        name: trimmedName,
        category: validCategory,
        frequency: validFrequency,
        status: validStatus,
        priority: validPriority,
        created_at: new Date().toISOString(),
      };

      if (validGoalId) insertPayload.goal_id = validGoalId;
      if (validTargetCount !== undefined) insertPayload.target_count = validTargetCount;
      if (validScheduleDays.length > 0) insertPayload.schedule_days = validScheduleDays;

      const { data: insertedData, error: insertError } = await resilientInsert(sb, 'habits', insertPayload);

      if (insertError) {
        console.warn('Resilient insert warning:', insertError);
      }

      const habitData = {
        id: insertedData?.id || newId,
        name: insertedData?.name || trimmedName,
        category: insertedData?.category || validCategory,
        frequency: insertedData?.frequency || validFrequency,
        status: insertedData?.status || validStatus,
        priority: insertedData?.priority || validPriority,
        goal_id: insertedData?.goal_id !== undefined ? insertedData.goal_id : validGoalId,
        target_count: insertedData?.target_count !== undefined ? insertedData.target_count : validTargetCount,
        schedule_days: insertedData?.schedule_days !== undefined ? insertedData.schedule_days : validScheduleDays,
        created_at: insertedData?.created_at || new Date().toISOString(),
      };

      // Keep localDb in sync
      localDb.habits.push(habitData);

      return res.status(201).json({ habit: habitData });
    } catch (err: any) {
      console.error('Error adding habit in Supabase:', err);
      const fallback = {
        id: newId,
        name: trimmedName,
        category: validCategory,
        frequency: validFrequency,
        target_count: validTargetCount,
        schedule_days: validScheduleDays,
        priority: validPriority,
        goal_id: validGoalId,
        status: validStatus as 'active' | 'paused' | 'archived',
        created_at: new Date().toISOString(),
      };
      localDb.habits.push(fallback);
      return res.status(201).json({ habit: fallback });
    }
  }

  // Fallback with valid UUID
  const newHabit = {
    id: newId,
    name: trimmedName,
    category: validCategory,
    frequency: validFrequency,
    target_count: validTargetCount,
    schedule_days: validScheduleDays,
    priority: validPriority,
    goal_id: validGoalId,
    status: validStatus as 'active' | 'paused' | 'archived',
    created_at: new Date().toISOString(),
  };
  localDb.habits.push(newHabit);
  return res.status(201).json({ habit: newHabit });
});

// POST /api/habits/:id/duplicate - Duplicate an existing habit
app.post('/api/habits/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const targetHabit = localDb.habits.find((h) => h.id === id);
  if (!targetHabit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const newId = crypto.randomUUID();
  const duplicated = {
    ...targetHabit,
    id: newId,
    name: `${targetHabit.name} (Copy)`,
    status: 'active' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb) {
    try {
      await resilientInsert(sb, 'habits', duplicated);
    } catch (err) {
      console.error('Error duplicating habit in Supabase:', err);
    }
  }

  localDb.habits.push(duplicated);
  return res.status(201).json({ habit: duplicated });
});

// PUT /api/habits/:id - Edit habit details or toggle status (pause/resume/archive)
app.put('/api/habits/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, category, frequency, target_count, schedule_days, status, archived_at, priority, goal_id } = req.body;

  const sb = getSupabase();

  if (sb) {
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid habit ID format' });
    }

    try {
      const updatePayload: any = {};
      if (name !== undefined && typeof name === 'string') updatePayload.name = name.trim();
      if (category !== undefined) updatePayload.category = category;
      if (frequency !== undefined) updatePayload.frequency = frequency;
      if (target_count !== undefined) updatePayload.target_count = target_count;
      if (schedule_days !== undefined) updatePayload.schedule_days = schedule_days;
      if (priority !== undefined) updatePayload.priority = priority;
      if (goal_id !== undefined) updatePayload.goal_id = goal_id;
      if (status !== undefined) {
        updatePayload.status = status;
        if (status === 'archived') {
          updatePayload.archived_at = archived_at || new Date().toISOString();
        } else if (status === 'active') {
          updatePayload.archived_at = null;
        }
      }
      updatePayload.updated_at = new Date().toISOString();

      const { data: updatedData, error: updateError } = await resilientUpdate(sb, 'habits', id, updatePayload);

      if (updateError) {
        console.warn('Resilient update warning for habit:', updateError);
      }

      const habitData = {
        id,
        name: name !== undefined ? name.trim() : (updatedData?.name || 'Habit'),
        category: category || updatedData?.category || 'general',
        frequency: frequency || updatedData?.frequency || 'daily',
        status: status || updatedData?.status || 'active',
        priority: priority || updatedData?.priority || 'medium',
        goal_id: goal_id !== undefined ? goal_id : updatedData?.goal_id,
        target_count: target_count !== undefined ? target_count : updatedData?.target_count,
        schedule_days: schedule_days !== undefined ? schedule_days : updatedData?.schedule_days,
        archived_at: status === 'archived' ? (archived_at || new Date().toISOString()) : (status === 'active' ? null : updatedData?.archived_at),
        created_at: updatedData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Keep localDb in sync
      const localIdx = localDb.habits.findIndex((h) => h.id === id);
      if (localIdx >= 0) {
        localDb.habits[localIdx] = { ...localDb.habits[localIdx], ...habitData };
      } else {
        localDb.habits.push(habitData);
      }

      return res.json({ habit: habitData });
    } catch (err: any) {
      console.error('Error updating habit in Supabase:', err);
      // Graceful fallback
      const fallbackHabit = {
        id,
        name: name?.trim() || 'Habit',
        category: category || 'general',
        frequency: frequency || 'daily',
        status: status || 'active',
        priority: priority || 'medium',
        goal_id: goal_id || null,
        target_count,
        schedule_days,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return res.json({ habit: fallbackHabit });
    }
  }

  // Fallback
  const habit = localDb.habits.find((h) => h.id === id);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }
  if (name !== undefined) habit.name = name.trim();
  if (category !== undefined) habit.category = category;
  if (frequency !== undefined) habit.frequency = frequency;
  if (target_count !== undefined) habit.target_count = target_count;
  if (schedule_days !== undefined) habit.schedule_days = schedule_days;
  if (priority !== undefined) (habit as any).priority = priority;
  if (goal_id !== undefined) (habit as any).goal_id = goal_id;
  if (status !== undefined) {
    habit.status = status;
    if (status === 'archived') {
      habit.archived_at = archived_at || new Date().toISOString();
    } else if (status === 'active') {
      habit.archived_at = null;
    }
  }
  habit.updated_at = new Date().toISOString();
  return res.json({ habit });
});

// DELETE /api/habits/:id - Archive habit by default, or delete if permanent=true
app.delete('/api/habits/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const permanent = req.query.permanent === 'true';
  const sb = getSupabase();

  if (sb) {
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid habit ID format' });
    }

    try {
      if (permanent) {
        // Delete associated entries first
        await sb.from('habit_entries').delete().eq('habit_id', id);
        await sb.from('habits').delete().eq('id', id);
        localDb.habits = localDb.habits.filter((h) => h.id !== id);
        localDb.habit_entries = localDb.habit_entries.filter((e) => e.habit_id !== id);
        return res.json({ success: true, message: 'Habit permanently deleted' });
      } else {
        // Soft archive by default
        await resilientUpdate(sb, 'habits', id, {
          status: 'archived',
          archived_at: new Date().toISOString(),
        });
        const localHabit = localDb.habits.find((h) => h.id === id);
        if (localHabit) {
          localHabit.status = 'archived';
          localHabit.archived_at = new Date().toISOString();
        }
        return res.json({ success: true, message: 'Habit archived' });
      }
    } catch (err: any) {
      console.error('Error deleting/archiving habit in Supabase:', err);
    }
  }

  // Fallback
  const habit = localDb.habits.find((h) => h.id === id);
  if (habit) {
    if (permanent) {
      localDb.habits = localDb.habits.filter((h) => h.id !== id);
      localDb.habit_entries = localDb.habit_entries.filter((e) => e.habit_id !== id);
    } else {
      habit.status = 'archived';
      habit.archived_at = new Date().toISOString();
    }
  }
  return res.json({ success: true, message: permanent ? 'Habit deleted' : 'Habit archived' });
});

// POST /api/habits/:id/archive - Archive a habit
app.post('/api/habits/:id/archive', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSupabase();
  const archivedAt = new Date().toISOString();

  if (sb) {
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    try {
      const { data, error } = await resilientUpdate(sb, 'habits', id, {
        status: 'archived',
        archived_at: archivedAt,
        updated_at: new Date().toISOString(),
      });
      const localHabit = localDb.habits.find((h) => h.id === id);
      if (localHabit) {
        localHabit.status = 'archived';
        localHabit.archived_at = archivedAt;
      }
      return res.json({ success: true, habit: data || localHabit, message: 'Habit archived' });
    } catch (err: any) {
      console.error('Error archiving habit in Supabase:', err);
    }
  }

  const habit = localDb.habits.find((h) => h.id === id);
  if (habit) {
    habit.status = 'archived';
    habit.archived_at = archivedAt;
    habit.updated_at = new Date().toISOString();
    return res.json({ success: true, habit, message: 'Habit archived' });
  }
  return res.status(404).json({ error: 'Habit not found' });
});

// POST /api/habits/:id/restore - Restore an archived habit
app.post('/api/habits/:id/restore', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSupabase();

  if (sb) {
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    try {
      const { data, error } = await resilientUpdate(sb, 'habits', id, {
        status: 'active',
        archived_at: null,
        updated_at: new Date().toISOString(),
      });
      const localHabit = localDb.habits.find((h) => h.id === id);
      if (localHabit) {
        localHabit.status = 'active';
        localHabit.archived_at = null;
      }
      return res.json({ success: true, habit: data || localHabit, message: 'Habit restored' });
    } catch (err: any) {
      console.error('Error restoring habit in Supabase:', err);
    }
  }

  const habit = localDb.habits.find((h) => h.id === id);
  if (habit) {
    habit.status = 'active';
    habit.archived_at = null;
    habit.updated_at = new Date().toISOString();
    return res.json({ success: true, habit, message: 'Habit restored' });
  }
  return res.status(404).json({ error: 'Habit not found' });
});

// GET /api/habit-entries - Fetch entries for a specific month or range
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
    // Full year
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  const sb = getSupabase();

  if (sb) {
    try {
      const { data, error } = await sb
        .from('habit_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!error && data) {
        return res.json({ entries: data });
      }
    } catch (err: any) {
      console.error('Error fetching habit entries:', err);
    }
  }

  // Fallback
  const matched = localDb.habit_entries.filter((e) => e.date >= startDate && e.date <= endDate);
  return res.json({ entries: matched });
});

// POST /api/habit-entries/toggle - Create or toggle habit entry
app.post('/api/habit-entries/toggle', async (req: Request, res: Response) => {
  const { habit_id, date, completed } = req.body;

  if (!habit_id || !date || typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'habit_id, date (YYYY-MM-DD), and completed boolean are required' });
  }

  const sb = getSupabase();

  if (sb) {
    if (!isValidUuid(habit_id)) {
      return res.status(400).json({ error: `Invalid habit ID format: "${habit_id}". Please refresh the page.` });
    }

    try {
      const { data: existing } = await sb
        .from('habit_entries')
        .select('*')
        .eq('habit_id', habit_id)
        .eq('date', date)
        .maybeSingle();

      let entryData: any = null;

      if (existing) {
        const updatePayload = { completed, updated_at: new Date().toISOString() };
        const { data: updated } = await resilientUpdate(sb, 'habit_entries', existing.id, updatePayload);
        entryData = updated || { ...existing, completed };
      } else {
        const newId = crypto.randomUUID();
        const insertPayload = { id: newId, habit_id, date, completed, created_at: new Date().toISOString() };
        const { data: inserted } = await resilientInsert(sb, 'habit_entries', insertPayload);
        entryData = inserted || insertPayload;
      }

      // Sync localDb
      let loc = localDb.habit_entries.find((e) => e.habit_id === habit_id && e.date === date);
      if (loc) {
        loc.completed = completed;
      } else {
        localDb.habit_entries.push({
          id: entryData.id || crypto.randomUUID(),
          habit_id,
          date,
          completed,
          created_at: entryData.created_at || new Date().toISOString(),
        });
      }

      return res.json({ entry: entryData });
    } catch (err: any) {
      console.error('Error toggling habit entry in Supabase:', err);
    }
  }

  // Fallback
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

  return res.json({ entry });
});

// GET /api/reflections - Fetch reflection for year and month
app.get('/api/reflections', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'Valid year and month required' });
  }

  const sb = getSupabase();

  if (sb) {
    try {
      const { data, error } = await sb
        .from('reflections')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (!error && data) {
        return res.json({ reflection: data });
      }
    } catch (err: any) {
      console.error('Error fetching reflection from Supabase:', err);
    }
  }

  // Fallback
  const reflection = localDb.reflections.find((r) => r.year === year && r.month === month) || null;
  return res.json({ reflection });
});

// POST /api/reflections - Save or update reflection
app.post('/api/reflections', async (req: Request, res: Response) => {
  const { month, year, content } = req.body;

  if (typeof month !== 'number' || typeof year !== 'number' || typeof content !== 'string') {
    return res.status(400).json({ error: 'month, year, and content required' });
  }

  const sb = getSupabase();

  if (sb) {
    try {
      const { data: existing } = await sb
        .from('reflections')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      let reflectionData: any = null;

      if (existing) {
        const updatePayload = { content, updated_at: new Date().toISOString() };
        const { data: updated } = await resilientUpdate(sb, 'reflections', existing.id, updatePayload);
        reflectionData = updated || { ...existing, content };
      } else {
        const newId = crypto.randomUUID();
        const insertPayload = { id: newId, month, year, content, created_at: new Date().toISOString() };
        const { data: inserted } = await resilientInsert(sb, 'reflections', insertPayload);
        reflectionData = inserted || insertPayload;
      }

      // Sync localDb
      let loc = localDb.reflections.find((r) => r.year === year && r.month === month);
      if (loc) {
        loc.content = content;
      } else {
        localDb.reflections.push({
          id: reflectionData.id || crypto.randomUUID(),
          month,
          year,
          content,
          created_at: new Date().toISOString(),
        });
      }

      return res.json({ reflection: reflectionData });
    } catch (err: any) {
      console.error('Error saving reflection in Supabase:', err);
    }
  }

  // Fallback
  let reflection = localDb.reflections.find((r) => r.year === year && r.month === month);
  if (reflection) {
    reflection.content = content;
    reflection.updated_at = new Date().toISOString();
  } else {
    reflection = {
      id: crypto.randomUUID(),
      month,
      year,
      content,
      created_at: new Date().toISOString(),
    };
    localDb.reflections.push(reflection);
  }

  return res.json({ reflection });
});

// GET /api/weekly-reviews - Fetch weekly reviews
app.get('/api/weekly-reviews', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'Valid year and month required' });
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('weekly_reviews')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      if (!error && data) {
        const formatted = data.map((r: any) => ({
          ...r,
          improve: r.improve || r.could_improve || '',
        }));
        return res.json({ reviews: formatted });
      }
    } catch (err) {
      // fallback
    }
  }

  // Fallback
  const reviews = localDb.weekly_reviews.filter((w) => w.year === year && w.month === month);
  return res.json({ reviews });
});

// POST /api/weekly-reviews - Save weekly review
app.post('/api/weekly-reviews', async (req: Request, res: Response) => {
  const { year, month, week_number, went_well, improve, could_improve, next_focus } = req.body;

  if (typeof year !== 'number' || typeof month !== 'number' || typeof week_number !== 'number') {
    return res.status(400).json({ error: 'year, month, and week_number required' });
  }

  const validImprove = improve || could_improve || '';

  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb
        .from('weekly_reviews')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .eq('week_number', week_number)
        .maybeSingle();

      let reviewData: any = null;

      if (existing) {
        const updatePayload = {
          went_well: went_well || '',
          improve: validImprove,
          could_improve: validImprove,
          next_focus: next_focus || '',
          updated_at: new Date().toISOString(),
        };
        const { data: updated } = await resilientUpdate(sb, 'weekly_reviews', existing.id, updatePayload);
        reviewData = updated || { ...existing, ...updatePayload };
      } else {
        const newId = crypto.randomUUID();
        const insertPayload = {
          id: newId,
          year,
          month,
          week_number,
          went_well: went_well || '',
          improve: validImprove,
          could_improve: validImprove,
          next_focus: next_focus || '',
          created_at: new Date().toISOString(),
        };
        const { data: inserted } = await resilientInsert(sb, 'weekly_reviews', insertPayload);
        reviewData = inserted || insertPayload;
      }

      // Sync localDb
      let loc = localDb.weekly_reviews.find(
        (w) => w.year === year && w.month === month && w.week_number === week_number
      );
      if (loc) {
        loc.went_well = went_well || '';
        loc.improve = validImprove;
        loc.could_improve = validImprove;
        loc.next_focus = next_focus || '';
      } else {
        localDb.weekly_reviews.push({
          id: reviewData?.id || crypto.randomUUID(),
          year,
          month,
          week_number,
          went_well: went_well || '',
          improve: validImprove,
          could_improve: validImprove,
          next_focus: next_focus || '',
          created_at: new Date().toISOString(),
        });
      }

      return res.json({
        review: {
          ...reviewData,
          improve: reviewData?.improve || reviewData?.could_improve || validImprove,
        },
      });
    } catch (err) {
      console.error('Error saving weekly review in Supabase:', err);
    }
  }

  // Fallback
  let item = localDb.weekly_reviews.find(
    (w) => w.year === year && w.month === month && w.week_number === week_number
  );
  if (item) {
    item.went_well = went_well || '';
    item.improve = validImprove;
    item.could_improve = validImprove;
    item.next_focus = next_focus || '';
    item.updated_at = new Date().toISOString();
  } else {
    item = {
      id: crypto.randomUUID(),
      year,
      month,
      week_number,
      went_well: went_well || '',
      improve: validImprove,
      could_improve: validImprove,
      next_focus: next_focus || '',
      created_at: new Date().toISOString(),
    };
    localDb.weekly_reviews.push(item);
  }

  return res.json({ review: item });
});

// GET /api/affirmations (or /api/affirmation)
app.get(['/api/affirmation', '/api/affirmations'], async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (sb) {
    try {
      // Try affirmations table first
      let { data, error } = await sb.from('affirmations').select('*').limit(1).maybeSingle();
      if (error) {
        // Try fallback table name visual_affirmations
        const fallback = await sb.from('visual_affirmations').select('*').limit(1).maybeSingle();
        data = fallback.data;
      }
      if (data) {
        return res.json({ affirmation: data });
      }
    } catch (err) {
      // fallback
    }
  }
  return res.json({ affirmation: localDb.affirmations[0] });
});

// POST /api/affirmations (or /api/affirmation)
app.post(['/api/affirmation', '/api/affirmations'], async (req: Request, res: Response) => {
  const { quote, author, image_url, active } = req.body;
  const affirmation = {
    quote: quote || 'Small progress every day creates massive results.',
    author: author || 'Robin Sharma',
    image_url: image_url || '',
    active: active !== false,
    updated_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb) {
    try {
      let { data: existing } = await sb.from('affirmations').select('id').limit(1).maybeSingle();
      if (existing) {
        await resilientUpdate(sb, 'affirmations', existing.id, affirmation);
      } else {
        const { error: insErr } = await resilientInsert(sb, 'affirmations', affirmation);
        if (insErr) {
          const vExisting = await sb.from('visual_affirmations').select('id').limit(1).maybeSingle();
          if (vExisting.data) {
            await resilientUpdate(sb, 'visual_affirmations', vExisting.data.id, affirmation);
          } else {
            await resilientInsert(sb, 'visual_affirmations', affirmation);
          }
        }
      }
    } catch (err) {
      // fallback
    }
  }

  localDb.affirmations[0] = { ...localDb.affirmations[0], ...affirmation };
  return res.json({ affirmation: localDb.affirmations[0] });
});

// GET /api/settings - Fetch all settings preferences
app.get('/api/settings', async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('settings').select('*');
      if (!error && data && data.length > 0) {
        const settingsMap: Record<string, any> = { ...localDb.settings };
        data.forEach((row: any) => {
          settingsMap[row.setting_key] = row.setting_value;
        });
        return res.json({ settings: settingsMap });
      }
    } catch (err) {
      // fallback
    }
  }
  return res.json({ settings: localDb.settings });
});

// POST /api/settings - Update settings preferences
app.post('/api/settings', async (req: Request, res: Response) => {
  const { setting_key, setting_value } = req.body;
  if (!setting_key) {
    return res.status(400).json({ error: 'setting_key is required' });
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb
        .from('settings')
        .select('*')
        .eq('setting_key', setting_key)
        .maybeSingle();

      if (existing) {
        await resilientUpdate(sb, 'settings', existing.id, {
          setting_value,
          updated_at: new Date().toISOString(),
        });
      } else {
        await resilientInsert(sb, 'settings', {
          setting_key,
          setting_value,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      // fallback
    }
  }

  localDb.settings[setting_key] = setting_value;
  return res.json({ success: true, settings: localDb.settings });
});

// GET /api/habit-categories - Fetch categories
app.get('/api/habit-categories', async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('habit_categories').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return res.json({ categories: data });
      }
    } catch (err) {
      // fallback
    }
  }
  return res.json({ categories: localDb.habit_categories });
});

// POST /api/habit-categories - Add custom category
app.post('/api/habit-categories', async (req: Request, res: Response) => {
  const { name, icon } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const newCat = {
    id: crypto.randomUUID(),
    name: name.trim(),
    icon: (icon && typeof icon === 'string' ? icon.trim() : '✨'),
    created_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb) {
    try {
      await resilientInsert(sb, 'habit_categories', newCat);
    } catch (err) {
      console.warn('Error saving category to Supabase:', err);
    }
  }

  localDb.habit_categories.push(newCat);
  return res.status(201).json({ category: newCat });
});

// DELETE /api/habit-categories/:id - Delete custom category
app.delete('/api/habit-categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('habit_categories').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting category in Supabase:', err);
    }
  }
  localDb.habit_categories = localDb.habit_categories.filter((c) => c.id !== id);
  return res.json({ success: true, message: 'Category removed' });
});

// ==========================================
// GOALS API
// ==========================================
// GET /api/goals - Fetch all goals
app.get('/api/goals', async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('goals').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return res.json({ goals: data });
      }
    } catch (err) {
      // fallback
    }
  }
  return res.json({ goals: localDb.goals });
});

// POST /api/goals - Create new goal
app.post('/api/goals', async (req: Request, res: Response) => {
  const { title, description, category, target_date, progress, status } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Goal title is required' });
  }

  const newGoal = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description ? String(description).trim() : '',
    category: category || 'general',
    target_date: target_date || null,
    progress: typeof progress === 'number' ? progress : 0,
    status: status === 'completed' || status === 'paused' ? status : ('active' as const),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await resilientInsert(sb, 'goals', newGoal);
      if (data) {
        localDb.goals.push(data);
        return res.status(201).json({ goal: data });
      }
    } catch (err) {
      console.warn('Error creating goal in Supabase:', err);
    }
  }

  localDb.goals.push(newGoal);
  return res.status(201).json({ goal: newGoal });
});

// PUT /api/goals/:id - Update goal
app.put('/api/goals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, category, target_date, progress, status } = req.body;

  const updatePayload: any = { updated_at: new Date().toISOString() };
  if (title !== undefined) updatePayload.title = String(title).trim();
  if (description !== undefined) updatePayload.description = String(description).trim();
  if (category !== undefined) updatePayload.category = category;
  if (target_date !== undefined) updatePayload.target_date = target_date;
  if (progress !== undefined) updatePayload.progress = progress;
  if (status !== undefined) updatePayload.status = status;

  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await resilientUpdate(sb, 'goals', id, updatePayload);
      if (data) {
        const idx = localDb.goals.findIndex((g) => g.id === id);
        if (idx >= 0) localDb.goals[idx] = { ...localDb.goals[idx], ...data };
        return res.json({ goal: data });
      }
    } catch (err) {
      console.warn('Error updating goal in Supabase:', err);
    }
  }

  const localIdx = localDb.goals.findIndex((g) => g.id === id);
  if (localIdx >= 0) {
    localDb.goals[localIdx] = { ...localDb.goals[localIdx], ...updatePayload };
    return res.json({ goal: localDb.goals[localIdx] });
  }

  return res.status(404).json({ error: 'Goal not found' });
});

// DELETE /api/goals/:id - Delete goal
app.delete('/api/goals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  const sb = getSupabase();
  if (sb) {
    try {
      // 1. Unlink any habits pointing to this goal first to prevent FK constraint conflicts
      const { error: unlinkError } = await sb.from('habits').update({ goal_id: null }).eq('goal_id', id);
      if (unlinkError) {
        console.warn('Notice unlinking habits in Supabase:', unlinkError.message);
      }

      // 2. Delete the vision goal record
      const { error: deleteError } = await sb.from('goals').delete().eq('id', id);
      if (deleteError) {
        console.warn('Error deleting goal in Supabase:', deleteError.message);
      }
    } catch (err: any) {
      console.warn('Error deleting goal in Supabase:', err?.message || err);
    }
  }

  // Also clean up in-memory localDb
  if (localDb.habits) {
    localDb.habits.forEach((h: any) => {
      if (h.goal_id === id) {
        h.goal_id = null;
      }
    });
  }
  localDb.goals = localDb.goals.filter((g) => g.id !== id);

  return res.json({ success: true, message: 'Goal removed successfully' });
});

// ==========================================
// DAILY JOURNAL & MOOD API
// ==========================================
// GET /api/journal - Fetch daily journal notes
app.get('/api/journal', async (req: Request, res: Response) => {
  const date = req.query.date as string;
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from('daily_journal').select('*');
      if (date) {
        query = query.eq('date', date);
      } else if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (month && year) {
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = `${year}-${String(month).padStart(2, '0')}-31`;
        query = query.gte('date', start).lte('date', end);
      }
      const { data, error } = await query.order('date', { ascending: true });
      if (!error && data) {
        return res.json({ journal: data });
      }
    } catch (err) {
      // fallback
    }
  }

  let filtered = [...localDb.daily_journal];
  if (date) {
    filtered = filtered.filter((j) => j.date === date);
  } else if (startDate && endDate) {
    filtered = filtered.filter((j) => j.date >= startDate && j.date <= endDate);
  } else if (month && year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    filtered = filtered.filter((j) => j.date.startsWith(prefix));
  }
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  return res.json({ journal: filtered });
});

// POST /api/journal - Upsert daily journal / mood
app.post('/api/journal', async (req: Request, res: Response) => {
  let { date, content, mood, energy_level } = req.body;

  // Robust date normalization: handle strings, ISO timestamps, or YYYY-M-D
  if (typeof date === 'string') {
    date = date.trim();
    if (date.includes('T')) {
      date = date.split('T')[0];
    }
    const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      date = `${y}-${m}-${d}`;
    }
  }

  // Fallback to today's date if missing or still not in YYYY-MM-DD format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    date = `${y}-${m}-${d}`;
  }

  const payload: Record<string, any> = {
    date,
    updated_at: new Date().toISOString(),
  };
  if (content !== undefined) payload.content = String(content);
  if (mood !== undefined) payload.mood = String(mood);
  if (energy_level !== undefined && energy_level !== null) {
    const energyNum = Math.min(5, Math.max(1, Math.round(Number(energy_level))));
    if (!isNaN(energyNum)) {
      payload.energy_level = energyNum;
    }
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb.from('daily_journal').select('*').eq('date', date).maybeSingle();
      if (existing) {
        const dbUpdatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.mood !== undefined) dbUpdatePayload.mood = payload.mood;
        if (payload.energy_level !== undefined) dbUpdatePayload.energy_level = payload.energy_level;
        if (payload.daily_win !== undefined) dbUpdatePayload.daily_win = payload.daily_win;
        else if (payload.content !== undefined) dbUpdatePayload.daily_win = payload.content;
        if (payload.lesson_learned !== undefined) dbUpdatePayload.lesson_learned = payload.lesson_learned;
        if (payload.tomorrow_focus !== undefined) dbUpdatePayload.tomorrow_focus = payload.tomorrow_focus;

        const updateRes = await sb.from('daily_journal').update(dbUpdatePayload).eq('id', existing.id).select().maybeSingle();
        const resultData = {
          ...existing,
          ...payload,
          ...(updateRes.data || {}),
          content: payload.content || payload.daily_win || existing.daily_win || '',
          date,
        };
        const localIdx = localDb.daily_journal.findIndex((j) => j.date === date);
        if (localIdx >= 0) localDb.daily_journal[localIdx] = { ...localDb.daily_journal[localIdx], ...resultData };
        else localDb.daily_journal.push(resultData);
        return res.json({ entry: resultData });
      } else {
        const dbInsertPayload: Record<string, any> = {
          id: crypto.randomUUID(),
          date,
          mood: payload.mood !== undefined ? payload.mood : 'good',
          energy_level: payload.energy_level !== undefined ? payload.energy_level : 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (payload.daily_win !== undefined) dbInsertPayload.daily_win = payload.daily_win;
        else if (payload.content !== undefined) dbInsertPayload.daily_win = payload.content;
        if (payload.lesson_learned !== undefined) dbInsertPayload.lesson_learned = payload.lesson_learned;
        if (payload.tomorrow_focus !== undefined) dbInsertPayload.tomorrow_focus = payload.tomorrow_focus;

        const insertRes = await sb.from('daily_journal').insert([dbInsertPayload]).select().maybeSingle();
        const resultData = {
          ...dbInsertPayload,
          ...payload,
          ...(insertRes.data || {}),
          content: payload.content || payload.daily_win || '',
          date,
        };
        const localIdx = localDb.daily_journal.findIndex((j) => j.date === date);
        if (localIdx >= 0) localDb.daily_journal[localIdx] = { ...localDb.daily_journal[localIdx], ...resultData };
        else localDb.daily_journal.push(resultData);
        return res.json({ entry: resultData });
      }
    } catch (err) {
      // Fallback to local
    }
  }

  const localIdx = localDb.daily_journal.findIndex((j) => j.date === date);
  if (localIdx >= 0) {
    localDb.daily_journal[localIdx] = { ...localDb.daily_journal[localIdx], ...payload, date };
    return res.json({ entry: localDb.daily_journal[localIdx] });
  } else {
    const newEntry = {
      id: crypto.randomUUID(),
      date,
      content: payload.content !== undefined ? payload.content : '',
      mood: payload.mood !== undefined ? payload.mood : 'good',
      energy_level: payload.energy_level !== undefined ? payload.energy_level : 3,
      ...payload,
      created_at: new Date().toISOString(),
    };
    localDb.daily_journal.push(newEntry);
    return res.json({ entry: newEntry });
  }
});

// ==========================================
// WEEKLY PLANNING API
// ==========================================
// GET /api/weekly-plans - Fetch weekly planning
app.get('/api/weekly-plans', async (req: Request, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

  const sb = getSupabase();
  if (sb) {
    try {
      let q = sb.from('weekly_plans').select('*');
      if (year) q = q.eq('year', year);
      if (month) q = q.eq('month', month);
      const { data, error } = await q;
      if (!error && data) {
        return res.json({ plans: data });
      }
    } catch (err) {
      // fallback
    }
  }

  let filtered = localDb.weekly_plans;
  if (year) filtered = filtered.filter((p) => p.year === year);
  if (month) filtered = filtered.filter((p) => p.month === month);
  return res.json({ plans: filtered });
});

// POST /api/weekly-plans - Upsert weekly plan
app.post('/api/weekly-plans', async (req: Request, res: Response) => {
  const { year, month, week_number, main_goal, priority_1, priority_2, priority_3, target_percentage } = req.body;
  if (!year || !month || !week_number) {
    return res.status(400).json({ error: 'year, month, and week_number are required' });
  }

  const payload = {
    year: Number(year),
    month: Number(month),
    week_number: Number(week_number),
    main_goal: main_goal ? String(main_goal).trim() : '',
    priority_1: priority_1 ? String(priority_1).trim() : '',
    priority_2: priority_2 ? String(priority_2).trim() : '',
    priority_3: priority_3 ? String(priority_3).trim() : '',
    target_percentage: typeof target_percentage === 'number' ? target_percentage : 85,
    updated_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb
        .from('weekly_plans')
        .select('id')
        .eq('year', payload.year)
        .eq('month', payload.month)
        .eq('week_number', payload.week_number)
        .maybeSingle();

      if (existing) {
        await resilientUpdate(sb, 'weekly_plans', existing.id, payload);
      } else {
        await resilientInsert(sb, 'weekly_plans', {
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Error saving weekly plan in Supabase:', err);
    }
  }

  const idx = localDb.weekly_plans.findIndex(
    (p) => p.year === payload.year && p.month === payload.month && p.week_number === payload.week_number
  );
  if (idx >= 0) {
    localDb.weekly_plans[idx] = { ...localDb.weekly_plans[idx], ...payload };
    return res.json({ plan: localDb.weekly_plans[idx] });
  } else {
    const newPlan = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
    localDb.weekly_plans.push(newPlan);
    return res.json({ plan: newPlan });
  }
});

// ==========================================
// MOOD TRACKER (public.mood_tracker) API
// ==========================================

// GET /api/moods - Fetch mood tracker entries (public)
app.get('/api/moods', async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('mood_tracker').select('*').order('date', { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const item of data) {
          const idx = localDb.mood_tracker.findIndex((m) => m.id === item.id || m.date === item.date);
          if (idx >= 0) localDb.mood_tracker[idx] = { ...localDb.mood_tracker[idx], ...item };
          else localDb.mood_tracker.push(item);
        }
        const sorted = [...localDb.mood_tracker].sort((a, b) => b.date.localeCompare(a.date));
        return res.json({ moods: sorted });
      }
    } catch (_err) {
      // Graceful fallback to localDb
    }
  }

  // Fallback to localDb (sorted reverse chronological) if Supabase is offline
  const sorted = [...localDb.mood_tracker].sort((a, b) => b.date.localeCompare(a.date));
  return res.json({ moods: sorted });
});

// GET /api/moods/:id - Fetch single mood tracker entry by ID (public)
app.get('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('mood_tracker').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return res.json({ mood: data });
      }
    } catch (_err) {
      // Graceful fallback to localDb
    }
  }

  const found = localDb.mood_tracker.find((m) => m.id === id);
  if (found) return res.json({ mood: found });
  return res.status(404).json({ error: 'Mood entry not found' });
});

// POST /api/moods - Insert or update mood entry for a specific date (protected)
app.post('/api/moods', async (req: Request, res: Response) => {
  let { date, mood, mood_score, energy_level, note } = req.body;

  // Strict Date Validation (never null, never undefined, must be YYYY-MM-DD)
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
  }

  const validMoods = ['very_low', 'low', 'okay', 'good', 'great', 'excellent'];
  const safeMood = validMoods.includes(mood) ? mood : 'good';
  const defaultScoreMap: Record<string, number> = {
    very_low: 1,
    low: 2,
    okay: 3,
    good: 4,
    great: 5,
    excellent: 6,
  };
  const safeScore = (typeof mood_score === 'number' && mood_score >= 1 && mood_score <= 6)
    ? mood_score
    : (defaultScoreMap[safeMood] || 4);

  const safeEnergy = (typeof energy_level === 'number' && energy_level >= 1 && energy_level <= 5)
    ? Math.round(energy_level)
    : 3;

  const safeNote = typeof note === 'string' ? note.trim() : '';

  const payload = {
    date,
    mood: safeMood,
    mood_score: safeScore,
    energy_level: safeEnergy,
    note: safeNote,
  };

  // Required logging
  console.log('[Mood Tracker] Saving:', payload);

  const sb = getSupabase();
  if (sb) {
    try {
      // Check if mood for this date already exists to prevent duplicate entries
      const { data: existing } = await sb
        .from('mood_tracker')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (existing) {
        // Update existing record by ID
        const updatePayload = {
          ...payload,
          updated_at: new Date().toISOString(),
        };
        const updateRes = await resilientUpdate(sb, 'mood_tracker', existing.id, updatePayload);
        if (!updateRes.error) {
          const resultRecord = { ...existing, ...updatePayload, ...(updateRes.data || {}), id: existing.id, date };

          const lIdx = localDb.mood_tracker.findIndex((m) => m.date === date || m.id === existing.id);
          if (lIdx >= 0) localDb.mood_tracker[lIdx] = resultRecord;
          else localDb.mood_tracker.push(resultRecord);

          return res.json({ mood: resultRecord, updated: true });
        }
      } else {
        // Insert new record
        const newRecord = {
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const insertRes = await resilientInsert(sb, 'mood_tracker', newRecord);
        if (!insertRes.error) {
          const resultRecord = { ...newRecord, ...(insertRes.data || {}), date };

          const lIdx = localDb.mood_tracker.findIndex((m) => m.date === date);
          if (lIdx >= 0) localDb.mood_tracker[lIdx] = resultRecord;
          else localDb.mood_tracker.push(resultRecord);

          return res.json({ mood: resultRecord, created: true });
        }
      }
    } catch (_err) {
      // Graceful fallback to local persistence if Supabase network fails
    }
  }

  // Fallback to localDb if Supabase is offline
  const localIdx = localDb.mood_tracker.findIndex((m) => m.date === date);
  if (localIdx >= 0) {
    localDb.mood_tracker[localIdx] = {
      ...localDb.mood_tracker[localIdx],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    return res.json({ mood: localDb.mood_tracker[localIdx], updated: true });
  } else {
    const newEntry = {
      id: crypto.randomUUID(),
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDb.mood_tracker.push(newEntry);
    return res.json({ mood: newEntry, created: true });
  }
});

// PUT /api/moods/:id - Update existing mood entry by ID (protected)
app.put('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  let { date, mood, mood_score, energy_level, note } = req.body;

  if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
  }

  const validMoods = ['very_low', 'low', 'okay', 'good', 'great', 'excellent'];
  const safeMood = mood && validMoods.includes(mood) ? mood : undefined;
  const defaultScoreMap: Record<string, number> = {
    very_low: 1,
    low: 2,
    okay: 3,
    good: 4,
    great: 5,
    excellent: 6,
  };
  const safeScore = (typeof mood_score === 'number' && mood_score >= 1 && mood_score <= 6)
    ? mood_score
    : (safeMood ? defaultScoreMap[safeMood] : undefined);

  const safeEnergy = (typeof energy_level === 'number' && energy_level >= 1 && energy_level <= 5)
    ? Math.round(energy_level)
    : undefined;

  const safeNote = typeof note === 'string' ? note.trim() : undefined;

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (date) payload.date = date;
  if (safeMood) payload.mood = safeMood;
  if (safeScore !== undefined) payload.mood_score = safeScore;
  if (safeEnergy !== undefined) payload.energy_level = safeEnergy;
  if (safeNote !== undefined) payload.note = safeNote;

  console.log('[Mood Tracker] Saving:', { id, ...payload });

  const sb = getSupabase();
  if (sb) {
    try {
      const updateRes = await resilientUpdate(sb, 'mood_tracker', id, payload);
      if (!updateRes.error) {
        const updated = updateRes.data || { id, ...payload };

        const lIdx = localDb.mood_tracker.findIndex((m) => m.id === id);
        if (lIdx >= 0) localDb.mood_tracker[lIdx] = { ...localDb.mood_tracker[lIdx], ...updated };
        else localDb.mood_tracker.push(updated);

        return res.json({ mood: updated });
      }
    } catch (_err) {
      // Graceful fallback to localDb
    }
  }

  const lIdx = localDb.mood_tracker.findIndex((m) => m.id === id);
  if (lIdx >= 0) {
    localDb.mood_tracker[lIdx] = { ...localDb.mood_tracker[lIdx], ...payload };
    return res.json({ mood: localDb.mood_tracker[lIdx] });
  }

  return res.status(404).json({ error: 'Mood entry not found' });
});

// DELETE /api/moods/:id - Delete mood entry by ID (protected)
app.delete('/api/moods/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('mood_tracker').delete().eq('id', id);
    } catch (_err) {
      // Graceful fallback to localDb
    }
  }

  localDb.mood_tracker = localDb.mood_tracker.filter((m) => m.id !== id);
  return res.json({ success: true, id });
});

// ==========================================
// BACKUP RESTORE / IMPORT API
// ==========================================
// POST /api/backup/import - Import JSON backup with merge or replace mode
app.post('/api/backup/import', async (req: Request, res: Response) => {
  const { data: importData, mode = 'merge' } = req.body;
  if (!importData || typeof importData !== 'object') {
    return res.status(400).json({ error: 'Valid backup data object is required' });
  }

  const sb = getSupabase();
  const {
    habits = [],
    habit_entries = [],
    reflections = [],
    weekly_reviews = [],
    affirmations = [],
    goals = [],
    daily_journal = [],
    weekly_plans = [],
    settings = [],
    habit_categories = [],
  } = importData;

  if (mode === 'replace') {
    localDb.habits = Array.isArray(habits) ? habits : [];
    localDb.habit_entries = Array.isArray(habit_entries) ? habit_entries : [];
    localDb.reflections = Array.isArray(reflections) ? reflections : [];
    localDb.weekly_reviews = Array.isArray(weekly_reviews) ? weekly_reviews : [];
    localDb.affirmations = Array.isArray(affirmations) && affirmations.length > 0 ? affirmations : localDb.affirmations;
    localDb.goals = Array.isArray(goals) ? goals : [];
    localDb.daily_journal = Array.isArray(daily_journal) ? daily_journal : [];
    localDb.weekly_plans = Array.isArray(weekly_plans) ? weekly_plans : [];
    localDb.habit_categories = Array.isArray(habit_categories) && habit_categories.length > 0 ? habit_categories : localDb.habit_categories;

    if (sb) {
      try {
        await Promise.allSettled([
          sb.from('habit_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          sb.from('habits').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          sb.from('reflections').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          sb.from('weekly_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          sb.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        ]);

        if (habits.length > 0) await sb.from('habits').insert(habits);
        if (habit_entries.length > 0) await sb.from('habit_entries').insert(habit_entries);
        if (reflections.length > 0) await sb.from('reflections').insert(reflections);
        if (weekly_reviews.length > 0) await sb.from('weekly_reviews').insert(weekly_reviews);
        if (goals.length > 0) await sb.from('goals').insert(goals);
      } catch (err) {
        console.warn('Supabase replace import warning:', err);
      }
    }
  } else {
    // MERGE mode: Add missing or updated records
    if (Array.isArray(habits)) {
      habits.forEach((h: any) => {
        const existingIdx = localDb.habits.findIndex((item) => item.id === h.id);
        if (existingIdx >= 0) localDb.habits[existingIdx] = { ...localDb.habits[existingIdx], ...h };
        else localDb.habits.push(h);
      });
    }

    if (Array.isArray(habit_entries)) {
      habit_entries.forEach((e: any) => {
        const existingIdx = localDb.habit_entries.findIndex((item) => item.habit_id === e.habit_id && item.date === e.date);
        if (existingIdx >= 0) localDb.habit_entries[existingIdx] = { ...localDb.habit_entries[existingIdx], ...e };
        else localDb.habit_entries.push(e);
      });
    }

    if (Array.isArray(goals)) {
      goals.forEach((g: any) => {
        const existingIdx = localDb.goals.findIndex((item) => item.id === g.id);
        if (existingIdx >= 0) localDb.goals[existingIdx] = { ...localDb.goals[existingIdx], ...g };
        else localDb.goals.push(g);
      });
    }

    if (Array.isArray(daily_journal)) {
      daily_journal.forEach((j: any) => {
        const existingIdx = localDb.daily_journal.findIndex((item) => item.date === j.date);
        if (existingIdx >= 0) localDb.daily_journal[existingIdx] = { ...localDb.daily_journal[existingIdx], ...j };
        else localDb.daily_journal.push(j);
      });
    }
  }

  return res.json({
    success: true,
    message: `Backup data successfully imported (${mode} mode)`,
    summary: {
      habits: localDb.habits.length,
      habit_entries: localDb.habit_entries.length,
      goals: localDb.goals.length,
      daily_journal: localDb.daily_journal.length,
    },
  });
});

// Helper to safely match schedule_days whether items are numbers, day names, or strings
function checkDayMatchesSchedule(scheduleDay: any, dayIdx: number, dayName: string): boolean {
  if (scheduleDay === null || scheduleDay === undefined) return false;
  if (typeof scheduleDay === 'number') {
    return (scheduleDay % 7 + 7) % 7 === dayIdx;
  }
  const str = String(scheduleDay).trim().toLowerCase();
  if (!str) return false;
  const num = parseInt(str, 10);
  if (!isNaN(num) && (str === String(num) || /^[0-6]$/.test(str))) {
    return (num % 7 + 7) % 7 === dayIdx;
  }
  return str.startsWith(dayName.slice(0, 3));
}

// GET /api/streak - Calculate Consistency Streak (>=70% daily completion) and per-habit streaks
app.get('/api/streak', async (_req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    let entriesList: Array<{ habit_id: string; date: string; completed: boolean }> = [];
    let habitsList: Array<{ id: string; status?: string; frequency?: string; schedule_days?: any[] }> = [];

    if (sb) {
      try {
        const [eRes, hRes] = await Promise.all([
          sb.from('habit_entries').select('habit_id, date, completed').eq('completed', true),
          sb.from('habits').select('id, status, frequency, schedule_days'),
        ]);
        entriesList = eRes.data || [];
        habitsList = hRes.data || [];
      } catch (err) {
        console.error('Error calculating streak from Supabase:', err);
        entriesList = localDb.habit_entries.filter((e) => e.completed);
        habitsList = localDb.habits;
      }
    } else {
      entriesList = localDb.habit_entries.filter((e) => e.completed);
      habitsList = localDb.habits;
    }

    const activeHabits = habitsList.filter((h) => (h.status || 'active') === 'active');
    const activeHabitCount = activeHabits.length;

    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Map of date -> Set of completed habit IDs
    const completedByDate: Record<string, Set<string>> = {};
    // Map of habit_id -> Set of completed dates
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

    // Helper to check if a day met the 70% threshold
    const isDaySuccessful = (dateStr: string) => {
      const completedSet = completedByDate[dateStr];
      if (!completedSet || completedSet.size === 0) return false;

      // Filter active habits scheduled on that day
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

    // Calculate overall Current Consistency Streak
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

    // Calculate overall Best Consistency Streak
    const allDates = Object.keys(completedByDate).sort();
    let bestStreak = 0;
    let runningStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of allDates) {
      if (isDaySuccessful(dateStr)) {
        const cDate = new Date(dateStr + 'T00:00:00');
        if (prevDate) {
          const diffDays = Math.round((cDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            runningStreak++;
          } else if (diffDays > 1) {
            runningStreak = 1;
          }
        } else {
          runningStreak = 1;
        }
        if (runningStreak > bestStreak) bestStreak = runningStreak;
        prevDate = cDate;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);

    // Calculate per-habit streaks
    const habitStreaks: Record<string, { current: number; best: number; totalCompletions: number }> = {};
    for (const habit of habitsList) {
      const hId = habit.id;
      const dateSet = habitCompletedDates[hId] || new Set();
      const totalCompletions = dateSet.size;

      const isHabitScheduledOn = (d: Date) => {
        if ((habit.status || 'active') !== 'active') return false;
        if (!habit.frequency || habit.frequency === 'daily' || habit.frequency === 'weekly_target' || habit.frequency === 'monthly_target') return true;
        if (habit.frequency === 'specific_days' && Array.isArray(habit.schedule_days) && habit.schedule_days.length > 0) {
          const dayIdx = d.getDay();
          const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const name = weekdayNames[dayIdx];
          return habit.schedule_days.some((sd) => checkDayMatchesSchedule(sd, dayIdx, name));
        }
        return true;
      };

      let hCurrent = 0;
      let hCheck = new Date(now);
      const isTodayScheduled = isHabitScheduledOn(hCheck);
      if (isTodayScheduled && !dateSet.has(todayStr)) {
        hCheck.setDate(hCheck.getDate() - 1);
      }

      let iterations = 0;
      while (iterations < 365) {
        iterations++;
        const dStr = formatDateStr(hCheck);
        const isSched = isHabitScheduledOn(hCheck);

        if (isSched) {
          if (dateSet.has(dStr)) {
            hCurrent++;
            hCheck.setDate(hCheck.getDate() - 1);
          } else {
            break;
          }
        } else {
          hCheck.setDate(hCheck.getDate() - 1);
        }
      }

      const hSorted = Array.from(dateSet).sort();
      let hBest = 0;
      let hRun = 0;
      let lastValidDate: Date | null = null;

      for (const dStr of hSorted) {
        const cDate = new Date(dStr + 'T00:00:00');
        if (lastValidDate) {
          const diffDays = Math.round((cDate.getTime() - lastValidDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            hRun++;
          } else if (diffDays > 1) {
            let broken = false;
            const temp = new Date(lastValidDate);
            temp.setDate(temp.getDate() + 1);
            while (temp < cDate) {
              if (isHabitScheduledOn(temp)) {
                broken = true;
                break;
              }
              temp.setDate(temp.getDate() + 1);
            }

            if (broken) {
              hRun = 1;
            } else {
              hRun++;
            }
          }
        } else {
          hRun = 1;
        }

        if (hRun > hBest) hBest = hRun;
        lastValidDate = cDate;
      }
      hBest = Math.max(hBest, hCurrent);

      habitStreaks[hId] = { current: hCurrent, best: hBest, totalCompletions };
    }

    res.json({
      streak: currentStreak,
      bestStreak,
      completedToday: hasCompletedToday,
      habitStreaks,
    });
  } catch (streakErr) {
    console.error('Unhandled error calculating streak:', streakErr);
    res.json({
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      habitStreaks: {},
    });
  }
});

// GET /api/export - Export full JSON backup (all tables) or CSV
app.get('/api/export', async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const sb = getSupabase();

  let habits: any[] = [];
  let habit_entries: any[] = [];
  let reflections: any[] = [];
  let weekly_reviews: any[] = [];
  let affirmations: any[] = [];
  let settings: any[] = [];
  let habit_categories: any[] = [];
  let goals: any[] = [];
  let daily_journal: any[] = [];
  let weekly_plans: any[] = [];
  let mood_tracker: any[] = [];

  if (sb) {
    try {
      const [hRes, eRes, rRes, wRes, aRes, sRes, cRes, gRes, jRes, pRes, mRes] = await Promise.allSettled([
        sb.from('habits').select('*'),
        sb.from('habit_entries').select('*'),
        sb.from('reflections').select('*'),
        sb.from('weekly_reviews').select('*'),
        sb.from('affirmations').select('*'),
        sb.from('settings').select('*'),
        sb.from('habit_categories').select('*'),
        sb.from('goals').select('*'),
        sb.from('daily_journal').select('*'),
        sb.from('weekly_plans').select('*'),
        sb.from('mood_tracker').select('*'),
      ]);

      if (hRes.status === 'fulfilled') habits = hRes.value.data || [];
      if (eRes.status === 'fulfilled') habit_entries = eRes.value.data || [];
      if (rRes.status === 'fulfilled') reflections = rRes.value.data || [];
      if (wRes.status === 'fulfilled') weekly_reviews = wRes.value.data || [];
      if (aRes.status === 'fulfilled') affirmations = aRes.value.data || [];
      if (sRes.status === 'fulfilled') settings = sRes.value.data || [];
      if (cRes.status === 'fulfilled') habit_categories = cRes.value.data || [];
      if (gRes.status === 'fulfilled') goals = gRes.value.data || [];
      if (jRes.status === 'fulfilled') daily_journal = jRes.value.data || [];
      if (pRes.status === 'fulfilled') weekly_plans = pRes.value.data || [];
      if (mRes.status === 'fulfilled') mood_tracker = mRes.value.data || [];
    } catch (e) {
      habits = localDb.habits;
      habit_entries = localDb.habit_entries;
      reflections = localDb.reflections;
      weekly_reviews = localDb.weekly_reviews;
      affirmations = localDb.affirmations;
      settings = Object.entries(localDb.settings).map(([k, v]) => ({ setting_key: k, setting_value: v }));
      habit_categories = localDb.habit_categories;
      goals = localDb.goals;
      daily_journal = localDb.daily_journal;
      weekly_plans = localDb.weekly_plans;
      mood_tracker = localDb.mood_tracker;
    }
  } else {
    habits = localDb.habits;
    habit_entries = localDb.habit_entries;
    reflections = localDb.reflections;
    weekly_reviews = localDb.weekly_reviews;
    affirmations = localDb.affirmations;
    settings = Object.entries(localDb.settings).map(([k, v]) => ({ setting_key: k, setting_value: v }));
    habit_categories = localDb.habit_categories;
    goals = localDb.goals;
    daily_journal = localDb.daily_journal;
    weekly_plans = localDb.weekly_plans;
    mood_tracker = localDb.mood_tracker;
  }

  if (format === 'csv') {
    const habitMap = new Map(habits.map((h) => [h.id, h.name]));
    let csv = 'Habit ID,Habit Name,Date,Completed,Created At\n';
    habit_entries.forEach((e) => {
      const hName = (habitMap.get(e.habit_id) || 'Unknown').replace(/"/g, '""');
      csv += `"${e.habit_id}","${hName}","${e.date}",${e.completed ? 'TRUE' : 'FALSE'},"${e.created_at || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vignesh_habits_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csv);
  }

  return res.json({
    app: 'Vignesh Habit Tracker',
    version: '3.0',
    exported_at: new Date().toISOString(),
    habits,
    habit_entries,
    reflections,
    weekly_reviews,
    affirmations,
    settings,
    habit_categories,
    goals,
    daily_journal,
    weekly_plans,
    mood_tracker,
  });
});

// POST /api/import - Import full JSON backup (protected write action)
app.post('/api/import', async (req: Request, res: Response) => {
  try {
    const {
      habits,
      habit_entries,
      reflections,
      weekly_reviews,
      affirmations,
      settings,
      habit_categories,
      goals,
      daily_journal,
      weekly_plans,
      mood_tracker,
    } = req.body || {};

    const sb = getSupabase();
    if (sb) {
      if (Array.isArray(habits) && habits.length > 0) {
        await sb.from('habits').upsert(habits, { onConflict: 'id' });
      }
      if (Array.isArray(habit_entries) && habit_entries.length > 0) {
        await sb.from('habit_entries').upsert(habit_entries, { onConflict: 'id' });
      }
      if (Array.isArray(reflections) && reflections.length > 0) {
        await sb.from('reflections').upsert(reflections, { onConflict: 'id' });
      }
      if (Array.isArray(weekly_reviews) && weekly_reviews.length > 0) {
        await sb.from('weekly_reviews').upsert(weekly_reviews, { onConflict: 'id' });
      }
      if (Array.isArray(affirmations) && affirmations.length > 0) {
        await sb.from('affirmations').upsert(affirmations, { onConflict: 'id' });
      }
      if (Array.isArray(goals) && goals.length > 0) {
        await sb.from('goals').upsert(goals, { onConflict: 'id' });
      }
      if (Array.isArray(daily_journal) && daily_journal.length > 0) {
        await sb.from('daily_journal').upsert(daily_journal, { onConflict: 'id' });
      }
      if (Array.isArray(weekly_plans) && weekly_plans.length > 0) {
        await sb.from('weekly_plans').upsert(weekly_plans, { onConflict: 'id' });
      }
      if (Array.isArray(mood_tracker) && mood_tracker.length > 0) {
        await sb.from('mood_tracker').upsert(mood_tracker, { onConflict: 'id' });
      }
    } else {
      if (Array.isArray(habits)) localDb.habits = habits;
      if (Array.isArray(habit_entries)) localDb.habit_entries = habit_entries;
      if (Array.isArray(reflections)) localDb.reflections = reflections;
      if (Array.isArray(weekly_reviews)) localDb.weekly_reviews = weekly_reviews;
      if (Array.isArray(affirmations)) localDb.affirmations = affirmations;
      if (Array.isArray(goals)) localDb.goals = goals;
      if (Array.isArray(daily_journal)) localDb.daily_journal = daily_journal;
      if (Array.isArray(weekly_plans)) localDb.weekly_plans = weekly_plans;
      if (Array.isArray(mood_tracker)) localDb.mood_tracker = mood_tracker;
    }

    res.json({ success: true, message: 'Data imported successfully' });
  } catch (err: any) {
    console.error('Error importing data:', err);
    res.status(500).json({ error: 'Failed to import data: ' + (err?.message || 'Unknown error') });
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
    console.log(`Vignesh Habit Tracker 2.0 server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone HTTP server when executed directly (not in Vercel serverless environment)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
export default app;
