import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from './api';
import {
  Habit,
  WeeklyReview,
  VisualAffirmation as VisualAffirmationType,
  AppSettings,
  SaveStatus,
  ViewTab,
  HabitCategory,
  HabitFrequency,
  DailyJournal,
  MoodType,
  MoodTrackerEntry,
} from './types';
import { Header } from './components/Header';
import { TodayFocus } from './components/TodayFocus';
import { GoalsView } from './components/GoalsView';
import { SummaryCards } from './components/SummaryCards';
import { DailyHabitGrid } from './components/DailyHabitGrid';
import { CalendarMonthView } from './components/CalendarMonthView';
import { MoodCalendarView } from './components/mood/MoodCalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { ReviewView } from './components/ReviewView';
import { SettingsView } from './components/SettingsView';
import { MoodTrackerSection } from './components/mood/MoodTrackerSection';
import { HabitDetailModal } from './components/HabitDetailModal';
import { VisualAffirmation } from './components/VisualAffirmation';
import { AddHabitModal, EditHabitModal, ArchiveHabitModal, DeleteHabitModal } from './components/HabitModals';
import { getDaysInMonth, getTodayDateInfo, formatDateKey } from './utils/date';
import { getHabitOpportunities, calculateConsistencyStreaks } from './utils/scheduler';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { useProtectedAction } from './context/ProtectedActionContext';

interface UndoAction {
  habitId: string;
  habitName: string;
  dateStr: string;
  previousCompleted: boolean;
  timestamp: number;
}

export function App() {
  const { isUnlocked, executeProtected, requestUnlock, lock, unlock } = useProtectedAction();

  // Navigation tab state: 'today' | 'goals' | 'grid' | 'calendar' | 'analytics' | 'review' | 'settings'
  const [activeTab, setActiveTab] = useState<ViewTab>('today');

  // Month & Year state
  const today = getTodayDateInfo();
  const [currentYear, setCurrentYear] = useState<number>(today.year);
  const [currentMonth, setCurrentMonth] = useState<number>(today.month); // 1-12

  // Core Data state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Record<string, boolean>>({});
  const [journals, setJournals] = useState<DailyJournal[]>([]);
  const [reflectionContent, setReflectionContent] = useState<string>('');
  const [weeklyReviews, setWeeklyReviews] = useState<Record<number, WeeklyReview>>({});
  const [affirmation, setAffirmation] = useState<VisualAffirmationType>({
    quote: 'Small daily disciplines repeated over time lead to extraordinary transformation.',
    author: 'Robin Sharma',
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('vignesh_theme') : null) as 'light' | 'dark' | 'system' | null;
    return {
      theme: savedTheme || 'light',
      week_start: 'sunday',
      auto_lock_minutes: 15,
      default_view: 'today',
    };
  });

  // Calendar tab display mode ('habits' | 'mood' | 'both')
  const [calendarTabMode, setCalendarTabMode] = useState<'habits' | 'mood' | 'both'>('habits');
  const [calendarMoodEntries, setCalendarMoodEntries] = useState<MoodTrackerEntry[]>([]);

  // Track active dark mode state for UI indicators
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('vignesh_theme') || 'light';
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'system') {
      return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    }
    return false;
  });

  // Sync theme with HTML class and local storage
  useEffect(() => {
    const applyTheme = () => {
      let activeDark = false;
      if (settings.theme === 'dark') {
        activeDark = true;
      } else if (settings.theme === 'system') {
        activeDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
      } else {
        activeDark = false;
      }

      if (activeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      setIsDarkMode(activeDark);
      try {
        localStorage.setItem('vignesh_theme', settings.theme);
      } catch (e) {
        // ignore
      }
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  const handleToggleTheme = () => {
    const nextTheme: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';
    handleUpdateSetting('theme', nextTheme);
  };

  // Streak data
  const [streakDays, setStreakDays] = useState<number>(0);
  const [bestStreakDays, setBestStreakDays] = useState<number>(0);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, { current: number; best: number; totalCompletions: number }>>({});

  // Sync & Status state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isSupabase, setIsSupabase] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('vignesh_is_supabase');
      return cached !== null ? cached === 'true' : true;
    }
    return true;
  });
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dbStatusMessage, setDbStatusMessage] = useState<string>('Connected to Supabase PostgreSQL cloud database');

  // Auto-dismiss transient error banner after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Undo Toast state
  const [lastUndoAction, setLastUndoAction] = useState<UndoAction | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [archivingHabit, setArchivingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<Habit | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  // ----------------------------------------------------
  // Initial Status & Lock Check
  // ----------------------------------------------------
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await api.getStatus();
        setIsSupabase(status.isSupabase);
        if (typeof window !== 'undefined') {
          localStorage.setItem('vignesh_is_supabase', String(status.isSupabase));
        }
        setDbStatusMessage(status.isSupabase ? 'Connected to Supabase PostgreSQL cloud database' : 'Local fallback persistence active');
      } catch (err) {
        console.warn('Backend status check:', err);
      }
    }
    checkStatus();
  }, []);

  // ----------------------------------------------------
  // Fetch Monthly Data
  // ----------------------------------------------------
  const loadMonthData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setErrorMessage('');

      // Fetch habits, entries, reflection, weekly reviews, affirmation, streak, settings, journals in parallel
      const [
        habitsRes,
        entriesRes,
        reflectionRes,
        reviewsRes,
        affirmationRes,
        streakRes,
        settingsRes,
        journalsRes,
        moodsRes,
      ] = await Promise.allSettled([
        api.getHabits(),
        api.getHabitEntries(currentYear, currentMonth),
        api.getReflection(currentYear, currentMonth),
        api.getWeeklyReviews(currentYear, currentMonth),
        api.getAffirmation(),
        api.getStreak(),
        api.getSettings(),
        api.getJournal({ year: currentYear, month: currentMonth }),
        api.getMoods(),
      ]);

      // 1. Habits
      if (habitsRes.status === 'fulfilled') {
        const loadedHabits = habitsRes.value.habits || [];
        setHabits(loadedHabits);

        // Seed default habits if empty
        if (loadedHabits.length === 0) {
          const defaults: Array<{
            name: string;
            category: HabitCategory;
            frequency: HabitFrequency;
            schedule_days?: string[];
          }> = [
            { name: 'Morning Workout & Stretch', category: 'health', frequency: 'daily' },
            { name: 'Deep Work Session (2h)', category: 'career', frequency: 'daily' },
            { name: 'Read 20 Pages', category: 'learning', frequency: 'daily' },
            { name: 'Meditation & Mindfulness', category: 'personal', frequency: 'daily' },
            { name: 'Review Daily Spending', category: 'finance', frequency: 'specific_days', schedule_days: ['Sun', 'Fri'] },
          ];

          for (const d of defaults) {
            try {
              const res = await api.addHabit(d);
              loadedHabits.push(res.habit);
            } catch (e) {
              console.error('Seeding habit failed', e);
            }
          }
          setHabits([...loadedHabits]);
        }
      }

      // 2. Entries
      if (entriesRes.status === 'fulfilled') {
        const entriesMap: Record<string, boolean> = {};
        entriesRes.value.entries.forEach((e) => {
          if (e.completed) {
            entriesMap[`${e.habit_id}_${e.date}`] = true;
          }
        });
        setEntries(entriesMap);
      }

      // 3. Reflection
      if (reflectionRes.status === 'fulfilled') {
        setReflectionContent(reflectionRes.value.reflection?.content || '');
      }

      // 4. Weekly Reviews
      if (reviewsRes.status === 'fulfilled') {
        const map: Record<number, WeeklyReview> = {};
        (reviewsRes.value.reviews || []).forEach((r) => {
          map[r.week_number] = r;
        });
        setWeeklyReviews(map);
      }

      // 5. Affirmation
      if (affirmationRes.status === 'fulfilled' && affirmationRes.value.affirmation) {
        setAffirmation(affirmationRes.value.affirmation);
      }

      // 6. Streak Info
      if (streakRes.status === 'fulfilled') {
        setStreakDays(streakRes.value.streak);
        setBestStreakDays(streakRes.value.bestStreak || streakRes.value.streak);
        setHabitStreaks(streakRes.value.habitStreaks || {});
      }

      // 7. Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value.settings) {
        setSettings((prev) => ({ ...prev, ...settingsRes.value.settings }));
      }

      // 8. Daily Journals (Mood & Energy)
      if (journalsRes.status === 'fulfilled') {
        setJournals(journalsRes.value.journal || []);
      }

      // 9. Mood Tracker Entries
      if (moodsRes.status === 'fulfilled' && moodsRes.value.moods) {
        setCalendarMoodEntries(moodsRes.value.moods);
      }
    } catch (err: any) {
      console.error('Error loading month data:', err);
      setErrorMessage(err?.message || 'Unable to load data. Please refresh.');
    } finally {
      setInitialLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // ----------------------------------------------------
  // Month Navigation Handlers
  // ----------------------------------------------------
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = getTodayDateInfo();
    setCurrentYear(now.year);
    setCurrentMonth(now.month);
  };

  // ----------------------------------------------------
  // Toggle Habit Entry with Undo Toast
  // ----------------------------------------------------
  const handleToggleEntry = (habitId: string, dateStr: string, currentCompleted: boolean) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    const actionDesc = `${currentCompleted ? 'Uncheck' : 'Check'} "${targetHabit?.name || 'Habit'}"`;

    executeProtected(async () => {
      const nextCompleted = !currentCompleted;
      const entryKey = `${habitId}_${dateStr}`;

      // Set up Undo Action
      setLastUndoAction({
        habitId,
        habitName: targetHabit?.name || 'Habit',
        dateStr,
        previousCompleted: currentCompleted,
        timestamp: Date.now(),
      });

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setLastUndoAction(null);
      }, 5000);

      // Optimistic UI update
      setEntries((prev) => {
        const updated = { ...prev };
        if (nextCompleted) {
          updated[entryKey] = true;
        } else {
          delete updated[entryKey];
        }
        return updated;
      });

      setSaveStatus('saving');

      try {
        await api.toggleHabitEntry(habitId, dateStr, nextCompleted);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);

        // Refresh streak calculation
        api.getStreak().then((res) => {
          setStreakDays(res.streak);
          setBestStreakDays(res.bestStreak);
          setHabitStreaks(res.habitStreaks || {});
        });
      } catch (err: any) {
        console.error('Failed to toggle habit entry:', err);
        setSaveStatus('error');
        // Revert optimistic update
        setEntries((prev) => {
          const reverted = { ...prev };
          if (currentCompleted) {
            reverted[entryKey] = true;
          } else {
            delete reverted[entryKey];
          }
          return reverted;
        });
      }
    }, actionDesc);
  };

  // Undo Handler
  const handleUndo = async () => {
    if (!lastUndoAction) return;
    const { habitId, dateStr, previousCompleted } = lastUndoAction;
    setLastUndoAction(null);
    handleToggleEntry(habitId, dateStr, !previousCompleted);
  };

  // ----------------------------------------------------
  // Habit Management Handlers (Guarded by Protected Action)
  // ----------------------------------------------------
  const handleAddHabit = async (data: {
    name: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    target_count?: number;
    schedule_days?: string[];
    priority?: 'high' | 'normal' | 'low';
    goal_id?: string;
  }) => {
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.addHabit(data);
        setHabits((prev) => [...prev, res.habit]);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to add habit:', err);
        setSaveStatus('error');
      }
    }, `Add Habit "${data.name}"`);
  };

  const handleEditHabit = async (habitId: string, updates: Partial<Habit>) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.updateHabit(habitId, updates);
        setHabits((prev) => prev.map((h) => (h.id === habitId ? res.habit : h)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to update habit:', err);
        setSaveStatus('error');
      }
    }, `Update Habit "${updates.name || targetHabit?.name || 'Habit'}"`);
  };

  const handleDuplicateHabit = async (habitId: string) => {
    const habitToClone = habits.find((h) => h.id === habitId);
    if (!habitToClone) return;

    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.addHabit({
          name: `${habitToClone.name} (Copy)`,
          category: habitToClone.category,
          frequency: habitToClone.frequency,
          target_count: habitToClone.target_count,
          schedule_days: habitToClone.schedule_days,
          priority: habitToClone.priority || 'normal',
          goal_id: habitToClone.goal_id,
        });
        setHabits((prev) => [...prev, res.habit]);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('error');
      }
    }, `Duplicate "${habitToClone.name}"`);
  };

  const handleArchiveHabit = async (habitId: string) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.archiveHabit(habitId);
        const archivedHabit = res.habit || {
          ...habits.find((h) => h.id === habitId),
          status: 'archived' as const,
          archived_at: new Date().toISOString(),
        };
        setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, ...archivedHabit, status: 'archived' } : h)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to archive habit:', err);
        setSaveStatus('error');
      }
    }, `Archive "${targetHabit?.name || 'Habit'}"`);
  };

  const handleTogglePause = async (habit: Habit) => {
    const nextStatus = habit.status === 'paused' ? 'active' : 'paused';
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.updateHabit(habit.id, { status: nextStatus });
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? res.habit : h)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to toggle pause status:', err);
        setSaveStatus('error');
      }
    }, `${nextStatus === 'paused' ? 'Pause' : 'Resume'} "${habit.name}"`);
  };

  const handleRestoreHabit = async (habitId: string) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        const res = await api.restoreHabit(habitId);
        setHabits((prev) => prev.map((h) => (h.id === habitId ? res.habit : h)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to restore habit:', err);
        setSaveStatus('error');
      }
    }, `Restore "${targetHabit?.name || 'Habit'}"`);
  };

  const handlePermanentlyDeleteHabit = async (habitId: string) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        await api.deleteHabitPermanently(habitId);
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to delete habit permanently:', err);
        setSaveStatus('error');
      }
    }, `Permanently Delete "${targetHabit?.name || 'Habit'}"`);
  };

  // ----------------------------------------------------
  // Reflection & Review Handlers (Guarded by Protected Action)
  // ----------------------------------------------------
  const handleSaveReflection = async (content: string) => {
    return new Promise<any>((resolve, reject) => {
      executeProtected(async () => {
        try {
          setReflectionContent(content);
          const res = await api.saveReflection(currentYear, currentMonth, content);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }, 'Save Monthly Reflection');
    });
  };

  const handleSaveWeeklyReview = async (reviewData: {
    year: number;
    month: number;
    week_number: number;
    went_well: string;
    improve: string;
    next_focus: string;
  }) => {
    executeProtected(async () => {
      const res = await api.saveWeeklyReview({
        year: reviewData.year,
        month: reviewData.month,
        week_number: reviewData.week_number,
        went_well: reviewData.went_well,
        improve: reviewData.improve,
        next_focus: reviewData.next_focus,
      });
      setWeeklyReviews((prev) => ({
        ...prev,
        [reviewData.week_number]: res.review,
      }));
    }, `Save Week ${reviewData.week_number} Review`);
  };

  const handleSaveAffirmation = async (newAffirmation: VisualAffirmationType) => {
    executeProtected(async () => {
      const res = await api.saveAffirmation(newAffirmation);
      setAffirmation(res.affirmation);
    }, 'Update Vision Affirmation');
  };

  // ----------------------------------------------------
  // Settings Handler
  // ----------------------------------------------------
  const handleUpdateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    // Theme toggling doesn't require PIN (client preference)
    if (key === 'theme') {
      const nextSettings = { ...settings, [key]: value };
      setSettings(nextSettings);
      try {
        await api.saveSetting(key, value);
      } catch (err) {
        console.error('Failed to save theme setting:', err);
      }
      return;
    }

    executeProtected(async () => {
      const nextSettings = { ...settings, [key]: value };
      setSettings(nextSettings);
      try {
        await api.saveSetting(key, value);
      } catch (err) {
        console.error('Failed to save setting:', err);
      }
    }, `Update Preference (${String(key)})`);
  };

  // ----------------------------------------------------
  // Export Data Handler (CSV / JSON)
  // ----------------------------------------------------
  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      if (format === 'csv') {
        window.location.href = '/api/export?format=csv';
      } else {
        const res = await fetch('/api/export?format=json');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vignesh_habits_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Active vs Archived Habits
  const activeHabits = useMemo(() => habits.filter((h) => (h.status || 'active') === 'active'), [habits]);
  const pausedHabits = useMemo(() => habits.filter((h) => h.status === 'paused'), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.status === 'archived'), [habits]);

  // Summary Stats Calculation
  const summaryStats = useMemo(() => {
    const totalHabits = activeHabits.length;
    let completedDaysCount = 0;
    let totalDaysPossible = 0;

    activeHabits.forEach((habit) => {
      const opps = getHabitOpportunities(habit, currentMonth, currentYear);
      totalDaysPossible += opps;

      for (let day = 1; day <= daysInMonth; day++) {
        const key = formatDateKey(currentYear, currentMonth, day);
        if (entries[`${habit.id}_${key}`]) {
          completedDaysCount++;
        }
      }
    });

    const percentage = totalDaysPossible > 0 ? Math.min(100, Math.round((completedDaysCount / totalDaysPossible) * 100)) : 0;

    return {
      totalHabits,
      completedDaysCount,
      totalDaysPossible,
      percentage,
    };
  }, [activeHabits, entries, currentYear, currentMonth, daysInMonth]);

  // ----------------------------------------------------
  // Save Mood Handler
  // ----------------------------------------------------
  const handleSaveMood = async (payload: {
    date?: string;
    mood: MoodType;
    energy_level?: number;
    notes?: string;
  }) => {
    try {
      setSaveStatus('saving');
      const today = getTodayDateInfo();
      const targetDate = payload.date || formatDateKey(today.year, today.month, today.day);
      const res = await api.saveJournal({ ...payload, date: targetDate });
      if (res.journal) {
        setJournals((prev) => {
          const idx = prev.findIndex((j) => j.date === res.journal.date);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.journal;
            return copy;
          }
          return [res.journal, ...prev];
        });
      }
      setSaveStatus('saved');
      setErrorMessage('');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to save mood entry:', err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to save mood entry.');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-900 text-[#2D2A26] dark:text-slate-100 flex flex-col font-sans selection:bg-[#D5E5D9] selection:text-[#2C523A] transition-colors">
      {/* Sticky Header with Navigation Tabs */}
      <Header
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onCurrentMonth={handleCurrentMonth}
        saveStatus={saveStatus}
        isSupabase={isSupabase}
        isUnlocked={isUnlocked}
        onLock={lock}
        onUnlockRequest={() => requestUnlock('Unlock Editing Mode')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExportData}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FDF2F0] dark:bg-rose-950/40 border border-[#F5D5D0] dark:border-rose-800 text-xs font-semibold text-[#C05746] dark:text-rose-300 flex items-center justify-between shadow-2xs">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-[#C05746] dark:text-rose-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {initialLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-[#5B8266] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#7D766C] dark:text-slate-400 font-medium">Syncing with database...</p>
          </div>
        ) : (
          <>
            {/* 1. TODAY'S FOCUS DASHBOARD TAB */}
            {activeTab === 'today' && (
              <div className="animate-in fade-in duration-200 space-y-6">
                {/* Visual Affirmation Quote Bar */}
                <VisualAffirmation
                  affirmation={affirmation}
                  onSave={handleSaveAffirmation}
                />

                {/* Today's Focus Action Section */}
                <TodayFocus
                  habits={habits}
                  entries={entries}
                  streakDays={streakDays}
                  bestStreakDays={bestStreakDays}
                  month={currentMonth}
                  year={currentYear}
                  isUnlocked={isUnlocked}
                  onToggleEntry={handleToggleEntry}
                  onOpenAddModal={() => executeProtected(() => setIsAddModalOpen(true), 'Add New Habit')}
                  onSelectHabit={(h) => setSelectedHabitForDetail(h)}
                  onSwitchToGrid={() => setActiveTab('grid')}
                  onOpenGoals={() => setActiveTab('goals')}
                  onOpenMoodTab={() => setActiveTab('mood')}
                  onRequireUnlock={() => requestUnlock('Unlock Editing Mode')}
                  onDuplicateHabit={handleDuplicateHabit}
                />
              </div>
            )}

            {/* 2. VISION & GOALS TAB */}
            {activeTab === 'goals' && (
              <div className="animate-in fade-in duration-200">
                <GoalsView
                  habits={habits}
                  entries={entries}
                  onRefreshHabits={loadMonthData}
                  onAddHabitForGoal={(_goalId) => {
                    executeProtected(() => setIsAddModalOpen(true), 'Add Habit for Goal');
                  }}
                />
              </div>
            )}

            {/* 3. MONTHLY SPREADSHEET GRID TAB */}
            {activeTab === 'grid' && (
              <div className="animate-in fade-in duration-200 space-y-6">
                {/* Summary Metrics */}
                <SummaryCards
                  totalHabits={summaryStats.totalHabits}
                  completedDaysCount={summaryStats.completedDaysCount}
                  totalDaysPossible={summaryStats.totalDaysPossible}
                  percentage={summaryStats.percentage}
                  streakDays={streakDays}
                  bestStreakDays={bestStreakDays}
                  habits={habits}
                />

                {/* Spreadsheet Habit Tracker Grid */}
                <DailyHabitGrid
                  habits={habits}
                  year={currentYear}
                  month={currentMonth}
                  daysInMonth={daysInMonth}
                  entries={entries}
                  habitStreaks={habitStreaks}
                  onToggleEntry={handleToggleEntry}
                  onOpenAddModal={() => executeProtected(() => setIsAddModalOpen(true), 'Add New Habit')}
                  onOpenEditModal={(h) => executeProtected(() => setEditingHabit(h), `Edit Habit "${h.name}"`)}
                  onOpenArchiveModal={(h) => executeProtected(() => setArchivingHabit(h), `Archive Habit "${h.name}"`)}
                  onTogglePause={handleTogglePause}
                  onRestoreHabit={handleRestoreHabit}
                  onSelectHabit={(h) => setSelectedHabitForDetail(h)}
                />
              </div>
            )}

            {/* 4. CALENDAR VIEW TAB */}
            {activeTab === 'calendar' && (
              <div className="animate-in fade-in duration-200 space-y-6">
                {/* Calendar View Type Switcher */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 p-1 bg-[#F0EBE1] dark:bg-slate-800 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCalendarTabMode('habits')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        calendarTabMode === 'habits'
                          ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                          : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                      }`}
                    >
                      Habits Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarTabMode('mood');
                        if (calendarMoodEntries.length === 0) {
                          api.getMoods().then((res) => {
                            if (res.moods) setCalendarMoodEntries(res.moods);
                          });
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        calendarTabMode === 'mood'
                          ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                          : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                      }`}
                    >
                      <span>Mood Tracker Calendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarTabMode('both');
                        if (calendarMoodEntries.length === 0) {
                          api.getMoods().then((res) => {
                            if (res.moods) setCalendarMoodEntries(res.moods);
                          });
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        calendarTabMode === 'both'
                          ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                          : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                      }`}
                    >
                      Both Calendars
                    </button>
                  </div>
                </div>

                {(calendarTabMode === 'habits' || calendarTabMode === 'both') && (
                  <CalendarMonthView
                    habits={habits}
                    year={currentYear}
                    month={currentMonth}
                    weekStart={settings.week_start}
                    entries={entries}
                    onToggleEntry={handleToggleEntry}
                    onOpenAddModal={() => executeProtected(() => setIsAddModalOpen(true), 'Add New Habit')}
                    onSelectHabit={(h) => setSelectedHabitForDetail(h)}
                  />
                )}

                {(calendarTabMode === 'mood' || calendarTabMode === 'both') && (
                  <div className="space-y-4">
                    {calendarTabMode === 'both' && (
                      <div className="border-t border-[#ECE6DC] dark:border-slate-800 pt-6">
                        <h3 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white mb-1">
                          Mood Tracker Calendar
                        </h3>
                        <p className="text-xs text-[#7D766C] dark:text-slate-400 mb-4">
                          Monthly visual log of daily emotional wellness, energy stars, and notes.
                        </p>
                      </div>
                    )}
                    <MoodCalendarView
                      entries={calendarMoodEntries}
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      onMonthChange={(m, y) => {
                        setCurrentMonth(m);
                        setCurrentYear(y);
                      }}
                      onEdit={() => setActiveTab('mood')}
                      onDelete={() => setActiveTab('mood')}
                      onAddForDate={() => setActiveTab('mood')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5. ANALYTICS & TRENDS TAB */}
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in duration-200">
                <AnalyticsView
                  habits={habits}
                  entries={entries}
                  currentYear={currentYear}
                  onYearChange={setCurrentYear}
                  streakDays={streakDays}
                  bestStreakDays={bestStreakDays}
                  habitStreaks={habitStreaks}
                />
              </div>
            )}

            {/* 6. REVIEW & REFLECT TAB */}
            {activeTab === 'review' && (
              <div className="animate-in fade-in duration-200">
                <ReviewView
                  year={currentYear}
                  month={currentMonth}
                  reviews={weeklyReviews}
                  monthlyReflectionContent={reflectionContent}
                  journals={journals}
                  onSaveWeeklyReview={handleSaveWeeklyReview}
                  onSaveMonthlyReflection={handleSaveReflection}
                />
              </div>
            )}

            {/* 7. MOOD TRACKER TAB */}
            {activeTab === 'mood' && (
              <div className="animate-in fade-in duration-200">
                <MoodTrackerSection
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  isUnlocked={isUnlocked}
                  onRequireUnlock={() => requestUnlock('Unlock Mood Log Editing')}
                  onMonthChange={(m, y) => {
                    setCurrentMonth(m);
                    setCurrentYear(y);
                  }}
                />
              </div>
            )}

            {/* 8. SETTINGS & PREFERENCES TAB */}
            {activeTab === 'settings' && (
              <div className="animate-in fade-in duration-200">
                <SettingsView
                  settings={settings}
                  archivedHabits={archivedHabits}
                  isSupabase={isSupabase}
                  dbStatusMessage={dbStatusMessage}
                  onUpdateSetting={handleUpdateSetting}
                  onRestoreHabit={handleRestoreHabit}
                  onPermanentlyDeleteHabit={handlePermanentlyDeleteHabit}
                  onExport={handleExportData}
                  onImportSuccess={() => loadMonthData()}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Undo Notification Toast */}
      {lastUndoAction && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#2D2A26] dark:bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-[#4A453E] dark:border-slate-700 flex items-center gap-3 text-xs">
            <span>
              Updated <strong>{lastUndoAction.habitName}</strong>
            </span>
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 bg-[#5B8266] hover:bg-[#4C7156] text-white px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setLastUndoAction(null)}
              className="text-white/60 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="border-t border-[#ECE6DC] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 py-6 text-center text-xs text-[#8C8377] dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Vignesh Habit Tracker • Version 3.0 (Personal Growth OS)</span>
          <span className="text-[11px] text-[#A69E92] dark:text-slate-400">
            {isSupabase ? '☁️ Synced to Supabase PostgreSQL' : '💾 Resilient persistence active'}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddHabitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddHabit}
      />

      <EditHabitModal
        habit={editingHabit}
        isOpen={!!editingHabit}
        onClose={() => setEditingHabit(null)}
        onSave={handleEditHabit}
        onArchive={(h) => setArchivingHabit(h)}
        onDelete={(h) => setDeletingHabit(h)}
      />

      <ArchiveHabitModal
        habit={archivingHabit}
        isOpen={!!archivingHabit}
        onClose={() => setArchivingHabit(null)}
        onArchive={handleArchiveHabit}
      />

      <DeleteHabitModal
        habit={deletingHabit}
        isOpen={!!deletingHabit}
        onClose={() => setDeletingHabit(null)}
        onDelete={handlePermanentlyDeleteHabit}
      />

      <HabitDetailModal
        habit={selectedHabitForDetail}
        isOpen={!!selectedHabitForDetail}
        onClose={() => setSelectedHabitForDetail(null)}
        entries={entries}
        currentYear={currentYear}
        currentMonth={currentMonth}
        streakInfo={
          selectedHabitForDetail ? habitStreaks[selectedHabitForDetail.id] : undefined
        }
        onEdit={(h) => {
          executeProtected(() => {
            setSelectedHabitForDetail(null);
            setEditingHabit(h);
          }, `Edit Habit "${h.name}"`);
        }}
        onArchive={(h) => {
          executeProtected(() => {
            setSelectedHabitForDetail(null);
            setArchivingHabit(h);
          }, `Archive Habit "${h.name}"`);
        }}
        onDelete={(h) => {
          executeProtected(() => {
            setSelectedHabitForDetail(null);
            setDeletingHabit(h);
          }, `Delete Habit "${h.name}"`);
        }}
        onTogglePause={(h) => {
          handleTogglePause(h);
          setSelectedHabitForDetail(null);
        }}
      />
    </div>
  );
}

export default App;
