import React, { useState } from 'react';
import { DailyJournal, MoodType } from '../types';
import {
  MONTH_NAMES,
  WEEKDAYS,
  getDaysInMonth,
  formatDateKey,
  getTodayDateInfo,
} from '../utils/date';
import { getMoodMeta, normalizeMood, ENERGY_LEVELS } from '../utils/mood';
import {
  Calendar as CalendarIcon,
  Star,
  MessageSquare,
  Lock,
  Edit3,
  Check,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';

interface MoodCalendarViewProps {
  year: number;
  month: number;
  journals: DailyJournal[];
  weekStart?: 'sunday' | 'monday';
  isUnlocked: boolean;
  onSelectDateToEdit?: (dateStr: string) => void;
  onRequireUnlock?: () => void;
}

export const MoodCalendarView: React.FC<MoodCalendarViewProps> = ({
  year,
  month,
  journals,
  weekStart = 'sunday',
  isUnlocked,
  onSelectDateToEdit,
  onRequireUnlock,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const today = getTodayDateInfo();
  const todayDateStr = formatDateKey(today.year, today.month, today.day);

  // Selected day inspection
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);

  // Build map of dateStr -> DailyJournal
  const journalMap = new Map<string, DailyJournal>();
  journals.forEach((j) => {
    if (j.date) {
      journalMap.set(j.date, j);
    }
  });

  // Calculate calendar grid cells
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon, ...
  const offset = weekStart === 'monday' ? (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) : firstDayOfMonth;

  const weekdaysHeader = weekStart === 'monday'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedJournal = journalMap.get(selectedDateStr);
  const selectedMeta = selectedJournal?.mood ? getMoodMeta(selectedJournal.mood) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Monthly Calendar Grid */}
        <div className="lg:col-span-2 bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF4FB] dark:bg-slate-700 text-[#2A486F] dark:text-sky-300 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
                  Monthly Mood Calendar
                </h3>
                <p className="text-xs text-[#7D766C] dark:text-slate-400">
                  {MONTH_NAMES[month - 1]} {year} • Tap any day to inspect details
                </p>
              </div>
            </div>

            <div className="text-xs text-[#8C8377] dark:text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5B8266]" />
              <span>Logged ({journalMap.size} days)</span>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
            {weekdaysHeader.map((d) => (
              <div
                key={d}
                className="py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8C8377] dark:text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Blank offset tiles */}
            {Array.from({ length: offset }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square sm:min-h-[72px] rounded-2xl bg-[#FAF8F5]/40 dark:bg-slate-800/40 border border-dashed border-[#F0EBE1] dark:border-slate-800/80"
              />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateKey(year, month, day);
              const journal = journalMap.get(dateStr);
              const hasEntry = !!journal && (!!journal.mood || !!journal.energy_level);
              const isToday = dateStr === todayDateStr;
              const isSelected = dateStr === selectedDateStr;
              const meta = journal?.mood ? getMoodMeta(journal.mood) : null;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`relative aspect-square sm:min-h-[72px] rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'ring-2 ring-[#5B8266] border-[#5B8266] shadow-sm bg-white dark:bg-slate-750'
                      : hasEntry
                      ? `${meta?.bgClass || 'bg-[#FAF8F5] dark:bg-slate-800'} border-[#E5DFD5] dark:border-slate-700 hover:border-[#5B8266]`
                      : 'bg-[#FAF8F5] dark:bg-slate-800/60 border-[#ECE6DC] dark:border-slate-700/80 hover:bg-[#F2ECE4] dark:hover:bg-slate-700'
                  }`}
                >
                  {/* Top: Day number + Today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#5B8266] text-white flex items-center justify-center -ml-0.5 -mt-0.5'
                          : 'text-[#5C554B] dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {journal?.content && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A729E] dark:bg-sky-400" title="Note exists" />
                    )}
                  </div>

                  {/* Middle: Mood Emoji */}
                  {hasEntry && meta ? (
                    <div className="flex items-center justify-center my-auto">
                      <span className="text-xl sm:text-2xl transition-transform hover:scale-125">
                        {meta.emoji}
                      </span>
                    </div>
                  ) : (
                    <div className="my-auto flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 dark:text-slate-600 font-serif">·</span>
                    </div>
                  )}

                  {/* Bottom: Energy Stars */}
                  {hasEntry && journal?.energy_level ? (
                    <div className="flex items-center justify-center gap-0.5 overflow-hidden">
                      {Array.from({ length: journal.energy_level }).map((_, idx) => (
                        <span key={idx} className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400" />
                      ))}
                    </div>
                  ) : (
                    <div className="h-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Day Inspector Drawer / Card */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                  Day Inspector
                </span>
                <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
                  {selectedDateStr}
                </h4>
              </div>

              {selectedDateStr === todayDateStr && (
                <span className="text-xs font-semibold text-[#5B8266] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Today
                </span>
              )}
            </div>

            {/* Entry Details */}
            {selectedJournal && (selectedJournal.mood || selectedJournal.energy_level || selectedJournal.content) ? (
              <div className="space-y-4">
                {/* Mood Badge */}
                {selectedMeta && (
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#E5DFD5] dark:border-slate-700 flex items-center gap-3">
                    <span className="text-3xl">{selectedMeta.emoji}</span>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#8C8377] dark:text-slate-400 font-bold block">
                        Logged Mood
                      </span>
                      <strong className={`text-base ${selectedMeta.colorClass}`}>
                        {selectedMeta.label}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Energy Level */}
                {selectedJournal.energy_level && (
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#E5DFD5] dark:border-slate-700">
                    <span className="text-[11px] uppercase tracking-wider text-[#8C8377] dark:text-slate-400 font-bold block mb-1">
                      Energy Level
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: selectedJournal.energy_level }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        Level {selectedJournal.energy_level}/5 • {ENERGY_LEVELS[selectedJournal.energy_level - 1]?.description}
                      </span>
                    </div>
                  </div>
                )}

                {/* Short Note */}
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#E5DFD5] dark:border-slate-700 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#8C8377] dark:text-slate-400 font-bold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5B8266]" />
                    Note & Thoughts
                  </span>
                  <p className="text-xs sm:text-sm text-[#4A453E] dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedJournal.content || 'No text note recorded for this day.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#E5DFD5] dark:border-slate-700 flex items-center justify-center text-xl text-[#8C8377]">
                  🗓️
                </div>
                <p className="text-xs font-semibold text-[#5C554B] dark:text-slate-300">
                  No mood logged for this date
                </p>
                <p className="text-[11px] text-[#8C8377] dark:text-slate-400 max-w-xs mx-auto">
                  {isUnlocked
                    ? 'You can log retroactively for this date using the editor below.'
                    : 'Visitors can view historical entries. Authenticate to add or edit.'}
                </p>
              </div>
            )}
          </div>

          {/* Action / Edit Section */}
          <div className="mt-6 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
            {isUnlocked ? (
              <button
                type="button"
                onClick={() => onSelectDateToEdit && onSelectDateToEdit(selectedDateStr)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>
                  {selectedJournal ? `Edit Entry for ${selectedDateStr}` : `Log Mood for ${selectedDateStr}`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Calendar is view-only for visitors.</span>
                </div>
                <button
                  type="button"
                  onClick={onRequireUnlock}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#2D2A26] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock with PIN to Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
