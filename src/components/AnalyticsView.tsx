import React, { useState, useMemo } from 'react';
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Award,
  Flame,
  Calendar,
  BarChart3,
  CheckCircle2,
  ArrowUpDown,
  Compass,
  Check,
  Zap,
} from 'lucide-react';
import { Habit, HabitCategory } from '../types';
import { MONTH_NAMES, WEEKDAYS, getDaysInMonth, formatDateKey } from '../utils/date';
import { getCategoryMeta, CATEGORIES_META } from '../utils/categories';
import { getHabitOpportunities, getHabitProgress, getDayProgress, getMonthWeekNumber } from '../utils/scheduler';
import { TaskAnalyticsSection } from './TaskAnalyticsSection';

interface AnalyticsViewProps {
  habits: Habit[];
  entries: Record<string, boolean>; // key: `${habit_id}_${date}`
  currentYear: number;
  onYearChange: (year: number) => void;
  streakDays: number;
  bestStreakDays: number;
  habitStreaks?: Record<string, { current: number; best: number; totalCompletions: number }>;
}

type SortField = 'percentage' | 'currentStreak' | 'bestStreak' | 'completed';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  habits,
  entries,
  currentYear,
  onYearChange,
  streakDays,
  bestStreakDays,
  habitStreaks,
}) => {
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const element = document.getElementById('task-analytics-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Active habits list
  const activeHabits = useMemo(() => habits.filter((h) => h.status !== 'archived'), [habits]);

  // Aggregate stats across all 12 months for the selected year
  const analyticsData = useMemo(() => {
    const monthsData = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const days = getDaysInMonth(currentYear, monthNum);
      let completedCount = 0;
      let totalOpportunities = 0;

      activeHabits.forEach((h) => {
        const opps = getHabitOpportunities(h, monthNum, currentYear);
        totalOpportunities += opps;

        for (let d = 1; d <= days; d++) {
          const key = formatDateKey(currentYear, monthNum, d);
          if (entries[`${h.id}_${key}`]) {
            completedCount++;
          }
        }
      });

      const percentage = totalOpportunities > 0 ? Math.round((completedCount / totalOpportunities) * 100) : 0;

      return {
        month: monthNum,
        name,
        shortName: name.substring(0, 3),
        days,
        completedCount,
        totalOpportunities,
        percentage,
      };
    });

    const activeMonths = monthsData.filter((m) => m.completedCount > 0);
    const totalCompletions = monthsData.reduce((acc, m) => acc + m.completedCount, 0);
    const totalPossibleYear = monthsData.reduce((acc, m) => acc + m.totalOpportunities, 0);
    const yearlyAveragePercentage =
      totalPossibleYear > 0 ? Math.round((totalCompletions / totalPossibleYear) * 100) : 0;

    // Best & Worst Month
    let bestMonth = null;
    let worstMonth = null;
    if (activeMonths.length > 0) {
      const sortedByPercent = [...activeMonths].sort((a, b) => b.percentage - a.percentage);
      bestMonth = sortedByPercent[0];
      worstMonth = sortedByPercent[sortedByPercent.length - 1];
    }

    // Per-habit consistency in this year
    const habitStats = habits.map((h) => {
      let hCompleted = 0;
      let hTotal = 0;
      for (let m = 1; m <= 12; m++) {
        hTotal += getHabitOpportunities(h, m, currentYear);
        const days = getDaysInMonth(currentYear, m);
        for (let d = 1; d <= days; d++) {
          const key = formatDateKey(currentYear, m, d);
          if (entries[`${h.id}_${key}`]) {
            hCompleted++;
          }
        }
      }
      const pct = hTotal > 0 ? Math.min(100, Math.round((hCompleted / hTotal) * 100)) : 0;
      const hStr = habitStreaks?.[h.id] || { current: 0, best: 0, totalCompletions: 0 };

      return {
        ...h,
        completed: hCompleted,
        totalOpportunities: hTotal,
        percentage: pct,
        currentStreak: hStr.current,
        bestStreak: hStr.best,
      };
    });

    const sortedHabits = [...habitStats].filter((h) => h.status !== 'archived').sort((a, b) => b.percentage - a.percentage);
    const mostConsistent = sortedHabits.length > 0 ? sortedHabits[0] : null;
    const needsAttention = sortedHabits.length > 1 ? sortedHabits[sortedHabits.length - 1] : null;

    // Weekday performance calculation (0 = Sun, 6 = Sat)
    const weekdayStats: Array<{ dayName: string; completed: number; scheduled: number; pct: number }> = WEEKDAYS.map(
      (name) => ({ dayName: name, completed: 0, scheduled: 0, pct: 0 })
    );

    // Week of month performance calculation (Weeks 1 to 5)
    const weekOfMonthStats = [
      { week: 1, label: 'Week 1 (Days 1–7)', completed: 0, scheduled: 0, pct: 0 },
      { week: 2, label: 'Week 2 (Days 8–14)', completed: 0, scheduled: 0, pct: 0 },
      { week: 3, label: 'Week 3 (Days 15–21)', completed: 0, scheduled: 0, pct: 0 },
      { week: 4, label: 'Week 4 (Days 22–28)', completed: 0, scheduled: 0, pct: 0 },
      { week: 5, label: 'Week 5 (Days 29–End)', completed: 0, scheduled: 0, pct: 0 },
    ];

    // Compute day by day across entire year
    for (let m = 1; m <= 12; m++) {
      const days = getDaysInMonth(currentYear, m);
      for (let d = 1; d <= days; d++) {
        const dateKey = formatDateKey(currentYear, m, d);
        const dateObj = new Date(currentYear, m - 1, d);
        const dayOfWeek = dateObj.getDay();
        const weekNum = getMonthWeekNumber(d);

        const dayProg = getDayProgress(activeHabits, dateKey, entries);
        weekdayStats[dayOfWeek].completed += dayProg.completedCount;
        weekdayStats[dayOfWeek].scheduled += dayProg.totalScheduled;

        if (weekNum >= 1 && weekNum <= 5) {
          weekOfMonthStats[weekNum - 1].completed += dayProg.completedCount;
          weekOfMonthStats[weekNum - 1].scheduled += dayProg.totalScheduled;
        }
      }
    }

    weekdayStats.forEach((w) => {
      w.pct = w.scheduled > 0 ? Math.round((w.completed / w.scheduled) * 100) : 0;
    });

    weekOfMonthStats.forEach((w) => {
      w.pct = w.scheduled > 0 ? Math.round((w.completed / w.scheduled) * 100) : 0;
    });

    // Sort weekdays to find strongest and weakest
    const activeWeekdays = weekdayStats.filter((w) => w.scheduled > 0);
    let strongestWeekday = null;
    let weakestWeekday = null;
    if (activeWeekdays.length > 0) {
      const sortedW = [...activeWeekdays].sort((a, b) => b.pct - a.pct);
      strongestWeekday = sortedW[0];
      weakestWeekday = sortedW[sortedW.length - 1];
    }

    // Sort weeks of month to find weakest
    const activeWeeks = weekOfMonthStats.filter((w) => w.scheduled > 0);
    let weakestWeek = null;
    if (activeWeeks.length > 0) {
      const sortedWeeks = [...activeWeeks].sort((a, b) => a.pct - b.pct);
      weakestWeek = sortedWeeks[0];
    }

    // Category breakdown
    const categoryMap: Record<string, { count: number; completed: number; total: number }> = {};
    habitStats.forEach((h) => {
      const cat = h.category || 'general';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, completed: 0, total: 0 };
      }
      categoryMap[cat].count++;
      categoryMap[cat].completed += h.completed;
      categoryMap[cat].total += h.totalOpportunities;
    });

    const categoryBreakdown = Object.keys(categoryMap).map((cat) => {
      const item = categoryMap[cat];
      const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      return {
        category: cat,
        meta: getCategoryMeta(cat),
        count: item.count,
        completed: item.completed,
        total: item.total,
        percentage: pct,
      };
    });

    return {
      monthsData,
      totalCompletions,
      yearlyAveragePercentage,
      bestMonth,
      worstMonth,
      mostConsistent,
      needsAttention,
      habitStats,
      weekdayStats,
      strongestWeekday,
      weakestWeekday,
      weekOfMonthStats,
      weakestWeek,
      categoryBreakdown,
    };
  }, [habits, activeHabits, entries, currentYear, habitStreaks]);

  // Sort habit comparison list
  const sortedHabitComparison = useMemo(() => {
    const list = [...analyticsData.habitStats];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [analyticsData.habitStats, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-8 mb-8">
      {/* Top Header & Year Selector */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] text-[#3D6B4E] border border-[#D5E5D9] flex items-center justify-center shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] tracking-tight">
              Analytics & Long-Term Trends
            </h2>
            <p className="text-xs text-[#7D766C]">
              Detailed insights, heatmaps, habit comparisons, and behavioral trends
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#E5DFD5]">
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => onYearChange(y)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentYear === y
                  ? 'bg-[#5B8266] text-white shadow-2xs'
                  : 'text-[#635B50] hover:bg-[#FFFFFF]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Completions */}
        <div className="bg-[#FAF6F0] p-5 rounded-2xl border border-[#EBE3D5] flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7C6E5F]">
            Total Completions
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {analyticsData.totalCompletions}
            </span>
            <p className="text-[11px] text-[#8C8072] mt-1">Logged habit checks in {currentYear}</p>
          </div>
        </div>

        {/* Yearly Average % */}
        <div className="bg-[#F3F6F4] p-5 rounded-2xl border border-[#DFE8E2] flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#577260]">
            Yearly Average
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {analyticsData.yearlyAveragePercentage}%
            </span>
            <p className="text-[11px] text-[#6A7E70] mt-1">Annual completion consistency</p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-[#FAF4EE] p-5 rounded-2xl border border-[#EFE4D7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A674D]">
              Current Streak
            </span>
            <Flame className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {streakDays} <span className="text-sm font-sans font-normal text-[#8A674D]">Days</span>
            </span>
            <p className="text-[11px] text-[#8F7762] mt-1">Consecutive consistency days</p>
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-[#FEF9E7] p-5 rounded-2xl border border-[#F5E8B8] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C6D1F]">
              All-Time Best
            </span>
            <Trophy className="w-4 h-4 text-[#B88E1F]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {bestStreakDays} <span className="text-sm font-sans font-normal text-[#8C6D1F]">Days</span>
            </span>
            <p className="text-[11px] text-[#8C7A4A] mt-1">Longest recorded streak</p>
          </div>
        </div>
      </div>

      {/* Interactive Task Deep-Dive: List of Tasks, Dedicated Heatmap & Graph View */}
      <TaskAnalyticsSection
        habits={habits}
        entries={entries}
        currentYear={currentYear}
        habitStreaks={habitStreaks}
        selectedTaskId={selectedTaskId}
        onSelectTask={handleSelectTask}
      />

      {/* Rule-Based Behavioral Insights & Missed Habit Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule-Based Behavioral Insights */}
        <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F0EBE1] mb-4">
            <Compass className="w-5 h-5 text-[#5B8266]" />
            <h3 className="text-lg font-serif font-bold text-[#2D2A26]">
              Behavioral Insights & Patterns
            </h3>
          </div>

          <div className="space-y-3.5">
            {analyticsData.strongestWeekday && (
              <div className="p-3.5 rounded-2xl bg-[#F2F8F4] border border-[#D5E5D9] flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5B8266] text-white flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2C523A]">Strongest Weekday</h4>
                  <p className="text-xs text-[#40684C] mt-0.5">
                    <strong>{analyticsData.strongestWeekday.dayName}s</strong> are your most productive days with an average of{' '}
                    <strong>{analyticsData.strongestWeekday.pct}%</strong> habit completion.
                  </p>
                </div>
              </div>
            )}

            {analyticsData.weakestWeekday && (
              <div className="p-3.5 rounded-2xl bg-[#FAF0E6] border border-[#ECDCCB] flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#A06D3B] text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#7D5226]">Opportunity Day</h4>
                  <p className="text-xs text-[#8A674D] mt-0.5">
                    <strong>{analyticsData.weakestWeekday.dayName}s</strong> show your lowest consistency at{' '}
                    <strong>{analyticsData.weakestWeekday.pct}%</strong>. Consider lighter scheduling on this day.
                  </p>
                </div>
              </div>
            )}

            {analyticsData.bestMonth && (
              <div className="p-3.5 rounded-2xl bg-[#EFF4FB] border border-[#D4E0F0] flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1E40AF]">Peak Month</h4>
                  <p className="text-xs text-[#2A486F] mt-0.5">
                    <strong>{analyticsData.bestMonth.name}</strong> was your highest performing month reaching{' '}
                    <strong>{analyticsData.bestMonth.percentage}%</strong> overall completion.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Missed Habit & Week Breakdown Analysis */}
        <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F0EBE1] mb-4">
            <AlertTriangle className="w-5 h-5 text-[#A06D3B]" />
            <h3 className="text-lg font-serif font-bold text-[#2D2A26]">
              Missed Habit & Rhythm Analysis
            </h3>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C8377]">
              Monthly Rhythm (Weeks 1 to 5)
            </h4>
            <div className="space-y-2">
              {analyticsData.weekOfMonthStats.map((w) => (
                <div key={w.week} className="flex items-center gap-3">
                  <span className="w-36 text-xs text-[#5C554B] truncate">{w.label}</span>
                  <div className="flex-1 bg-[#FAF8F5] h-6 rounded-lg border border-[#E8E2D7] p-0.5 relative overflow-hidden flex items-center">
                    <div
                      className="bg-[#5B8266] h-full rounded-md transition-all duration-300"
                      style={{ width: `${w.pct}%` }}
                    />
                    <span className="absolute right-2 text-[11px] font-bold text-[#2D2A26]">
                      {w.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {analyticsData.weakestWeek && (
              <p className="text-xs text-[#7D766C] mt-2 pt-2 border-t border-[#F0EBE1]">
                💡 <strong>Rhythm Insight:</strong> <strong>{analyticsData.weakestWeek.label}</strong> experiences the highest drop-off rate ({analyticsData.weakestWeek.pct}%).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Habit Comparison Table */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EBE1] mb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#2D2A26]">
              Habit Performance Comparison
            </h3>
            <p className="text-xs text-[#7D766C]">
              Side-by-side consistency comparison across all habits in {currentYear}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse select-none min-w-[620px]">
            <thead>
              <tr className="border-b border-[#ECE6DC] text-left text-xs font-serif font-bold text-[#4A453E]">
                <th className="py-3 pr-4">HABIT NAME</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#5B8266]"
                  onClick={() => handleSort('percentage')}
                >
                  <div className="flex items-center gap-1">
                    <span>COMPLETION %</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8C8377]" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#5B8266]"
                  onClick={() => handleSort('currentStreak')}
                >
                  <div className="flex items-center gap-1">
                    <span>CURRENT STREAK</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8C8377]" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-[#5B8266]"
                  onClick={() => handleSort('bestStreak')}
                >
                  <div className="flex items-center gap-1">
                    <span>BEST STREAK</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8C8377]" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#5B8266]"
                  onClick={() => handleSort('completed')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL LOGGED</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8C8377]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedHabitComparison.map((habit) => {
                const catMeta = getCategoryMeta(habit.category);
                const isSelected = selectedTaskId === habit.id;

                return (
                  <tr
                    key={habit.id}
                    onClick={() => handleSelectTask(habit.id)}
                    title="Click to inspect this habit's heatmap and trend graph above"
                    className={`border-b border-[#F0EBE1] dark:border-slate-700/60 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 font-semibold'
                        : 'hover:bg-[#FAF8F5] dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{catMeta.emoji}</span>
                        <span className="text-xs font-semibold text-[#2D2A26] dark:text-white truncate">
                          {habit.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                            Inspecting
                          </span>
                        )}
                        {habit.status === 'paused' && (
                          <span className="text-[9px] bg-[#FEF6E8] text-[#92400E] px-1.5 py-0.2 rounded font-semibold">
                            Paused
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}>
                        {catMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#EAE2D5] dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#5B8266] dark:bg-emerald-500 h-full rounded-full"
                            style={{ width: `${habit.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                          {habit.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-[#D97706] inline-flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-[#D97706]" />
                        {habit.currentStreak}d
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-[#2563EB] inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {habit.bestStreak}d
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        {habit.completed}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
