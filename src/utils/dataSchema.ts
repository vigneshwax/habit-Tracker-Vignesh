/**
 * Central Relational Data Schema for Vignesh Habit Tracker
 * 
 * Single source of truth for both Excel (.xlsx) and Google Sheets
 * import, export, synchronization, and validation.
 * 
 * Schema Version: 3.0.0
 */

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
} from '../types';

export const SCHEMA_VERSION = '3.0.0';
export const APP_IDENTIFIER = 'Vignesh Habit Tracker';

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

export type SupportedTableName =
  | 'affirmations'
  | 'daily_journal'
  | 'goals'
  | 'habit_categories'
  | 'habit_entries'
  | 'habits'
  | 'mood_tracker'
  | 'reflections'
  | 'settings'
  | 'weekly_plans'
  | 'weekly_reviews'
  // Aliases for backward compatibility
  | 'categories'
  | 'monthly_reflections';

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'json';

export interface ColumnDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: { table: SupportedTableName; column: string };
  description: string;
  defaultValue?: any;
}

export interface TableDefinition {
  name: SupportedTableName;
  displayName: string;
  primaryKey: string;
  foreignKeyDescription: string;
  description: string;
  themeColor: string;
  columns: ColumnDefinition[];
  dependencies?: SupportedTableName[];
}

export const CENTRAL_DATA_SCHEMA: Record<SupportedTableName, TableDefinition> = {
  affirmations: {
    name: 'affirmations',
    displayName: 'Affirmations',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores motivational quotes and images',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique affirmation UUID' },
      { name: 'quote', type: 'string', required: true, description: 'Motivational quote text' },
      { name: 'author', type: 'string', required: false, description: 'Author attribution' },
      { name: 'image_url', type: 'string', required: false, description: 'Image asset URL' },
      { name: 'active', type: 'boolean', required: true, defaultValue: true, description: 'Active status flag (TRUE/FALSE)' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  daily_journal: {
    name: 'daily_journal',
    displayName: 'Daily Journal',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores daily journal entries, moods, and energy levels',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique journal entry UUID' },
      { name: 'date', type: 'date', required: true, description: 'Journal date (YYYY-MM-DD)' },
      { name: 'content', type: 'string', required: false, description: 'Journal content text' },
      { name: 'mood', type: 'string', required: false, description: 'Daily mood identifier' },
      { name: 'energy_level', type: 'number', required: false, defaultValue: 3, description: 'Energy level rating (1-5)' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  goals: {
    name: 'goals',
    displayName: 'Goals',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Tracks personal goals and their progress',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique vision goal UUID' },
      { name: 'title', type: 'string', required: true, description: 'Goal title' },
      { name: 'description', type: 'string', required: false, description: 'Goal description and vision' },
      { name: 'category', type: 'string', required: false, defaultValue: 'general', description: 'Goal category' },
      { name: 'target_date', type: 'date', required: false, description: 'Target date (YYYY-MM-DD)' },
      { name: 'progress', type: 'number', required: false, defaultValue: 0, description: 'Progress percentage (0-100)' },
      { name: 'status', type: 'string', required: true, defaultValue: 'active', description: 'Goal lifecycle status' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  habit_categories: {
    name: 'habit_categories',
    displayName: 'Habit Categories',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Organizes habits into categories',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique category identifier (UUID)' },
      { name: 'name', type: 'string', required: true, description: 'Category name' },
      { name: 'icon', type: 'string', required: false, defaultValue: '✨', description: 'Emoji icon' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
    ],
  },
  habit_entries: {
    name: 'habit_entries',
    displayName: 'Habit Entries',
    primaryKey: 'id',
    foreignKeyDescription: 'habit_id -> habits.id',
    description: 'Records whether a habit was completed on a particular date',
    themeColor: '#0F172A',
    dependencies: ['habits'],
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique check-in entry UUID' },
      { name: 'habit_id', type: 'string', required: true, isForeignKey: true, foreignKeyRef: { table: 'habits', column: 'id' }, description: 'Foreign key to habits.id' },
      { name: 'date', type: 'date', required: true, description: 'Check-in date (YYYY-MM-DD)' },
      { name: 'completed', type: 'boolean', required: true, defaultValue: false, description: 'Boolean completion flag (TRUE or FALSE)' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  habits: {
    name: 'habits',
    displayName: 'Habits',
    primaryKey: 'id',
    foreignKeyDescription: 'goal_id -> goals.id',
    description: 'Stores habit details, schedules, priorities, and statuses',
    themeColor: '#0F172A',
    dependencies: ['goals'],
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique habit UUID' },
      { name: 'name', type: 'string', required: true, description: 'Habit title/routine name' },
      { name: 'category', type: 'string', required: false, defaultValue: 'general', description: 'Category identifier' },
      { name: 'frequency', type: 'string', required: true, defaultValue: 'daily', description: 'Schedule cadence (daily, weekly, specific_days)' },
      { name: 'priority', type: 'string', required: false, defaultValue: 'normal', description: 'Priority level (high, normal, low)' },
      { name: 'goal_id', type: 'string', required: false, isForeignKey: true, foreignKeyRef: { table: 'goals', column: 'id' }, description: 'Linked vision goal UUID' },
      { name: 'target_count', type: 'number', required: false, defaultValue: 1, description: 'Target daily or weekly count' },
      { name: 'schedule_days', type: 'array', required: false, defaultValue: [], description: 'JSON array or comma-separated days' },
      { name: 'status', type: 'string', required: true, defaultValue: 'active', description: 'Status (active, paused, archived)' },
      { name: 'archived_at', type: 'date', required: false, description: 'Timestamp when archived' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  mood_tracker: {
    name: 'mood_tracker',
    displayName: 'Mood Tracker',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Tracks daily moods, mood scores, and energy levels',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique mood entry UUID' },
      { name: 'date', type: 'date', required: true, description: 'Date of mood log (YYYY-MM-DD)' },
      { name: 'mood', type: 'string', required: true, description: 'Mood descriptor (ecstatic, energized, calm, neutral, drained, exhausted)' },
      { name: 'mood_score', type: 'number', required: true, defaultValue: 4, description: 'Numerical score (1 to 6)' },
      { name: 'energy_level', type: 'number', required: true, defaultValue: 3, description: 'Energy level (1 to 5)' },
      { name: 'note', type: 'string', required: false, description: 'Reflection notes or triggers' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  reflections: {
    name: 'reflections',
    displayName: 'Reflections',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores monthly reflections',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique reflection UUID' },
      { name: 'month', type: 'number', required: true, description: 'Calendar month (1-12)' },
      { name: 'year', type: 'number', required: true, description: 'Calendar year' },
      { name: 'content', type: 'string', required: false, description: 'Monthly reflection markdown or text' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  settings: {
    name: 'settings',
    displayName: 'Settings',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores application preferences and configuration',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique settings UUID' },
      { name: 'setting_key', type: 'string', required: true, description: 'Unique configuration key' },
      { name: 'setting_value', type: 'json', required: false, description: 'Configured value (JSONB/string)' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last updated timestamp' },
    ],
  },
  weekly_plans: {
    name: 'weekly_plans',
    displayName: 'Weekly Plans',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores weekly goals, priorities, and target completion percentages',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique weekly plan UUID' },
      { name: 'year', type: 'number', required: true, description: 'Calendar year' },
      { name: 'month', type: 'number', required: true, description: 'Calendar month (1-12)' },
      { name: 'week_number', type: 'number', required: true, description: 'Week index of the month (1-5)' },
      { name: 'main_goal', type: 'string', required: false, description: 'Primary weekly sprint goal' },
      { name: 'priority_1', type: 'string', required: false, description: 'Priority task 1' },
      { name: 'priority_2', type: 'string', required: false, description: 'Priority task 2' },
      { name: 'priority_3', type: 'string', required: false, description: 'Priority task 3' },
      { name: 'target_percentage', type: 'number', required: false, defaultValue: 80, description: 'Target completion percentage (0-100)' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  weekly_reviews: {
    name: 'weekly_reviews',
    displayName: 'Weekly Reviews',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Stores weekly reviews and improvement plans',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique weekly review UUID' },
      { name: 'year', type: 'number', required: true, description: 'Calendar year' },
      { name: 'month', type: 'number', required: true, description: 'Calendar month (1-12)' },
      { name: 'week_number', type: 'number', required: true, description: 'Week index of month (1-5)' },
      { name: 'went_well', type: 'string', required: false, description: 'What went well this week' },
      { name: 'improve', type: 'string', required: false, description: 'What needs improvement' },
      { name: 'could_improve', type: 'string', required: false, description: 'Could improve notes' },
      { name: 'next_focus', type: 'string', required: false, description: 'Key focus for next week' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
  // Backward compatibility aliases
  categories: {
    name: 'categories',
    displayName: 'Categories (Legacy Alias)',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Alias for habit_categories',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique category identifier (UUID)' },
      { name: 'name', type: 'string', required: true, description: 'Category name' },
      { name: 'icon', type: 'string', required: false, defaultValue: '✨', description: 'Emoji icon' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
    ],
  },
  monthly_reflections: {
    name: 'monthly_reflections',
    displayName: 'Monthly Reflections (Legacy Alias)',
    primaryKey: 'id',
    foreignKeyDescription: 'none',
    description: 'Alias for reflections',
    themeColor: '#0F172A',
    columns: [
      { name: 'id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique reflection UUID' },
      { name: 'month', type: 'number', required: true, description: 'Calendar month (1-12)' },
      { name: 'year', type: 'number', required: true, description: 'Calendar year' },
      { name: 'content', type: 'string', required: false, description: 'Monthly reflection markdown or text' },
      { name: 'created_at', type: 'date', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'date', required: false, description: 'Last modified timestamp' },
    ],
  },
};

export const ORDERED_TABLE_NAMES: SupportedTableName[] = [
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

export interface ValidationIssue {
  sheet: string;
  rowNumber: number;
  column: string;
  recordId?: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  issues: ValidationIssue[];
  duplicatePkCount: number;
  foreignKeyErrorCount: number;
  missingRequiredCount: number;
}

// Format date consistently to YYYY-MM-DD
export function formatDateIso(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return value;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

// Parse boolean values safely from Excel / Google Sheets
export function parseBooleanValue(val: any, fallback = false): boolean {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const str = String(val).trim().toUpperCase();
  if (str === 'TRUE' || str === '1' || str === 'YES' || str === 'Y') return true;
  if (str === 'FALSE' || str === '0' || str === 'NO' || str === 'N' || str === '') return false;
  return fallback;
}

// Parse array safely (JSON or comma separated)
export function parseArrayValue(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim());
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim());
      } catch {
        // fallback
      }
    }
    return trimmed.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [String(val)];
}

// Serialize record to row matching column definitions
export function serializeRecordToColumns(
  tableName: SupportedTableName,
  record: Record<string, any>
): Record<string, any> {
  const table = CENTRAL_DATA_SCHEMA[tableName];
  if (!table) return record;

  const result: Record<string, any> = {};
  for (const col of table.columns) {
    const rawVal = record[col.name];
    if (rawVal === undefined || rawVal === null) {
      result[col.name] = '';
      continue;
    }

    switch (col.type) {
      case 'boolean':
        result[col.name] = parseBooleanValue(rawVal) ? 'TRUE' : 'FALSE';
        break;
      case 'number':
        result[col.name] = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
        break;
      case 'date':
        result[col.name] = formatDateIso(rawVal);
        break;
      case 'array':
        if (Array.isArray(rawVal)) {
          result[col.name] = rawVal.join(', ');
        } else {
          result[col.name] = String(rawVal);
        }
        break;
      case 'json':
        if (typeof rawVal === 'object') {
          result[col.name] = JSON.stringify(rawVal);
        } else {
          result[col.name] = String(rawVal);
        }
        break;
      default:
        result[col.name] = String(rawVal);
        break;
    }
  }
  return result;
}

// Deserialize row from columns matching table definition
export function deserializeColumnsToRecord(
  tableName: SupportedTableName,
  row: Record<string, any>
): Record<string, any> {
  const table = CENTRAL_DATA_SCHEMA[tableName];
  if (!table) return row;

  // Header normalization lookup: lowercase trimmed
  const normalizedRow: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[k.trim().toLowerCase()] = v;
  }

  const result: Record<string, any> = {};
  for (const col of table.columns) {
    const rawVal = normalizedRow[col.name.toLowerCase()] ?? normalizedRow[col.name];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (col.defaultValue !== undefined) {
        result[col.name] = col.defaultValue;
      } else {
        result[col.name] = col.type === 'number' ? 0 : col.type === 'boolean' ? false : col.type === 'array' ? [] : '';
      }
      continue;
    }

    switch (col.type) {
      case 'boolean':
        result[col.name] = parseBooleanValue(rawVal, col.defaultValue ?? false);
        break;
      case 'number':
        const num = Number(rawVal);
        result[col.name] = isNaN(num) ? col.defaultValue ?? 0 : num;
        break;
      case 'date':
        result[col.name] = formatDateIso(rawVal);
        break;
      case 'array':
        result[col.name] = parseArrayValue(rawVal);
        break;
      case 'json':
        if (typeof rawVal === 'string') {
          try {
            result[col.name] = JSON.parse(rawVal);
          } catch {
            result[col.name] = rawVal;
          }
        } else {
          result[col.name] = rawVal;
        }
        break;
      default:
        result[col.name] = String(rawVal).trim();
        break;
    }
  }
  return result;
}

// Generate canonical README rows explaining database schema
export function generateSchemaReadmeRows(): Array<Record<string, any>> {
  const readmeRows: Array<Record<string, any>> = [
    {
      table_name: '__metadata__',
      display_name: 'Database Metadata',
      primary_key: 'schema_version',
      foreign_keys: 'none',
      columns: 'app, schema_version, export_date, format, platform',
      description: `Official relational database schema for ${APP_IDENTIFIER}. Parity with Google Sheets and Persistent Storage.`,
    },
  ];

  for (const tableName of ORDERED_TABLE_NAMES) {
    const table = CENTRAL_DATA_SCHEMA[tableName];
    readmeRows.push({
      table_name: table.name,
      display_name: table.displayName,
      primary_key: table.primaryKey,
      foreign_keys: table.foreignKeyDescription,
      columns: table.columns.map((c) => c.name).join(', '),
      description: table.description,
    });
  }

  return readmeRows;
}

// Validate parsed tables across primary keys, foreign keys, required fields, and types
export function validateDatabaseTables(tables: Partial<Record<SupportedTableName, any[]>>): ValidationSummary {
  const issues: ValidationIssue[] = [];
  let duplicatePkCount = 0;
  let foreignKeyErrorCount = 0;
  let missingRequiredCount = 0;

  // 1. Build lookup sets for primary keys
  const pkLookups: Partial<Record<SupportedTableName, Set<string>>> = {};
  for (const tableName of ORDERED_TABLE_NAMES) {
    const records = tables[tableName];
    if (!Array.isArray(records)) continue;

    const tableDef = CENTRAL_DATA_SCHEMA[tableName];
    const pkSet = new Set<string>();

    records.forEach((record, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const pkVal = record[tableDef.primaryKey];
      const pkStr = pkVal !== undefined && pkVal !== null ? String(pkVal).trim() : '';

      if (!pkStr) {
        missingRequiredCount++;
        issues.push({
          sheet: tableName,
          rowNumber,
          column: tableDef.primaryKey,
          severity: 'error',
          message: `Missing required primary key '${tableDef.primaryKey}'`,
        });
      } else {
        if (pkSet.has(pkStr)) {
          duplicatePkCount++;
          issues.push({
            sheet: tableName,
            rowNumber,
            column: tableDef.primaryKey,
            recordId: pkStr,
            severity: 'error',
            message: `Duplicate primary key '${pkStr}' in '${tableName}'`,
          });
        } else {
          pkSet.add(pkStr);
        }
      }

      // Check other required fields
      for (const col of tableDef.columns) {
        if (col.required && !col.isPrimaryKey && col.defaultValue === undefined) {
          const val = record[col.name];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            missingRequiredCount++;
            issues.push({
              sheet: tableName,
              rowNumber,
              column: col.name,
              recordId: pkStr,
              severity: 'error',
              message: `Missing required field '${col.name}'`,
            });
          }
        }
      }
    });

    pkLookups[tableName] = pkSet;
  }

  // 2. Validate Foreign Keys
  // a) habit_entries.habit_id -> habits.id
  if (Array.isArray(tables.habit_entries)) {
    const habitIds = pkLookups.habits;
    tables.habit_entries.forEach((entry, idx) => {
      const rowNumber = idx + 2;
      const habitId = entry.habit_id ? String(entry.habit_id).trim() : '';
      if (habitId && habitIds && habitIds.size > 0 && !habitIds.has(habitId)) {
        foreignKeyErrorCount++;
        issues.push({
          sheet: 'habit_entries',
          rowNumber,
          column: 'habit_id',
          recordId: entry.id,
          severity: 'error',
          message: `Foreign key violation: habit_id '${habitId}' does not exist in 'habits' table`,
        });
      }
    });
  }

  // b) habits.goal_id -> goals.id (optional FK)
  if (Array.isArray(tables.habits)) {
    const goalIds = pkLookups.goals;
    tables.habits.forEach((habit, idx) => {
      const rowNumber = idx + 2;
      const goalId = habit.goal_id ? String(habit.goal_id).trim() : '';
      if (goalId && goalIds && goalIds.size > 0 && !goalIds.has(goalId)) {
        foreignKeyErrorCount++;
        issues.push({
          sheet: 'habits',
          rowNumber,
          column: 'goal_id',
          recordId: habit.id,
          severity: 'warning',
          message: `Foreign key warning: goal_id '${goalId}' not found in 'goals' table`,
        });
      }
    });
  }

  const totalErrors = issues.filter((i) => i.severity === 'error').length;
  const totalWarnings = issues.filter((i) => i.severity === 'warning').length;

  return {
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    issues,
    duplicatePkCount,
    foreignKeyErrorCount,
    missingRequiredCount,
  };
}
