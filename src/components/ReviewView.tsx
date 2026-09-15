import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, CalendarCheck, Check, RefreshCw, Sparkles, Target, Compass, Smile } from 'lucide-react';
import { WeeklyReview as WeeklyReviewType, DailyJournal } from '../types';
import { MONTH_NAMES } from '../utils/date';
import { WeeklyPlanningCard } from './WeeklyPlanningCard';
import { getWeeklyMoodSummary, getMonthlyMoodSummary } from '../utils/mood';
import { useProtectedAction } from '../context/ProtectedActionContext';

interface ReviewViewProps {
  year: number;
  month: number;
  reviews: Record<number, WeeklyReviewType>; // key: week_number (1-5)
  monthlyReflectionContent: string;
  journals?: DailyJournal[];
  onSaveWeeklyReview: (review: {
    year: number;
    month: number;
    week_number: number;
    went_well: string;
    improve: string;
    next_focus: string;
  }) => Promise<void>;
  onSaveMonthlyReflection: (content: string) => Promise<void>;
}

const WEEKS_META = [
  { num: 1, label: 'Week 1', days: 'Days 1 – 7' },
  { num: 2, label: 'Week 2', days: 'Days 8 – 14' },
  { num: 3, label: 'Week 3', days: 'Days 15 – 21' },
  { num: 4, label: 'Week 4', days: 'Days 22 – 28' },
  { num: 5, label: 'Week 5', days: 'Days 29 – End' },
];

export const ReviewView: React.FC<ReviewViewProps> = ({
  year,
  month,
  reviews,
  monthlyReflectionContent,
  journals = [],
  onSaveWeeklyReview,
  onSaveMonthlyReflection,
}) => {
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [wentWell, setWentWell] = useState<string>('');
  const [improve, setImprove] = useState<string>('');
  const [nextFocus, setNextFocus] = useState<string>('');
  const [weeklySaveStatus, setWeeklySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [monthlyContent, setMonthlyContent] = useState<string>(monthlyReflectionContent);
  const [monthlySaveStatus, setMonthlySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { isUnlocked, executeProtected } = useProtectedAction();

  const handleProtectedFieldClick = (label: string) => {
    if (!isUnlocked) {
      executeProtected(() => {}, `Edit ${label}`);
    }
  };

  const weeklyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monthlyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monthName = MONTH_NAMES[month - 1];

  // Sync weekly form when active week or month changes
  useEffect(() => {
    const current = reviews[activeWeek];
    setWentWell(current?.went_well || '');
    setImprove(current?.improve || (current as any)?.could_improve || '');
    setNextFocus(current?.next_focus || '');
    setWeeklySaveStatus('idle');
  }, [activeWeek, year, month, reviews]);

  // Sync monthly reflection when month changes
  useEffect(() => {
    setMonthlyContent(monthlyReflectionContent);
    setMonthlySaveStatus('idle');
  }, [year, month, monthlyReflectionContent]);

  // Auto-save weekly review
  const triggerWeeklyAutoSave = (well: string, imp: string, focus: string) => {
    setWeeklySaveStatus('saving');
    if (weeklyTimerRef.current) {
      clearTimeout(weeklyTimerRef.current);
    }
    weeklyTimerRef.current = setTimeout(async () => {
      try {
        await onSaveWeeklyReview({
          year,
          month,
          week_number: activeWeek,
          went_well: well,
          improve: imp,
          next_focus: focus,
        });
        setWeeklySaveStatus('saved');
        setTimeout(() => setWeeklySaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Error saving weekly review:', err);
        setWeeklySaveStatus('error');
      }
    }, 1000);
  };

  // Auto-save monthly reflection
  const handleMonthlyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMonthlyContent(val);
    setMonthlySaveStatus('saving');

    if (monthlyTimerRef.current) {
      clearTimeout(monthlyTimerRef.current);
    }
    monthlyTimerRef.current = setTimeout(async () => {
      try {
        await onSaveMonthlyReflection(val);
        setMonthlySaveStatus('saved');
        setTimeout(() => setMonthlySaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Error saving monthly reflection:', err);
        setMonthlySaveStatus('error');
      }
    }, 1000);
  };

  const activeWeekMood = getWeeklyMoodSummary(journals, year, month, activeWeek);
  const monthlyMood = getMonthlyMoodSummary(journals, year, month);

  return (
    <div className="space-y-8 mb-8">
      {/* 1. Weekly Planning & Priorities for Active Week */}
      <WeeklyPlanningCard
        year={year}
        month={month}
        weekNumber={activeWeek}
      />

      {/* 2. Weekly Reviews Section */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] dark:border-slate-700 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF4FB] dark:bg-blue-950/40 text-[#2A486F] dark:text-blue-300 border border-[#D4E0F0] dark:border-blue-800 flex items-center justify-center shadow-2xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight">
                Weekly Reviews
              </h2>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                Continuous weekly reflection for {monthName} {year}
              </p>
            </div>
          </div>

          {/* Auto-save status */}
          <div className="flex items-center self-start sm:self-center">
            {weeklySaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E8E2D8] dark:border-slate-600 text-xs text-[#8C7A6B] dark:text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C7A6B]" />
                <span>Saving review...</span>
              </span>
            )}
            {weeklySaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F0F7F2] dark:bg-emerald-950/40 border border-[#D3E8D8] dark:border-emerald-800 text-xs font-medium text-[#40684C] dark:text-emerald-300">
                <Check className="w-3.5 h-3.5 text-[#5B8266]" />
                <span>Saved to Supabase ✓</span>
              </span>
            )}
            {weeklySaveStatus === 'idle' && (
              <span className="text-[11px] text-[#A69E92] dark:text-slate-400">Auto-saves on typing</span>
            )}
          </div>
        </div>

        {/* Week Selector Tabs (Weeks 1 to 5) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {WEEKS_META.map((w) => (
            <button
              key={w.num}
              type="button"
              onClick={() => setActiveWeek(w.num)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeWeek === w.num
                  ? 'bg-[#5B8266] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#635B50] dark:text-slate-300 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <span>{w.label}</span>
              <span
                className={`text-[10px] font-normal ${
                  activeWeek === w.num ? 'text-white/80' : 'text-[#8C8377] dark:text-slate-400'
                }`}
              >
                ({w.days})
              </span>
            </button>
          ))}
        </div>

        {/* Weekly Mood Insight Banner */}
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 flex items-center justify-center text-xl shadow-2xs">
              {activeWeekMood.averageMood ? activeWeekMood.averageMood.emoji : '😐'}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D766C] dark:text-slate-400 block">
                Week {activeWeek} Average Mood
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
                  {activeWeekMood.averageMood ? activeWeekMood.averageMood.label : 'No mood entries logged for this week'}
                </span>
                {activeWeekMood.averageEnergy !== null && (
                  <span className="text-xs text-[#5B8266] dark:text-emerald-400 font-semibold">
                    • Avg Energy: {activeWeekMood.averageEnergy} ⭐
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#8C8377] dark:text-slate-400 self-start sm:self-center">
            {activeWeekMood.daysLogged > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 font-medium">
                {activeWeekMood.daysLogged} {activeWeekMood.daysLogged === 1 ? 'day' : 'days'} logged
              </span>
            ) : (
              <span className="italic text-[#A69E92]">Log daily in Mood tab</span>
            )}
          </div>
        </div>

        {/* 3 Structured Prompts for the active week */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Prompt 1: What went well? */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900/60 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3D6B4E] dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <span>🌿</span>
                <span>What went well?</span>
              </label>
              <textarea
                value={wentWell}
                readOnly={!isUnlocked}
                onClick={() => handleProtectedFieldClick('Weekly Review')}
                onChange={(e) => {
                  setWentWell(e.target.value);
                  triggerWeeklyAutoSave(e.target.value, improve, nextFocus);
                }}
                rows={5}
                placeholder="Wins, positive habits maintained, small milestones..."
                className={`w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-white placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266] resize-none ${
                  !isUnlocked ? 'cursor-pointer hover:border-amber-400' : ''
                }`}
              />
            </div>
            <p className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-2">Celebrated accomplishments</p>
          </div>

          {/* Prompt 2: What can improve? */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900/60 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8A674D] dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <span>🔍</span>
                <span>What can improve?</span>
              </label>
              <textarea
                value={improve}
                readOnly={!isUnlocked}
                onClick={() => handleProtectedFieldClick('Weekly Review')}
                onChange={(e) => {
                  setImprove(e.target.value);
                  triggerWeeklyAutoSave(wentWell, e.target.value, nextFocus);
                }}
                rows={5}
                placeholder="Frictions faced, missed routines, energy blockers..."
                className={`w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-white placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266] resize-none ${
                  !isUnlocked ? 'cursor-pointer hover:border-amber-400' : ''
                }`}
              />
            </div>
            <p className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-2">Obstacles and friction</p>
          </div>

          {/* Prompt 3: Main focus for next week */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900/60 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2A486F] dark:text-blue-400 mb-2 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Main focus for next week</span>
              </label>
              <textarea
                value={nextFocus}
                readOnly={!isUnlocked}
                onClick={() => handleProtectedFieldClick('Weekly Review')}
                onChange={(e) => {
                  setNextFocus(e.target.value);
                  triggerWeeklyAutoSave(wentWell, improve, e.target.value);
                }}
                rows={5}
                placeholder="Top 1-2 habit adjustments and clear priority..."
                className={`w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-white placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266] resize-none ${
                  !isUnlocked ? 'cursor-pointer hover:border-amber-400' : ''
                }`}
              />
            </div>
            <p className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-2">Key priority for the upcoming week</p>
          </div>
        </div>
      </div>

      {/* 3. Monthly Reflection Section */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF4EE] dark:bg-amber-950/40 text-[#8A674D] dark:text-amber-300 border border-[#ECDCCB] dark:border-amber-800 flex items-center justify-center shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight">
                Monthly Reflection
              </h2>
              <p className="text-xs text-[#7D766C] dark:text-slate-400">
                High-level synthesis for {monthName} {year}
              </p>
            </div>
          </div>

          <div className="flex items-center self-start sm:self-center">
            {monthlySaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E8E2D8] dark:border-slate-600 text-xs text-[#8C7A6B] dark:text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C7A6B]" />
                <span>Saving reflection...</span>
              </span>
            )}
            {monthlySaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F0F7F2] dark:bg-emerald-950/40 border border-[#D3E8D8] dark:border-emerald-800 text-xs font-medium text-[#40684C] dark:text-emerald-300">
                <Check className="w-3.5 h-3.5 text-[#5B8266]" />
                <span>Saved ✓</span>
              </span>
            )}
            {monthlySaveStatus === 'idle' && (
              <span className="text-[11px] text-[#A69E92] dark:text-slate-400">Auto-saves on typing</span>
            )}
          </div>
        </div>

        {/* Monthly Mood Highlight Banner */}
        <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 flex items-center justify-center text-xl shadow-2xs">
              {monthlyMood.mostFrequentMood ? monthlyMood.mostFrequentMood.emoji : '📊'}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D766C] dark:text-slate-400 block">
                Most Frequent Mood ({monthName})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
                  {monthlyMood.mostFrequentMood
                    ? `${monthlyMood.mostFrequentMood.label} (${monthlyMood.mostFrequentCount} days)`
                    : 'No mood logs recorded this month'}
                </span>
                {monthlyMood.averageEnergy !== null && (
                  <span className="text-xs text-[#5B8266] dark:text-emerald-400 font-semibold">
                    • Avg Energy: {monthlyMood.averageEnergy} ⭐
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#8C8377] dark:text-slate-400 self-start sm:self-center">
            {monthlyMood.totalLogged > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 font-medium">
                {monthlyMood.totalLogged} {monthlyMood.totalLogged === 1 ? 'day' : 'days'} logged in {monthName}
              </span>
            ) : (
              <span className="italic text-[#A69E92]">Log daily in Mood tab</span>
            )}
          </div>
        </div>

        <textarea
          value={monthlyContent}
          readOnly={!isUnlocked}
          onClick={() => handleProtectedFieldClick('Monthly Reflection')}
          onChange={handleMonthlyChange}
          rows={6}
          placeholder="Reflect on your monthly growth:
1. What did I achieve this month?
2. What held me back or needs improvement?
3. What is my primary focus for next month?"
          className={`w-full p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-white placeholder-[#A69E92] text-sm leading-relaxed focus:outline-none focus:border-[#5B8266] focus:ring-2 focus:ring-[#5B8266]/15 transition-all resize-y min-h-[160px] ${
            !isUnlocked ? 'cursor-pointer hover:border-amber-400' : ''
          }`}
        />

        <div className="flex justify-between items-center mt-3 px-1 text-[11px] text-[#8C8377] dark:text-slate-400">
          <span>Saved permanently in Supabase reflections table</span>
          <span>{monthlyContent.length} characters</span>
        </div>
      </div>
    </div>
  );
};
