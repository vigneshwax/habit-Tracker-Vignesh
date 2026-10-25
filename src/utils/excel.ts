import * as XLSX from 'xlsx';
import {
  Habit,
  HabitEntry,
  Goal,
  MoodTrackerEntry,
  DailyJournal,
  WeeklyReview,
  WeeklyPlan,
  Reflection,
  HabitCategoryItem,
  AppSettings,
  VisualAffirmation,
  MOOD_TRACKER_MAP,
  MoodTrackerValue,
} from '../types';
import {
  CENTRAL_DATA_SCHEMA,
  SCHEMA_VERSION,
  APP_IDENTIFIER,
  ORDERED_TABLE_NAMES,
  SupportedTableName,
  TableDefinition,
} from './dataSchema';

export {
  CENTRAL_DATA_SCHEMA,
  SCHEMA_VERSION,
  APP_IDENTIFIER,
  ORDERED_TABLE_NAMES,
};
export type { SupportedTableName };

export interface FullExportData {
  habits: Habit[];
  habit_entries: HabitEntry[];
  goals: Goal[];
  mood_tracker: MoodTrackerEntry[];
  daily_journal: DailyJournal[];
  weekly_reviews: WeeklyReview[];
  weekly_plans: WeeklyPlan[];
  reflections: Reflection[];
  habit_categories?: HabitCategoryItem[];
  categories?: HabitCategoryItem[];
  affirmations?: VisualAffirmation[];
  settings?: AppSettings | Record<string, any>;
  exported_at?: string;
  app?: string;
  version?: string;
}

export interface TableMeta {
  name: SupportedTableName;
  displayName: string;
  primaryKey: string;
  foreignKeys: string;
  description: string;
  fields: string[];
}

export const RELATIONAL_TABLES: Record<SupportedTableName, TableMeta> = {
  affirmations: {
    name: 'affirmations',
    displayName: 'Affirmations',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores motivational quotes and images',
    fields: ['id', 'quote', 'author', 'image_url', 'active', 'created_at', 'updated_at'],
  },
  daily_journal: {
    name: 'daily_journal',
    displayName: 'Daily Journal',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores daily journal entries, reflections, gratitude, and energy levels',
    fields: [
      'id',
      'date',
      'content',
      'mood',
      'energy_level',
      'productivity',
      'highlights',
      'gratitude',
      'wins',
      'challenges',
      'priorities',
      'tags',
      'linked_notes',
      'created_at',
      'updated_at',
    ],
  },
  goals: {
    name: 'goals',
    displayName: 'Goals',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Tracks personal goals and their progress',
    fields: ['id', 'title', 'description', 'category', 'target_date', 'progress', 'status', 'created_at', 'updated_at'],
  },
  habit_categories: {
    name: 'habit_categories',
    displayName: 'Habit Categories',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Organizes habits into categories',
    fields: ['id', 'name', 'icon', 'created_at'],
  },
  habit_entries: {
    name: 'habit_entries',
    displayName: 'Habit Entries',
    primaryKey: 'id',
    foreignKeys: 'habit_id -> habits.id',
    description: 'Records whether a habit was completed on a particular date',
    fields: ['id', 'habit_id', 'date', 'completed', 'created_at', 'updated_at'],
  },
  habits: {
    name: 'habits',
    displayName: 'Habits',
    primaryKey: 'id',
    foreignKeys: 'goal_id -> goals.id',
    description: 'Stores habit details, schedules, priorities, and statuses',
    fields: ['id', 'name', 'category', 'frequency', 'priority', 'goal_id', 'target_count', 'schedule_days', 'status', 'archived_at', 'created_at', 'updated_at'],
  },
  mood_tracker: {
    name: 'mood_tracker',
    displayName: 'Mood Tracker',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Tracks daily moods, mood scores, and energy levels',
    fields: ['id', 'date', 'mood', 'mood_score', 'energy_level', 'note', 'created_at', 'updated_at'],
  },
  reflections: {
    name: 'reflections',
    displayName: 'Reflections',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores monthly reflections',
    fields: ['id', 'month', 'year', 'content', 'created_at', 'updated_at'],
  },
  settings: {
    name: 'settings',
    displayName: 'Settings',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores application preferences and configuration',
    fields: ['id', 'setting_key', 'setting_value', 'updated_at'],
  },
  weekly_plans: {
    name: 'weekly_plans',
    displayName: 'Weekly Plans',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores weekly goals, priorities, and target completion percentages',
    fields: ['id', 'year', 'month', 'week_number', 'main_goal', 'priority_1', 'priority_2', 'priority_3', 'target_percentage', 'created_at', 'updated_at'],
  },
  weekly_reviews: {
    name: 'weekly_reviews',
    displayName: 'Weekly Reviews',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores weekly reviews and improvement plans',
    fields: ['id', 'year', 'month', 'week_number', 'went_well', 'improve', 'could_improve', 'next_focus', 'created_at', 'updated_at'],
  },
  tasks: {
    name: 'tasks',
    displayName: 'Tasks',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores personal and executive tasks, assignments, priorities, and deadlines',
    fields: ['id', 'date', 'time', 'title', 'description', 'category', 'priority', 'status', 'assigned_to', 'notes', 'follow_up_date', 'created_at', 'updated_at'],
  },
  notes: {
    name: 'notes',
    displayName: 'Notes & Second Brain',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Stores digital second brain notes, knowledge documents, checklists, and ideas',
    fields: ['id', 'title', 'content', 'type', 'category', 'checklist', 'tags', 'pinned', 'favorite', 'color', 'created_at', 'updated_at'],
  },
  // Backward compatibility aliases
  categories: {
    name: 'categories',
    displayName: 'Categories (Legacy Alias)',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Alias for habit_categories',
    fields: ['id', 'name', 'icon', 'created_at'],
  },
  monthly_reflections: {
    name: 'monthly_reflections',
    displayName: 'Monthly Reflections (Legacy Alias)',
    primaryKey: 'id',
    foreignKeys: 'none',
    description: 'Alias for reflections',
    fields: ['id', 'month', 'year', 'content', 'created_at', 'updated_at'],
  },
};

export interface ValidationIssue {
  sheet: string;
  rowNumber: number;
  column?: string;
  type: 'error' | 'warning';
  message: string;
  recordId?: string;
}

export interface SheetImportStats {
  tableName: SupportedTableName;
  displayName: string;
  totalRows: number;
  validRows: number;
  newRows: number;
  updatedRows: number;
  errors: number;
  warnings: number;
}

export interface ExcelImportSummary {
  habitsCount: number;
  entriesCount: number;
  goalsCount: number;
  moodsCount: number;
  journalCount: number;
  reviewsCount: number;
  plansCount: number;
  reflectionsCount: number;
  categoriesCount: number;
  settingsCount: number;
  detectedSheets: string[];
  totalRows: number;
  validRowsCount: number;
  parsedData: FullExportData;
  warnings: string[];
  errors: ValidationIssue[];
  issues: ValidationIssue[];
  sheetStats: Record<string, SheetImportStats>;
  schemaVersion: string;
  hasForeignKeysResolved: boolean;
}

/**
 * Format date string YYYY-MM-DD from various Excel inputs (serial numbers, strings, Date objects)
 */
export function normalizeExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel serial number (days since Dec 30 1899)
    try {
      const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // ignore
    }
  }
  const str = String(val).trim();
  // Match standard YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Match MM/DD/YYYY or DD/MM/YYYY
  const parts = str.split(/[-/.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Validates whether a date string is a valid calendar date in YYYY-MM-DD format
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const testDate = new Date(y, m - 1, d);
  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

/**
 * Normalize boolean from Excel cell
 */
export function normalizeExcelBool(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'done' || s === 'completed';
  }
  return false;
}

/**
 * Generate a valid UUID if none provided
 */
export function makeUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculate column width based on content and header
 */
function calculateColWidths(headers: string[], rows: Array<Record<string, any>>): Array<{ wch: number }> {
  return headers.map((header) => {
    let maxLen = header.length;
    for (let i = 0; i < Math.min(rows.length, 100); i++) {
      const val = rows[i][header];
      if (val !== undefined && val !== null) {
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (str.length > maxLen) {
          maxLen = Math.min(str.length, 60);
        }
      }
    }
    return { wch: Math.max(maxLen + 3, 12) };
  });
}

/**
 * Build a structured worksheet following strict database table rules:
 * - Row 1 is exclusively column headers (no decorative or merged rows)
 * - Row 2+ are data records
 * - Auto-filters and freeze panes enabled
 */
function createTableSheet(headers: string[], rows: Array<Record<string, any>>): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {})], {
    header: headers,
  });

  // If empty sample row was created just for headers, remove row 2 data
  if (rows.length === 0) {
    // Keep header in row 1, clear range to row 1
    ws['!ref'] = `A1:${XLSX.utils.encode_col(headers.length - 1)}1`;
  }

  // Set column widths
  ws['!cols'] = calculateColWidths(headers, rows);

  // Enable AutoFilter on header row
  const rowCount = Math.max(rows.length, 1);
  const endCol = XLSX.utils.encode_col(headers.length - 1);
  ws['!autofilter'] = { ref: `A1:${endCol}${rowCount}` };

  // Freeze the first row so column headers stay pinned while scrolling
  ws['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  return ws;
}

export interface BuildExcelOptions {
  selectedTables?: SupportedTableName[];
}

export const POSTGRESQL_SCHEMA_DICTIONARY = [
  // 1. affirmations
  { table_name: 'affirmations', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Stores motivational quotes and images' },
  { table_name: 'affirmations', column: 'quote', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Motivational quote text' },
  { table_name: 'affirmations', column: 'author', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Quote author attribution' },
  { table_name: 'affirmations', column: 'image_url', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Image asset URL' },
  { table_name: 'affirmations', column: 'active', data_type: 'BOOLEAN', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Active dashboard banner flag' },
  { table_name: 'affirmations', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'affirmations', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modification timestamp' },

  // 2. daily_journal
  { table_name: 'daily_journal', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique journal entry identifier' },
  { table_name: 'daily_journal', column: 'date', data_type: 'DATE', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Date of daily journal entry (YYYY-MM-DD)' },
  { table_name: 'daily_journal', column: 'content', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Micro-journaling reflections and notes' },
  { table_name: 'daily_journal', column: 'mood', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Daily mood tag' },
  { table_name: 'daily_journal', column: 'energy_level', data_type: 'INTEGER', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Energy level rating (1 to 5)' },
  { table_name: 'daily_journal', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'daily_journal', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 3. goals
  { table_name: 'goals', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique goal identifier' },
  { table_name: 'goals', column: 'title', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Personal goal title' },
  { table_name: 'goals', column: 'description', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Detailed objective description' },
  { table_name: 'goals', column: 'category', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Category grouping (health, career, learning, etc.)' },
  { table_name: 'goals', column: 'target_date', data_type: 'DATE', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Target milestone deadline (YYYY-MM-DD)' },
  { table_name: 'goals', column: 'progress', data_type: 'NUMERIC', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Current progress completion percentage (0-100)' },
  { table_name: 'goals', column: 'status', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Goal status (active, completed, paused)' },
  { table_name: 'goals', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'goals', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 4. habit_categories
  { table_name: 'habit_categories', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique category identifier' },
  { table_name: 'habit_categories', column: 'name', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Category name (Health, Career, Learning)' },
  { table_name: 'habit_categories', column: 'icon', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Emoji icon representation' },
  { table_name: 'habit_categories', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp (4 columns strictly)' },

  // 5. habit_entries
  { table_name: 'habit_entries', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique check-in entry identifier' },
  { table_name: 'habit_entries', column: 'habit_id', data_type: 'UUID', nullable: 'NO', primary_key: 'NO', foreign_key: 'habits.id', description: 'Foreign key referencing parent habits.id' },
  { table_name: 'habit_entries', column: 'date', data_type: 'DATE', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Date of habit completion (YYYY-MM-DD)' },
  { table_name: 'habit_entries', column: 'completed', data_type: 'BOOLEAN', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Completion status (TRUE / FALSE)' },
  { table_name: 'habit_entries', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'habit_entries', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 6. habits
  { table_name: 'habits', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique habit identifier' },
  { table_name: 'habits', column: 'name', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Habit routine name' },
  { table_name: 'habits', column: 'category', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Category key' },
  { table_name: 'habits', column: 'frequency', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Recurrence (daily, specific_days, weekly_target, monthly_target)' },
  { table_name: 'habits', column: 'priority', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Priority level (high, normal, low)' },
  { table_name: 'habits', column: 'goal_id', data_type: 'UUID', nullable: 'YES', primary_key: 'NO', foreign_key: 'goals.id', description: 'Foreign key linking to parent goal' },
  { table_name: 'habits', column: 'target_count', data_type: 'INTEGER', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Weekly/monthly target completion count' },
  { table_name: 'habits', column: 'schedule_days', data_type: 'ARRAY', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Array of scheduled days (e.g. Mon, Wed, Fri)' },
  { table_name: 'habits', column: 'status', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Status (active, paused, archived)' },
  { table_name: 'habits', column: 'archived_at', data_type: 'TIMESTAMPTZ', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Timestamp when habit was archived' },
  { table_name: 'habits', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'habits', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 7. mood_tracker
  { table_name: 'mood_tracker', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique mood entry identifier' },
  { table_name: 'mood_tracker', column: 'date', data_type: 'DATE', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Date of mood log (YYYY-MM-DD)' },
  { table_name: 'mood_tracker', column: 'mood', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Mood descriptor (awesome, good, neutral, low, difficult)' },
  { table_name: 'mood_tracker', column: 'mood_score', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Quantitative score 1-5' },
  { table_name: 'mood_tracker', column: 'energy_level', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Energy level rating 1-5' },
  { table_name: 'mood_tracker', column: 'note', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Contextual emotional notes' },
  { table_name: 'mood_tracker', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'mood_tracker', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 8. reflections
  { table_name: 'reflections', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique reflection identifier' },
  { table_name: 'reflections', column: 'month', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Calendar month number (1-12)' },
  { table_name: 'reflections', column: 'year', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Calendar year (e.g. 2026)' },
  { table_name: 'reflections', column: 'content', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Monthly retrospective synthesis' },
  { table_name: 'reflections', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'reflections', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 9. settings
  { table_name: 'settings', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique setting identifier' },
  { table_name: 'settings', column: 'setting_key', data_type: 'TEXT', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Application preference key name' },
  { table_name: 'settings', column: 'setting_value', data_type: 'JSONB', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Configuration value (JSONB)' },
  { table_name: 'settings', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 10. weekly_plans
  { table_name: 'weekly_plans', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique weekly plan identifier' },
  { table_name: 'weekly_plans', column: 'year', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Calendar year' },
  { table_name: 'weekly_plans', column: 'month', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Month number (1-12)' },
  { table_name: 'weekly_plans', column: 'week_number', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Week index (1-5)' },
  { table_name: 'weekly_plans', column: 'main_goal', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Primary weekly sprint goal' },
  { table_name: 'weekly_plans', column: 'priority_1', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'First key priority' },
  { table_name: 'weekly_plans', column: 'priority_2', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Second key priority' },
  { table_name: 'weekly_plans', column: 'priority_3', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Third key priority' },
  { table_name: 'weekly_plans', column: 'target_percentage', data_type: 'NUMERIC', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Target completion percentage' },
  { table_name: 'weekly_plans', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'weekly_plans', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },

  // 11. weekly_reviews
  { table_name: 'weekly_reviews', column: 'id', data_type: 'UUID', nullable: 'NO', primary_key: 'YES', foreign_key: 'none', description: 'Unique review identifier' },
  { table_name: 'weekly_reviews', column: 'year', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Calendar year' },
  { table_name: 'weekly_reviews', column: 'month', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Month number (1-12)' },
  { table_name: 'weekly_reviews', column: 'week_number', data_type: 'INTEGER', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Week index (1-5)' },
  { table_name: 'weekly_reviews', column: 'went_well', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Wins and accomplishments' },
  { table_name: 'weekly_reviews', column: 'improve', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Areas needing adjustment' },
  { table_name: 'weekly_reviews', column: 'could_improve', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Additional growth opportunities' },
  { table_name: 'weekly_reviews', column: 'next_focus', data_type: 'TEXT', nullable: 'YES', primary_key: 'NO', foreign_key: 'none', description: 'Priority focus for upcoming week' },
  { table_name: 'weekly_reviews', column: 'created_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Creation timestamp' },
  { table_name: 'weekly_reviews', column: 'updated_at', data_type: 'TIMESTAMPTZ', nullable: 'NO', primary_key: 'NO', foreign_key: 'none', description: 'Last modified timestamp' },
];

/**
 * Generate a complete Relational Excel Workbook from application data
 * strictly organized by the PostgreSQL database structure:
 * 1. README: System & backup overview, relationships, record counts
 * 2. DATABASE_SCHEMA: Full column-level dictionary (data types, nullability, constraints)
 * 3-13. 11 Individual relational table sheets
 */
export function buildExcelWorkbook(data: FullExportData, options?: BuildExcelOptions): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const selected = options?.selectedTables;
  const isIncluded = (tbl: SupportedTableName) => {
    if (!selected) return true;
    if (selected.includes(tbl)) return true;
    if (tbl === 'habit_categories' && selected.includes('categories' as any)) return true;
    if (tbl === 'categories' && selected.includes('habit_categories')) return true;
    if (tbl === 'reflections' && selected.includes('monthly_reflections' as any)) return true;
    if (tbl === 'monthly_reflections' && selected.includes('reflections')) return true;
    return false;
  };

  const exportedAt = data.exported_at || new Date().toISOString();
  const schemaVersion = 'v3.0-postgresql';

  // 1. README Worksheet (Database Schema Guide & Metadata)
  const readmeHeaders = [
    'table_no',
    'table_name',
    'display_name',
    'primary_key',
    'foreign_keys',
    'column_count',
    'record_count',
    'description',
    'supported_formats',
  ];

  const canonicalTables: SupportedTableName[] = [
    'affirmations',
    'daily_journal',
    'goals',
    'habit_categories',
    'habit_entries',
    'habits',
    'mood_tracker',
    'reflections',
    'settings',
    'weekly_plans',
    'weekly_reviews',
  ];

  const readmeRows: Array<{
    table_no: string | number;
    table_name: string;
    display_name: string;
    primary_key: string;
    foreign_keys: string;
    column_count: number;
    record_count: number;
    description: string;
    supported_formats: string;
  }> = canonicalTables
    .filter((tbl) => isIncluded(tbl))
    .map((tbl, idx) => {
      const meta = RELATIONAL_TABLES[tbl];
      let count = 0;
      if (tbl === 'affirmations') count = data.affirmations?.length || 0;
      else if (tbl === 'daily_journal') count = data.daily_journal?.length || 0;
      else if (tbl === 'goals') count = data.goals?.length || 0;
      else if (tbl === 'habit_categories') count = (data.habit_categories || data.categories)?.length || 0;
      else if (tbl === 'habit_entries') count = data.habit_entries?.length || 0;
      else if (tbl === 'habits') count = data.habits?.length || 0;
      else if (tbl === 'mood_tracker') count = data.mood_tracker?.length || 0;
      else if (tbl === 'reflections') count = data.reflections?.length || 0;
      else if (tbl === 'settings') count = data.settings ? Object.keys(data.settings).length : 0;
      else if (tbl === 'weekly_plans') count = data.weekly_plans?.length || 0;
      else if (tbl === 'weekly_reviews') count = data.weekly_reviews?.length || 0;

      return {
        table_no: idx + 1,
        table_name: meta.name,
        display_name: meta.displayName,
        primary_key: meta.primaryKey,
        foreign_keys: meta.foreignKeys,
        column_count: meta.fields.length,
        record_count: count,
        description: meta.description,
        supported_formats: 'Excel .xlsx, CSV, Google Sheets, JSON',
      };
    });

  // Append schema metadata row to README
  readmeRows.unshift({
    table_no: 0,
    table_name: '__metadata__',
    display_name: 'Database Metadata',
    primary_key: 'schema_version',
    foreign_keys: 'none',
    column_count: 7,
    record_count: 1,
    description: `Vignesh Habit Tracker PostgreSQL Backup. Exported at: ${exportedAt}. Version: ${schemaVersion}.`,
    supported_formats: 'ISO-8601, UTF-8, JSONB, UUID-v4',
  });

  const wsReadme = createTableSheet(readmeHeaders, readmeRows);
  XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

  // 2. DATABASE_SCHEMA Worksheet (Full Column-by-Column PostgreSQL Dictionary)
  const schemaHeaders = ['table_name', 'column', 'data_type', 'nullable', 'primary_key', 'foreign_key', 'description'];
  const wsSchema = createTableSheet(schemaHeaders, POSTGRESQL_SCHEMA_DICTIONARY);
  XLSX.utils.book_append_sheet(wb, wsSchema, 'DATABASE_SCHEMA');

  // 3. affirmations Worksheet
  if (isIncluded('affirmations')) {
    const headers = RELATIONAL_TABLES.affirmations.fields;
    const affirmationsList = data.affirmations || [];
    const rows = affirmationsList.map((a) => ({
      id: a.id || makeUuid(),
      quote: a.quote || '',
      author: a.author || '',
      image_url: a.image_url || '',
      active: a.active !== false,
      created_at: a.created_at || exportedAt,
      updated_at: a.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'affirmations');
  }

  // 4. daily_journal Worksheet
  if (isIncluded('daily_journal')) {
    const headers = RELATIONAL_TABLES.daily_journal.fields;
    const rows = (data.daily_journal || []).map((j) => ({
      id: j.id || makeUuid(),
      date: normalizeExcelDate(j.date),
      content: j.content || '',
      mood: j.mood || '',
      energy_level: j.energy_level ?? '',
      created_at: j.created_at || exportedAt,
      updated_at: j.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'daily_journal');
  }

  // 5. goals Worksheet
  if (isIncluded('goals')) {
    const headers = RELATIONAL_TABLES.goals.fields;
    const rows = (data.goals || []).map((g) => ({
      id: g.id || makeUuid(),
      title: g.title || '',
      description: g.description || '',
      category: g.category || 'general',
      target_date: normalizeExcelDate(g.target_date),
      progress: g.progress ?? 0,
      status: g.status || 'active',
      created_at: g.created_at || exportedAt,
      updated_at: g.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'goals');
  }

  // 6. habit_categories Worksheet (4 columns strictly as specified in PostgreSQL schema)
  if (isIncluded('habit_categories') || isIncluded('categories')) {
    const headers = RELATIONAL_TABLES.habit_categories.fields;
    const catList = data.habit_categories || data.categories || [];
    const rows = catList.map((c) => ({
      id: c.id || makeUuid(),
      name: c.name || '',
      icon: c.icon || '✨',
      created_at: c.created_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'habit_categories');
  }

  // 7. habit_entries Worksheet
  if (isIncluded('habit_entries')) {
    const headers = RELATIONAL_TABLES.habit_entries.fields;
    const rows = (data.habit_entries || []).map((e) => ({
      id: e.id || makeUuid(),
      habit_id: e.habit_id || '',
      date: normalizeExcelDate(e.date),
      completed: e.completed ? true : false,
      created_at: e.created_at || exportedAt,
      updated_at: e.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'habit_entries');
  }

  // 8. habits Worksheet
  if (isIncluded('habits')) {
    const headers = RELATIONAL_TABLES.habits.fields;
    const rows = (data.habits || []).map((h) => ({
      id: h.id || makeUuid(),
      name: h.name || '',
      category: h.category || 'general',
      frequency: h.frequency || 'daily',
      priority: h.priority || 'normal',
      goal_id: h.goal_id || '',
      target_count: h.target_count ?? (h.target_days ?? ''),
      schedule_days: Array.isArray(h.schedule_days) ? h.schedule_days.join(', ') : (h.schedule_days || ''),
      status: h.status || 'active',
      archived_at: h.archived_at || '',
      created_at: h.created_at || exportedAt,
      updated_at: h.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'habits');
  }

  // 9. mood_tracker Worksheet (8 columns strictly)
  if (isIncluded('mood_tracker')) {
    const headers = RELATIONAL_TABLES.mood_tracker.fields;
    const rows = (data.mood_tracker || []).map((m) => ({
      id: m.id || makeUuid(),
      date: normalizeExcelDate(m.date),
      mood: m.mood || 'good',
      mood_score: m.mood_score ?? (MOOD_TRACKER_MAP[m.mood as MoodTrackerValue]?.score ?? 4),
      energy_level: m.energy_level ?? 3,
      note: m.note || '',
      created_at: m.created_at || exportedAt,
      updated_at: m.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'mood_tracker');
  }

  // 10. reflections Worksheet
  if (isIncluded('reflections') || isIncluded('monthly_reflections')) {
    const headers = RELATIONAL_TABLES.reflections.fields;
    const rows = (data.reflections || []).map((rf) => ({
      id: rf.id || makeUuid(),
      month: rf.month || 1,
      year: rf.year || 2026,
      content: rf.content || '',
      created_at: rf.created_at || exportedAt,
      updated_at: rf.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'monthly_reflections');
  }

  // 11. settings Worksheet (4 columns strictly: id, setting_key, setting_value, updated_at)
  if (isIncluded('settings')) {
    const headers = RELATIONAL_TABLES.settings.fields;
    const settingsObj = data.settings || {};
    const settingsList = Array.isArray(settingsObj)
      ? settingsObj
      : Object.entries(settingsObj).map(([k, v]) => ({
          id: makeUuid(),
          setting_key: k,
          setting_value: typeof v === 'object' ? JSON.stringify(v) : String(v),
          updated_at: exportedAt,
        }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, settingsList), 'settings');
  }

  // 12. weekly_plans Worksheet (11 columns strictly)
  if (isIncluded('weekly_plans')) {
    const headers = RELATIONAL_TABLES.weekly_plans.fields;
    const rows = (data.weekly_plans || []).map((p) => ({
      id: p.id || makeUuid(),
      year: p.year || 2026,
      month: p.month || 1,
      week_number: p.week_number || 1,
      main_goal: p.main_goal || '',
      priority_1: p.priority_1 || '',
      priority_2: p.priority_2 || '',
      priority_3: p.priority_3 || '',
      target_percentage: p.target_percentage ?? 80,
      created_at: p.created_at || exportedAt,
      updated_at: p.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'weekly_plans');
  }

  // 13. weekly_reviews Worksheet (10 columns strictly)
  if (isIncluded('weekly_reviews')) {
    const headers = RELATIONAL_TABLES.weekly_reviews.fields;
    const rows = (data.weekly_reviews || []).map((r) => ({
      id: r.id || makeUuid(),
      year: r.year || 2026,
      month: r.month || 1,
      week_number: r.week_number || 1,
      went_well: r.went_well || '',
      improve: r.improve || '',
      could_improve: r.could_improve || '',
      next_focus: r.next_focus || '',
      created_at: r.created_at || exportedAt,
      updated_at: r.updated_at || exportedAt,
    }));
    XLSX.utils.book_append_sheet(wb, createTableSheet(headers, rows), 'weekly_reviews');
  }

  return wb;
}

/**
 * Trigger immediate client-side download of the relational Excel workbook
 */
export function downloadExcelWorkbook(data: FullExportData, filename?: string, options?: BuildExcelOptions): void {
  const wb = buildExcelWorkbook(data, options);
  const nowStr = new Date().toISOString().split('T')[0];
  const finalName = filename || `vignesh_habit_tracker_${nowStr}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Generate a blank/sample Excel template workbook with column headers, guide, and relational foreign keys
 */
export function downloadExcelTemplate(): void {
  const sampleHabitId = '11111111-1111-4111-8111-111111111111';
  const sampleGoalId = '44444444-4444-4444-8444-444444444444';

  const templateData: FullExportData = {
    app: 'Vignesh Habit Tracker',
    version: '3.0',
    exported_at: new Date().toISOString(),
    goals: [
      {
        id: sampleGoalId,
        title: 'Run 10km Marathon',
        category: 'health',
        description: 'Build weekly endurance and pace',
        target_date: '2026-12-31',
        progress: 50,
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ],
    habits: [
      {
        id: sampleHabitId,
        name: 'Morning Exercise',
        category: 'health',
        frequency: 'daily',
        priority: 'high',
        goal_id: sampleGoalId,
        status: 'active',
        created_at: new Date().toISOString(),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Read 20 Pages',
        category: 'learning',
        frequency: 'specific_days',
        schedule_days: ['Mon', 'Wed', 'Fri'],
        priority: 'normal',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ],
    habit_entries: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        habit_id: sampleHabitId,
        date: new Date().toISOString().split('T')[0],
        completed: true,
        created_at: new Date().toISOString(),
      },
    ],
    mood_tracker: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        date: new Date().toISOString().split('T')[0],
        mood: 'good',
        mood_score: 4,
        energy_level: 4,
        note: 'High focus and steady habit consistency.',
        created_at: new Date().toISOString(),
      },
    ],
    daily_journal: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        date: new Date().toISOString().split('T')[0],
        content: 'Small daily steps compound into massive lifelong results.',
        mood: 'good',
        energy_level: 4,
        created_at: new Date().toISOString(),
      },
    ],
    weekly_plans: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        year: 2026,
        month: 10,
        week_number: 1,
        main_goal: 'Maintain consistent habit execution',
        priority_1: 'Morning run 4x/week',
        priority_2: 'Finish book reading',
        priority_3: 'Daily hydration & sleep',
        target_percentage: 85,
        created_at: new Date().toISOString(),
      },
    ],
    weekly_reviews: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        year: 2026,
        month: 10,
        week_number: 1,
        went_well: 'Solid morning consistency',
        improve: 'Sleep schedule timing',
        next_focus: 'Deep focus on high priority habits',
        created_at: new Date().toISOString(),
      },
    ],
    reflections: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        year: 2026,
        month: 10,
        content: 'End of month reflection on personal growth and discipline.',
        created_at: new Date().toISOString(),
      },
    ],
    habit_categories: [
      { id: 'cat-health', name: 'Health', icon: '🏃' },
      { id: 'cat-career', name: 'Career', icon: '💼' },
      { id: 'cat-learning', name: 'Learning', icon: '📚' },
      { id: 'cat-personal', name: 'Personal', icon: '🧘' },
      { id: 'cat-finance', name: 'Finance', icon: '💰' },
      { id: 'cat-general', name: 'General', icon: '✨' },
    ],
    affirmations: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quote: 'Small daily choices compound into massive lifelong transformations.',
        author: 'James Clear',
        image_url: '',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    settings: {
      theme: 'light',
      week_start: 'sunday',
      default_view: 'today',
      auto_lock_minutes: 15,
    },
  };

  const wb = buildExcelWorkbook(templateData);
  XLSX.writeFile(wb, 'vignesh_habit_tracker_relational_template.xlsx');
}

/**
 * Match a worksheet name flexibly against both canonical names and legacy capitalized names
 */
function resolveSheetName(sheetNames: string[], target: SupportedTableName): string | null {
  const targetClean = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const name of sheetNames) {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean === targetClean) return name;
  }

  // Legacy fallback mappings
  const legacyMap: Record<SupportedTableName, string[]> = {
    affirmations: ['affirmation', 'quotes', 'motivation', 'visual_affirmations'],
    daily_journal: ['journal', 'microjournal', 'journalentries', 'notes'],
    goals: ['goal', 'targets', 'vision', 'milestones'],
    habit_categories: ['categories', 'category', 'habitcategories', 'tags'],
    habit_entries: ['entries', 'checkins', 'habitentry', 'logs', 'completion', 'habitentries'],
    habits: ['habit', 'habitslist', 'allhabits'],
    mood_tracker: ['mood', 'moods', 'moodlog', 'moodhistory'],
    reflections: ['monthly_reflections', 'reflections', 'reflection', 'retrospective'],
    settings: ['setting', 'preferences', 'config'],
    weekly_plans: ['plans', 'weeklyplan', 'plan'],
    weekly_reviews: ['reviews', 'weeklyreview', 'review'],
    categories: ['category', 'habitcategories', 'tags'],
    monthly_reflections: ['reflections', 'reflection', 'retrospective'],
  };

  const aliases = legacyMap[target] || [];
  for (const alias of aliases) {
    const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const name of sheetNames) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === aliasClean || clean.includes(aliasClean)) return name;
    }
  }

  return null;
}

/**
 * Parse an Excel worksheet into rows with normalized column names
 */
function getSheetRowsWithHeaders(sheet: XLSX.WorkSheet | undefined): {
  headers: string[];
  rows: Array<{ rowNum: number; data: Record<string, any>; raw: Record<string, any> }>;
} {
  if (!sheet) return { headers: [], rows: [] };
  const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  if (!rawData || rawData.length === 0) return { headers: [], rows: [] };

  const rawHeaderRow = (rawData[0] || []) as any[];
  const headers = rawHeaderRow.map((h) => String(h || '').trim());
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

  const rows: Array<{ rowNum: number; data: Record<string, any>; raw: Record<string, any> }> = [];

  for (let r = 1; r < rawData.length; r++) {
    const rowValues = rawData[r] as any[];
    // Check if row is completely empty
    const hasValues = rowValues.some((v) => v !== '' && v !== null && v !== undefined);
    if (!hasValues) continue;

    const dataObj: Record<string, any> = {};
    const rawObj: Record<string, any> = {};

    headers.forEach((origHeader, idx) => {
      const val = rowValues[idx] !== undefined ? rowValues[idx] : '';
      rawObj[origHeader] = val;
      const normKey = normalizedHeaders[idx];
      if (normKey) {
        dataObj[normKey] = val;
      }
    });

    rows.push({
      rowNum: r + 1, // 1-based Excel row number
      data: dataObj,
      raw: rawObj,
    });
  }

  return { headers, rows };
}

/**
 * Safely parse and validate an Excel workbook arrayBuffer or File with relational integrity checks
 */
export async function parseExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  existingDatabaseData?: Partial<FullExportData>
): Promise<ExcelImportSummary> {
  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  const summary: ExcelImportSummary = {
    habitsCount: 0,
    entriesCount: 0,
    goalsCount: 0,
    moodsCount: 0,
    journalCount: 0,
    reviewsCount: 0,
    plansCount: 0,
    reflectionsCount: 0,
    categoriesCount: 0,
    settingsCount: 0,
    detectedSheets: wb.SheetNames,
    totalRows: 0,
    validRowsCount: 0,
    parsedData: {
      habits: [],
      habit_entries: [],
      goals: [],
      mood_tracker: [],
      daily_journal: [],
      weekly_reviews: [],
      weekly_plans: [],
      reflections: [],
      habit_categories: [],
      settings: {},
    },
    warnings: [],
    errors: [],
    issues: [],
    sheetStats: {},
    schemaVersion: 'v3.0-relational',
    hasForeignKeysResolved: true,
  };

  const addIssue = (issue: ValidationIssue) => {
    summary.issues.push(issue);
    if (issue.type === 'error') {
      summary.errors.push(issue);
    } else {
      summary.warnings.push(`[${issue.sheet}] Row ${issue.rowNumber}: ${issue.message}`);
    }
  };

  // Known existing IDs for foreign-key validation
  const knownHabitIds = new Set<string>();
  (existingDatabaseData?.habits || []).forEach((h) => {
    if (h.id) knownHabitIds.add(h.id);
  });

  const knownGoalIds = new Set<string>();
  (existingDatabaseData?.goals || []).forEach((g) => {
    if (g.id) knownGoalIds.add(g.id);
  });

  // Track primary keys within workbook to catch duplicates
  const seenPrimaryKeys: Record<string, Set<string>> = {
    habits: new Set<string>(),
    habit_entries: new Set<string>(),
    categories: new Set<string>(),
    goals: new Set<string>(),
    mood_tracker: new Set<string>(),
    daily_journal: new Set<string>(),
    weekly_plans: new Set<string>(),
    weekly_reviews: new Set<string>(),
    monthly_reflections: new Set<string>(),
    settings: new Set<string>(),
  };

  // 1. Parse categories
  const categoriesSheetName = resolveSheetName(wb.SheetNames, 'categories');
  if (categoriesSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[categoriesSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const name = String(data.name || data.category || '').trim();
      if (!name) {
        addIssue({
          sheet: categoriesSheetName,
          rowNumber: rowNum,
          column: 'name',
          type: 'error',
          message: 'Category name is required',
        });
        errCount++;
        return;
      }

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.categories.has(id)) {
        addIssue({
          sheet: categoriesSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.categories.add(id);

      summary.parsedData.habit_categories?.push({
        id,
        name,
        icon: String(data.icon || '✨').trim(),
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
      });
      validCount++;
    });

    summary.categoriesCount = validCount;
    summary.sheetStats.categories = {
      tableName: 'categories',
      displayName: 'Categories',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 2. Parse goals
  const goalsSheetName = resolveSheetName(wb.SheetNames, 'goals');
  if (goalsSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[goalsSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const title = String(data.title || data.name || data.goal || '').trim();
      if (!title) {
        addIssue({
          sheet: goalsSheetName,
          rowNumber: rowNum,
          column: 'title',
          type: 'error',
          message: 'Goal title is required',
        });
        errCount++;
        return;
      }

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.goals.has(id)) {
        addIssue({
          sheet: goalsSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.goals.add(id);
      knownGoalIds.add(id);

      const rawTargetDate = data.target_date || data.targetdate || data.date;
      const targetDate = normalizeExcelDate(rawTargetDate);
      if (rawTargetDate && targetDate && !isValidIsoDate(targetDate)) {
        addIssue({
          sheet: goalsSheetName,
          rowNumber: rowNum,
          column: 'target_date',
          type: 'warning',
          message: `Invalid target date '${rawTargetDate}'. Expected YYYY-MM-DD.`,
          recordId: id,
        });
      }

      let progress = 0;
      if (data.progress !== undefined && data.progress !== '') {
        const num = Number(data.progress);
        if (!isNaN(num)) {
          progress = num <= 1 && num > 0 ? Math.round(num * 100) : Math.min(Math.max(num, 0), 100);
        }
      }

      const statusStr = String(data.status || 'active').toLowerCase();
      const status = ['active', 'completed', 'paused'].includes(statusStr) ? (statusStr as any) : 'active';

      summary.parsedData.goals.push({
        id,
        title,
        description: data.description ? String(data.description) : undefined,
        category: String(data.category || 'general').toLowerCase(),
        target_date: targetDate || undefined,
        progress,
        status,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.goalsCount = validCount;
    summary.sheetStats.goals = {
      tableName: 'goals',
      displayName: 'Goals',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 3. Parse habits
  const habitsSheetName = resolveSheetName(wb.SheetNames, 'habits');
  if (habitsSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[habitsSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const name = String(data.name || data.habit_name || data.habitname || data.title || '').trim();
      if (!name) {
        addIssue({
          sheet: habitsSheetName,
          rowNumber: rowNum,
          column: 'name',
          type: 'error',
          message: 'Habit name is required',
        });
        errCount++;
        return;
      }

      const id = String(data.id || data.habit_id || data.habitid || '').trim() || makeUuid();
      if (seenPrimaryKeys.habits.has(id)) {
        addIssue({
          sheet: habitsSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.habits.add(id);
      knownHabitIds.add(id);

      // Foreign key validation: goal_id
      const goalId = String(data.goal_id || data.goalid || '').trim();
      if (goalId && !knownGoalIds.has(goalId)) {
        addIssue({
          sheet: habitsSheetName,
          rowNumber: rowNum,
          column: 'goal_id',
          type: 'warning',
          message: `Foreign key 'goal_id' (${goalId}) not found in Goals table or database. Will import with unlinked goal.`,
          recordId: id,
        });
      }

      // Schedule days
      let scheduleDays: string[] = [];
      const schedVal = data.schedule_days || data.scheduledays || data.days || data.schedule;
      if (typeof schedVal === 'string' && schedVal.trim()) {
        try {
          if (schedVal.startsWith('[') && schedVal.endsWith(']')) {
            scheduleDays = JSON.parse(schedVal);
          } else {
            scheduleDays = schedVal.split(/[,;|]/).map((d: string) => d.trim()).filter(Boolean);
          }
        } catch {
          scheduleDays = schedVal.split(/[,;|]/).map((d: string) => d.trim()).filter(Boolean);
        }
      } else if (Array.isArray(schedVal)) {
        scheduleDays = schedVal;
      }

      // Target count
      let targetCount: number | undefined = undefined;
      const tVal = data.target_count || data.targetcount || data.target_days || data.targetdays;
      if (tVal !== '' && tVal !== undefined && !isNaN(Number(tVal))) {
        targetCount = Number(tVal);
      }

      // Priority
      const prioStr = String(data.priority || 'normal').toLowerCase();
      const priority = ['high', 'normal', 'medium', 'low'].includes(prioStr) ? (prioStr as Habit['priority']) : 'normal';

      // Frequency
      const freqStr = String(data.frequency || 'daily').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const frequency = ['daily', 'specific_days', 'weekly_target', 'monthly_target'].includes(freqStr)
        ? (freqStr as Habit['frequency'])
        : 'daily';

      // Status
      const statStr = String(data.status || 'active').toLowerCase();
      const status = ['active', 'paused', 'archived'].includes(statStr) ? (statStr as Habit['status']) : 'active';

      summary.parsedData.habits.push({
        id,
        name,
        category: String(data.category || 'general').toLowerCase(),
        frequency,
        priority,
        goal_id: goalId || null,
        target_count: targetCount,
        schedule_days: scheduleDays,
        status,
        archived_at: data.archived_at || data.archivedat ? String(data.archived_at || data.archivedat) : null,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.habitsCount = validCount;
    summary.sheetStats.habits = {
      tableName: 'habits',
      displayName: 'Habits',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 4. Parse habit_entries
  const entriesSheetName = resolveSheetName(wb.SheetNames, 'habit_entries');
  if (entriesSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[entriesSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const rawDate = data.date || data.entry_date || data.entrydate || data.day;
      const dateStr = normalizeExcelDate(rawDate);
      if (!dateStr || !isValidIsoDate(dateStr)) {
        addIssue({
          sheet: entriesSheetName,
          rowNumber: rowNum,
          column: 'date',
          type: 'error',
          message: `Invalid or missing check-in date '${rawDate || ''}'. Expected YYYY-MM-DD.`,
        });
        errCount++;
        return;
      }

      const habitId = String(data.habit_id || data.habitid || '').trim();
      if (!habitId) {
        addIssue({
          sheet: entriesSheetName,
          rowNumber: rowNum,
          column: 'habit_id',
          type: 'error',
          message: `Missing required foreign key 'habit_id'`,
        });
        errCount++;
        return;
      }

      // Foreign key integrity check: habit_id must exist in habits sheet or existing database
      if (!knownHabitIds.has(habitId)) {
        addIssue({
          sheet: entriesSheetName,
          rowNumber: rowNum,
          column: 'habit_id',
          type: 'error',
          message: `Foreign key 'habit_id' (${habitId}) does not exist in 'habits' table or database`,
        });
        summary.hasForeignKeysResolved = false;
        errCount++;
        return;
      }

      const id = String(data.id || data.entry_id || data.entryid || '').trim() || makeUuid();
      if (seenPrimaryKeys.habit_entries.has(id)) {
        addIssue({
          sheet: entriesSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.habit_entries.add(id);

      const completed = normalizeExcelBool(data.completed !== undefined ? data.completed : data.status);

      summary.parsedData.habit_entries.push({
        id,
        habit_id: habitId,
        date: dateStr,
        completed,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.entriesCount = validCount;
    summary.sheetStats.habit_entries = {
      tableName: 'habit_entries',
      displayName: 'Habit Entries',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 5. Parse mood_tracker
  const moodSheetName = resolveSheetName(wb.SheetNames, 'mood_tracker');
  if (moodSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[moodSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const rawDate = data.date || data.day || data.entry_date || data.entrydate;
      const dateStr = normalizeExcelDate(rawDate);
      if (!dateStr || !isValidIsoDate(dateStr)) {
        addIssue({
          sheet: moodSheetName,
          rowNumber: rowNum,
          column: 'date',
          type: 'error',
          message: `Invalid or missing date '${rawDate || ''}'. Expected YYYY-MM-DD.`,
        });
        errCount++;
        return;
      }

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.mood_tracker.has(id)) {
        addIssue({
          sheet: moodSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.mood_tracker.add(id);

      let moodStr = String(data.mood || data.mood_tier || data.moodtier || 'good').toLowerCase().trim();
      if (moodStr === 'very low') moodStr = 'very_low';
      const validMoods = ['very_low', 'low', 'okay', 'good', 'great', 'excellent'];
      const mood = (validMoods.includes(moodStr) ? moodStr : 'good') as MoodTrackerValue;

      let score = Number(data.mood_score || data.moodscore || data.score);
      if (isNaN(score) || score < 1 || score > 6) {
        score = MOOD_TRACKER_MAP[mood]?.score ?? 4;
      }

      let energy = Number(data.energy_level || data.energylevel || data.energy || 3);
      if (isNaN(energy) || energy < 1 || energy > 5) energy = 3;

      summary.parsedData.mood_tracker.push({
        id,
        date: dateStr,
        mood,
        mood_score: score,
        energy_level: energy,
        note: data.note || data.notes ? String(data.note || data.notes) : '',
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.moodsCount = validCount;
    summary.sheetStats.mood_tracker = {
      tableName: 'mood_tracker',
      displayName: 'Mood Tracker',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 6. Parse daily_journal
  const journalSheetName = resolveSheetName(wb.SheetNames, 'daily_journal');
  if (journalSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[journalSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const rawDate = data.date || data.day;
      const dateStr = normalizeExcelDate(rawDate);
      if (!dateStr || !isValidIsoDate(dateStr)) {
        addIssue({
          sheet: journalSheetName,
          rowNumber: rowNum,
          column: 'date',
          type: 'error',
          message: `Invalid or missing journal date '${rawDate || ''}'. Expected YYYY-MM-DD.`,
        });
        errCount++;
        return;
      }

      const content = String(data.content || data.notes || data.note || data.text || '').trim();
      if (!content) {
        addIssue({
          sheet: journalSheetName,
          rowNumber: rowNum,
          column: 'content',
          type: 'error',
          message: 'Daily journal content is empty',
        });
        errCount++;
        return;
      }

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.daily_journal.has(id)) {
        addIssue({
          sheet: journalSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.daily_journal.add(id);

      summary.parsedData.daily_journal.push({
        id,
        date: dateStr,
        content,
        mood: data.mood ? (String(data.mood).toLowerCase() as any) : undefined,
        energy_level: data.energy_level || data.energylevel ? Number(data.energy_level || data.energylevel) : undefined,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.journalCount = validCount;
    summary.sheetStats.daily_journal = {
      tableName: 'daily_journal',
      displayName: 'Daily Journal',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 7. Parse weekly_plans
  const plansSheetName = resolveSheetName(wb.SheetNames, 'weekly_plans');
  if (plansSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[plansSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const year = Number(data.year || new Date().getFullYear());
      const month = Number(data.month || new Date().getMonth() + 1);
      const week_number = Number(data.week_number || data.weeknumber || data.week || 1);
      const main_goal = String(data.main_goal || data.maingoal || data.goal || '').trim();
      const priority_1 = String(data.priority_1 || data.priority1 || '').trim();
      const priority_2 = String(data.priority_2 || data.priority2 || '').trim();
      const priority_3 = String(data.priority_3 || data.priority3 || '').trim();

      if (!main_goal && !priority_1) {
        addIssue({
          sheet: plansSheetName,
          rowNumber: rowNum,
          column: 'main_goal',
          type: 'warning',
          message: 'Weekly plan has no main goal or priorities specified',
        });
      }

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.weekly_plans.has(id)) {
        addIssue({
          sheet: plansSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.weekly_plans.add(id);

      let target_percentage = Number(data.target_percentage || data.targetpercentage || data.target || 80);
      if (isNaN(target_percentage)) target_percentage = 80;

      summary.parsedData.weekly_plans.push({
        id,
        year,
        month,
        week_number,
        main_goal,
        priority_1,
        priority_2,
        priority_3,
        target_percentage,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.plansCount = validCount;
    summary.sheetStats.weekly_plans = {
      tableName: 'weekly_plans',
      displayName: 'Weekly Plans',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 8. Parse weekly_reviews
  const reviewsSheetName = resolveSheetName(wb.SheetNames, 'weekly_reviews');
  if (reviewsSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[reviewsSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const year = Number(data.year || new Date().getFullYear());
      const month = Number(data.month || new Date().getMonth() + 1);
      const week_number = Number(data.week_number || data.weeknumber || data.week || 1);
      const went_well = String(data.went_well || data.wentwell || '').trim();
      const improve = String(data.improve || data.could_improve || data.couldimprove || '').trim();
      const next_focus = String(data.next_focus || data.nextfocus || '').trim();

      if (!went_well && !improve && !next_focus) return;

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.weekly_reviews.has(id)) {
        addIssue({
          sheet: reviewsSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.weekly_reviews.add(id);

      summary.parsedData.weekly_reviews.push({
        id,
        year,
        month,
        week_number,
        went_well,
        improve,
        could_improve: improve,
        next_focus,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.reviewsCount = validCount;
    summary.sheetStats.weekly_reviews = {
      tableName: 'weekly_reviews',
      displayName: 'Weekly Reviews',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 9. Parse monthly_reflections
  const reflSheetName = resolveSheetName(wb.SheetNames, 'monthly_reflections');
  if (reflSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[reflSheetName]);
    let validCount = 0;
    let errCount = 0;

    rows.forEach(({ rowNum, data }) => {
      const content = String(data.content || data.reflection || '').trim();
      if (!content) return;

      const year = Number(data.year || new Date().getFullYear());
      const month = Number(data.month || new Date().getMonth() + 1);

      const id = String(data.id || '').trim() || makeUuid();
      if (seenPrimaryKeys.monthly_reflections.has(id)) {
        addIssue({
          sheet: reflSheetName,
          rowNumber: rowNum,
          column: 'id',
          type: 'error',
          message: `Duplicate primary key 'id' (${id})`,
          recordId: id,
        });
        errCount++;
        return;
      }
      seenPrimaryKeys.monthly_reflections.add(id);

      summary.parsedData.reflections.push({
        id,
        year,
        month,
        content,
        created_at: data.created_at || data.createdat ? String(data.created_at || data.createdat) : new Date().toISOString(),
        updated_at: data.updated_at || data.updatedat ? String(data.updated_at || data.updatedat) : undefined,
      });
      validCount++;
    });

    summary.reflectionsCount = validCount;
    summary.sheetStats.monthly_reflections = {
      tableName: 'monthly_reflections',
      displayName: 'Monthly Reflections',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: errCount,
      warnings: 0,
    };
  }

  // 10. Parse settings
  const settingsSheetName = resolveSheetName(wb.SheetNames, 'settings');
  if (settingsSheetName) {
    const { rows } = getSheetRowsWithHeaders(wb.Sheets[settingsSheetName]);
    let validCount = 0;

    const parsedSettings: Record<string, any> = {};
    rows.forEach(({ rowNum, data }) => {
      const key = String(data.setting_key || data.key || data.name || '').trim();
      if (!key) return;

      const rawVal = data.setting_value !== undefined ? data.setting_value : data.value;
      let parsedVal: any = rawVal;
      if (typeof rawVal === 'string') {
        try {
          if ((rawVal.startsWith('{') && rawVal.endsWith('}')) || (rawVal.startsWith('[') && rawVal.endsWith(']'))) {
            parsedVal = JSON.parse(rawVal);
          } else if (rawVal === 'true') parsedVal = true;
          else if (rawVal === 'false') parsedVal = false;
          else if (!isNaN(Number(rawVal)) && rawVal.trim() !== '') parsedVal = Number(rawVal);
        } catch {
          parsedVal = rawVal;
        }
      }

      parsedSettings[key] = parsedVal;
      validCount++;
    });

    summary.parsedData.settings = parsedSettings;
    summary.settingsCount = validCount;
    summary.sheetStats.settings = {
      tableName: 'settings',
      displayName: 'Settings',
      totalRows: rows.length,
      validRows: validCount,
      newRows: validCount,
      updatedRows: 0,
      errors: 0,
      warnings: 0,
    };
  }

  // Calculate totals
  summary.totalRows = Object.values(summary.sheetStats).reduce((acc, s) => acc + s.totalRows, 0);
  summary.validRowsCount = Object.values(summary.sheetStats).reduce((acc, s) => acc + s.validRows, 0);

  if (summary.totalRows === 0) {
    summary.warnings.push(
      'No recognizable relational tables were found. Make sure your Excel workbook contains valid sheets like "habits", "habit_entries", "goals", or "mood_tracker".'
    );
  }

  return summary;
}
