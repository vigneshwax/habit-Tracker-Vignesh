import React, { useState } from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_MAP } from '../../types';
import { MONTH_NAMES, WEEKDAYS, getDaysInMonth, getFirstDayOfMonth, formatDateKey, getTodayDateInfo } from '../../utils/date';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star, Edit3, Trash2, X, Plus } from 'lucide-react';

interface MoodCalendarViewProps {
  entries: MoodTrackerEntry[];
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
  onEdit: (entry: MoodTrackerEntry) => void;
  onDelete: (entry: MoodTrackerEntry) => void;
  onAddForDate?: (dateStr: string) => void;
}

export const MoodCalendarView: React.FC<MoodCalendarViewProps> = ({
  entries,
  currentMonth,
  currentYear,
  onMonthChange,
  onEdit,
  onDelete,
  onAddForDate,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<{
    dateStr: string;
    entry: MoodTrackerEntry | null;
  } | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth); // 0 = Sunday
  const todayInfo = getTodayDateInfo();
  const todayStr = formatDateKey(todayInfo.year, todayInfo.month, todayInfo.day);

  // Map entries by dateStr
  const entriesByDate = React.useMemo(() => {
    const map: Record<string, MoodTrackerEntry> = {};
    entries.forEach((e) => {
      map[e.date] = e;
    });
    return map;
  }, [entries]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

  const handleCurrentMonth = () => {
    onMonthChange(todayInfo.month, todayInfo.year);
  };

  // Calendar cells
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-7 shadow-xs">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F0EBE1] dark:border-slate-700 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/40 border border-[#D5E5D9] dark:border-emerald-800 flex items-center justify-center text-[#5B8266] dark:text-emerald-300">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h3>
            <p className="text-xs text-[#8C8377] dark:text-slate-400">
              Monthly Mood Calendar
            </p>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-xs font-bold text-[#4A453E] dark:text-slate-300 border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-[#4A453E] dark:text-slate-300 border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-[#4A453E] dark:text-slate-300 border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-[11px] font-bold uppercase tracking-wider text-[#8C8377] dark:text-slate-400 py-1"
          >
            {wd.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/* Blank padding cells */}
        {blanks.map((b) => (
          <div
            key={`blank-${b}`}
            className="min-h-[64px] sm:min-h-[80px] rounded-2xl bg-[#FAF8F5]/40 dark:bg-slate-800/40 border border-dashed border-[#ECE6DC]/40 dark:border-slate-800"
          />
        ))}

        {/* Month Day Cells */}
        {dayNumbers.map((day) => {
          const dateStr = formatDateKey(currentYear, currentMonth, day);
          const entry = entriesByDate[dateStr] || null;
          const isToday = dateStr === todayStr;
          const meta = entry ? MOOD_TRACKER_MAP[entry.mood] : null;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedEntry({ dateStr, entry })}
              className={`min-h-[64px] sm:min-h-[80px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left relative group ${
                isToday
                  ? 'border-[#5B8266] bg-[#F4F8F5] dark:bg-emerald-950/20 dark:border-emerald-500 shadow-2xs'
                  : entry
                  ? 'border-[#ECE6DC] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-750 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 hover:border-[#D5E5D9]'
                  : 'border-[#ECE6DC]/60 dark:border-slate-800/80 bg-[#FAF8F5]/60 dark:bg-slate-800/60 hover:bg-[#F2ECE4]/60'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold leading-none ${
                    isToday
                      ? 'text-[#5B8266] dark:text-emerald-400'
                      : 'text-[#4A453E] dark:text-slate-300'
                  }`}
                >
                  {day}
                </span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B8266]" />
                )}
              </div>

              {/* Mood Emoji Display */}
              <div className="flex-1 flex items-center justify-center my-1">
                {entry ? (
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl filter drop-shadow-2xs transition-transform group-hover:scale-115 block">
                      {meta?.emoji || '🙂'}
                    </span>
                    {entry.energy_level && (
                      <span className="text-[9px] text-[#8C8377] dark:text-slate-400 font-semibold block leading-tight mt-0.5">
                        {entry.energy_level}⭐
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-[#A69E92] dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    + Add
                  </span>
                )}
              </div>

              {/* Little bottom indicator if note present */}
              {entry?.note && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#5B8266] mx-auto opacity-70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Date Details Modal / Popover */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                {selectedEntry.dateStr}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 text-[#8C8377] hover:text-[#2D2A26] dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEntry.entry ? (
              <div className="mt-5 space-y-4">
                <div className="text-center py-2">
                  <span className="text-5xl block mb-2">
                    {MOOD_TRACKER_MAP[selectedEntry.entry.mood]?.emoji || '🙂'}
                  </span>
                  <h4 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
                    {MOOD_TRACKER_MAP[selectedEntry.entry.mood]?.label || selectedEntry.entry.mood}
                  </h4>
                  <p className="text-xs text-[#8C8377] dark:text-slate-400 mt-0.5">
                    Mood Score: <strong>{selectedEntry.entry.mood_score}/6</strong>
                  </p>
                </div>

                {/* Energy Level */}
                <div className="p-3 bg-[#FAF8F5] dark:bg-slate-750 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#7D766C] dark:text-slate-400">
                    Energy Level:
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{selectedEntry.entry.energy_level || 3} / 5 Stars</span>
                  </div>
                </div>

                {/* Reflection Note */}
                {selectedEntry.entry.note ? (
                  <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-750 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 text-xs">
                    <span className="block font-bold text-[#7D766C] dark:text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                      Daily Note
                    </span>
                    <p className="text-[#2D2A26] dark:text-slate-200 italic leading-relaxed">
                      "{selectedEntry.entry.note}"
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#A69E92] dark:text-slate-500 italic text-center">
                    No note recorded for this date.
                  </div>
                )}

                {/* Edit & Delete Action Buttons (Password protected) */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#F0EBE1] dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const entryToEdit = selectedEntry.entry!;
                      setSelectedEntry(null);
                      onEdit(entryToEdit);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-xs font-bold text-[#2D2A26] dark:text-white border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#5B8266]" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const entryToDelete = selectedEntry.entry!;
                      setSelectedEntry(null);
                      onDelete(entryToDelete);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-xs font-bold text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-center py-4 space-y-4">
                <p className="text-xs text-[#8C8377] dark:text-slate-400">
                  No mood recorded for this date.
                </p>
                {onAddForDate && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetDate = selectedEntry.dateStr;
                      setSelectedEntry(null);
                      onAddForDate(targetDate);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B8266] text-white text-xs font-bold hover:bg-[#4C7156] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Mood for this Day</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
