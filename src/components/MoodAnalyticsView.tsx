import React from 'react';
import { DailyJournal, Habit } from '../types';
import {
  calculateMoodStats,
  calculateMoodVsHabits,
  SELECTABLE_MOODS,
  ENERGY_LEVELS,
  MoodMeta,
} from '../utils/mood';
import { MONTH_NAMES } from '../utils/date';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Star,
  Smile,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  PieChart,
} from 'lucide-react';

interface MoodAnalyticsViewProps {
  journals: DailyJournal[];
  entries: Record<string, boolean>;
  habits: Habit[];
  year: number;
  month: number;
}

export const MoodAnalyticsView: React.FC<MoodAnalyticsViewProps> = ({
  journals,
  entries,
  habits,
  year,
  month,
}) => {
  const monthName = MONTH_NAMES[month - 1];
  const stats = calculateMoodStats(journals, year, month);
  const habitCorrelation = calculateMoodVsHabits(journals, entries, habits, year, month);

  return (
    <div className="space-y-6">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Average Energy Level */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Energy</span>
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {stats.averageEnergy !== null ? stats.averageEnergy : '—'}
            </span>
            <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">/ 5.0 ⭐</span>
          </div>
          <p className="text-[11px] text-[#5B8266] dark:text-emerald-400 font-semibold mt-1 truncate">
            {stats.averageEnergy !== null
              ? ENERGY_LEVELS[Math.min(4, Math.max(0, Math.round(stats.averageEnergy) - 1))].description
              : 'No logs this month'}
          </p>
        </div>

        {/* Metric 2: Most Common Mood */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Mood</span>
            <div className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">
              {stats.mostCommonMood ? stats.mostCommonMood.emoji : '😐'}
            </span>
            <span className="text-lg sm:text-xl font-serif font-bold text-[#2D2A26] dark:text-white truncate">
              {stats.mostCommonMood ? stats.mostCommonMood.label : 'None'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            {stats.mostCommonMoodCount > 0
              ? `${stats.mostCommonMoodCount} days recorded`
              : 'Log your mood to see top state'}
          </p>
        </div>

        {/* Metric 3: Mood Logging Streak */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mood Streak</span>
            <div className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {stats.moodStreak}
            </span>
            <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">Days In A Row</span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            {stats.totalDaysLogged} total days logged in {monthName}
          </p>
        </div>

        {/* Metric 4: Trend Indicator */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Trend Direction</span>
            <div
              className={`p-1.5 rounded-xl ${
                stats.trend === 'improving'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : stats.trend === 'declining'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
              }`}
            >
              {stats.trend === 'improving' && <TrendingUp className="w-4 h-4" />}
              {stats.trend === 'declining' && <TrendingDown className="w-4 h-4" />}
              {stats.trend === 'stable' && <Minus className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-lg sm:text-xl font-serif font-bold capitalize ${
                stats.trend === 'improving'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.trend === 'declining'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {stats.trend === 'improving'
                ? 'Improving ↗'
                : stats.trend === 'declining'
                ? 'Declining ↘'
                : 'Stable →'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1 truncate">
            Based on 7-day rolling mood scores
          </p>
        </div>
      </div>

      {/* 2. Mood Distribution & Habit Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Distribution Card */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF4EE] dark:bg-slate-700 text-[#8A674D] dark:text-amber-300 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                  Monthly Mood Distribution
                </h3>
                <p className="text-xs text-[#7D766C] dark:text-slate-400">
                  Spread of recorded emotional states in {monthName}
                </p>
              </div>
            </div>
            <span className="text-xs text-[#8C8377] dark:text-slate-400 font-semibold">
              {stats.totalDaysLogged} entries
            </span>
          </div>

          <div className="space-y-3">
            {stats.distribution.map((item) => (
              <div key={item.meta.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[#4A453E] dark:text-slate-200">
                    <span className="text-base">{item.meta.emoji}</span>
                    <span>{item.meta.label}</span>
                  </span>
                  <span className="text-[#7D766C] dark:text-slate-400 font-semibold">
                    {item.count} {item.count === 1 ? 'day' : 'days'} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#FAF8F5] dark:bg-slate-700 rounded-full overflow-hidden border border-[#ECE6DC] dark:border-slate-600">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      item.meta.type === 'excellent'
                        ? 'bg-violet-500'
                        : item.meta.type === 'great'
                        ? 'bg-teal-500'
                        : item.meta.type === 'good'
                        ? 'bg-emerald-500'
                        : item.meta.type === 'okay'
                        ? 'bg-blue-400'
                        : item.meta.type === 'low'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mood vs Habits Correlation Card */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EBF3EE] dark:bg-slate-700 text-[#40684C] dark:text-emerald-300 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                    Mood vs Habit Completion
                  </h3>
                  <p className="text-xs text-[#7D766C] dark:text-slate-400">
                    Behavioral insights connecting execution with mindset
                  </p>
                </div>
              </div>
            </div>

            {/* High vs Low Completion Comparison Table / Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-[#F0F7F2] dark:bg-emerald-950/30 border border-[#D3E8D8] dark:border-emerald-800/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#40684C] dark:text-emerald-300 block">
                  High Completion (≥80%)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {habitCorrelation.highCompletionCommonMood?.emoji || '😄'}
                  </span>
                  <span className="text-sm font-bold text-[#2D2A26] dark:text-white">
                    {habitCorrelation.highCompletionCommonMood?.label || 'Positive'}
                  </span>
                </div>
                <p className="text-[11px] text-[#5B8266] dark:text-emerald-300 font-semibold">
                  Avg Energy: {habitCorrelation.highCompletionAvgEnergy ?? '—'} ⭐
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#E5DFD5] dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8377] dark:text-slate-400 block">
                  Low Completion (&lt;50%)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {habitCorrelation.lowCompletionCommonMood?.emoji || '😐'}
                  </span>
                  <span className="text-sm font-bold text-[#2D2A26] dark:text-white">
                    {habitCorrelation.lowCompletionCommonMood?.label || 'Variable'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7D766C] dark:text-slate-400 font-semibold">
                  Avg Energy: {habitCorrelation.lowCompletionAvgEnergy ?? '—'} ⭐
                </p>
              </div>
            </div>

            {/* Verbatim Insights */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-[#EFF4FB] dark:bg-sky-950/30 border border-[#D9E6F6] dark:border-sky-900/50 flex items-start gap-2.5 text-xs text-[#2A486F] dark:text-sky-200">
                <Sparkles className="w-4 h-4 shrink-0 text-[#4A729E] dark:text-sky-400 mt-0.5" />
                <span>{habitCorrelation.allCompletedMoodHighlight}</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-2.5 text-xs text-[#5C554B] dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5B8266] mt-0.5" />
                <span>{habitCorrelation.energyComparisonHighlight}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EBE1] dark:border-slate-700 text-[11px] text-[#8C8377] dark:text-slate-400">
            {habitCorrelation.correlationSummary}
          </div>
        </div>
      </div>
    </div>
  );
};
