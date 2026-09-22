import React, { useState, useEffect } from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_OPTIONS, MOOD_TRACKER_MAP, MoodTrackerValue } from '../types';
import { api } from '../api';
import { getLocalDateString } from '../utils/date';
import { useProtectedAction } from '../context/ProtectedActionContext';
import { Smile, Star, ArrowRight, Check, Plus, Sparkles } from 'lucide-react';

interface CompactMoodWidgetProps {
  dateStr?: string;
  isUnlocked: boolean;
  onOpenMoodTab?: () => void;
  onRequireUnlock?: () => void;
}

export const CompactMoodWidget: React.FC<CompactMoodWidgetProps> = ({
  isUnlocked,
  onOpenMoodTab,
  onRequireUnlock,
}) => {
  const todayStr = getLocalDateString();

  const [todayMood, setTodayMood] = useState<MoodTrackerEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickSaved, setQuickSaved] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadTodayMood() {
      try {
        const res = await api.getMoods();
        if (isMounted && res.moods) {
          const found = res.moods.find((m) => m.date === todayStr);
          setTodayMood(found || null);
        }
      } catch (err) {
        // silent fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadTodayMood();
    return () => {
      isMounted = false;
    };
  }, [todayStr]);

  const { executeProtected } = useProtectedAction();

  const handleQuickMood = async (moodVal: MoodTrackerValue) => {
    executeProtected(async () => {
      const opt = MOOD_TRACKER_MAP[moodVal];
      try {
        const res = await api.saveMood({
          date: todayStr,
          mood: moodVal,
          mood_score: opt?.score || 4,
          energy_level: todayMood?.energy_level || 3,
          note: todayMood?.note || '',
        });
        if (res.mood) {
          setTodayMood(res.mood);
          setQuickSaved(true);
          setTimeout(() => setQuickSaved(false), 2500);
        }
      } catch (err) {
        console.error('Failed to quick-save mood:', err);
      }
    }, `Log Quick Mood: ${moodVal}`);
  };

  const meta = todayMood ? MOOD_TRACKER_MAP[todayMood.mood] : null;
  const hasLogged = !!todayMood;

  return (
    <div
      id="compact-mood-widget"
      className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-4 sm:p-5 transition-all duration-300 ease-out hover:scale-[1.008] hover:shadow-md hover:border-[#D5CDC0] dark:hover:border-slate-600"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-2xs ${
              hasLogged
                ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 text-[#5B8266] border border-[#D5E5D9] dark:border-emerald-800'
                : 'bg-[#FAF8F5] dark:bg-slate-750 text-[#8C8377] border border-[#ECE6DC] dark:border-slate-700'
            }`}
          >
            {hasLogged && meta ? meta.emoji : '🙂'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-[#D5E5D9] dark:border-emerald-800">
                Today's Mood
              </span>
              {quickSaved && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>

            {hasLogged && meta ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </span>
                {todayMood?.energy_level && (
                  <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">
                    • Energy {Array.from({ length: todayMood.energy_level }).map(() => '⭐').join('')}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#4A453E] dark:text-slate-200 mt-1">
                How are you feeling today?
              </p>
            )}

            {todayMood?.note && (
              <p className="text-xs text-[#7D766C] dark:text-slate-400 italic line-clamp-1 mt-0.5">
                "{todayMood.note}"
              </p>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {hasLogged ? (
            <button
              type="button"
              onClick={onOpenMoodTab}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-650 border border-[#ECE6DC] dark:border-slate-600 text-xs font-bold text-[#2D2A26] dark:text-slate-200 transition-colors cursor-pointer"
            >
              <span>View & Edit Mood</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5B8266]" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-[#FAF8F5] dark:bg-slate-750 p-1 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
                {MOOD_TRACKER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuickMood(opt.value)}
                    className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-lg transition-transform hover:scale-125 cursor-pointer"
                    title={`Log ${opt.label}`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenMoodTab}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Mood</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
