import React from 'react';
import { Habit } from '../types';
import { calculateDashboardScore, calculateCompletionForecast, getHabitRiskStatus } from '../utils/scheduler';
import { Flame, Trophy, TrendingUp, AlertTriangle, Target, CheckCircle, Sparkles } from 'lucide-react';

interface DashboardScoreCardProps {
  habits: Habit[];
  entries: Record<string, boolean>;
  month: number;
  year: number;
  onOpenGoals?: () => void;
}

export function DashboardScoreCard({ habits, entries, month, year, onOpenGoals }: DashboardScoreCardProps) {
  const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');
  const scoreData = calculateDashboardScore(activeHabits, entries);

  // Check habits at risk
  const habitsAtRisk = activeHabits
    .map((h) => ({ habit: h, risk: getHabitRiskStatus(h, entries) }))
    .filter((item) => item.risk.isAtRisk);

  // Determine ring color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400 stroke-emerald-500';
    if (score >= 75) return 'text-indigo-600 dark:text-indigo-400 stroke-indigo-500';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400 stroke-amber-500';
    return 'text-rose-600 dark:text-rose-400 stroke-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 75) return 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800';
    if (score >= 60) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
  };

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreData.score / 100) * circumference;

  return (
    <div id="v3-dashboard-score-card" className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        {/* Left: Circular Score & Message */}
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center flex-shrink-0 w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-700"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`transition-all duration-1000 ease-out ${getScoreColor(scoreData.score)}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
                {scoreData.score}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${getScoreBg(scoreData.score)}`}>
                Rank {scoreData.grade}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Today's Readiness
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight">
              {scoreData.motivationalMessage}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {scoreData.completedTodayCount} of {scoreData.totalScheduledToday} scheduled habits checked off today
            </p>
          </div>
        </div>

        {/* Right: Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-700 pt-4 lg:pt-0 lg:pl-6">
          {/* Consistency Streak */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Streak
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {scoreData.currentStreak} <span className="text-xs font-normal text-slate-400">days</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
              ≥70% daily rule
            </div>
          </div>

          {/* 7-Day Velocity */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                7-Day Rate
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {scoreData.weeklyProgressPct}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, scoreData.weeklyProgressPct)}%` }}
              />
            </div>
          </div>

          {/* Habit Health / Risk */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              {habitsAtRisk.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Health
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {habitsAtRisk.length > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">{habitsAtRisk.length} At Risk</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">100% Solid</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
              {habitsAtRisk.length > 0 ? 'Needs attention' : 'No missed streaks'}
            </div>
          </div>
        </div>
      </div>

      {/* At Risk Alert Bar (if any) */}
      {habitsAtRisk.length > 0 && (
        <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-900/30 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/20 px-3.5 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              <strong>Attention needed:</strong> {habitsAtRisk.map((item) => item.habit.name).join(', ')} (missed recent sessions)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 underline cursor-default">
            Protect your streak today
          </span>
        </div>
      )}
    </div>
  );
}
