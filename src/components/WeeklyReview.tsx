import React, { useState, useEffect, useRef } from 'react';
import { CalendarCheck, Check, RefreshCw, Smile } from 'lucide-react';
import { WeeklyReview as WeeklyReviewType, DailyJournal } from '../types';
import { MONTH_NAMES } from '../utils/date';
import { getWeeklyMoodSummary } from '../utils/mood';

interface WeeklyReviewProps {
  year: number;
  month: number;
  reviews: Record<number, WeeklyReviewType>; // key: week_number (1-5)
  journals?: DailyJournal[];
  onSave: (review: {
    year: number;
    month: number;
    week_number: number;
    went_well: string;
    could_improve: string;
    next_focus: string;
  }) => Promise<void>;
}

const WEEKS_META = [
  { num: 1, label: 'Week 1', days: 'Days 1 – 7' },
  { num: 2, label: 'Week 2', days: 'Days 8 – 14' },
  { num: 3, label: 'Week 3', days: 'Days 15 – 21' },
  { num: 4, label: 'Week 4', days: 'Days 22 – 28' },
  { num: 5, label: 'Week 5', days: 'Days 29 – 31' },
];

export const WeeklyReview: React.FC<WeeklyReviewProps> = ({
  year,
  month,
  reviews,
  journals = [],
  onSave,
}) => {
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [wentWell, setWentWell] = useState<string>('');
  const [couldImprove, setCouldImprove] = useState<string>('');
  const [nextFocus, setNextFocus] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monthName = MONTH_NAMES[month - 1];

  const weeklyMood = getWeeklyMoodSummary(journals, year, month, activeWeek);

  // Update inputs when active week or month changes
  useEffect(() => {
    const current = reviews[activeWeek];
    setWentWell(current?.went_well || '');
    setCouldImprove(current?.could_improve || '');
    setNextFocus(current?.next_focus || '');
    setSaveStatus('idle');
  }, [activeWeek, year, month, reviews]);

  const triggerAutoSave = (well: string, improve: string, focus: string) => {
    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await onSave({
          year,
          month,
          week_number: activeWeek,
          went_well: well,
          could_improve: improve,
          next_focus: focus,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Error saving weekly review:', err);
        setSaveStatus('error');
      }
    }, 1000);
  };

  const handleWentWellChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setWentWell(val);
    triggerAutoSave(val, couldImprove, nextFocus);
  };

  const handleCouldImproveChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCouldImprove(val);
    triggerAutoSave(wentWell, val, nextFocus);
  };

  const handleNextFocusChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNextFocus(val);
    triggerAutoSave(wentWell, couldImprove, val);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF4FB] text-[#2A486F] flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#2D2A26] tracking-tight">
              WEEKLY REVIEW
            </h2>
            <p className="text-xs text-[#7D766C]">
              Continuous feedback loops for {monthName} {year}
            </p>
          </div>
        </div>

        {/* Auto-save status */}
        <div className="flex items-center self-start sm:self-center">
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] text-xs text-[#8C7A6B]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C7A6B]" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F0F7F2] border border-[#D3E8D8] text-xs font-medium text-[#40684C]">
              <Check className="w-3.5 h-3.5 text-[#5B8266]" />
              <span>Saved ✓</span>
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-[11px] text-[#A69E92]">Auto-saves on typing</span>
          )}
        </div>
      </div>

      {/* Week Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {WEEKS_META.map((w) => (
          <button
            key={w.num}
            type="button"
            onClick={() => setActiveWeek(w.num)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeWeek === w.num
                ? 'bg-[#5B8266] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#635B50] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
            }`}
          >
            <span>{w.label}</span>
            <span className={`text-[10px] font-normal ${activeWeek === w.num ? 'text-white/80' : 'text-[#8C8377]'}`}>
              ({w.days})
            </span>
          </button>
        ))}
      </div>

      {/* Weekly Mood Insight */}
      <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E5DFD5] flex items-center justify-center text-xl shadow-2xs">
            {weeklyMood.averageMood ? weeklyMood.averageMood.emoji : '😐'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D766C] block">
              Week {activeWeek} Average Mood
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-serif font-bold text-[#2D2A26]">
                {weeklyMood.averageMood ? weeklyMood.averageMood.label : 'No mood entries logged for this week'}
              </span>
              {weeklyMood.averageEnergy !== null && (
                <span className="text-xs text-[#5B8266] font-semibold">
                  • Avg Energy: {weeklyMood.averageEnergy} ⭐
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#8C8377] self-start sm:self-center">
          {weeklyMood.daysLogged > 0 ? (
            <span className="px-2.5 py-1 rounded-full bg-white border border-[#E5DFD5] font-medium">
              {weeklyMood.daysLogged} {weeklyMood.daysLogged === 1 ? 'day' : 'days'} logged
            </span>
          ) : (
            <span className="italic text-[#A69E92]">Log daily in Mood tab</span>
          )}
        </div>
      </div>

      {/* 3 Reflection Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. What went well */}
        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE6DC]">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#3D6B4E] mb-2">
            🌿 What went well?
          </label>
          <textarea
            value={wentWell}
            onChange={handleWentWellChange}
            rows={4}
            placeholder="Wins, positive habits kept, small milestones achieved..."
            className="w-full p-3 rounded-xl bg-white border border-[#E5DFD5] text-xs text-[#2D2A26] placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266]"
          />
        </div>

        {/* 2. What could improve */}
        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE6DC]">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#8A674D] mb-2">
            🔍 What can improve?
          </label>
          <textarea
            value={couldImprove}
            onChange={handleCouldImproveChange}
            rows={4}
            placeholder="Frictions faced, missed routines, triggers to avoid..."
            className="w-full p-3 rounded-xl bg-white border border-[#E5DFD5] text-xs text-[#2D2A26] placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266]"
          />
        </div>

        {/* 3. Main focus next week */}
        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE6DC]">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#2A486F] mb-2">
            🎯 Main focus next week
          </label>
          <textarea
            value={nextFocus}
            onChange={handleNextFocusChange}
            rows={4}
            placeholder="Top 1-2 habit priorities and simple adjustments..."
            className="w-full p-3 rounded-xl bg-white border border-[#E5DFD5] text-xs text-[#2D2A26] placeholder-[#A69E92] leading-relaxed focus:outline-none focus:border-[#5B8266]"
          />
        </div>
      </div>
    </div>
  );
};
