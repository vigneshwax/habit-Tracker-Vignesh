import React, { useState, useMemo } from 'react';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Minus,
  Flame,
  Trophy,
  Filter,
  Search,
  Layers,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { Habit } from '../types';
import {
  MONTH_NAMES,
  WEEKDAYS,
  getDaysInMonth,
  formatDateKey,
  getFirstDayOfMonth,
  getTodayDateInfo,
} from '../utils/date';
import { getCategoryMeta } from '../utils/categories';
import { isHabitScheduledOnDate, getDayProgress, getHabitOpportunities } from '../utils/scheduler';

interface TaskAnalyticsSectionProps {
  habits: Habit[];
  entries: Record<string, boolean>; // key: `${habit_id}_${date}`
  currentYear: number;
  habitStreaks?: Record<string, { current: number; best: number; totalCompletions: number }>;
  selectedTaskId: string; // 'all' or habit.id
  onSelectTask: (taskId: string) => void;
}

type TimeframeScope = 'overall' | number; // 'overall' or month 1-12
type ViewDisplayMode = 'both' | 'heatmap' | 'graph';

export const TaskAnalyticsSection: React.FC<TaskAnalyticsSectionProps> = ({
  habits,
  entries,
  currentYear,
  habitStreaks,
  selectedTaskId,
  onSelectTask,
}) => {
  const todayInfo = useMemo(() => getTodayDateInfo(), []);

  // Timeframe: 'overall' or 1..12
  const [timeframeScope, setTimeframeScope] = useState<TimeframeScope>('overall');
  // View mode: both, heatmap, graph
  const [displayMode, setDisplayMode] = useState<ViewDisplayMode>('both');
  // Task search filter
  const [searchQuery, setSearchQuery] = useState('');
  // Task category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // Hovered day / month for interactive tooltip
  const [hoveredDate, setHoveredDate] = useState<{
    label: string;
    sublabel: string;
    statusText: string;
    statusColor: string;
    completed: number;
    total: number;
    pct: number;
  } | null>(null);

  // Active (non-archived) habits
  const activeHabits = useMemo(
    () => habits.filter((h) => h.status !== 'archived'),
    [habits]
  );

  // Selected single habit (if not 'all')
  const selectedHabit = useMemo(() => {
    if (selectedTaskId === 'all') return null;
    return activeHabits.find((h) => h.id === selectedTaskId) || null;
  }, [activeHabits, selectedTaskId]);

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeHabits.forEach((h) => {
      if (h.category) set.add(h.category);
    });
    return Array.from(set);
  }, [activeHabits]);

  // Filtered habits list for the task selector
  const filteredHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'all' || h.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [activeHabits, searchQuery, categoryFilter]);

  // Compute metrics for the selected task (or all) within the chosen timeframe
  const metrics = useMemo(() => {
    const isSingle = !!selectedHabit;
    const targetHabits = selectedHabit ? [selectedHabit] : activeHabits;

    const startMonth = timeframeScope === 'overall' ? 1 : timeframeScope;
    const endMonth = timeframeScope === 'overall' ? 12 : timeframeScope;

    let completedCount = 0;
    let scheduledOpportunities = 0;

    for (let m = startMonth; m <= endMonth; m++) {
      const days = getDaysInMonth(currentYear, m);
      for (let d = 1; d <= days; d++) {
        const dateKey = formatDateKey(currentYear, m, d);
        targetHabits.forEach((h) => {
          const isSched = isHabitScheduledOnDate(h, dateKey);
          if (isSched) {
            scheduledOpportunities++;
            if (entries[`${h.id}_${dateKey}`]) {
              completedCount++;
            }
          }
        });
      }
    }

    const pct =
      scheduledOpportunities > 0
        ? Math.round((completedCount / scheduledOpportunities) * 100)
        : 0;

    const streak = selectedHabit
      ? habitStreaks?.[selectedHabit.id] || { current: 0, best: 0, totalCompletions: 0 }
      : null;

    return {
      completedCount,
      scheduledOpportunities,
      percentage: pct,
      currentStreak: streak?.current ?? 0,
      bestStreak: streak?.best ?? 0,
      isSingle,
    };
  }, [selectedHabit, activeHabits, timeframeScope, currentYear, entries, habitStreaks]);

  // -------------------------------------------------------------
  // HEATMAP DATA CALCULATION
  // -------------------------------------------------------------

  // 1. Full Year (52 weeks) Grid
  const annualHeatmapGrid = useMemo(() => {
    const weeks: Array<
      Array<{
        dateStr: string;
        day: number;
        month: number;
        isScheduled: boolean;
        isCompleted: boolean;
        completedCount: number;
        scheduledCount: number;
        pct: number;
      }>
    > = [];

    let currentWeek: Array<{
      dateStr: string;
      day: number;
      month: number;
      isScheduled: boolean;
      isCompleted: boolean;
      completedCount: number;
      scheduledCount: number;
      pct: number;
    }> = [];

    // Pad beginning of year
    const startDayOfWeek = new Date(currentYear, 0, 1).getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({
        dateStr: '',
        day: 0,
        month: 0,
        isScheduled: false,
        isCompleted: false,
        completedCount: 0,
        scheduledCount: 0,
        pct: -1,
      });
    }

    for (let m = 1; m <= 12; m++) {
      const days = getDaysInMonth(currentYear, m);
      for (let d = 1; d <= days; d++) {
        const dateKey = formatDateKey(currentYear, m, d);

        if (selectedHabit) {
          const isSched = isHabitScheduledOnDate(selectedHabit, dateKey);
          const isDone = !!entries[`${selectedHabit.id}_${dateKey}`];
          currentWeek.push({
            dateStr: dateKey,
            day: d,
            month: m,
            isScheduled: isSched,
            isCompleted: isDone,
            completedCount: isDone ? 1 : 0,
            scheduledCount: isSched ? 1 : 0,
            pct: isSched ? (isDone ? 100 : 0) : -1,
          });
        } else {
          const dayProg = getDayProgress(activeHabits, dateKey, entries);
          currentWeek.push({
            dateStr: dateKey,
            day: d,
            month: m,
            isScheduled: dayProg.totalScheduled > 0,
            isCompleted: dayProg.completedCount > 0,
            completedCount: dayProg.completedCount,
            scheduledCount: dayProg.totalScheduled,
            pct: dayProg.percentage,
          });
        }

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          dateStr: '',
          day: 0,
          month: 0,
          isScheduled: false,
          isCompleted: false,
          completedCount: 0,
          scheduledCount: 0,
          pct: -1,
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, selectedHabit, activeHabits, entries]);

  // 2. Month Calendar Heatmap Grid (when a specific month is selected)
  const monthCalendarGrid = useMemo(() => {
    if (timeframeScope === 'overall') return null;
    const month = timeframeScope;
    const daysCount = getDaysInMonth(currentYear, month);
    const firstDay = getFirstDayOfMonth(currentYear, month);

    const cells: Array<{
      day: number;
      dateStr: string;
      isScheduled: boolean;
      isCompleted: boolean;
      completedCount: number;
      scheduledCount: number;
      pct: number;
      isToday: boolean;
    } | null> = [];

    // Prepend nulls for offset
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysCount; d++) {
      const dateKey = formatDateKey(currentYear, month, d);
      const isToday =
        currentYear === todayInfo.year &&
        month === todayInfo.month &&
        d === todayInfo.day;

      if (selectedHabit) {
        const isSched = isHabitScheduledOnDate(selectedHabit, dateKey);
        const isDone = !!entries[`${selectedHabit.id}_${dateKey}`];
        cells.push({
          day: d,
          dateStr: dateKey,
          isScheduled: isSched,
          isCompleted: isDone,
          completedCount: isDone ? 1 : 0,
          scheduledCount: isSched ? 1 : 0,
          pct: isSched ? (isDone ? 100 : 0) : -1,
          isToday,
        });
      } else {
        const dayProg = getDayProgress(activeHabits, dateKey, entries);
        cells.push({
          day: d,
          dateStr: dateKey,
          isScheduled: dayProg.totalScheduled > 0,
          isCompleted: dayProg.completedCount > 0,
          completedCount: dayProg.completedCount,
          scheduledCount: dayProg.totalScheduled,
          pct: dayProg.percentage,
          isToday,
        });
      }
    }

    return cells;
  }, [timeframeScope, currentYear, selectedHabit, activeHabits, entries, todayInfo]);

  // -------------------------------------------------------------
  // GRAPH DATA CALCULATION
  // -------------------------------------------------------------

  // Case A: 12-Month Bar & Curve (When Overall is selected)
  const annualGraphData = useMemo(() => {
    if (timeframeScope !== 'overall') return [];

    return MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const days = getDaysInMonth(currentYear, monthNum);
      let completed = 0;
      let scheduled = 0;

      const targetHabits = selectedHabit ? [selectedHabit] : activeHabits;

      for (let d = 1; d <= days; d++) {
        const key = formatDateKey(currentYear, monthNum, d);
        targetHabits.forEach((h) => {
          if (isHabitScheduledOnDate(h, key)) {
            scheduled++;
            if (entries[`${h.id}_${key}`]) {
              completed++;
            }
          }
        });
      }

      const pct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

      return {
        monthNum,
        monthName: name,
        shortName: name.substring(0, 3),
        completed,
        scheduled,
        pct,
      };
    });
  }, [timeframeScope, currentYear, selectedHabit, activeHabits, entries]);

  // Case B: Day-by-day Progression Chart (When a specific month is selected)
  const monthDailyGraphData = useMemo(() => {
    if (timeframeScope === 'overall') return [];
    const month = timeframeScope;
    const daysCount = getDaysInMonth(currentYear, month);
    const targetHabits = selectedHabit ? [selectedHabit] : activeHabits;

    let runningCumulative = 0;
    const daysData = [];

    for (let d = 1; d <= daysCount; d++) {
      const key = formatDateKey(currentYear, month, d);
      let dayCompleted = 0;
      let dayScheduled = 0;

      targetHabits.forEach((h) => {
        if (isHabitScheduledOnDate(h, key)) {
          dayScheduled++;
          if (entries[`${h.id}_${key}`]) {
            dayCompleted++;
          }
        }
      });

      runningCumulative += dayCompleted;
      const dayPct = dayScheduled > 0 ? Math.round((dayCompleted / dayScheduled) * 100) : 0;

      daysData.push({
        day: d,
        dateStr: key,
        completed: dayCompleted,
        scheduled: dayScheduled,
        isCompleted: dayCompleted > 0,
        pct: dayPct,
        cumulative: runningCumulative,
      });
    }

    return daysData;
  }, [timeframeScope, currentYear, selectedHabit, activeHabits, entries]);

  // Cell Color for single task annual heatmap
  const getSingleTaskHeatmapColor = (isSched: boolean, isDone: boolean) => {
    if (!isSched) return 'bg-[#FAF8F5] dark:bg-slate-800/40 border border-[#EBE5DB] dark:border-slate-800 text-slate-300';
    if (isDone) return 'bg-[#2E5338] dark:bg-emerald-600 border border-[#1E3B27] dark:border-emerald-500 text-white';
    return 'bg-[#FFF1F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-900/60 text-rose-400';
  };

  // Cell Color for all tasks annual heatmap
  const getAllTasksHeatmapColor = (pct: number) => {
    if (pct < 0) return 'bg-transparent';
    if (pct === 0) return 'bg-[#EAE4D9] dark:bg-slate-700/60';
    if (pct < 40) return 'bg-[#C5DACB] dark:bg-emerald-900/40';
    if (pct < 70) return 'bg-[#8FB89A] dark:bg-emerald-700/60';
    if (pct < 100) return 'bg-[#5B8266] dark:bg-emerald-600';
    return 'bg-[#2E5338] dark:bg-emerald-500';
  };

  return (
    <div id="task-analytics-section" className="space-y-6">
      {/* 1. TOP SELECTOR & SCOPE BAR */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
                Task Deep-Dive & Visual Trends
              </h3>
            </div>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1">
              Select any habit from your list to inspect its dedicated daily heatmap and progress graph across months or the entire year.
            </p>
          </div>

          {/* View Mode Toggle (Both / Heatmap / Graph) */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] dark:bg-slate-900 p-1.5 rounded-2xl border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setDisplayMode('both')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                displayMode === 'both'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Both Views
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('heatmap')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                displayMode === 'heatmap'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Heatmap Only
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('graph')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                displayMode === 'graph'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Graph Only
            </button>
          </div>
        </div>

        {/* 2. TASK LIST SELECTOR PILLS */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Choose Task to Inspect:
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                {activeHabits.length} habits
              </span>
            </div>

            {/* Quick search input if more than 4 habits */}
            {activeHabits.length > 4 && (
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-[#2D2A26] dark:text-white placeholder-slate-400"
                />
              </div>
            )}
          </div>

          {/* Horizontal scrollable / wrap task pills */}
          <div className="flex flex-wrap gap-2 pt-1 max-h-[160px] overflow-y-auto pr-1">
            {/* "All Tasks" button */}
            <button
              id="select-task-all"
              type="button"
              onClick={() => onSelectTask('all')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                selectedTaskId === 'all'
                  ? 'bg-[#2E5338] text-white border-[#1E3B27] shadow-sm ring-2 ring-emerald-600/30'
                  : 'bg-[#FAF8F5] dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-[#E8E2D7] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Tasks (Overview)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  selectedTaskId === 'all'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {activeHabits.length}
              </span>
            </button>

            {/* Individual Task Buttons */}
            {filteredHabits.map((habit) => {
              const meta = getCategoryMeta(habit.category);
              const isSelected = selectedTaskId === habit.id;
              const streak = habitStreaks?.[habit.id]?.current ?? 0;

              return (
                <button
                  key={habit.id}
                  id={`select-task-${habit.id}`}
                  type="button"
                  onClick={() => onSelectTask(habit.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30 font-bold'
                      : 'bg-[#FAF8F5] dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-[#E8E2D7] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm">{meta.emoji}</span>
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">{habit.name}</span>
                  {streak > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 ${
                        isSelected
                          ? 'bg-emerald-800 text-amber-200'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <Flame className="w-2.5 h-2.5 fill-current" />
                      {streak}d
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. TIMEFRAME SCOPE SELECTOR (Overall vs. Months) */}
        <div className="pt-3 border-t border-[#F0EBE1] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Timeframe Scope:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F5] dark:bg-slate-900 p-1 rounded-2xl border border-[#E5DFD5] dark:border-slate-700">
            {/* Overall full year button */}
            <button
              id="timeframe-overall"
              type="button"
              onClick={() => setTimeframeScope('overall')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeframeScope === 'overall'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Overall ({currentYear})
            </button>

            {/* Individual month buttons */}
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 hidden sm:block" />

            {MONTH_NAMES.map((name, idx) => {
              const monthNum = idx + 1;
              const isSelected = timeframeScope === monthNum;
              const isCurrent = currentYear === todayInfo.year && monthNum === todayInfo.month;

              return (
                <button
                  key={monthNum}
                  id={`timeframe-month-${monthNum}`}
                  type="button"
                  onClick={() => setTimeframeScope(monthNum)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                  title={name}
                >
                  {name.substring(0, 3)}
                  {isCurrent && (
                    <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SELECTED TASK HEADER CARD & PERFORMANCE METRICS */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
          <div className="flex items-center gap-3">
            {selectedHabit ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-2xl shadow-2xs">
                  {getCategoryMeta(selectedHabit.category).emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white">
                      {selectedHabit.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        getCategoryMeta(selectedHabit.category).badgeBg
                      } ${getCategoryMeta(selectedHabit.category).badgeText}`}
                    >
                      {getCategoryMeta(selectedHabit.category).label}
                    </span>
                  </div>
                  <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                    {timeframeScope === 'overall'
                      ? `Viewing Annual Trend across all 12 Months of ${currentYear}`
                      : `Viewing Daily Rhythm for ${MONTH_NAMES[timeframeScope - 1]} ${currentYear}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-2xs">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white">
                    All Active Tasks (Combined)
                  </h3>
                  <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                    {timeframeScope === 'overall'
                      ? `Aggregate performance across ${activeHabits.length} habits for ${currentYear}`
                      : `Aggregate daily performance for ${MONTH_NAMES[timeframeScope - 1]} ${currentYear}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Return to all button if specific habit is selected */}
          {selectedHabit && (
            <button
              type="button"
              onClick={() => onSelectTask('all')}
              className="text-xs font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <span>← View All Tasks</span>
            </button>
          )}
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Completion Count */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900/60 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completions Logged
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold text-[#2D2A26] dark:text-white">
                {metrics.completedCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                / {metrics.scheduledOpportunities} scheduled
              </span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-[#F3F7F4] dark:bg-emerald-950/30 p-4 rounded-2xl border border-[#D8E6DB] dark:border-emerald-900/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Consistency Rate
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold text-emerald-900 dark:text-emerald-200">
                {metrics.percentage}%
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">target: 80%</span>
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-[#FAF4EE] dark:bg-amber-950/30 p-4 rounded-2xl border border-[#EFE4D7] dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Current Streak
              </span>
              <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-200">
                {metrics.currentStreak}{' '}
                <span className="text-xs font-sans font-normal text-amber-700 dark:text-amber-400">
                  Days
                </span>
              </span>
            </div>
          </div>

          {/* Best Streak */}
          <div className="bg-[#FEF9E7] dark:bg-yellow-950/30 p-4 rounded-2xl border border-[#F5E8B8] dark:border-yellow-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-300">
                All-Time Best
              </span>
              <Trophy className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-serif font-bold text-yellow-900 dark:text-yellow-200">
                {metrics.bestStreak}{' '}
                <span className="text-xs font-sans font-normal text-yellow-700 dark:text-yellow-400">
                  Days
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DEDICATED HEATMAP VIEW */}
      {(displayMode === 'both' || displayMode === 'heatmap') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
            <div>
              <h4 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-2">
                <span>🔥</span>
                <span>
                  {selectedHabit ? `Heatmap: ${selectedHabit.name}` : 'Heatmap: All Tasks'}
                </span>
              </h4>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                {timeframeScope === 'overall'
                  ? '52-week contribution matrix across the full calendar year'
                  : `Daily completion calendar for ${MONTH_NAMES[timeframeScope - 1]} ${currentYear}`}
              </p>
            </div>

            {/* Heatmap Legend */}
            {selectedHabit ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#2E5338] dark:bg-emerald-600 border border-[#1E3B27]" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#FFF1F2] dark:bg-rose-950/60 border border-[#FECDD3] dark:border-rose-800" />
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#FAF8F5] dark:bg-slate-800 border border-[#EBE5DB] dark:border-slate-700" />
                  <span>Rest / Not Sched</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span>0%</span>
                <span className="w-3 h-3 rounded-xs bg-[#EAE4D9] dark:bg-slate-700" />
                <span className="w-3 h-3 rounded-xs bg-[#C5DACB] dark:bg-emerald-900/40" />
                <span className="w-3 h-3 rounded-xs bg-[#8FB89A] dark:bg-emerald-700/60" />
                <span className="w-3 h-3 rounded-xs bg-[#5B8266] dark:bg-emerald-600" />
                <span className="w-3 h-3 rounded-xs bg-[#2E5338] dark:bg-emerald-500" />
                <span>100%</span>
              </div>
            )}
          </div>

          {/* A. Overall 52-Week Horizontal Heatmap */}
          {timeframeScope === 'overall' && (
            <div className="overflow-x-auto pb-3 pt-1">
              <div className="min-w-[760px] space-y-2">
                {/* Month labels header */}
                <div className="flex text-[10px] font-bold text-slate-400 dark:text-slate-500 pl-8">
                  {MONTH_NAMES.map((m, idx) => (
                    <div key={idx} className="flex-1">
                      {m.substring(0, 3)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  {/* Day of week labels */}
                  <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 pr-1 select-none">
                    <span className="h-3 leading-3">Sun</span>
                    <span className="h-3 leading-3">Mon</span>
                    <span className="h-3 leading-3">Tue</span>
                    <span className="h-3 leading-3">Wed</span>
                    <span className="h-3 leading-3">Thu</span>
                    <span className="h-3 leading-3">Fri</span>
                    <span className="h-3 leading-3">Sat</span>
                  </div>

                  {/* Matrix Columns */}
                  <div className="flex gap-1 flex-1">
                    {annualHeatmapGrid.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((cell, dIdx) => {
                          if (!cell.dateStr) {
                            return (
                              <div
                                key={dIdx}
                                className="w-3 h-3 rounded-xs bg-transparent"
                              />
                            );
                          }

                          const tooltipTitle = selectedHabit
                            ? `${cell.dateStr}: ${
                                !cell.isScheduled
                                  ? 'Not Scheduled'
                                  : cell.isCompleted
                                  ? 'Completed ✓'
                                  : 'Missed'
                              }`
                            : `${cell.dateStr}: ${cell.completedCount}/${cell.scheduledCount} completed (${cell.pct}%)`;

                          return (
                            <div
                              key={dIdx}
                              className={`w-3 h-3 rounded-xs transition-transform hover:scale-150 cursor-pointer ${
                                selectedHabit
                                  ? getSingleTaskHeatmapColor(
                                      cell.isScheduled,
                                      cell.isCompleted
                                    )
                                  : getAllTasksHeatmapColor(cell.pct)
                              }`}
                              title={tooltipTitle}
                              onMouseEnter={() => {
                                setHoveredDate({
                                  label: cell.dateStr,
                                  sublabel: `${WEEKDAYS[dIdx]}`,
                                  statusText: selectedHabit
                                    ? !cell.isScheduled
                                    : `${cell.completedCount} / ${cell.scheduledCount} tasks`,
                                  statusColor: cell.isCompleted
                                    ? 'text-emerald-600'
                                    : 'text-slate-500',
                                  completed: cell.completedCount,
                                  total: cell.scheduledCount,
                                  pct: cell.pct,
                                });
                              }}
                              onMouseLeave={() => setHoveredDate(null)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. Specific Month Calendar Heatmap Grid */}
          {timeframeScope !== 'overall' && monthCalendarGrid && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-1">
                {WEEKDAYS.map((w, idx) => (
                  <div key={idx} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthCalendarGrid.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={idx}
                        className="h-16 sm:h-20 rounded-2xl bg-transparent border border-dashed border-transparent"
                      />
                    );
                  }

                  const isSingle = !!selectedHabit;

                  return (
                    <div
                      key={idx}
                      className={`h-16 sm:h-20 p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                        cell.isToday ? 'ring-2 ring-emerald-500 shadow-xs' : ''
                      } ${
                        isSingle
                          ? !cell.isScheduled
                            ? 'bg-[#FAF8F5] dark:bg-slate-900/50 border-[#E8E2D7] dark:border-slate-800 opacity-60'
                            : cell.isCompleted
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                            : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                          : cell.pct === 100
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                          : cell.pct > 0
                          ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                          : 'bg-[#FAF8F5] dark:bg-slate-900/50 border-[#E8E2D7] dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            cell.isToday
                              ? 'w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {cell.day}
                        </span>
                        {isSingle ? (
                          cell.isScheduled ? (
                            cell.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                            )
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-slate-400" />
                          )
                        ) : (
                          cell.scheduledCount > 0 && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                              {cell.completedCount}/{cell.scheduledCount}
                            </span>
                          )
                        )}
                      </div>

                      <div className="text-[10px] truncate">
                        {isSingle ? (
                          cell.isScheduled ? (
                            <span
                              className={`font-semibold ${
                                cell.isCompleted
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {cell.isCompleted ? 'Completed' : 'Missed'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Rest day</span>
                          )
                        ) : (
                          cell.scheduledCount > 0 && (
                            <div className="space-y-1">
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${cell.pct}%` }}
                                />
                              </div>
                              <span className="font-semibold text-slate-600 dark:text-slate-400 block text-right">
                                {cell.pct}%
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Inspection Tooltip Bar */}
          {hoveredDate && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 text-xs flex items-center justify-between animate-in fade-in duration-100">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-emerald-400">{hoveredDate.label}</span>
                <span className="text-slate-400">({hoveredDate.sublabel})</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{hoveredDate.statusText}</span>
                {hoveredDate.pct >= 0 && (
                  <span className="font-bold text-emerald-300">{hoveredDate.pct}%</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. DEDICATED GRAPH VIEW */}
      {(displayMode === 'both' || displayMode === 'graph') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
            <div>
              <h4 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {selectedHabit ? `Trend Graph: ${selectedHabit.name}` : 'Trend Graph: All Tasks'}
                </span>
              </h4>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                {timeframeScope === 'overall'
                  ? 'Monthly completion rate (%) & logged frequency across the year'
                  : `Day-by-day progression and cumulative velocity for ${
                      MONTH_NAMES[timeframeScope - 1]
                    } ${currentYear}`}
              </p>
            </div>

            {/* Benchmark & legend */}
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span>Completion %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500" />
                <span>80% Target</span>
              </div>
            </div>
          </div>

          {/* A. 12-Month Progression Graph (when Overall is selected) */}
          {timeframeScope === 'overall' && (
            <div className="pt-2">
              <div className="relative h-64 w-full">
                {/* 80% Benchmark Line */}
                <div
                  className="absolute left-10 right-2 border-b-2 border-dashed border-amber-400/80 pointer-events-none z-10 flex items-center justify-end"
                  style={{ top: '20%' }}
                >
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800 px-1 rounded -translate-y-2">
                    80% Target
                  </span>
                </div>

                {/* 50% Mid Line */}
                <div
                  className="absolute left-10 right-2 border-b border-dashed border-slate-200 dark:border-slate-700 pointer-events-none"
                  style={{ top: '50%' }}
                >
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 -translate-y-2 inline-block">
                    50%
                  </span>
                </div>

                {/* SVG Graph Curve & Bars */}
                <div className="h-full flex items-end gap-2 sm:gap-4 pl-8 pr-2 pb-6 border-b border-slate-200 dark:border-slate-700 relative">
                  {/* Y-Axis labels */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-mono text-slate-400 select-none">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  {annualGraphData.map((item) => {
                    const barHeight = Math.max(4, item.pct);

                    return (
                      <div
                        key={item.monthNum}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                      >
                        {/* Interactive Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                          <div className="bg-slate-900 text-white dark:bg-slate-950 text-[11px] font-bold py-1.5 px-3 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap text-center">
                            <div>{item.monthName}</div>
                            <div className="text-emerald-400 font-mono text-xs">
                              {item.pct}% ({item.completed}/{item.scheduled})
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                        </div>

                        {/* Bar Container */}
                        <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-700/50 rounded-t-xl h-full flex items-end p-0.5 transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              item.pct >= 80
                                ? 'bg-emerald-600 dark:bg-emerald-500'
                                : item.pct >= 50
                                ? 'bg-emerald-700/80 dark:bg-emerald-600/80'
                                : 'bg-emerald-800/50 dark:bg-emerald-700/50'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          />
                        </div>

                        {/* Month Label */}
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2 font-mono group-hover:text-emerald-600 transition-colors">
                          {item.shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* B. Day-by-Day Daily Progress Chart (when specific Month is selected) */}
          {timeframeScope !== 'overall' && (
            <div className="pt-2 space-y-4">
              <div className="relative h-64 w-full">
                {/* SVG Curve for Cumulative or Daily Consistency */}
                <div className="h-full flex items-end gap-1 pl-8 pr-2 pb-6 border-b border-slate-200 dark:border-slate-700 relative">
                  {/* Y-Axis Labels */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-mono text-slate-400 select-none">
                    <span>Max</span>
                    <span>Mid</span>
                    <span>0</span>
                  </div>

                  {monthDailyGraphData.map((item) => {
                    const isDone = item.completed > 0;
                    const maxCum =
                      monthDailyGraphData[monthDailyGraphData.length - 1]?.cumulative || 1;
                    const cumHeight = Math.max(6, Math.round((item.cumulative / maxCum) * 100));

                    return (
                      <div
                        key={item.day}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                          <div className="bg-slate-900 text-white dark:bg-slate-950 text-[11px] font-bold py-1.5 px-2.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap text-center">
                            <div>Day {item.day}</div>
                            <div className="text-emerald-400 font-mono">
                              {selectedHabit
                                ? item.scheduled === 0
                                  ? 'Rest Day'
                                  : isDone
                                  ? 'Completed ✓'
                                  : 'Missed'
                                : `${item.completed}/${item.scheduled} done (${item.pct}%)`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Cumulative: {item.cumulative} checks
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                        </div>

                        {/* Daily Status Pillar */}
                        <div className="w-full max-w-[14px] bg-slate-100 dark:bg-slate-800 rounded-t-sm h-full flex flex-col justify-end p-0.5">
                          {/* Cumulative fill layer */}
                          <div
                            className={`w-full rounded-t-xs transition-all ${
                              isDone
                                ? 'bg-emerald-600 dark:bg-emerald-500'
                                : item.scheduled > 0
                                ? 'bg-rose-300 dark:bg-rose-900'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                            style={{ height: `${cumHeight}%` }}
                          />
                        </div>

                        {/* Day number (show every 2nd or 3rd day to avoid clutter) */}
                        <span className="text-[9px] font-mono text-slate-400 mt-1.5">
                          {item.day % 3 === 1 || item.day === monthDailyGraphData.length
                            ? item.day
                            : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
                <span>Day 1</span>
                <span>Days 15 (Mid-Month)</span>
                <span>Day {monthDailyGraphData.length} (End of Month)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
