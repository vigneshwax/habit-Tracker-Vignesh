import React, { useState } from 'react';
import { DailyJournal, Habit } from '../types';
import { DailyMoodCard } from './DailyMoodCard';
import { MoodCalendarView } from './MoodCalendarView';
import { MoodAnalyticsView } from './MoodAnalyticsView';
import { MoodGraphView } from './MoodGraphView';
import { formatDateKey, getTodayDateInfo, MONTH_NAMES } from '../utils/date';
import { Smile, Calendar, BarChart3, TrendingUp, Lock, Sparkles, Check } from 'lucide-react';

interface MoodTrackerViewProps {
  year?: number;
  month?: number;
  currentYear?: number;
  currentMonth?: number;
  journals: DailyJournal[];
  habits: Habit[];
  entries: Record<string, boolean>;
  isUnlocked: boolean;
  weekStart?: 'sunday' | 'monday';
  onSavedJournal?: (entry: DailyJournal) => void;
  onSaveMood?: (payload: any) => Promise<any>;
  onMonthChange?: (month: number, year: number) => void;
  onRequireUnlock: () => void;
}

export const MoodTrackerView: React.FC<MoodTrackerViewProps> = ({
  year,
  month,
  currentYear,
  currentMonth,
  journals,
  habits,
  entries,
  isUnlocked,
  weekStart = 'sunday',
  onSavedJournal,
  onSaveMood,
  onMonthChange,
  onRequireUnlock,
}) => {
  const activeYear = currentYear ?? year ?? new Date().getFullYear();
  const activeMonth = currentMonth ?? month ?? (new Date().getMonth() + 1);

  const today = getTodayDateInfo();
  const todayDateStr = formatDateKey(today.year, today.month, today.day);

  // Selected date for editing/inspection in DailyMoodCard
  const [activeDateStr, setActiveDateStr] = useState<string>(todayDateStr);
  const [subTab, setSubTab] = useState<'all' | 'checkin' | 'trends' | 'calendar' | 'analytics'>('all');

  const monthName = MONTH_NAMES[activeMonth - 1];

  const handleSelectDateToEdit = (dateStr: string) => {
    setActiveDateStr(dateStr);
    // If in trends or calendar only, switch to all or checkin so user can view/edit
    if (subTab === 'trends' || subTab === 'calendar') {
      setSubTab('all');
    }
    // Smoothly scroll to editor
    setTimeout(() => {
      const cardEl = document.getElementById('daily-mood-card');
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                Mood & Vitality OS
              </span>
              <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">
                {monthName} {activeYear}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
              Personal Mood Tracker
            </h2>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-xl">
              Understand your emotional rhythms, track daily energy, and discover how completing your habits directly impacts your mental clarity.
            </p>
          </div>

          {/* Quick Sub-tab filters */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSubTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setSubTab('checkin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === 'checkin'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              Daily Card
            </button>
            <button
              type="button"
              onClick={() => setSubTab('trends')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                subTab === 'trends'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#5B8266]" />
              Graph View
            </button>
            <button
              type="button"
              onClick={() => setSubTab('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setSubTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === 'analytics'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              Correlations
            </button>
          </div>
        </div>
      </div>

      {/* 1. Daily Mood Card */}
      {(subTab === 'all' || subTab === 'checkin') && (
        <div id="daily-mood-card">
          <DailyMoodCard
            dateStr={activeDateStr}
            isUnlocked={isUnlocked}
            onSaved={(entry) => {
              if (onSavedJournal) onSavedJournal(entry);
            }}
            onRequireUnlock={onRequireUnlock}
            title={activeDateStr === todayDateStr ? "Today's Mood & Energy" : `Mood & Energy for ${activeDateStr}`}
          />
        </div>
      )}

      {/* 2. Mood Trends Graph View (Public, no PIN needed) */}
      {(subTab === 'all' || subTab === 'trends') && (
        <MoodGraphView
          journals={journals}
          currentYear={activeYear}
          currentMonth={activeMonth}
          onMonthChange={onMonthChange}
          onSelectDateToEdit={handleSelectDateToEdit}
        />
      )}

      {/* 3. Mood Calendar */}
      {(subTab === 'all' || subTab === 'calendar') && (
        <MoodCalendarView
          year={activeYear}
          month={activeMonth}
          journals={journals}
          weekStart={weekStart}
          isUnlocked={isUnlocked}
          onSelectDateToEdit={handleSelectDateToEdit}
          onRequireUnlock={onRequireUnlock}
        />
      )}

      {/* 4. Mood Analytics & Habit Insights */}
      {(subTab === 'all' || subTab === 'analytics') && (
        <MoodAnalyticsView
          journals={journals}
          entries={entries}
          habits={habits}
          year={activeYear}
          month={activeMonth}
        />
      )}
    </div>
  );
};

