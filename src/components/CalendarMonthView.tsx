import React, { useState } from 'react';
import { Check, Calendar as CalendarIcon, Plus, Sparkles, CheckCircle2, Eye } from 'lucide-react';
import { Habit } from '../types';
import { MONTH_NAMES, WEEKDAYS, getDaysInMonth, formatDateKey, isSameDay } from '../utils/date';
import { getCategoryMeta } from '../utils/categories';
import { getDayScheduledHabits, getDayProgress, isHabitScheduledOnDate } from '../utils/scheduler';

interface CalendarMonthViewProps {
  habits: Habit[];
  year: number;
  month: number;
  weekStart?: 'sunday' | 'monday';
  entries: Record<string, boolean>;
  onToggleEntry: (habitId: string, dateStr: string, currentCompleted: boolean) => void;
  onOpenAddModal: () => void;
  onSelectHabit: (habit: Habit) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  habits,
  year,
  month,
  weekStart = 'sunday',
  entries,
  onToggleEntry,
  onOpenAddModal,
  onSelectHabit,
}) => {
  const daysInMonth = getDaysInMonth(year, month);

  // Calculate day of week for day 1 (0 = Sunday, 1 = Monday, etc.)
  const rawFirstDay = new Date(year, month - 1, 1).getDay();
  const firstDayOffset = weekStart === 'monday' ? (rawFirstDay === 0 ? 6 : rawFirstDay - 1) : rawFirstDay;

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const now = new Date();
    if (now.getFullYear() === year && now.getMonth() + 1 === month) {
      return now.getDate();
    }
    return 1;
  });

  const selectedDateStr = formatDateKey(year, month, selectedDay);
  const monthName = MONTH_NAMES[month - 1];

  // Weekday column labels based on weekStart
  const weekdayLabels =
    weekStart === 'monday'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar cells
  const calendarCells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDayOffset; i++) {
    calendarCells.push({ day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d });
  }

  // Active habits
  const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');

  // Selected day scheduled habits and progress
  const selectedDayScheduled = getDayScheduledHabits(habits, selectedDateStr);
  const selectedDayStats = getDayProgress(activeHabits, selectedDateStr, entries);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Main Calendar Grid (2 cols on lg) */}
      <div className="lg:col-span-2 bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] text-[#3D6B4E] border border-[#D5E5D9] flex items-center justify-center shadow-2xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2D2A26] tracking-tight">
                Calendar View
              </h2>
              <p className="text-xs text-[#7D766C]">
                {monthName} {year} • Click any date to open the Day Inspector
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Habit</span>
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-[#8C8377] uppercase tracking-wider">
          {weekdayLabels.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => {
            if (!cell.day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[72px] sm:min-h-[85px] bg-[#FAF8F5]/40 rounded-2xl border border-transparent"
                />
              );
            }

            const day = cell.day;
            const dateStr = formatDateKey(year, month, day);
            const isToday = isSameDay(year, month, day);
            const isSelected = selectedDay === day;
            const dayProg = getDayProgress(activeHabits, dateStr, entries);

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-[72px] sm:min-h-[85px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-[#5B8266] border-[#5B8266] bg-[#FFFFFF] shadow-sm'
                    : isToday
                    ? 'border-[#C5DACB] bg-[#F2F8F4]'
                    : dayProg.percentage === 100 && dayProg.totalScheduled > 0
                    ? 'border-[#D5E5D9] bg-[#F4F9F6]'
                    : dayProg.completedCount > 0
                    ? 'border-[#EAE3D5] bg-[#FAF8F5]'
                    : 'border-[#ECE6DC] bg-[#FFFFFF] hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-[#5B8266] text-white shadow-2xs'
                        : isSelected
                        ? 'bg-[#2D2A26] text-white'
                        : 'text-[#3D3A36]'
                    }`}
                  >
                    {day}
                  </span>
                  {dayProg.percentage === 100 && dayProg.totalScheduled > 0 && (
                    <span className="text-[10px] text-[#5B8266] font-bold">✓</span>
                  )}
                </div>

                {/* Day status summary */}
                <div className="mt-1">
                  {dayProg.totalScheduled === 0 ? (
                    <span className="text-[10px] text-[#A69E92]">-</span>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-medium text-[#7D766C]">
                        <span>
                          {dayProg.completedCount}/{dayProg.totalScheduled}
                        </span>
                        <span className={dayProg.isSuccessful ? 'text-[#5B8266] font-bold' : ''}>
                          {dayProg.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-[#EAE2D5] h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            dayProg.percentage === 100
                              ? 'bg-[#5B8266]'
                              : dayProg.isSuccessful
                              ? 'bg-[#7FA388]'
                              : 'bg-[#C2B7A5]'
                          }`}
                          style={{ width: `${dayProg.percentage}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Day Inspector Panel */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="pb-4 border-b border-[#F0EBE1] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] px-2.5 py-0.5 rounded-full border border-[#D5E5D9]">
                Day Inspector
              </span>
              <h3 className="text-lg font-serif font-bold text-[#2D2A26] mt-1">
                {monthName} {selectedDay}, {year}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#2D2A26]">
                {selectedDayStats.completedCount} / {selectedDayStats.totalScheduled}
              </span>
              <p className="text-[11px] font-semibold text-[#5B8266]">{selectedDayStats.percentage}% done</p>
            </div>
          </div>

          {/* Scheduled habits checklist for selected day */}
          <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {habits.length === 0 ? (
              <div className="py-8 text-center text-[#8C8377]">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#A69E92]" />
                <p className="text-xs">No habits created yet.</p>
              </div>
            ) : selectedDayScheduled.length === 0 ? (
              <div className="py-8 text-center text-[#8C8377]">
                <p className="text-xs">No active habits scheduled on this day.</p>
              </div>
            ) : (
              selectedDayScheduled.map((habit) => {
                const isDone = !!entries[`${habit.id}_${selectedDateStr}`];
                const catMeta = getCategoryMeta(habit.category);

                return (
                  <div
                    key={habit.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-[#F2F8F4] border-[#D5E5D9]'
                        : 'bg-[#FAF8F5] border-[#E8E2D7] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 mr-2 cursor-pointer"
                      onClick={() => onSelectHabit(habit)}
                      title="Click to view details"
                    >
                      <span className="text-sm">{catMeta.emoji}</span>
                      <div className="truncate min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isDone ? 'line-through text-[#6E7B71]' : 'text-[#2D2A26]'
                          }`}
                        >
                          {habit.name}
                        </p>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                        >
                          {catMeta.label}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleEntry(habit.id, selectedDateStr, isDone)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isDone
                          ? 'bg-[#5B8266] text-white shadow-2xs'
                          : 'bg-white border border-[#D0C8BB] text-transparent hover:border-[#5B8266]'
                      }`}
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'scale-100' : 'scale-0'}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#F0EBE1] text-[11px] text-[#8C8377] flex items-center justify-between">
          <span>Click any habit name for statistics</span>
          <span className="text-[#5B8266] font-medium">Auto-saved online</span>
        </div>
      </div>
    </div>
  );
};
