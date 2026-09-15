import React from 'react';
import { X, Flame, Trophy, Calendar, Target, Edit2, Archive, Pause, Play, TrendingUp, CheckCircle2, Trash2 } from 'lucide-react';
import { Habit } from '../types';
import { getCategoryMeta, getFrequencyMeta, formatHabitFrequency } from '../utils/categories';
import { MONTH_NAMES, formatDateKey, getTodayDateInfo } from '../utils/date';
import { getHabitProgress } from '../utils/scheduler';

interface HabitDetailModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  entries: Record<string, boolean>;
  currentYear: number;
  currentMonth: number;
  streakInfo?: { current: number; best: number; totalCompletions?: number };
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onDelete?: (habit: Habit) => void;
  onTogglePause?: (habit: Habit) => void;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  habit,
  isOpen,
  onClose,
  entries,
  currentYear,
  currentMonth,
  streakInfo,
  onEdit,
  onArchive,
  onDelete,
  onTogglePause,
}) => {
  if (!isOpen || !habit) return null;

  const catMeta = getCategoryMeta(habit.category);
  const freqMeta = getFrequencyMeta(habit.frequency);
  const monthName = MONTH_NAMES[currentMonth - 1];

  // Calculate habit progress using scheduler
  const habitProg = getHabitProgress(habit, currentMonth, currentYear, entries);

  // Generate last 28 days mini activity dots
  const recentDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dayNum = d.getDate();
    const key = formatDateKey(y, m, dayNum);
    return {
      date: key,
      dayNum,
      isDone: !!entries[`${habit.id}_${key}`],
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#E8E2D7] shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${catMeta.badgeBg} ${catMeta.borderColor}`}
            >
              <span>{catMeta.emoji}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                >
                  {catMeta.label}
                </span>
                <span className="text-xs text-[#8C8377] font-medium">{freqMeta.label}</span>
                {habit.status === 'paused' && (
                  <span className="text-[10px] bg-[#FEF6E8] text-[#92400E] px-2 py-0.5 rounded font-semibold">
                    Paused
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2D2A26] mt-0.5 truncate max-w-[280px]">
                {habit.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C8377] hover:bg-[#F4EFEA] hover:text-[#2D2A26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Streaks & Performance Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
          {/* Current Streak */}
          <div className="bg-[#FAF4EE] p-3.5 rounded-2xl border border-[#EFE4D7] text-center">
            <div className="flex items-center justify-center gap-1 text-[#B05B2A] text-xs font-semibold uppercase">
              <Flame className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
              <span>Current</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#2D2A26] mt-1">
              {streakInfo?.current || 0}{' '}
              <span className="text-xs font-sans font-normal text-[#8A674D]">Days</span>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="bg-[#FEF9E7] p-3.5 rounded-2xl border border-[#F5E8B8] text-center">
            <div className="flex items-center justify-center gap-1 text-[#8C6D1F] text-xs font-semibold uppercase">
              <Trophy className="w-3.5 h-3.5 text-[#B88E1F]" />
              <span>Best Streak</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#2D2A26] mt-1">
              {streakInfo?.best || streakInfo?.current || 0}{' '}
              <span className="text-xs font-sans font-normal text-[#8C6D1F]">Days</span>
            </div>
          </div>

          {/* Month Completion */}
          <div className="bg-[#F2F8F4] p-3.5 rounded-2xl border border-[#D5E5D9] text-center col-span-2 sm:col-span-1">
            <div className="flex items-center justify-center gap-1 text-[#3D6B4E] text-xs font-semibold uppercase">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{monthName}</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#2D2A26] mt-1">
              {habitProg.percentage}%
            </div>
          </div>
        </div>

        {/* Schedule & Frequency Specs */}
        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE6DC] mb-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4A453E] mb-2">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#5B8266]" />
              <span>Schedule & Monthly Progress</span>
            </span>
            <span>
              {habitProg.completed} / {habitProg.opportunities} Days
            </span>
          </div>
          <div className="w-full bg-[#E5DDD0] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#5B8266] h-full rounded-full transition-all duration-500"
              style={{ width: `${habitProg.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#7D766C]">
            <span>
              Schedule: {formatHabitFrequency(habit)}
            </span>
            <span className="font-semibold text-[#5B8266]">
              {habitProg.percentage === 100 ? 'Goal Hit! 🎉' : `${habitProg.percentage}% complete`}
            </span>
          </div>
        </div>

        {/* 28-Day Consistency Matrix */}
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#736A5E] mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Recent Activity (Last 28 Days)</span>
          </h4>
          <div className="grid grid-cols-7 gap-1.5 bg-[#FAF8F5] p-3 rounded-2xl border border-[#ECE6DC]">
            {recentDays.map((rd, i) => (
              <div
                key={i}
                className={`h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all ${
                  rd.isDone
                    ? 'bg-[#5B8266] text-white shadow-2xs'
                    : 'bg-[#FFFFFF] border border-[#E5DDD0] text-[#A69E92]'
                }`}
                title={`${rd.date}: ${rd.isDone ? 'Completed' : 'Not completed'}`}
              >
                {rd.dayNum}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F0EBE1]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onArchive(habit);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#FEF6E8] hover:text-[#D97706] text-[#736A5E] text-xs font-semibold border border-[#E5DDD0] transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(habit);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#FDF2F0] hover:text-[#C05746] text-[#736A5E] text-xs font-semibold border border-[#E5DDD0] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            {onTogglePause && (
              <button
                type="button"
                onClick={() => onTogglePause(habit)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#736A5E] text-xs font-semibold border border-[#E5DDD0] transition-colors cursor-pointer"
              >
                {habit.status === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#5B8266]" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(habit);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#5B8266] hover:bg-[#4C7156] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Habit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
