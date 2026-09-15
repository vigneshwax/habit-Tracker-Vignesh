import React, { useState, useMemo } from 'react';
import { Plus, Check, Edit2, Archive, Pause, Play, Search, Sparkles, Info, Flame, Trophy, RotateCcw } from 'lucide-react';
import { Habit, HabitCategory } from '../types';
import { getDayOfWeek, WEEKDAYS, formatDateKey, isSameDay } from '../utils/date';
import { getCategoryMeta, CATEGORIES_META, formatHabitFrequency } from '../utils/categories';
import { isHabitScheduledOnDate, getHabitProgress, getDayProgress } from '../utils/scheduler';

const CATEGORY_FILTERS: Array<{ id: string; label: string; emoji: string }> = [
  { id: 'all', label: 'All', emoji: '' },
  { id: 'health', label: 'Health', emoji: '🏃' },
  { id: 'career', label: 'Career', emoji: '💼' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
  { id: 'personal', label: 'Personal', emoji: '🧘' },
  { id: 'finance', label: 'Finance', emoji: '💰' },
  { id: 'general', label: 'General', emoji: '✨' },
];

interface DailyHabitGridProps {
  habits: Habit[];
  year: number;
  month: number;
  daysInMonth: number;
  entries: Record<string, boolean>; // key: `${habit_id}_${date}`
  habitStreaks?: Record<string, { current: number; best: number; totalCompletions: number }>;
  onToggleEntry: (habitId: string, dateStr: string, currentCompleted: boolean) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (habit: Habit) => void;
  onOpenArchiveModal: (habit: Habit) => void;
  onTogglePause: (habit: Habit) => void;
  onRestoreHabit?: (habitId: string) => void;
  onSelectHabit: (habit: Habit) => void;
}

export const DailyHabitGrid: React.FC<DailyHabitGridProps> = ({
  habits,
  year,
  month,
  daysInMonth,
  entries,
  habitStreaks,
  onToggleEntry,
  onOpenAddModal,
  onOpenEditModal,
  onOpenArchiveModal,
  onTogglePause,
  onRestoreHabit,
  onSelectHabit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused' | 'archived' | 'all'>('active');

  // Filter habits based on category, search, and status
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      const status = h.status || 'active';
      if (statusFilter === 'active' && status !== 'active') return false;
      if (statusFilter === 'paused' && status !== 'paused') return false;
      if (statusFilter === 'archived' && status !== 'archived') return false;

      const habitCategory = String(h.category || 'general').toLowerCase();
      const matchesCat = selectedCategory === 'all' || habitCategory === selectedCategory;
      const matchesSearch = String(h.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCat && matchesSearch;
    });
  }, [habits, selectedCategory, searchQuery, statusFilter]);

  // Days array (1 to daysInMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Active habits list for daily summary calculations
  const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');

  const activeCount = habits.filter((h) => (h.status || 'active') === 'active').length;
  const pausedCount = habits.filter((h) => h.status === 'paused').length;
  const archivedCount = habits.filter((h) => h.status === 'archived').length;

  return (
    <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 mb-8 overflow-hidden">
      {/* Top Controls: Status Filters, Search, Category Filter Buttons, and Add Habit */}
      <div className="flex flex-col gap-4 pb-5 border-b border-[#F0EBE1] dark:border-slate-700">
        {/* Status Filter Tabs (Active [Default] / Paused / Archived / All) & Search/Add */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E5DFD5] dark:border-slate-700 w-fit">
            <button
              id="grid-filter-active-btn"
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-[#5B8266] text-white shadow-2xs'
                  : 'text-[#635B50] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              <span>Active</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-bold">
                {activeCount}
              </span>
            </button>

            <button
              id="grid-filter-paused-btn"
              type="button"
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'paused'
                  ? 'bg-[#D97706] text-white shadow-2xs'
                  : 'text-[#635B50] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              <span>Paused</span>
              {pausedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-bold">
                  {pausedCount}
                </span>
              )}
            </button>

            <button
              id="grid-filter-archived-btn"
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'archived'
                  ? 'bg-[#8C8377] text-white shadow-2xs'
                  : 'text-[#635B50] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              <span>Archived</span>
              {archivedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-bold">
                  {archivedCount}
                </span>
              )}
            </button>

            <button
              id="grid-filter-all-btn"
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-[#2D2A26] dark:bg-white dark:text-slate-900 text-white shadow-2xs'
                  : 'text-[#635B50] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-bold">
                {habits.length}
              </span>
            </button>
          </div>

          {/* Search & Add Button */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8377]" />
              <input
                id="habit-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-white placeholder-[#A69E92] focus:outline-none focus:border-[#5B8266]"
              />
            </div>

            <button
              id="add-habit-grid-top-btn"
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-semibold shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Habit</span>
            </button>
          </div>
        </div>

        {/* Category Filter Buttons: All, 🏃 Health, 💼 Career, 📚 Learning, 🧘 Personal, 💰 Finance, ✨ General */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = habits.filter((h) => {
              const matchesStatus =
                statusFilter === 'all' || (h.status || 'active') === statusFilter;
              const matchesCategory =
                cat.id === 'all' || String(h.category || 'general').toLowerCase() === cat.id;
              return matchesStatus && matchesCategory;
            }).length;

            return (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}-btn`}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2D2A26] dark:bg-white dark:text-slate-900 text-white shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#635B50] dark:text-slate-300 hover:bg-[#F2ECE4] border border-[#E5DFD5] dark:border-slate-700'
                }`}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-75 font-bold">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      {filteredHabits.length === 0 ? (
        <div className="py-14 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-[#A69E92] mb-3" />
          <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
            {habits.length === 0 ? 'No habits created yet' : 'No matching habits found'}
          </h4>
          <p className="text-xs text-[#8C8377] dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {habits.length === 0
              ? 'Start building your daily routines by clicking the "Add Habit" button above.'
              : 'Try selecting a different category or clearing your search filter.'}
          </p>
          {habits.length === 0 && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="mt-4 px-4 py-2 rounded-2xl bg-[#5B8266] text-white text-xs font-semibold hover:bg-[#4C7156] transition-colors cursor-pointer shadow-2xs"
            >
              + Create First Habit
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto mt-4 -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full border-collapse select-none min-w-[860px]">
            <thead>
              <tr className="border-b border-[#ECE6DC] dark:border-slate-700">
                {/* Habit Name Column Header */}
                <th className="sticky left-0 z-20 bg-[#FFFFFF] dark:bg-slate-800 py-3 pr-4 text-left font-serif text-xs font-bold text-[#4A453E] dark:text-slate-200 w-64 min-w-[240px]">
                  HABIT & FREQUENCY
                </th>

                {/* Days of Month Headers */}
                {days.map((day) => {
                  const dayOfWeek = getDayOfWeek(year, month, day);
                  const isToday = isSameDay(year, month, day);

                  return (
                    <th
                      key={day}
                      className={`p-1 text-center font-medium transition-colors ${
                        isToday
                          ? 'bg-[#F2F8F4] dark:bg-emerald-950/40 text-[#3D6B4E] dark:text-emerald-300'
                          : 'text-[#736A5E] dark:text-slate-400'
                      }`}
                      style={{ minWidth: '30px', width: '32px' }}
                    >
                      <div className="text-[9px] uppercase tracking-tighter text-[#9C9488]">
                        {WEEKDAYS[dayOfWeek]}
                      </div>
                      <div
                        className={`text-xs font-bold w-6 h-6 mx-auto rounded-full flex items-center justify-center ${
                          isToday ? 'bg-[#5B8266] text-white shadow-2xs' : ''
                        }`}
                      >
                        {day}
                      </div>
                    </th>
                  );
                })}

                {/* Monthly Progress Column Header */}
                <th className="py-3 px-3 text-center font-serif text-xs font-bold text-[#4A453E] dark:text-slate-200 w-28">
                  MONTHLY %
                </th>

                {/* Streaks Column Header */}
                <th className="py-3 px-2 text-center font-serif text-xs font-bold text-[#4A453E] dark:text-slate-200 w-24">
                  STREAK
                </th>

                {/* Actions Column Header */}
                <th className="py-3 px-2 text-right font-serif text-xs font-bold text-[#4A453E] dark:text-slate-200 w-24">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredHabits.map((habit) => {
                const catMeta = getCategoryMeta(habit.category);
                const freqFormatted = formatHabitFrequency(habit);
                const progress = getHabitProgress(habit, month, year, entries);
                const isPaused = habit.status === 'paused';
                const isArchived = habit.status === 'archived';
                const hStreak = habitStreaks?.[habit.id] || { current: 0, best: 0, totalCompletions: 0 };

                return (
                  <tr
                    key={habit.id}
                    className={`border-b border-[#F0EBE1] dark:border-slate-700 hover:bg-[#FAF8F5]/70 dark:hover:bg-slate-700/40 transition-colors group ${
                      isPaused ? 'opacity-65 bg-[#FAF8F5]/50 dark:bg-slate-900/30' : ''
                    } ${isArchived ? 'opacity-50 bg-[#F4EFEA]/40 dark:bg-slate-900/40' : ''}`}
                  >
                    {/* Habit Name Cell (Sticky Left Column) */}
                    <td className="sticky left-0 z-10 bg-[#FFFFFF] dark:bg-slate-800 group-hover:bg-[#FAF8F5] dark:group-hover:bg-slate-700/60 py-3 pr-4 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-base cursor-pointer hover:scale-110 transition-transform shrink-0"
                          onClick={() => onSelectHabit(habit)}
                          title="Click to view habit details"
                        >
                          {catMeta.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-semibold text-[#2D2A26] dark:text-white truncate cursor-pointer hover:text-[#5B8266] transition-colors flex items-center gap-1.5"
                            onClick={() => onSelectHabit(habit)}
                            title="Click for full history & stats"
                          >
                            <span>{habit.name}</span>
                            <Info className="w-3 h-3 text-[#A69E92] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {/* Category Badge */}
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                            >
                              {catMeta.label}
                            </span>
                            {/* Frequency Badge */}
                            <span className="text-[9px] text-[#7D766C] dark:text-slate-400 font-medium">
                              • {freqFormatted}
                            </span>
                            {/* Status Badges */}
                            {isPaused && (
                              <span className="text-[9px] bg-[#FEF6E8] text-[#D97706] px-1.5 py-0.2 rounded font-bold border border-[#F6E3B8]">
                                Paused
                              </span>
                            )}
                            {isArchived && (
                              <span className="text-[9px] bg-[#F4EFEA] text-[#78716C] px-1.5 py-0.2 rounded font-bold">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Checkboxes */}
                    {days.map((day) => {
                      const dateKey = formatDateKey(year, month, day);
                      const isCompleted = !!entries[`${habit.id}_${dateKey}`];
                      const isToday = isSameDay(year, month, day);
                      const isScheduled = isHabitScheduledOnDate(habit, dateKey);

                      return (
                        <td
                          key={day}
                          className={`p-1 text-center align-middle ${
                            isToday ? 'bg-[#F2F8F4]/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <button
                            id={`grid-btn-${habit.id}-${dateKey}`}
                            type="button"
                            onClick={() => onToggleEntry(habit.id, dateKey, isCompleted)}
                            className={`w-6 h-6 sm:w-7 sm:h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-[#5B8266] text-white shadow-2xs hover:bg-[#4C7156] active:scale-90'
                                : isScheduled
                                ? 'bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-transparent hover:border-[#5B8266] hover:bg-[#FFFFFF] dark:hover:bg-slate-800 active:scale-90'
                                : 'bg-[#F5F2EC] dark:bg-slate-900/60 border border-dashed border-[#DDD7CC] dark:border-slate-700 text-[#A69E92] hover:border-[#5B8266] active:scale-90'
                            }`}
                            title={`${habit.name} on Day ${day}: ${
                              isCompleted
                                ? 'Done'
                                : isScheduled
                                ? 'Scheduled (Incomplete)'
                                : 'Not Scheduled'
                            }`}
                            aria-label={`Toggle ${habit.name} on day ${day}`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[3] transition-transform scale-100" />
                            ) : !isScheduled ? (
                              <span className="text-[10px] text-[#A69E92] leading-none select-none">·</span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}

                    {/* Progress Bar & Percentage */}
                    <td className="py-3 px-3 text-center align-middle">
                      <div className="w-20 mx-auto">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#2D2A26] dark:text-white">
                          <span>
                            {progress.completed}/{progress.opportunities}
                          </span>
                          <span className="text-[#5B8266]">{progress.percentage}%</span>
                        </div>
                        <div className="w-full bg-[#EAE2D5] dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#5B8266] h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Streak Info */}
                    <td className="py-3 px-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#4A453E] dark:text-slate-300">
                        <span className="inline-flex items-center text-[#D97706]" title="Current Streak">
                          <Flame className="w-3 h-3 fill-[#D97706] mr-0.5" />
                          {hStreak.current}d
                        </span>
                        <span className="text-[#A69E92]">•</span>
                        <span className="inline-flex items-center text-[#2563EB]" title="Best Streak">
                          <Trophy className="w-3 h-3 mr-0.5" />
                          {hStreak.best}d
                        </span>
                      </div>
                    </td>

                    {/* Action Icons */}
                    <td className="py-3 px-2 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {isArchived ? (
                          onRestoreHabit && (
                            <button
                              type="button"
                              onClick={() => onRestoreHabit(habit.id)}
                              className="p-1 rounded-lg text-[#5B8266] hover:bg-[#EBF3EE] transition-colors cursor-pointer"
                              title="Restore archived habit"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onTogglePause(habit)}
                              className="p-1 rounded-lg text-[#8C8377] hover:text-[#2D2A26] dark:hover:text-white hover:bg-[#F2ECE4] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title={isPaused ? 'Resume habit' : 'Pause habit'}
                            >
                              {isPaused ? (
                                <Play className="w-3.5 h-3.5 text-[#5B8266]" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(habit)}
                              className="p-1 rounded-lg text-[#8C8377] hover:text-[#2D2A26] dark:hover:text-white hover:bg-[#F2ECE4] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Edit habit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenArchiveModal(habit)}
                              className="p-1 rounded-lg text-[#8C8377] hover:text-[#C05746] hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Archive habit"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Daily Totals Summary Footer */}
            <tfoot>
              <tr className="border-t-2 border-[#ECE6DC] dark:border-slate-700 bg-[#FAF8F5]/80 dark:bg-slate-900/60">
                <td className="sticky left-0 z-10 bg-[#FAF8F5] dark:bg-slate-900 py-2.5 pr-4 text-xs font-bold text-[#4A453E] dark:text-slate-200">
                  DAILY COMPLETION
                </td>
                {days.map((day) => {
                  const dateKey = formatDateKey(year, month, day);
                  const dayProg = getDayProgress(activeHabits, dateKey, entries);

                  return (
                    <td key={day} className="p-1 text-center text-[10px] font-bold">
                      <div
                        className={`rounded py-0.5 ${
                          dayProg.isSuccessful
                            ? 'text-[#2C523A] bg-[#EBF3EE] dark:bg-emerald-950/50 dark:text-emerald-300'
                            : dayProg.completedCount > 0
                            ? 'text-[#7D5226] bg-[#FAF0E6] dark:bg-amber-950/50 dark:text-amber-300'
                            : 'text-[#8C8377] dark:text-slate-500'
                        }`}
                        title={`Day ${day}: ${dayProg.completedCount}/${dayProg.totalScheduled} completed (${dayProg.percentage}%)`}
                      >
                        {dayProg.completedCount}
                      </div>
                    </td>
                  );
                })}
                <td
                  colSpan={3}
                  className="py-2.5 px-3 text-right text-[11px] font-medium text-[#7D766C] dark:text-slate-400"
                >
                  {activeHabits.length} Active Habits
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
