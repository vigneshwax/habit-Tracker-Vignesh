import React, { useState, useEffect, useMemo } from 'react';
import { MoodTrackerEntry, MoodTrackerValue, MOOD_TRACKER_OPTIONS, MOOD_TRACKER_MAP } from '../../types';
import { getLocalDateString, formatDateKey } from '../../utils/date';
import { api } from '../../api';
import { useProtectedAction } from '../../context/ProtectedActionContext';
import { Star, Check, Sparkles, Calendar, Lock, AlertCircle, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

interface TodayMoodCardProps {
  existingEntry?: MoodTrackerEntry | null;
  allEntries?: MoodTrackerEntry[];
  isUnlocked: boolean;
  onSaved: (entry: MoodTrackerEntry) => void;
  onRequireUnlock: () => void;
}

export const TodayMoodCard: React.FC<TodayMoodCardProps> = ({
  existingEntry,
  allEntries = [],
  isUnlocked,
  onSaved,
  onRequireUnlock,
}) => {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Find existing entry for selectedDate
  const currentEntry = useMemo(() => {
    if (selectedDate === todayStr && existingEntry) return existingEntry;
    return allEntries.find((m) => m.date === selectedDate) || (selectedDate === todayStr ? existingEntry : null);
  }, [selectedDate, todayStr, existingEntry, allEntries]);

  const [selectedMood, setSelectedMood] = useState<MoodTrackerValue>(
    currentEntry?.mood || 'good'
  );
  const [energyLevel, setEnergyLevel] = useState<number>(
    currentEntry?.energy_level || 3
  );
  const [note, setNote] = useState<string>(currentEntry?.note || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Auto-dismiss transient error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Sync state when currentEntry changes or selectedDate changes
  useEffect(() => {
    if (currentEntry) {
      setSelectedMood(currentEntry.mood);
      setEnergyLevel(currentEntry.energy_level || 3);
      setNote(currentEntry.note || '');
    } else {
      setSelectedMood('good');
      setEnergyLevel(3);
      setNote('');
    }
  }, [currentEntry, selectedDate]);

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const prev = formatDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    const next = formatDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    if (next <= todayStr) {
      setSelectedDate(next);
    }
  };

  const { executeProtected } = useProtectedAction();
  const currentScore = MOOD_TRACKER_MAP[selectedMood]?.score || 4;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    executeProtected(async () => {
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        const payload = {
          date: selectedDate,
          mood: selectedMood,
          mood_score: currentScore,
          energy_level: energyLevel,
          note: note.trim(),
        };

        const res = await api.saveMood(payload);
        if (res.mood) {
          onSaved(res.mood);
          const dateLabel = selectedDate === todayStr ? "Today's mood" : `Mood for ${selectedDate}`;
          setSuccessMessage(res.updated ? `${dateLabel} updated!` : `${dateLabel} saved!`);
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } catch (err: any) {
        console.error('Failed to save mood:', err);
        setErrorMessage(err?.message || 'Failed to save mood entry.');
      } finally {
        setIsSubmitting(false);
      }
    }, `Save Mood for ${selectedDate}`);
  };

  return (
    <div
      id="today-mood-card"
      className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-7 shadow-xs transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F0EBE1] dark:border-slate-700">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              id="today-mood-date-badge"
              className="relative inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1 rounded-full border border-[#D5E5D9] dark:border-emerald-800 hover:bg-[#E0EFE5] dark:hover:bg-emerald-900/40 transition-all cursor-pointer shadow-2xs group"
              title="Click to choose any date"
            >
              <Calendar className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>{selectedDate === todayStr ? `Today • ${selectedDate}` : selectedDate}</span>
              <Edit3 className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              <input
                id="mood-card-date-input"
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                aria-label="Change mood check-in date"
              />
            </span>

            {/* Quick Day Stepper: Previous Day, Today, Next Day */}
            <div className="inline-flex items-center gap-0.5 bg-[#FAF8F5] dark:bg-slate-750 p-0.5 rounded-full border border-[#ECE6DC] dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevDay}
                id="mood-prev-day-btn"
                title="Previous Day"
                aria-label="Previous Day"
                className="p-1 rounded-full text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  id="mood-jump-today-btn"
                  className="px-2 py-0.5 text-[10px] font-bold text-[#5B8266] dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                  title="Jump to Today"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={handleNextDay}
                disabled={selectedDate >= todayStr}
                id="mood-next-day-btn"
                title="Next Day"
                aria-label="Next Day"
                className="p-1 rounded-full text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentEntry ? (
              <span className="text-[11px] font-semibold text-[#5B8266] dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Logged
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8C8377] dark:text-slate-400">
                (Not logged yet)
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1.5">
            {selectedDate === todayStr ? "Today's Mood" : `Mood for ${selectedDate}`}
          </h2>
        </div>

        {currentEntry && (
          <div className="flex items-center gap-2 bg-[#FAF8F5] dark:bg-slate-750 px-3.5 py-1.5 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
            <span className="text-xl">{MOOD_TRACKER_MAP[currentEntry.mood]?.emoji}</span>
            <div className="text-xs">
              <span className="font-bold text-[#2D2A26] dark:text-slate-200">
                {MOOD_TRACKER_MAP[currentEntry.mood]?.label}
              </span>
              <span className="text-[#8C8377] dark:text-slate-400 ml-1.5">
                (Score: {currentEntry.mood_score}/6)
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        {/* Mood Selection (6 options) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-3">
            Select Your Mood
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {MOOD_TRACKER_OPTIONS.map((opt) => {
              const isSelected = selectedMood === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedMood(opt.value)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer text-center relative ${
                    isSelected
                      ? 'border-[#5B8266] bg-[#F4F8F5] dark:bg-emerald-950/40 dark:border-emerald-500 shadow-xs ring-2 ring-[#5B8266]/20'
                      : 'border-[#ECE6DC] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-[#4A453E] dark:text-slate-300'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl mb-1.5 transition-transform hover:scale-110">
                    {opt.emoji}
                  </span>
                  <span className="text-xs font-bold text-[#2D2A26] dark:text-slate-200">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
                    Score: {opt.score}/6
                  </span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#5B8266] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy Level (1-5 stars) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400">
              Energy Level (1–5)
            </label>
            <span className="text-xs font-bold text-[#2D2A26] dark:text-slate-300">
              Level {energyLevel} of 5
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-[#FAF8F5] dark:bg-slate-750 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const isActive = lvl <= energyLevel;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800'
                      : 'bg-white dark:bg-slate-800 text-[#A69E92] dark:text-slate-500 border border-[#ECE6DC] dark:border-slate-700 hover:bg-[#F2ECE4]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isActive ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>{lvl}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-2">
            Daily Reflection Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How are you feeling today?"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-[#2D2A26] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 focus:border-[#5B8266] transition-all resize-none placeholder:text-[#A69E92] dark:placeholder:text-slate-500"
          />
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[#8C8377] dark:text-slate-400">
            {!isUnlocked && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Lock className="w-3.5 h-3.5" />
                PIN required to save
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {currentEntry ? (
              <>
                <Edit3 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Updating...'
                    : `Update Mood (${selectedDate === todayStr ? 'Today' : selectedDate})`}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : `Save Mood (${selectedDate === todayStr ? 'Today' : selectedDate})`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
