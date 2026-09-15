import React from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_MAP } from '../../types';
import { WEEKDAYS } from '../../utils/date';
import { Flame, Trophy, TrendingUp, Sparkles, Star, Smile, BarChart2 } from 'lucide-react';

interface MoodSummaryStatsProps {
  entries: MoodTrackerEntry[];
}

export const MoodSummaryStats: React.FC<MoodSummaryStatsProps> = ({ entries }) => {
  const totalEntries = entries.length;

  if (totalEntries === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Entries', value: '0', icon: BarChart2 },
          { label: 'Avg Mood', value: '—', icon: Smile },
          { label: 'Avg Energy', value: '—', icon: Star },
          { label: 'Top Mood', value: '—', icon: Sparkles },
          { label: 'Best Day', value: '—', icon: Trophy },
          { label: 'Positive Streak', value: '0d', icon: Flame },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs"
          >
            <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
              <item.icon className="w-3.5 h-3.5 opacity-60" />
            </div>
            <div className="text-xl font-bold font-serif text-[#2D2A26] dark:text-white">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 1. Average Mood
  const sumScore = entries.reduce((acc, curr) => acc + (curr.mood_score || 4), 0);
  const avgScore = (sumScore / totalEntries).toFixed(1);

  // Map avgScore back to representative mood
  const numericAvg = parseFloat(avgScore);
  let avgMoodLabel = 'Good';
  let avgMoodEmoji = '🙂';
  if (numericAvg >= 5.5) {
    avgMoodLabel = 'Excellent';
    avgMoodEmoji = '🤩';
  } else if (numericAvg >= 4.5) {
    avgMoodLabel = 'Great';
    avgMoodEmoji = '😄';
  } else if (numericAvg >= 3.5) {
    avgMoodLabel = 'Good';
    avgMoodEmoji = '🙂';
  } else if (numericAvg >= 2.5) {
    avgMoodLabel = 'Okay';
    avgMoodEmoji = '😐';
  } else if (numericAvg >= 1.5) {
    avgMoodLabel = 'Low';
    avgMoodEmoji = '😕';
  } else {
    avgMoodLabel = 'Very Low';
    avgMoodEmoji = '😞';
  }

  // 2. Average Energy
  const sumEnergy = entries.reduce((acc, curr) => acc + (curr.energy_level || 3), 0);
  const avgEnergy = (sumEnergy / totalEntries).toFixed(1);

  // 3. Most Common Mood
  const moodCounts: Record<string, number> = {};
  entries.forEach((e) => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });
  let topMoodKey = 'good';
  let maxCount = 0;
  Object.entries(moodCounts).forEach(([moodKey, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topMoodKey = moodKey;
    }
  });
  const topMoodMeta = MOOD_TRACKER_MAP[topMoodKey as keyof typeof MOOD_TRACKER_MAP] || {
    emoji: '🙂',
    label: 'Good',
  };

  // 4. Best Mood Day (Day of Week with highest average score)
  const dayScores: Record<number, { sum: number; count: number }> = {};
  entries.forEach((e) => {
    const parts = e.date.split('-');
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayIdx = dt.getDay(); // 0-6
      if (!dayScores[dayIdx]) dayScores[dayIdx] = { sum: 0, count: 0 };
      dayScores[dayIdx].sum += e.mood_score || 4;
      dayScores[dayIdx].count += 1;
    }
  });
  let bestDayName = '—';
  let bestDayAvg = -1;
  Object.entries(dayScores).forEach(([dIdxStr, data]) => {
    const avg = data.sum / data.count;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      bestDayName = WEEKDAYS[parseInt(dIdxStr, 10)];
    }
  });

  // 5. Positive Streaks
  // Sort ascending by date
  const sortedAsc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const positiveMoods = new Set(['good', 'great', 'excellent']);

  // Calculate streaks across consecutive calendar dates
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (let i = 0; i < sortedAsc.length; i++) {
    const entry = sortedAsc[i];
    const isPos = positiveMoods.has(entry.mood) || (entry.mood_score && entry.mood_score >= 4);
    const [y, m, d] = entry.date.split('-').map(Number);
    const currDate = new Date(y, m - 1, d);

    if (isPos) {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
    prevDate = currDate;
  }

  // Check if current streak extends to today or yesterday
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (prevDate) {
    const diffFromToday = Math.round((todayOnly.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
    if (diffFromToday <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Entries */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Check-ins</span>
          <BarChart2 className="w-3.5 h-3.5 text-[#5B8266]" />
        </div>
        <div className="text-xl font-bold font-serif text-[#2D2A26] dark:text-white">
          {totalEntries}
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          Recorded days
        </div>
      </div>

      {/* 2. Average Mood */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Avg Mood</span>
          <Smile className="w-3.5 h-3.5 text-sky-600" />
        </div>
        <div className="flex items-baseline gap-1 text-xl font-bold font-serif text-[#2D2A26] dark:text-white">
          <span>{avgMoodEmoji}</span>
          <span>{avgScore}</span>
          <span className="text-xs font-normal text-[#8C8377] dark:text-slate-400">/6</span>
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          Typical: {avgMoodLabel}
        </div>
      </div>

      {/* 3. Average Energy */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Avg Energy</span>
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
        </div>
        <div className="flex items-baseline gap-1 text-xl font-bold font-serif text-[#2D2A26] dark:text-white">
          <span>{avgEnergy}</span>
          <span className="text-xs font-normal text-[#8C8377] dark:text-slate-400">/5 ⭐</span>
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          Energy level
        </div>
      </div>

      {/* 4. Most Common Mood */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Top Mood</span>
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className="flex items-center gap-1.5 text-base font-bold font-serif text-[#2D2A26] dark:text-white truncate">
          <span className="text-lg">{topMoodMeta.emoji}</span>
          <span className="truncate">{topMoodMeta.label}</span>
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          {maxCount} {maxCount === 1 ? 'time' : 'times'} logged
        </div>
      </div>

      {/* 5. Best Day */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Best Day</span>
          <Trophy className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-xl font-bold font-serif text-[#2D2A26] dark:text-white truncate">
          {bestDayName}
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          Highest mood avg
        </div>
      </div>

      {/* 6. Positive Mood Streak */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Pos Streak</span>
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-400" />
        </div>
        <div className="flex items-baseline gap-1 text-xl font-bold font-serif text-[#2D2A26] dark:text-white">
          <span>{currentStreak}d</span>
          <span className="text-xs font-normal text-[#8C8377] dark:text-slate-400">
            (best {bestStreak}d)
          </span>
        </div>
        <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
          Good, Great & Exc
        </div>
      </div>
    </div>
  );
};
