import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DailyJournal, MoodType } from '../types';
import { getTodayDateInfo, formatDateKey } from '../utils/date';
import { useProtectedAction } from '../context/ProtectedActionContext';
import {
  SELECTABLE_MOODS,
  ENERGY_LEVELS,
  normalizeMood,
  getMoodMeta,
  MoodMeta,
} from '../utils/mood';
import {
  Smile,
  Star,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
  Calendar,
  MessageSquare,
  Clock,
} from 'lucide-react';

interface DailyMoodCardProps {
  dateStr?: string;
  isUnlocked: boolean;
  onSaved?: (entry: DailyJournal) => void;
  onRequireUnlock?: () => void;
  title?: string;
  subtitle?: string;
}

export const DailyMoodCard: React.FC<DailyMoodCardProps> = ({
  dateStr,
  isUnlocked,
  onSaved,
  onRequireUnlock,
  title = "Today's Mood & Energy",
  subtitle,
}) => {
  const todayInfo = getTodayDateInfo();
  const todayStr = formatDateKey(todayInfo.year, todayInfo.month, todayInfo.day);
  const targetDate = (dateStr && typeof dateStr === 'string' && dateStr.trim())
    ? (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim())
    : todayStr;
  const isToday = targetDate === todayStr;

  const [selectedMood, setSelectedMood] = useState<MoodType>('good');
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const { executeProtected } = useProtectedAction();

  // Load existing daily_journal entry for targetDate
  useEffect(() => {
    let isMounted = true;
    async function loadEntry() {
      try {
        const res = await api.getJournal({ date: targetDate });
        if (isMounted && res.journal && res.journal.length > 0) {
          const entry = res.journal[0];
          if (entry.mood) setSelectedMood(normalizeMood(entry.mood));
          if (entry.energy_level && entry.energy_level >= 1 && entry.energy_level <= 5) {
            setEnergyLevel(entry.energy_level);
          }
          if (entry.content) setContent(entry.content);
          if (entry.updated_at || entry.created_at) {
            const dateObj = new Date(entry.updated_at || entry.created_at || '');
            if (!isNaN(dateObj.getTime())) {
              setLastSavedTime(
                dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              );
            }
          }
        } else if (isMounted) {
          // Reset default if no record for targetDate
          setSelectedMood('good');
          setEnergyLevel(3);
          setContent('');
          setLastSavedTime(null);
        }
      } catch (err) {
        // silent fallback
      } finally {
        if (isMounted) setHasLoaded(true);
      }
    }
    loadEntry();
    return () => {
      isMounted = false;
    };
  }, [targetDate]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    executeProtected(async () => {
      setIsSaving(true);
      setSaveStatus('idle');
      try {
        const res = await api.saveJournal(targetDate, content, selectedMood, energyLevel);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (onSaved && res.entry) onSaved(res.entry);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err) {
        console.error('Failed to save mood entry:', err);
        setSaveStatus('error');
      } finally {
        setIsSaving(false);
      }
    }, `Save Mood & Energy for ${targetDate}`);
  };

  const currentMoodMeta = getMoodMeta(selectedMood);

  return (
    <div
      id="daily-mood-card"
      className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EFF4FB] dark:bg-slate-700 text-[#2A486F] dark:text-sky-300 flex items-center justify-center text-xl shadow-2xs">
            {currentMoodMeta.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                {isToday ? 'Today' : targetDate}
              </span>
              {lastSavedTime && (
                <span className="text-[11px] text-[#8C8377] dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Saved at {lastSavedTime}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight mt-0.5">
              {title}
            </h3>
            <p className="text-xs text-[#7D766C] dark:text-slate-400">
              {subtitle || (isToday ? 'Record how you feel today and log your personal energy level.' : `Mood log for ${targetDate}`)}
            </p>
          </div>
        </div>

        {/* Auth / Status banner */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {!isUnlocked && (
            <button
              type="button"
              onClick={onRequireUnlock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Unlock to edit"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Unlock to Edit (PIN: 9500)</span>
            </button>
          )}

          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Mood Saved
            </span>
          )}

          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5" /> Error Saving
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-5 space-y-6">
        {/* 1. 6 Selectable Moods */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 flex items-center gap-1.5">
              <span>Select Mood</span>
              <span className="text-[11px] font-normal lowercase text-[#8C8377] dark:text-slate-500">
                (6 levels)
              </span>
            </label>
            <span className="text-xs font-semibold text-[#2D2A26] dark:text-white">
              Currently: <strong className={currentMoodMeta.colorClass}>{currentMoodMeta.label}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {SELECTABLE_MOODS.map((m) => {
              const isSelected = selectedMood === m.type;
              return (
                <button
                  key={m.type}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => setSelectedMood(m.type)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? `${m.activeClass} shadow-xs scale-[1.02]`
                      : `border-[#E5DFD5] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-750 text-[#5C554B] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 ${m.bgClass}`
                  } ${!isUnlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <span className="text-2xl sm:text-3xl mb-1 transition-transform group-hover:scale-110">
                    {m.emoji}
                  </span>
                  <span className="text-xs font-bold leading-tight truncate max-w-full">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Energy Level (1-5 ⭐) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 flex items-center gap-1.5">
              <span>Energy Level</span>
              <span className="text-[11px] font-normal text-[#8C8377] dark:text-slate-500">
                (1 to 5 stars)
              </span>
            </label>
            <span className="text-xs font-semibold text-[#2D2A26] dark:text-white">
              {ENERGY_LEVELS[energyLevel - 1]?.stars} •{' '}
              <span className="text-[#5B8266] dark:text-emerald-400 font-bold">
                {ENERGY_LEVELS[energyLevel - 1]?.description}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {ENERGY_LEVELS.map((item) => {
              const isSelected = energyLevel === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => setEnergyLevel(item.level)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border-[#5B8266] text-[#2C523A] dark:text-emerald-300 ring-2 ring-[#5B8266]/30 shadow-xs'
                      : 'border-[#E5DFD5] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-750 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700'
                  } ${!isUnlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-center gap-0.5 text-amber-500 mb-1">
                    {Array.from({ length: item.level }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                    ))}
                  </div>
                  <span className="text-xs font-bold">Level {item.level}</span>
                  <span className="text-[10px] text-[#8C8377] dark:text-slate-400 hidden sm:inline truncate max-w-full">
                    {item.label.split('-')[1]?.trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Short text field: "How are you feeling today?" */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#5B8266]" />
              How are you feeling today?
            </span>
            <span className="text-[11px] font-normal text-[#8C8377] dark:text-slate-400">
              Short note / thoughts
            </span>
          </label>
          <textarea
            value={content}
            disabled={!isUnlocked}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder={
              isUnlocked
                ? "Describe your thoughts, mood drivers, or how your body feels today..."
                : "Unlock with PIN to add or update your daily mood note..."
            }
            className="w-full px-4 py-3 text-xs sm:text-sm bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 rounded-2xl text-[#2D2A26] dark:text-slate-100 placeholder:text-[#A69E92] dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5B8266] focus:border-transparent transition-all resize-none disabled:opacity-60"
          />
        </div>

        {/* 4. Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#8C8377] dark:text-slate-400">
            {isUnlocked ? (
              <span>Updates existing <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[11px]">public.daily_journal</code> record for this date</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Visitors cannot edit. Unlock to save.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isUnlocked ? (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] active:bg-[#3D5E46] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Mood</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequireUnlock}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#2D2A26] hover:bg-black text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Enter PIN to Save</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
