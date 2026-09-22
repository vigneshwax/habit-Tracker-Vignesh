import React, { useState } from 'react';
import { Check, Flame, Trophy, Plus, Sparkles, CheckCircle2, Award, ArrowRight, TrendingUp, TrendingDown, Copy, AlertTriangle, Star } from 'lucide-react';
import { Habit } from '../types';
import { getCategoryMeta, FREQUENCIES_META, formatHabitFrequency } from '../utils/categories';
import { MONTH_NAMES, WEEKDAYS, formatDateKey, getTodayDateInfo } from '../utils/date';
import { getDayScheduledHabits, getHabitTrend, getHabitRiskStatus } from '../utils/scheduler';
import { DashboardScoreCard } from './DashboardScoreCard';
import { TodaySparklineCard } from './TodaySparklineCard';
import { DailyJournalCard } from './DailyJournalCard';
import { CompactMoodWidget } from './CompactMoodWidget';
import { useProtectedAction } from '../context/ProtectedActionContext';

interface TodayFocusProps {
  habits: Habit[];
  entries: Record<string, boolean>; // key: `${habit_id}_${date}`
  streakDays: number;
  bestStreakDays: number;
  month: number;
  year: number;
  isUnlocked?: boolean;
  onToggleEntry: (habitId: string, dateStr: string, currentCompleted: boolean) => void;
  onOpenAddModal: () => void;
  onSelectHabit?: (habit: Habit) => void;
  onSwitchToGrid?: () => void;
  onOpenGoals?: () => void;
  onOpenMoodTab?: () => void;
  onRequireUnlock?: () => void;
  onDuplicateHabit?: (habitId: string) => void;
}

export const TodayFocus: React.FC<TodayFocusProps> = ({
  habits,
  entries,
  streakDays,
  bestStreakDays,
  month,
  year,
  isUnlocked = true,
  onToggleEntry,
  onOpenAddModal,
  onSelectHabit,
  onSwitchToGrid,
  onOpenGoals,
  onOpenMoodTab,
  onRequireUnlock,
  onDuplicateHabit,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high_priority'>('all');
  const { executeProtected } = useProtectedAction();

  const handleProtectedToggle = (habitId: string, habitName: string, dateStr: string, isDone: boolean) => {
    executeProtected(() => {
      onToggleEntry(habitId, dateStr, isDone);
    }, `${isDone ? 'Uncheck' : 'Check'} "${habitName}"`);
  };

  const handleProtectedAdd = () => {
    executeProtected(() => {
      onOpenAddModal();
    }, 'Add New Habit');
  };

  const handleProtectedDuplicate = (habitId: string, habitName: string) => {
    if (!onDuplicateHabit) return;
    executeProtected(() => {
      onDuplicateHabit(habitId);
    }, `Duplicate "${habitName}"`);
  };

  const today = getTodayDateInfo();
  const todayDateStr = formatDateKey(today.year, today.month, today.day);
  const now = new Date();
  const dayOfWeekIndex = now.getDay();
  const dayOfWeekName = WEEKDAYS[dayOfWeekIndex];
  const monthName = MONTH_NAMES[today.month - 1];

  // Central scheduling engine: get habits scheduled for today
  const scheduledHabits = getDayScheduledHabits(habits, todayDateStr);

  const completedTodayCount = scheduledHabits.filter(
    (h) => !!entries[`${h.id}_${todayDateStr}`]
  ).length;

  const totalScheduled = scheduledHabits.length;
  const progressPercent = totalScheduled > 0 ? Math.round((completedTodayCount / totalScheduled) * 100) : 0;
  const isAllCompleted = totalScheduled > 0 && completedTodayCount === totalScheduled;

  const filteredHabits = scheduledHabits.filter((h) => {
    const isDone = !!entries[`${h.id}_${todayDateStr}`];
    if (filter === 'pending') return !isDone;
    if (filter === 'completed') return isDone;
    if (filter === 'high_priority') return h.priority === 'high';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Unified Dashboard Score Card */}
      <DashboardScoreCard
        habits={habits}
        entries={entries}
        month={month}
        year={year}
        onOpenGoals={onOpenGoals}
      />

      {/* 2. 7-Day Habit Completion Sparkline Card */}
      <TodaySparklineCard
        habits={habits}
        entries={entries}
        onSwitchToGrid={onSwitchToGrid}
      />

      {/* Today's Mood Quick Check-in Widget */}
      <CompactMoodWidget
        dateStr={todayDateStr}
        isUnlocked={isUnlocked}
        onOpenMoodTab={onOpenMoodTab}
        onRequireUnlock={onRequireUnlock}
      />

      {/* 2. Today's Action Section Header */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 transition-all duration-300 ease-out hover:scale-[1.008] hover:shadow-md hover:border-[#D5CDC0] dark:hover:border-slate-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                Action Checklist
              </span>
              <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">
                {dayOfWeekName}, {monthName} {today.day}, {today.year}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
              Today's Scheduled Habits
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleProtectedAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B8266] text-white text-xs font-bold hover:bg-[#4C7156] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Habit</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 pt-4 border-t border-[#F0EBE1] dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              All ({scheduledHabits.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              Pending ({scheduledHabits.length - completedTodayCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              Completed ({completedTodayCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('high_priority')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'high_priority'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-amber-700 dark:text-amber-400 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              ⭐ High Priority ({scheduledHabits.filter((h) => h.priority === 'high').length})
            </button>
          </div>

          <span className="text-xs font-bold text-[#5B8266]">
            {progressPercent}% completed today
          </span>
        </div>
      </div>

      {/* Celebratory Banner when 100% completed today */}
      {isAllCompleted && scheduledHabits.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#F0F7F2] dark:bg-emerald-950/30 border border-[#D3E8D8] dark:border-emerald-800 text-[#2C523A] dark:text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#5B8266] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#2C523A] dark:text-emerald-200">
                Outstanding! All today's habits completed.
              </h3>
              <p className="text-xs text-[#40684C] dark:text-emerald-400 mt-0.5">
                You've hit 100% of your scheduled goals today. Your streak has been safely locked in.
              </p>
            </div>
          </div>
          {onSwitchToGrid && (
            <button
              type="button"
              onClick={onSwitchToGrid}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#FFFFFF] dark:bg-slate-800 border border-[#D3E8D8] dark:border-slate-700 text-xs font-bold text-[#2C523A] dark:text-emerald-300 hover:bg-[#EBF3EE] transition-colors shrink-0 cursor-pointer"
            >
              <span>View Month Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Habits Action List */}
      {scheduledHabits.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-10 text-center flex flex-col items-center justify-center shadow-xs">
          <Sparkles className="w-8 h-8 text-[#A69E92] mb-3" />
          <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">No habits scheduled for today</h3>
          <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1 mb-5 max-w-sm">
            Create your daily habits or adjust your schedule settings to populate your action list.
          </p>
          <button
            type="button"
            onClick={handleProtectedAdd}
            className="px-5 py-2.5 rounded-2xl bg-[#5B8266] text-white text-xs font-semibold hover:bg-[#4C7156] transition-colors cursor-pointer shadow-2xs"
          >
            + Create New Habit
          </button>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-8 text-center text-xs text-[#8C8377] dark:text-slate-400">
          No habits matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredHabits.map((habit) => {
            const isDone = !!entries[`${habit.id}_${todayDateStr}`];
            const catMeta = getCategoryMeta(habit.category);
            const freqMeta = FREQUENCIES_META[habit.frequency] || FREQUENCIES_META.daily;
            const trend = getHabitTrend(habit, entries);
            const risk = getHabitRiskStatus(habit, entries);

            return (
              <div
                key={habit.id}
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ease-out hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-md ${
                  isDone
                    ? 'bg-[#F2F8F4] dark:bg-emerald-950/20 border-[#D5E5D9] dark:border-emerald-800 shadow-2xs hover:border-[#B5D1BC] dark:hover:border-emerald-700'
                    : 'bg-[#FFFFFF] dark:bg-slate-800 border-[#E8E2D7] dark:border-slate-700 hover:border-[#5B8266] dark:hover:border-emerald-600 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Habit Info & Details trigger */}
                  <div
                    className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => onSelectHabit && onSelectHabit(habit)}
                    title="Click to view habit statistics"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 border ${catMeta.badgeBg} ${catMeta.borderColor}`}
                    >
                      <span>{catMeta.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {habit.priority === 'high' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500" /> High Priority
                          </span>
                        )}
                        {risk.isAtRisk && !isDone && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> At Risk
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm font-semibold truncate mt-0.5 ${
                          isDone ? 'line-through text-[#6F7A72] dark:text-slate-400' : 'text-[#2D2A26] dark:text-white'
                        }`}
                        title={habit.name}
                      >
                        {habit.name}
                      </h4>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                        >
                          {catMeta.label}
                        </span>
                        <span className="text-[10px] text-[#9C9488] dark:text-slate-400">
                          • {formatHabitFrequency(habit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Large Tactile Completion Button */}
                  <button
                    id={`today-check-${habit.id}`}
                    type="button"
                    onClick={() => handleProtectedToggle(habit.id, habit.name, todayDateStr, isDone)}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
                      isDone
                        ? 'bg-[#5B8266] text-white shadow-xs hover:bg-[#4C7156] active:scale-90'
                        : 'bg-[#FAF8F5] dark:bg-slate-700 border-2 border-[#D5CDC0] dark:border-slate-600 text-transparent hover:border-[#5B8266] hover:bg-[#FFFFFF] active:scale-90'
                    }`}
                    title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                    aria-label={`Toggle ${habit.name}`}
                  >
                    <Check
                      className={`w-5 h-5 stroke-[3] transition-transform ${
                        isDone ? 'scale-100' : 'scale-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Card Footer: Trend & Duplicate Button */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    {trend.trendDirection === 'up' && (
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <TrendingUp className="w-3 h-3" /> +{trend.changePercentage}% vs last week
                      </span>
                    )}
                    {trend.trendDirection === 'down' && (
                      <span className="flex items-center gap-0.5 text-rose-500 font-semibold">
                        <TrendingDown className="w-3 h-3" /> -{trend.changePercentage}% vs last week
                      </span>
                    )}
                    {trend.trendDirection === 'stable' && (
                      <span className="text-slate-400">
                        {trend.currentWeekRate}% consistency this week
                      </span>
                    )}
                  </div>

                  {onDuplicateHabit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProtectedDuplicate(habit.id, habit.name);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                      title="Duplicate Habit"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Daily Journal & Micro-Wins Card */}
      <DailyJournalCard dateStr={todayDateStr} />
    </div>
  );
};
