export type HabitCategory = 'health' | 'career' | 'learning' | 'personal' | 'finance' | 'general' | string;

export type HabitFrequency = 'daily' | 'specific_days' | 'weekly_target' | 'monthly_target';

export type HabitStatus = 'active' | 'paused' | 'archived';

export type HabitPriority = 'high' | 'normal' | 'medium' | 'low';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  priority?: HabitPriority;
  goal_id?: string | null;
  target_count?: number; // For weekly_target (e.g. 3/week) or monthly_target (e.g. 20/month)
  target_days?: number; // alias
  schedule_days?: string[]; // E.g. ['Sun', 'Mon', 'Wed']
  status: HabitStatus;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: HabitCategory;
  target_date?: string;
  progress?: number;
  status: 'active' | 'completed' | 'paused';
  created_at?: string;
  updated_at?: string;
}

export type MoodType =
  | 'very_low'
  | 'low'
  | 'okay'
  | 'good'
  | 'great'
  | 'excellent'
  | 'bad'
  | 'neutral'
  | 'stressed';

export type MoodTrackerValue =
  | 'very_low'
  | 'low'
  | 'okay'
  | 'good'
  | 'great'
  | 'excellent';

export interface MoodTrackerEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: MoodTrackerValue;
  mood_score: number; // 1 to 6
  energy_level: number; // 1 to 5
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MoodOptionMeta {
  value: MoodTrackerValue;
  label: string;
  emoji: string;
  score: number;
  color: string;
  badgeBg: string;
}

export const MOOD_TRACKER_OPTIONS: MoodOptionMeta[] = [
  { value: 'very_low', label: 'Very Low', emoji: '😞', score: 1, color: '#EF4444', badgeBg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60' },
  { value: 'low', label: 'Low', emoji: '😕', score: 2, color: '#F97316', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60' },
  { value: 'okay', label: 'Okay', emoji: '😐', score: 3, color: '#EAB308', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60' },
  { value: 'good', label: 'Good', emoji: '🙂', score: 4, color: '#10B981', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60' },
  { value: 'great', label: 'Great', emoji: '😄', score: 5, color: '#06B6D4', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/60' },
  { value: 'excellent', label: 'Excellent', emoji: '🤩', score: 6, color: '#8B5CF6', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60' },
];

export const MOOD_TRACKER_MAP: Record<MoodTrackerValue, MoodOptionMeta> = {
  very_low: MOOD_TRACKER_OPTIONS[0],
  low: MOOD_TRACKER_OPTIONS[1],
  okay: MOOD_TRACKER_OPTIONS[2],
  good: MOOD_TRACKER_OPTIONS[3],
  great: MOOD_TRACKER_OPTIONS[4],
  excellent: MOOD_TRACKER_OPTIONS[5],
};

export interface DailyJournal {
  id?: string;
  date: string; // YYYY-MM-DD
  content?: string;
  mood?: MoodType;
  energy_level?: number; // 1-5
  created_at?: string;
  updated_at?: string;
}

export interface WeeklyPlan {
  id?: string;
  year: number;
  month: number;
  week_number: number; // 1-5
  main_goal: string;
  priority_1: string;
  priority_2: string;
  priority_3: string;
  target_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Reflection {
  id?: string;
  month: number; // 1-12
  year: number;  // e.g. 2026
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeeklyReview {
  id?: string;
  year: number;
  month: number;
  week_number: number; // 1-5
  went_well: string;
  improve: string;
  could_improve?: string; // alias for backward compatibility
  next_focus: string;
  created_at?: string;
  updated_at?: string;
}

export interface VisualAffirmation {
  id?: string;
  quote: string;
  author?: string;
  image_url?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  week_start: 'sunday' | 'monday';
  default_view: ViewTab;
  auto_lock_minutes: number; // 5, 15, 30, 0 (never)
}

export interface HabitCategoryItem {
  id?: string;
  name: string;
  icon: string;
  created_at?: string;
}

export interface StreakInfo {
  streak: number; // Overall Consistency Streak
  bestStreak: number; // Best Consistency Streak
  completedToday: boolean;
  habitStreaks?: Record<string, { current: number; best: number; totalCompletions: number }>;
}

export interface DashboardScore {
  score: number;
  streak: number;
  completedToday: number;
  scheduledToday: number;
  weeklyProgress: number;
}

export interface HabitRiskInfo {
  habitId: string;
  habitName: string;
  reason: string;
  recentCompletions: boolean[];
  dropPercentage: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type ViewTab = 'today' | 'goals' | 'grid' | 'calendar' | 'analytics' | 'review' | 'mood' | 'settings';

export interface UndoAction {
  id: string;
  habitId: string;
  habitName: string;
  date: string;
  previousCompleted: boolean;
  newCompleted: boolean;
  expiresAt: number;
}
