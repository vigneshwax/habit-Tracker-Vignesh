import React from 'react';
import { Flame, Trophy, CheckCircle2, ListTodo, TrendingUp } from 'lucide-react';
import { Habit } from '../types';

interface SummaryCardsProps {
  totalHabits: number;
  completedDaysCount: number;
  totalDaysPossible: number;
  percentage: number;
  streakDays: number;
  bestStreakDays: number;
  habits?: Habit[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalHabits,
  completedDaysCount,
  totalDaysPossible,
  percentage,
  streakDays,
  bestStreakDays,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {/* 1. Monthly Completion Percentage */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#ECE6DC] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#736A5E]">
            Monthly Progress
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#EBF3EE] text-[#3D6B4E] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {percentage}%
            </span>
            <span className="text-xs font-semibold text-[#5B8266]">
              {completedDaysCount}/{totalDaysPossible} checks
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-[#EFE9DE] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#5B8266] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Active Habits */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#ECE6DC] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#736A5E]">
            Active Habits
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#EFF4FB] text-[#2A486F] flex items-center justify-center">
            <ListTodo className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2A26]">
              {totalHabits}
            </span>
            <span className="text-xs font-semibold text-[#7D766C]">
              habits tracked
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] mt-3">
            {totalHabits > 0
              ? 'Organized by frequency & categories'
              : 'Add habits below to begin tracking'}
          </p>
        </div>
      </div>

      {/* 3. Streaks: Current & All-time Longest Streak */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#ECE6DC] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#736A5E]">
            Habit Streaks
          </span>
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 rounded-lg bg-[#FAF4EE] text-[#C95924] flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#FEF9E7] text-[#B88E1F] flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26]">
                {streakDays}
              </span>
              <span className="text-xs font-medium text-[#8A674D] block">
                🔥 Current
              </span>
            </div>
            <div className="h-8 w-px bg-[#EFE9DE]" />
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26]">
                {bestStreakDays}
              </span>
              <span className="text-xs font-medium text-[#8C6D1F] block">
                🏆 Best
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#8C8377] mt-3 truncate">
            {streakDays >= bestStreakDays && streakDays > 0
              ? '🔥 You are on your best streak ever!'
              : 'Keep the chain going daily!'}
          </p>
        </div>
      </div>
    </div>
  );
};
