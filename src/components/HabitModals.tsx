import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Archive, Check, Minus, Play, Pause, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';
import { Habit, HabitCategory, HabitFrequency, HabitStatus } from '../types';
import { CATEGORIES_META, getCategoryMeta, WEEKDAY_LABELS } from '../utils/categories';

const CATEGORY_OPTIONS: Array<{ id: HabitCategory; label: string; emoji: string }> = [
  { id: 'health', label: 'Health', emoji: '🏃' },
  { id: 'career', label: 'Career', emoji: '💼' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
  { id: 'personal', label: 'Personal', emoji: '🧘' },
  { id: 'finance', label: 'Finance', emoji: '💰' },
  { id: 'general', label: 'General', emoji: '✨' },
];

const FREQUENCY_OPTIONS: Array<{ id: HabitFrequency; label: string; desc: string }> = [
  { id: 'daily', label: 'Daily', desc: 'Scheduled every day' },
  { id: 'specific_days', label: 'Specific Days', desc: 'Selected weekdays (e.g. Mon, Wed, Fri)' },
  { id: 'weekly_target', label: 'Weekly Target', desc: 'Flexible target completions per week' },
  { id: 'monthly_target', label: 'Monthly Target', desc: 'Flexible target completions per month' },
];

// ----------------------------------------------------
// 1. IMPROVED ADD HABIT MODAL
// ----------------------------------------------------
interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: {
    name: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    schedule_days?: number[];
    target_count?: number;
    status: HabitStatus;
  }) => Promise<void>;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [weeklyTarget, setWeeklyTarget] = useState<number>(3);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(15);
  const [status, setStatus] = useState<HabitStatus>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategory('health');
      setFrequency('daily');
      setSelectedDays([1, 3, 5]);
      setWeeklyTarget(3);
      setMonthlyTarget(15);
      setStatus('active');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        // Prevent deselecting all days
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIndex).sort((a, b) => a - b);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a habit name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await onAdd({
        name: name.trim(),
        category,
        frequency,
        schedule_days: frequency === 'specific_days' ? selectedDays : undefined,
        target_count:
          frequency === 'weekly_target'
            ? weeklyTarget
            : frequency === 'monthly_target'
            ? monthlyTarget
            : undefined,
        status,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E8E2D7] dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/40 text-[#3D6B4E] dark:text-emerald-300 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
              Create New Habit
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C8377] hover:bg-[#F4EFEA] dark:hover:bg-slate-700 hover:text-[#2D2A26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && (
            <div className="p-3 bg-[#FDF2F0] dark:bg-rose-950/40 border border-[#F5D5D0] dark:border-rose-800 rounded-xl text-xs text-[#C05746] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. HABIT NAME */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Habit Name *
            </label>
            <input
              id="new-habit-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exercise, Read Books, Morning Meditation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-sm text-[#2D2A26] dark:text-white placeholder-[#A69E92] focus:outline-none focus:border-[#5B8266] focus:ring-1 focus:ring-[#5B8266]"
              autoFocus
            />
          </div>

          {/* 2. CATEGORY (Dropdown) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                id="new-habit-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as HabitCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-sm font-semibold text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266] cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. FREQUENCY OPTIONS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-2">
              Frequency
            </label>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border-[#5B8266] dark:border-emerald-600 shadow-2xs'
                        : 'bg-[#FAF8F5] dark:bg-slate-900/60 border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F4EFEA]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="habit-frequency"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setFrequency(opt.id)}
                      className="mt-0.5 text-[#5B8266] focus:ring-[#5B8266]"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Conditional: SPECIFIC DAYS (Sun Mon Tue Wed Thu Fri Sat) */}
          {frequency === 'specific_days' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase">
                  Select Days of Week
                </span>
                <span className="text-[11px] font-semibold text-[#5B8266]">
                  {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {WEEKDAY_LABELS.map((w) => {
                  const isDaySelected = selectedDays.includes(w.dayIndex);
                  return (
                    <button
                      key={w.dayIndex}
                      type="button"
                      onClick={() => toggleDay(w.dayIndex)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isDaySelected
                          ? 'bg-[#5B8266] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4]'
                      }`}
                      title={`${w.full} (Index ${w.dayIndex})`}
                    >
                      <span>{w.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conditional: WEEKLY TARGET STEPPER */}
          {frequency === 'weekly_target' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
              <label className="block text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase mb-2">
                Target times per week
              </label>
              <div className="flex items-center justify-center gap-4 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setWeeklyTarget((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                  aria-label="Decrease target"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="text-lg font-bold text-[#2D2A26] dark:text-white">
                    {weeklyTarget}
                  </span>
                  <span className="text-xs text-[#8C8377] block -mt-0.5">times / week</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyTarget((prev) => Math.min(7, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                  aria-label="Increase target"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Conditional: MONTHLY TARGET STEPPER */}
          {frequency === 'monthly_target' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
              <label className="block text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase mb-2">
                Target times per month
              </label>
              <div className="flex items-center justify-center gap-4 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMonthlyTarget((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                  aria-label="Decrease target"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[90px]">
                  <span className="text-lg font-bold text-[#2D2A26] dark:text-white">
                    {monthlyTarget}
                  </span>
                  <span className="text-xs text-[#8C8377] block -mt-0.5">times / month</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMonthlyTarget((prev) => Math.min(31, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                  aria-label="Increase target"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 4. STATUS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Initial Status
            </label>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2D2A26] dark:text-white">
                Active (Default)
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#EBF3EE] text-[#2C523A] rounded-full border border-[#D5E5D9]">
                Ready to track
              </span>
            </div>
          </div>

          {/* Buttons: Cancel & Create Habit */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#736A5E] dark:text-slate-300 hover:bg-[#F4EFEA] dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="create-habit-submit-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <span>Creating...</span> : <span>Create Habit</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. IMPROVED EDIT HABIT MODAL
// ----------------------------------------------------
interface EditHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    params: {
      name: string;
      category: HabitCategory;
      frequency: HabitFrequency;
      schedule_days?: number[];
      target_count?: number;
      status: HabitStatus;
    }
  ) => Promise<void>;
  onArchive?: (habit: Habit) => void;
  onDelete?: (habit: Habit) => void;
}

export const EditHabitModal: React.FC<EditHabitModalProps> = ({
  habit,
  isOpen,
  onClose,
  onSave,
  onArchive,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(3);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(15);
  const [status, setStatus] = useState<HabitStatus>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (habit) {
      setName(habit.name || '');
      setCategory((habit.category as HabitCategory) || 'health');
      setFrequency(habit.frequency || 'daily');

      // Parse schedule_days safely into numeric day indices 0-6
      if (Array.isArray(habit.schedule_days) && habit.schedule_days.length > 0) {
        const parsedIndices: number[] = [];
        habit.schedule_days.forEach((d) => {
          if (typeof d === 'number') {
            parsedIndices.push((d % 7 + 7) % 7);
          } else if (typeof d === 'string') {
            const num = parseInt(d, 10);
            if (!isNaN(num)) {
              parsedIndices.push((num % 7 + 7) % 7);
            } else {
              const clean = d.trim().toLowerCase();
              const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].findIndex((w) =>
                clean.startsWith(w)
              );
              if (idx >= 0) parsedIndices.push(idx);
            }
          }
        });
        setSelectedDays(parsedIndices.length > 0 ? Array.from(new Set(parsedIndices)).sort((a, b) => a - b) : [1, 3, 5]);
      } else {
        setSelectedDays([1, 3, 5]);
      }

      setWeeklyTarget(habit.target_count || habit.target_days || 3);
      setMonthlyTarget(habit.target_count || habit.target_days || 15);
      setStatus(habit.status || 'active');
      setError('');
    }
  }, [habit, isOpen]);

  if (!isOpen || !habit) return null;

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIndex).sort((a, b) => a - b);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a habit name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await onSave(habit.id, {
        name: name.trim(),
        category,
        frequency,
        schedule_days: frequency === 'specific_days' ? selectedDays : undefined,
        target_count:
          frequency === 'weekly_target'
            ? weeklyTarget
            : frequency === 'monthly_target'
            ? monthlyTarget
            : undefined,
        status,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to update habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E8E2D7] dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF4FB] dark:bg-blue-950/40 text-[#2A486F] dark:text-blue-300 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
              Edit Habit
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C8377] hover:bg-[#F4EFEA] dark:hover:bg-slate-700 hover:text-[#2D2A26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && (
            <div className="p-3 bg-[#FDF2F0] dark:bg-rose-950/40 border border-[#F5D5D0] dark:border-rose-800 rounded-xl text-xs text-[#C05746] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. HABIT NAME */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Habit Name *
            </label>
            <input
              id="edit-habit-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-sm text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266] focus:ring-1 focus:ring-[#5B8266]"
            />
          </div>

          {/* 2. CATEGORY (Dropdown) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              id="edit-habit-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as HabitCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-sm font-semibold text-[#2D2A26] dark:text-white focus:outline-none focus:border-[#5B8266] cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. STATUS SELECTOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-1.5">
              Habit Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'active'
                    ? 'bg-[#EBF3EE] dark:bg-emerald-950/50 border-[#5B8266] text-[#2C523A] dark:text-emerald-300 ring-2 ring-[#5B8266]'
                    : 'bg-[#FAF8F5] dark:bg-slate-900 border-[#E5DFD5] dark:border-slate-700 text-[#635B50] dark:text-slate-300'
                }`}
              >
                <Play className="w-3 h-3 text-[#5B8266]" /> Active
              </button>

              <button
                type="button"
                onClick={() => setStatus('paused')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'paused'
                    ? 'bg-[#FEF6E8] dark:bg-amber-950/50 border-[#D97706] text-[#D97706] ring-2 ring-[#D97706]'
                    : 'bg-[#FAF8F5] dark:bg-slate-900 border-[#E5DFD5] dark:border-slate-700 text-[#635B50] dark:text-slate-300'
                }`}
              >
                <Pause className="w-3 h-3 text-[#D97706]" /> Paused
              </button>

              <button
                type="button"
                onClick={() => setStatus('archived')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'archived'
                    ? 'bg-[#F4EFEA] dark:bg-slate-700 border-[#8C8377] text-[#5C554B] dark:text-white ring-2 ring-[#8C8377]'
                    : 'bg-[#FAF8F5] dark:bg-slate-900 border-[#E5DFD5] dark:border-slate-700 text-[#635B50] dark:text-slate-300'
                }`}
              >
                <Archive className="w-3 h-3 text-[#8C8377]" /> Archived
              </button>
            </div>
            <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
              {status === 'active' && 'Active habits appear in Today’s Focus, Grid, and consistency streaks.'}
              {status === 'paused' && 'Paused habits do not break streaks and are safely placed on hold.'}
              {status === 'archived' && 'Archived habits preserve all past entries and can be restored anytime.'}
            </p>
          </div>

          {/* 4. FREQUENCY OPTIONS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736A5E] dark:text-slate-300 mb-2">
              Frequency
            </label>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border-[#5B8266] dark:border-emerald-600 shadow-2xs'
                        : 'bg-[#FAF8F5] dark:bg-slate-900/60 border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F4EFEA]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-habit-frequency"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setFrequency(opt.id)}
                      className="mt-0.5 text-[#5B8266] focus:ring-[#5B8266]"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Conditional: SPECIFIC DAYS */}
          {frequency === 'specific_days' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase">
                  Select Days of Week
                </span>
                <span className="text-[11px] font-semibold text-[#5B8266]">
                  {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {WEEKDAY_LABELS.map((w) => {
                  const isDaySelected = selectedDays.includes(w.dayIndex);
                  return (
                    <button
                      key={w.dayIndex}
                      type="button"
                      onClick={() => toggleDay(w.dayIndex)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isDaySelected
                          ? 'bg-[#5B8266] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4]'
                      }`}
                      title={`${w.full} (Index ${w.dayIndex})`}
                    >
                      <span>{w.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conditional: WEEKLY TARGET STEPPER */}
          {frequency === 'weekly_target' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
              <label className="block text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase mb-2">
                Target times per week
              </label>
              <div className="flex items-center justify-center gap-4 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setWeeklyTarget((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="text-lg font-bold text-[#2D2A26] dark:text-white">
                    {weeklyTarget}
                  </span>
                  <span className="text-xs text-[#8C8377] block -mt-0.5">times / week</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyTarget((prev) => Math.min(7, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Conditional: MONTHLY TARGET STEPPER */}
          {frequency === 'monthly_target' && (
            <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#ECE6DC] dark:border-slate-700">
              <label className="block text-[11px] font-bold text-[#736A5E] dark:text-slate-300 uppercase mb-2">
                Target times per month
              </label>
              <div className="flex items-center justify-center gap-4 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMonthlyTarget((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center min-w-[90px]">
                  <span className="text-lg font-bold text-[#2D2A26] dark:text-white">
                    {monthlyTarget}
                  </span>
                  <span className="text-xs text-[#8C8377] block -mt-0.5">times / month</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMonthlyTarget((prev) => Math.min(31, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 flex items-center justify-center text-[#2D2A26] dark:text-white font-bold hover:bg-[#F2ECE4] active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
            <div className="flex items-center gap-2">
              {onArchive && (
                <button
                  id="edit-modal-archive-habit-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onArchive(habit);
                  }}
                  className="text-xs font-semibold text-[#8C8377] hover:text-[#D97706] hover:bg-[#FEF6E8] dark:hover:bg-amber-950/40 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              )}

              {onDelete && (
                <button
                  id="edit-modal-delete-habit-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(habit);
                  }}
                  className="text-xs font-semibold text-[#C05746] hover:text-[#9E3929] hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#736A5E] dark:text-slate-300 hover:bg-[#F4EFEA] dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="edit-habit-save-btn"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {loading ? <span>Saving Changes...</span> : <span>Save Changes</span>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. ARCHIVE CONFIRMATION MODAL
// ----------------------------------------------------
interface ArchiveHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onArchive: (id: string) => Promise<void>;
}

export const ArchiveHabitModal: React.FC<ArchiveHabitModalProps> = ({
  habit,
  isOpen,
  onClose,
  onArchive,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !habit) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onArchive(habit.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-[#E8E2D7] dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF6E8] dark:bg-amber-950/40 text-[#D97706] border border-[#F6E3B8] dark:border-amber-800 flex items-center justify-center mb-4">
          <Archive className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
          Archive this habit?
        </h3>
        <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-2 leading-relaxed">
          Your historical progress and entries will be preserved.
        </p>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#736A5E] dark:text-slate-300 hover:bg-[#F4EFEA] dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-archive-btn"
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. DELETE CONFIRMATION MODAL
// ----------------------------------------------------
interface DeleteHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export const DeleteHabitModal: React.FC<DeleteHabitModalProps> = ({
  habit,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !habit) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onDelete(habit.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-[#E8E2D7] dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] dark:bg-rose-950/40 text-[#C05746] border border-[#F5D5D0] dark:border-rose-800 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
          Delete &ldquo;{habit.name}&rdquo;?
        </h3>
        <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-2 leading-relaxed">
          Are you sure you want to permanently delete this habit? All associated entries and history will be permanently deleted.
        </p>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#736A5E] dark:text-slate-300 hover:bg-[#F4EFEA] dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-habit-btn"
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-2xl bg-[#C05746] hover:bg-[#A84535] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
