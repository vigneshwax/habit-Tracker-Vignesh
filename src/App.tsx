import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from './api';
import {
  Habit,
  Goal,
  WeeklyReview,
  WeeklyPlan,
  VisualAffirmation as VisualAffirmationType,
  AppSettings,
  SaveStatus,
  ViewTab,
  HabitCategory,
  HabitFrequency,
  DailyJournal,
  MoodType,
  MoodTrackerEntry,
  HRTask,
  TaskStatus,
} from './types';
import { Header } from './components/Header';
import { TodayFocus } from './components/TodayFocus';
import { GoalsView } from './components/GoalsView';
import { JournalView } from './components/JournalView';
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
import { ExcelImportModal } from './components/ExcelImportModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { TasksTableView } from './components/TasksTableView';
import { KanbanBoardView } from './components/KanbanBoardView';
import { CalendarTasksView } from './components/CalendarTasksView';
import { TaskModal } from './components/TaskModal';
import { localStorageService } from './services/localStorageService';
import { downloadExcelWorkbook, FullExportData, makeUuid } from './utils/excel';
import { getDaysInMonth, getTodayDateInfo, formatDateKey } from './utils/date';
import { getHabitOpportunities, calculateConsistencyStreaks } from './utils/scheduler';
import { CATEGORIES_META } from './utils/categories';
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

  // Core Data state with instant initial cache or fallback habits
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('vignesh_cached_habits');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      { id: '47440099-c760-432e-8561-0021fe75518d', name: 'Morning Workout & Stretch', category: 'health', frequency: 'daily', status: 'active', created_at: new Date().toISOString() },
      { id: '94469549-15f3-47a1-8b34-290befdb18c0', name: 'Deep Work Session (2h)', category: 'career', frequency: 'daily', status: 'active', created_at: new Date().toISOString() },
      { id: '3cde2ac8-3244-4553-8158-ae49578357c1', name: 'Read 20 Pages', category: 'learning', frequency: 'daily', status: 'active', created_at: new Date().toISOString() },
      { id: '4fa45b43-fb1e-4123-ac2e-5200a7c768c2', name: 'Meditation & Mindfulness', category: 'personal', frequency: 'daily', status: 'active', created_at: new Date().toISOString() },
    ];
  });
  const [entries, setEntries] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('vignesh_cached_entries');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });
  const [journals, setJournals] = useState<DailyJournal[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reflectionContent, setReflectionContent] = useState<string>('');
  const [weeklyReviews, setWeeklyReviews] = useState<Record<number, WeeklyReview>>({});
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [affirmation, setAffirmation] = useState<VisualAffirmationType>({
    quote: 'Small daily disciplines repeated over time lead to extraordinary transformation.',
    author: 'Robin Sharma',
  });

  // Tasks state
  const [tasks, setTasks] = useState<HRTask[]>(() => localStorageService.getTasks());
  const [tasksSubView, setTasksSubView] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<HRTask | null>(null);
  const [taskModalInitialDate, setTaskModalInitialDate] = useState<string | undefined>(undefined);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('vignesh_theme') : null) as 'light' | 'dark' | 'system' | null;
    let initial: AppSettings = {
      theme: savedTheme || 'light',
      week_start: 'sunday',
      auto_lock_minutes: 15,
      default_view: 'today',
    };
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('vignesh_settings');
        if (cached) {
          initial = { ...initial, ...JSON.parse(cached) };
        }
      } catch {}
    }
    return initial;
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
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isDatabaseSyncing, setIsDatabaseSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dbStatusMessage, setDbStatusMessage] = useState<string>('Primary Database: Google Sheet (Two-Way Live Database Engine Active)');
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState<boolean>(false);
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState<boolean>(false);
  const [excelImportNotice, setExcelImportNotice] = useState<string | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [googleSheetsNotice, setGoogleSheetsNotice] = useState<string | null>(null);
  const [googleSheetsSyncStatus, setGoogleSheetsSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

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
        setDbStatusMessage(status.message || 'Primary Database: Google Sheet (Two-Way Live Database Engine Active)');
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
      setIsDatabaseSyncing(true);
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
        goalsRes,
        plansRes,
        tasksRes,
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
        api.getGoals(),
        api.getWeeklyPlans(currentYear, currentMonth),
        api.getTasks(),
      ]);

      // 1. Habits
      if (habitsRes.status === 'fulfilled' && habitsRes.value) {
        const loadedHabits = Array.isArray(habitsRes.value.habits) ? habitsRes.value.habits : [];
        if (loadedHabits.length > 0) {
          setHabits(loadedHabits);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('vignesh_cached_habits', JSON.stringify(loadedHabits)); } catch {}
          }
        } else {
          // If empty, seed defaults in the background without blocking the UI
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
          ];
          Promise.allSettled(defaults.map((d) => api.addHabit(d))).then((results) => {
            const added: Habit[] = [];
            results.forEach((r) => {
              if (r.status === 'fulfilled' && r.value?.habit) added.push(r.value.habit);
            });
            if (added.length > 0) {
              setHabits(added);
              if (typeof window !== 'undefined') {
                try { localStorage.setItem('vignesh_cached_habits', JSON.stringify(added)); } catch {}
              }
            }
          }).catch(() => {});
        }
      }

      // 2. Entries
      if (entriesRes.status === 'fulfilled' && entriesRes.value && Array.isArray(entriesRes.value.entries)) {
        const entriesMap: Record<string, boolean> = {};
        entriesRes.value.entries.forEach((e) => {
          if (e && e.completed && e.habit_id && e.date) {
            entriesMap[`${e.habit_id}_${e.date}`] = true;
          }
        });
        setEntries(entriesMap);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('vignesh_cached_entries', JSON.stringify(entriesMap)); } catch {}
        }
      }

      // 3. Reflection
      if (reflectionRes.status === 'fulfilled' && reflectionRes.value?.reflection) {
        setReflectionContent(reflectionRes.value.reflection.content || '');
      }

      // 4. Weekly Reviews
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value && Array.isArray(reviewsRes.value.reviews)) {
        const map: Record<number, WeeklyReview> = {};
        reviewsRes.value.reviews.forEach((r) => {
          if (r && r.week_number) {
            map[r.week_number] = r;
          }
        });
        setWeeklyReviews(map);
      }

      // 5. Affirmation
      if (affirmationRes.status === 'fulfilled' && affirmationRes.value?.affirmation) {
        setAffirmation(affirmationRes.value.affirmation);
      }

      // 6. Streak Info
      if (streakRes.status === 'fulfilled' && streakRes.value) {
        setStreakDays(Number(streakRes.value.streak || 0));
        setBestStreakDays(Number(streakRes.value.bestStreak || streakRes.value.streak || 0));
        setHabitStreaks(streakRes.value.habitStreaks || {});
      }

      // 7. Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
        setSettings((prev) => ({ ...prev, ...settingsRes.value.settings }));
      }

      // 8. Daily Journals (Mood & Energy)
      if (journalsRes.status === 'fulfilled' && journalsRes.value && Array.isArray(journalsRes.value.journal)) {
        setJournals(journalsRes.value.journal);
      }

      // 9. Mood Tracker Entries
      if (moodsRes.status === 'fulfilled' && moodsRes.value && Array.isArray(moodsRes.value.moods)) {
        setCalendarMoodEntries(moodsRes.value.moods);
      }

      // 10. Goals
      if (goalsRes.status === 'fulfilled' && goalsRes.value && Array.isArray(goalsRes.value.goals)) {
        setGoals(goalsRes.value.goals);
      }

      // 11. Weekly Plans
      if (plansRes.status === 'fulfilled' && plansRes.value && Array.isArray(plansRes.value.plans)) {
        setWeeklyPlans(plansRes.value.plans);
      }

      // 12. Tasks
      if (tasksRes.status === 'fulfilled' && tasksRes.value && Array.isArray(tasksRes.value.tasks)) {
        setTasks(tasksRes.value.tasks);
        localStorageService.saveTasks(tasksRes.value.tasks);
      }
    } catch (err: any) {
      console.warn('Background database sync completed with local fallback:', err);
    } finally {
      setIsDatabaseSyncing(false);
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
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
        queueAutoPush();
      } catch (err: any) {
        console.error('Failed to delete habit permanently:', err);
        setSaveStatus('error');
      }
    }, `Permanently Delete "${targetHabit?.name || 'Habit'}"`);
  };

  // ----------------------------------------------------
  // Task Handlers (Tasks View)
  // ----------------------------------------------------
  const handleOpenNewTaskModal = (date?: string) => {
    executeProtected(() => {
      setTaskToEdit(null);
      setTaskModalInitialDate(date);
      setIsTaskModalOpen(true);
    }, 'Add New Task');
  };

  const handleOpenEditTaskModal = (task: HRTask) => {
    executeProtected(() => {
      setTaskToEdit(task);
      setTaskModalInitialDate(task.date);
      setIsTaskModalOpen(true);
    }, `Edit Task "${task.title}"`);
  };

  const handleSaveTaskModal = async (
    taskData: Omit<HRTask, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    try {
      setSaveStatus('saving');
      if (existingId) {
        const updated = localStorageService.updateTask(existingId, taskData);
        setTasks((prev) => prev.map((t) => (t.id === existingId ? updated : t)));
      } else {
        const created = localStorageService.createTask(taskData);
        setTasks((prev) => [created, ...prev]);
      }
      setIsTaskModalOpen(false);
      setTaskToEdit(null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      queueAutoPush();
    } catch (err) {
      console.error('Failed to save task:', err);
      setSaveStatus('error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    executeProtected(async () => {
      try {
        setSaveStatus('saving');
        localStorageService.deleteTask(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        queueAutoPush();
      } catch (err) {
        console.error('Failed to delete task:', err);
        setSaveStatus('error');
      }
    }, 'Delete Task');
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    executeProtected(async () => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      const updated = localStorageService.updateTask(taskId, {
        status: newStatus,
        completed: newStatus === 'Completed',
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      queueAutoPush();
    }, 'Update Task Status');
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    executeProtected(async () => {
      const updated = localStorageService.updateTask(taskId, {
        status: newStatus,
        completed: newStatus === 'Completed',
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      queueAutoPush();
    }, 'Update Task Status');
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
          queueAutoPush();
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
      queueAutoPush();
    }, `Save Week ${reviewData.week_number} Review`);
  };

  const handleSaveAffirmation = async (newAffirmation: VisualAffirmationType) => {
    executeProtected(async () => {
      const res = await api.saveAffirmation(newAffirmation);
      setAffirmation(res.affirmation);
      queueAutoPush();
    }, 'Update Vision Affirmation');
  };

  // ----------------------------------------------------
  // Settings Handler
  // ----------------------------------------------------
  const handleUpdateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    // Theme and Google Sheets preference toggles don't require PIN gate
    if (key === 'theme' || String(key).startsWith('google_sheets_')) {
      const nextSettings = { ...settings, [key]: value };
      setSettings(nextSettings);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vignesh_settings', JSON.stringify(nextSettings));
        } catch {}
      }
      try {
        await api.saveSetting(key, value);
      } catch (err) {
        console.warn(`Failed to save ${String(key)} setting to server:`, err);
      }
      // If user toggled settings or linked a new sheet, reflect to sheet if not a timestamp
      if (key !== 'google_sheets_last_synced' && key !== 'google_sheets_last_pushed' && key !== 'google_sheets_last_pulled') {
        queueAutoPush();
      }
      return;
    }

    executeProtected(async () => {
      const nextSettings = { ...settings, [key]: value };
      setSettings(nextSettings);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vignesh_settings', JSON.stringify(nextSettings));
        } catch {}
      }
      try {
        await api.saveSetting(key, value);
        queueAutoPush();
      } catch (err) {
        console.error('Failed to save setting:', err);
      }
    }, `Update Preference (${String(key)})`);
  };

  // ----------------------------------------------------
  // Export Data Handler (CSV / JSON / Excel XLSX)
  // ----------------------------------------------------
  const handleExportData = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      if (format === 'xlsx') {
        // Fetch full dataset to generate multi-sheet Excel workbook client-side
        try {
          const res = await fetch('/api/export?format=json');
          if (res.ok) {
            const data = await res.json();
            downloadExcelWorkbook(data);
            return;
          }
        } catch {
          // Fallback to server streaming route
        }
        window.location.href = '/api/export?format=xlsx';
      } else if (format === 'csv') {
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

  // ----------------------------------------------------
  // Google Sheets Auto-Download on Refresh / Reload
  // ----------------------------------------------------
  useEffect(() => {
    if (!initialLoading && settings.google_sheets_auto_download_excel && typeof window !== 'undefined') {
      const todayDate = new Date().toISOString().split('T')[0];
      const sessionKey = 'vignesh_excel_auto_download_' + todayDate;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'done');
        handleExportData('xlsx');
      }
    }
  }, [initialLoading, settings.google_sheets_auto_download_excel]);

  // ----------------------------------------------------
  // Google Sheets Auto-Reflect (Google Sheet -> App)
  // Reflects changes on tab switch and every 30 seconds
  // ----------------------------------------------------
  useEffect(() => {
    const isAutoReflectActive = settings.google_sheets_auto_reflect !== false && settings.google_sheets_auto_pull !== false;
    if (!isAutoReflectActive || !settings.google_sheets_script_url) {
      return;
    }

    const reflectFromSheet = async () => {
      try {
        const pullRes = await api.pullGoogleSheets(settings.google_sheets_script_url!, false);
        if (pullRes?.data) {
          if (Array.isArray(pullRes.data.habits) && pullRes.data.habits.length > 0) {
            setHabits(pullRes.data.habits);
            try { localStorage.setItem('vignesh_cached_habits', JSON.stringify(pullRes.data.habits)); } catch {}
          }
          if (Array.isArray(pullRes.data.goals)) {
            setGoals(pullRes.data.goals);
          }
          if (Array.isArray(pullRes.data.mood_tracker)) {
            setCalendarMoodEntries(pullRes.data.mood_tracker);
          }
          if (Array.isArray(pullRes.data.daily_journal)) {
            setJournals(pullRes.data.daily_journal);
          }
          if (Array.isArray(pullRes.data.tasks)) {
            setTasks(pullRes.data.tasks);
            localStorageService.saveTasks(pullRes.data.tasks);
          }
        }
        loadMonthData();
      } catch (err) {
        console.warn('Auto-reflect sync error:', err);
      }
    };

    // Periodic check every 30 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reflectFromSheet();
      }
    }, 30000);

    // On browser tab focus / switch
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reflectFromSheet();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [settings.google_sheets_auto_reflect, settings.google_sheets_script_url, loadMonthData]);

  // ----------------------------------------------------
  // Google Sheets Auto-Push (App -> Google Sheet)
  // Debounced push whenever data mutations complete
  // ----------------------------------------------------
  const autoPushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullExportDataRef = useRef<FullExportData | null>(null);
  const queueAutoPush = useCallback(() => {
    const isAutoPushActive = settings.google_sheets_auto_push !== false && settings.google_sheets_auto_sync !== false;
    const targetUrl = settings.google_sheets_script_url?.trim();
    if (!isAutoPushActive || !targetUrl) return;

    setGoogleSheetsSyncStatus('syncing');

    if (autoPushTimerRef.current) clearTimeout(autoPushTimerRef.current);
    autoPushTimerRef.current = setTimeout(async () => {
      try {
        const payload = fullExportDataRef.current || undefined;
        const res = await api.syncGoogleSheets(targetUrl, payload);
        if (res.timestamp) {
          setGoogleSheetsSyncStatus('synced');
          handleUpdateSetting('google_sheets_last_synced', res.timestamp);
          handleUpdateSetting('google_sheets_last_pushed', res.timestamp);
          setTimeout(() => {
            setGoogleSheetsSyncStatus('idle');
          }, 3000);
        } else {
          setGoogleSheetsSyncStatus('idle');
        }
      } catch (err) {
        console.warn('Auto-push sync warning:', err);
        setGoogleSheetsSyncStatus('error');
        setTimeout(() => setGoogleSheetsSyncStatus('idle'), 4000);
      }
    }, 1200); // Responsive 1.2s debounce
  }, [settings.google_sheets_auto_push, settings.google_sheets_auto_sync, settings.google_sheets_script_url]);

  // ----------------------------------------------------
  // Global Real-Time Reflection Subscription
  // Automatically triggers Google Sheet auto-push whenever
  // ANY data changes anywhere in the website (habits, entries,
  // goals, journal, mood, reviews, plans, affirmations, etc.)
  // ----------------------------------------------------
  useEffect(() => {
    const unsubscribe = api.onDataMutated((info) => {
      if (info?.url?.includes('google_sheets_last_')) return;
      queueAutoPush();
    });
    return unsubscribe;
  }, [queueAutoPush]);

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

  // Full Relational Dataset for Excel Export & Google Sheets
  const fullExportData: FullExportData = useMemo(() => {
    const entriesList = Object.entries(entries).map(([key, completed]) => {
      const parts = key.split('_');
      const habitId = parts[0];
      const dateStr = parts.slice(1).join('_');
      return {
        id: makeUuid(),
        habit_id: habitId,
        date: dateStr,
        completed: !!completed,
        created_at: new Date().toISOString(),
      };
    });

    const categoriesList = Object.values(CATEGORIES_META).map((c) => ({
      id: c.id,
      name: c.label,
      icon: c.emoji,
      created_at: new Date().toISOString(),
    }));

    const affirmationsList = affirmation && affirmation.quote
      ? [
          {
            id: affirmation.id || makeUuid(),
            quote: affirmation.quote,
            author: affirmation.author || '',
            image_url: affirmation.image_url || '',
            active: affirmation.active !== false,
            created_at: affirmation.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      : [];

    return {
      app: 'Vignesh Habit Tracker',
      version: '3.0',
      exported_at: new Date().toISOString(),
      habits,
      habit_entries: entriesList,
      goals,
      mood_tracker: calendarMoodEntries,
      daily_journal: journals,
      weekly_reviews: Object.values(weeklyReviews),
      weekly_plans: weeklyPlans,
      reflections: reflectionContent
        ? [
            {
              id: makeUuid(),
              month: currentMonth,
              year: currentYear,
              content: reflectionContent,
              created_at: new Date().toISOString(),
            },
          ]
        : [],
      habit_categories: categoriesList,
      affirmations: affirmationsList,
      tasks,
      notes: localStorageService.getNotes(),
      settings,
    };
  }, [
    habits,
    entries,
    goals,
    calendarMoodEntries,
    journals,
    weeklyReviews,
    weeklyPlans,
    reflectionContent,
    currentMonth,
    currentYear,
    affirmation,
    tasks,
    settings,
  ]);
  fullExportDataRef.current = fullExportData;

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
      queueAutoPush();
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
        isUnlocked={isUnlocked}
        onLock={lock}
        onUnlockRequest={() => requestUnlock('Unlock Editing Mode')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExportData}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        googleSheetsStatus={googleSheetsSyncStatus}
        isGoogleSheetsLinked={Boolean(settings.google_sheets_script_url?.trim())}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
        isDatabaseSyncing={isDatabaseSyncing}
      />

      {/* Main Content Area - Renders immediately without blocking the web view */}
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
                  onOpenJournalTab={() => setActiveTab('journal')}
                  onOpenMoodTab={() => setActiveTab('mood')}
                  onRequireUnlock={() => requestUnlock('Unlock Editing Mode')}
                  onDuplicateHabit={handleDuplicateHabit}
                />
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="animate-in fade-in duration-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ECE6DC] dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 bg-[#F0EBE1] dark:bg-slate-800 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setTasksSubView('table')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tasksSubView === 'table'
                            ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                            : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                        }`}
                      >
                        Table View
                      </button>
                      <button
                        type="button"
                        onClick={() => setTasksSubView('kanban')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tasksSubView === 'kanban'
                            ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                            : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                        }`}
                      >
                        Kanban Board
                      </button>
                      <button
                        type="button"
                        onClick={() => setTasksSubView('calendar')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tasksSubView === 'calendar'
                            ? 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white shadow-2xs'
                            : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white'
                        }`}
                      >
                        Tasks Calendar
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenNewTaskModal()}
                    className="inline-flex items-center gap-2 bg-[#5B8266] hover:bg-[#4A6F54] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    + New Task
                  </button>
                </div>

                {tasksSubView === 'table' && (
                  <TasksTableView
                    tasks={tasks}
                    onOpenNewTaskModal={() => handleOpenNewTaskModal()}
                    onEditTask={handleOpenEditTaskModal}
                    onDeleteTask={handleDeleteTask}
                    onToggleStatus={handleToggleTaskStatus}
                    isUnlocked={isUnlocked}
                    onRequestUnlock={() => requestUnlock('Unlock Tasks Editing')}
                  />
                )}

                {tasksSubView === 'kanban' && (
                  <KanbanBoardView
                    tasks={tasks}
                    onOpenNewTaskModal={() => handleOpenNewTaskModal()}
                    onEditTask={handleOpenEditTaskModal}
                    onDeleteTask={handleDeleteTask}
                    onUpdateStatus={handleUpdateTaskStatus}
                  />
                )}

                {tasksSubView === 'calendar' && (
                  <CalendarTasksView
                    tasks={tasks}
                    onOpenNewTaskModal={handleOpenNewTaskModal}
                    onEditTask={handleOpenEditTaskModal}
                  />
                )}
              </div>
            )}

            {/* 2. MY JOURNAL TAB */}
            {activeTab === 'journal' && (
              <div className="animate-in fade-in duration-200">
                <JournalView
                  habits={habits}
                  entries={entries}
                  initialJournals={journals}
                  onUpdateJournals={setJournals}
                  isUnlocked={isUnlocked}
                  onRequireUnlock={() => requestUnlock('Unlock Editing Mode')}
                  onSwitchTab={setActiveTab}
                />
              </div>
            )}

            {/* 3. VISION & GOALS TAB */}
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
                  dbStatusMessage={dbStatusMessage}
                  onUpdateSetting={handleUpdateSetting}
                  onRestoreHabit={(h: any) => handleRestoreHabit(typeof h === 'string' ? h : h?.id)}
                  onPermanentlyDeleteHabit={(h: any) => handlePermanentlyDeleteHabit(typeof h === 'string' ? h : h?.id)}
                  onExport={handleExportData}
                  onImportSuccess={() => loadMonthData()}
                  onOpenExcelExport={() => setIsExcelExportModalOpen(true)}
                  onOpenExcelImport={() => setIsExcelImportModalOpen(true)}
                  onOpenGoogleSheetsSync={() => setIsGoogleSheetsModalOpen(true)}
                />
              </div>
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

      {/* Floating Excel Import Notice Toast */}
      {excelImportNotice && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{excelImportNotice}</span>
            <button
              type="button"
              onClick={() => setExcelImportNotice(null)}
              className="text-white/70 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Google Sheets Notice Toast */}
      {googleSheetsNotice && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{googleSheetsNotice}</span>
            <button
              type="button"
              onClick={() => setGoogleSheetsNotice(null)}
              className="text-white/70 hover:text-white p-1 cursor-pointer"
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
            {settings.google_sheets_script_url ? '📊 Synced to Google Sheet Cloud' : '💾 Persistent Local Storage Active'}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddHabitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddHabit as any}
      />

      <EditHabitModal
        habit={editingHabit}
        isOpen={!!editingHabit}
        onClose={() => setEditingHabit(null)}
        onSave={handleEditHabit as any}
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

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        existingData={{ habits, goals }}
        onSuccess={(importSummary) => {
          loadMonthData();
          setExcelImportNotice(
            `Successfully imported ${importSummary.validRowsCount} records from Excel spreadsheet!`
          );
          setTimeout(() => setExcelImportNotice(null), 6000);
        }}
      />

      {/* Excel Export Modal */}
      <ExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        exportData={fullExportData}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        settings={settings}
        habitsCount={habits.length}
        entriesCount={Object.keys(entries).length}
        moodsCount={calendarMoodEntries.length}
        goalsCount={goals.length}
        journalsCount={journals.length + (reflectionContent ? 1 : 0)}
        tasksCount={tasks.length}
        notesCount={localStorageService.getNotes().length}
        onUpdateSetting={handleUpdateSetting}
        onRefreshData={() => loadMonthData()}
        fullExportData={fullExportData}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={handleSaveTaskModal}
        taskToEdit={taskToEdit}
        initialDate={taskModalInitialDate}
      />
    </div>
  );
}

export default App;
