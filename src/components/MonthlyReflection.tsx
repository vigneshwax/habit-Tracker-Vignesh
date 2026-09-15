import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Check, RefreshCw, Smile } from 'lucide-react';
import { DailyJournal } from '../types';
import { MONTH_NAMES } from '../utils/date';
import { getMonthlyMoodSummary } from '../utils/mood';

interface MonthlyReflectionProps {
  year: number;
  month: number;
  initialContent: string;
  journals?: DailyJournal[];
  onSave: (content: string) => Promise<void>;
}

export const MonthlyReflection: React.FC<MonthlyReflectionProps> = ({
  year,
  month,
  initialContent,
  journals = [],
  onSave,
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const monthName = MONTH_NAMES[month - 1];

  const monthlyMood = getMonthlyMoodSummary(journals, year, month);

  // Ref to track latest content and debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);
  const currentContentRef = useRef<string>(initialContent);

  // Sync state when month changes
  useEffect(() => {
    setContent(initialContent);
    currentContentRef.current = initialContent;
    setSaveStatus('idle');
    isInitialMount.current = true;
  }, [year, month, initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    currentContentRef.current = newContent;
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await onSave(currentContentRef.current);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2500);
      } catch (err) {
        console.error('Error saving reflection:', err);
        setSaveStatus('error');
      }
    }, 1000);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6 mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EBE1] mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAF4EE] text-[#8A674D] flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#2D2A26] tracking-tight">
              MONTHLY REFLECTION
            </h2>
            <p className="text-xs text-[#7D766C]">
              Notes and self-reflection for {monthName} {year}
            </p>
          </div>
        </div>

        {/* Auto-save Status Indicator */}
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
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-xs font-medium text-[#C05746]">
              <span>Unable to save reflection</span>
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-[11px] text-[#A69E92]">
              Auto-saves 1s after typing
            </span>
          )}
        </div>
      </div>

      {/* Monthly Mood Highlight */}
      <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E5DFD5] flex items-center justify-center text-xl shadow-2xs">
            {monthlyMood.mostFrequentMood ? monthlyMood.mostFrequentMood.emoji : '📊'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D766C] block">
              Most Frequent Mood ({monthName})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-serif font-bold text-[#2D2A26]">
                {monthlyMood.mostFrequentMood
                  ? `${monthlyMood.mostFrequentMood.label} (${monthlyMood.mostFrequentCount} days)`
                  : 'No mood logs recorded this month'}
              </span>
              {monthlyMood.averageEnergy !== null && (
                <span className="text-xs text-[#5B8266] font-semibold">
                  • Avg Energy: {monthlyMood.averageEnergy} ⭐
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#8C8377] self-start sm:self-center">
          {monthlyMood.totalLogged > 0 ? (
            <span className="px-2.5 py-1 rounded-full bg-white border border-[#E5DFD5] font-medium">
              {monthlyMood.totalLogged} {monthlyMood.totalLogged === 1 ? 'day' : 'days'} logged in {monthName}
            </span>
          ) : (
            <span className="italic text-[#A69E92]">Log daily in Mood tab</span>
          )}
        </div>
      </div>

      {/* Reflection Textarea */}
      <div>
        <textarea
          id="monthly-reflection-textarea"
          value={content}
          onChange={handleChange}
          rows={5}
          placeholder="What did you achieve this month? What can you improve next month?"
          className="w-full p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5] text-[#2D2A26] placeholder-[#A69E92] text-sm leading-relaxed focus:outline-none focus:border-[#5B8266] focus:ring-2 focus:ring-[#5B8266]/15 transition-all resize-y min-h-[140px]"
        />
        <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-[#8C8377]">
          <span>Personal thoughts are saved permanently online</span>
          <span>{content.length} characters</span>
        </div>
      </div>
    </div>
  );
};
