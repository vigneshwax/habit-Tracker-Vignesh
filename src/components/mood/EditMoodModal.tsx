import React, { useState, useEffect } from 'react';
import { MoodTrackerEntry, MoodTrackerValue, MOOD_TRACKER_OPTIONS, MOOD_TRACKER_MAP } from '../../types';
import { api } from '../../api';
import { X, Star, AlertTriangle, AlertCircle, Check, Sparkles } from 'lucide-react';
import { useProtectedAction } from '../../context/ProtectedActionContext';

interface EditMoodModalProps {
  isOpen: boolean;
  entry: MoodTrackerEntry | null;
  onClose: () => void;
  onUpdated: (updated: MoodTrackerEntry) => void;
}

export const EditMoodModal: React.FC<EditMoodModalProps> = ({
  isOpen,
  entry,
  onClose,
  onUpdated,
}) => {
  if (!isOpen || !entry) return null;

  const [date, setDate] = useState<string>(entry.date);
  const [mood, setMood] = useState<MoodTrackerValue>(entry.mood);
  const [energyLevel, setEnergyLevel] = useState<number>(entry.energy_level || 3);
  const [note, setNote] = useState<string>(entry.note || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { executeProtected } = useProtectedAction();

  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setMood(entry.mood);
      setEnergyLevel(entry.energy_level || 3);
      setNote(entry.note || '');
      setErrorMessage('');
    }
  }, [entry]);

  const currentScore = MOOD_TRACKER_MAP[mood]?.score || 4;
  const isDateChanged = date !== entry.date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMessage('Valid date (YYYY-MM-DD) is required.');
      return;
    }

    executeProtected(async () => {
      setIsSubmitting(true);
      setErrorMessage('');

      try {
        const payload = {
          date,
          mood,
          mood_score: currentScore,
          energy_level: energyLevel,
          note: note.trim(),
        };

        const res = await api.updateMood(entry.id, payload);
        if (res.mood) {
          onUpdated(res.mood);
          onClose();
        }
      } catch (err: any) {
        console.error('Failed to update mood entry:', err);
        setErrorMessage(err?.message || 'Failed to update mood entry.');
      } finally {
        setIsSubmitting(false);
      }
    }, `Update Mood Log for ${date}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="edit-mood-modal"
        className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white">
              Edit Mood Entry
            </h3>
            <p className="text-xs text-[#8C8377] dark:text-slate-400 mt-0.5">
              Modify mood, energy, or reflection notes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#8C8377] hover:text-[#2D2A26] dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Date with warning */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-1.5">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-sm font-medium text-[#2D2A26] dark:text-white focus:ring-2 focus:ring-[#5B8266]/30 focus:border-[#5B8266]"
            />
            {isDateChanged && (
              <div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Warning: Changing the date alters your historical calendar view.</span>
              </div>
            )}
          </div>

          {/* Mood selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-2">
              Mood
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MOOD_TRACKER_OPTIONS.map((opt) => {
                const isSelected = mood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#5B8266] bg-[#F4F8F5] dark:bg-emerald-950/40 dark:border-emerald-500 font-bold ring-2 ring-[#5B8266]/20'
                        : 'border-[#ECE6DC] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4]'
                    }`}
                  >
                    <span className="text-2xl block">{opt.emoji}</span>
                    <span className="text-xs text-[#2D2A26] dark:text-slate-200 mt-1 block">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-[#8C8377] dark:text-slate-400">
                      Score: {opt.score}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy level */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400">
                Energy Level
              </label>
              <span className="text-xs font-bold text-[#2D2A26] dark:text-slate-300">
                {energyLevel} / 5 Stars
              </span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] dark:bg-slate-750 rounded-xl border border-[#ECE6DC] dark:border-slate-700">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isActive = lvl <= energyLevel;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergyLevel(lvl)}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A]'
                        : 'bg-white dark:bg-slate-800 text-[#A69E92] border border-[#ECE6DC] dark:border-slate-700'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isActive ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                    <span>{lvl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7D766C] dark:text-slate-400 mb-1.5">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="How are you feeling today?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-sm text-[#2D2A26] dark:text-slate-100 focus:ring-2 focus:ring-[#5B8266]/30 focus:border-[#5B8266] resize-none"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0EBE1] dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7D766C] hover:bg-[#FAF8F5] dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
