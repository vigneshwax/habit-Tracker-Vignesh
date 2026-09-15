import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DailyJournal, MoodType } from '../types';
import { getTodayDateInfo, formatDateKey } from '../utils/date';
import { useProtectedAction } from '../context/ProtectedActionContext';
import { Smile, Meh, Frown, Sparkles, Check, AlertCircle, Calendar, BookOpen } from 'lucide-react';

interface DailyJournalCardProps {
  dateStr?: string;
  onSaved?: () => void;
}

const MOODS: { type: MoodType; label: string; icon: string; bg: string; activeBg: string }[] = [
  { type: 'great', label: 'Energized', icon: '😄', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30', activeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-500' },
  { type: 'good', label: 'Focused', icon: '🙂', bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30', activeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-500' },
  { type: 'neutral', label: 'Steady', icon: '😐', bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30', activeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-2 ring-amber-500' },
  { type: 'low', label: 'Tired', icon: '😔', bg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30', activeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 ring-2 ring-purple-500' },
  { type: 'stressed', label: 'Overwhelmed', icon: '😫', bg: 'hover:bg-rose-50 dark:hover:bg-rose-950/30', activeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 ring-2 ring-rose-500' },
];

export function DailyJournalCard({ dateStr, onSaved }: DailyJournalCardProps) {
  const todayInfo = getTodayDateInfo();
  const todayStr = formatDateKey(todayInfo.year, todayInfo.month, todayInfo.day);
  const targetDate = (dateStr && typeof dateStr === 'string' && dateStr.trim())
    ? (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim())
    : todayStr;

  const [content, setContent] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<MoodType>('good');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;
    async function loadJournal() {
      try {
        const res = await api.getJournal({ date: targetDate });
        if (isMounted && res.journal && res.journal.length > 0) {
          const entry = res.journal[0];
          setContent(entry.content || '');
          if (entry.mood) setSelectedMood(entry.mood);
        }
      } catch (err) {
        // silent fallback
      }
    }
    loadJournal();
    return () => {
      isMounted = false;
    };
  }, [targetDate]);

  const { executeProtected } = useProtectedAction();

  const handleSave = async (newMood?: MoodType, newContent?: string) => {
    executeProtected(async () => {
      setIsSaving(true);
      setSaveStatus('idle');
      try {
        const moodToSave = newMood !== undefined ? newMood : selectedMood;
        const contentToSave = newContent !== undefined ? newContent : content;
        await api.saveJournal(targetDate, contentToSave, moodToSave);
        setSaveStatus('saved');
        if (onSaved) onSaved();
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setSaveStatus('error');
      } finally {
        setIsSaving(false);
      }
    }, 'Save Daily Journal');
  };

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    handleSave(mood, content);
  };

  return (
    <div id="v3-daily-journal-card" className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Daily Check-in & Mindset
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Capture your mental state and 1 key takeaway for {targetDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
              <AlertCircle className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>
      </div>

      {/* Mood Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
          How are you feeling today?
        </label>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => {
            const isSelected = selectedMood === m.type;
            return (
              <button
                key={m.type}
                type="button"
                onClick={() => handleMoodSelect(m.type)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? m.activeBg
                    : `border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 ${m.bg}`
                }`}
              >
                <span className="text-xl mb-1">{m.icon}</span>
                <span className="text-[11px] font-medium leading-none truncate max-w-full">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Journal Text Area */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center justify-between">
          <span>Today's Journal / Micro-Wins</span>
          <span className="text-[10px] text-slate-400 font-normal">Auto-saves on blur</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => handleSave()}
          rows={3}
          placeholder="What went well today? What did you learn or feel proud of?"
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {isSaving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
