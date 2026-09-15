import { DailyJournal, MoodType, Habit } from '../types';
import { getDaysInMonth, formatDateKey, getTodayDateInfo } from './date';
import { getDayScheduledHabits } from './scheduler';

export interface MoodMeta {
  type: MoodType;
  label: string;
  emoji: string;
  score: number; // 1-6
  colorClass: string;
  bgClass: string;
  borderClass: string;
  activeClass: string;
  badgeBg: string;
}

export const MOOD_DEFINITIONS: Record<string, MoodMeta> = {
  very_low: {
    type: 'very_low',
    label: 'Very Low',
    emoji: '😞',
    score: 1,
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-200 dark:border-rose-800',
    activeClass: 'ring-2 ring-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  },
  low: {
    type: 'low',
    label: 'Low',
    emoji: '😕',
    score: 2,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    activeClass: 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  okay: {
    type: 'okay',
    label: 'Okay',
    emoji: '😐',
    score: 3,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    activeClass: 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  good: {
    type: 'good',
    label: 'Good',
    emoji: '🙂',
    score: 4,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    activeClass: 'ring-2 ring-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  great: {
    type: 'great',
    label: 'Great',
    emoji: '😄',
    score: 5,
    colorClass: 'text-teal-600 dark:text-teal-400',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    borderClass: 'border-teal-200 dark:border-teal-800',
    activeClass: 'ring-2 ring-teal-500 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  },
  excellent: {
    type: 'excellent',
    label: 'Excellent',
    emoji: '🤩',
    score: 6,
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderClass: 'border-violet-200 dark:border-violet-800',
    activeClass: 'ring-2 ring-violet-500 bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200',
    badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
  },
};

export const SELECTABLE_MOODS: MoodMeta[] = [
  MOOD_DEFINITIONS.very_low,
  MOOD_DEFINITIONS.low,
  MOOD_DEFINITIONS.okay,
  MOOD_DEFINITIONS.good,
  MOOD_DEFINITIONS.great,
  MOOD_DEFINITIONS.excellent,
];

export const ENERGY_LEVELS = [
  { level: 1, label: '1 - Low Energy', stars: '⭐', description: 'Depleted / Exhausted' },
  { level: 2, label: '2 - Moderate Low', stars: '⭐⭐', description: 'Fatigued / Sluggish' },
  { level: 3, label: '3 - Steady', stars: '⭐⭐⭐', description: 'Balanced / Normal' },
  { level: 4, label: '4 - High Energy', stars: '⭐⭐⭐⭐', description: 'Vibrant / Productive' },
  { level: 5, label: '5 - Peak Energy', stars: '⭐⭐⭐⭐⭐', description: 'Invigorated / Peak flow' },
];

/**
 * Normalizes any legacy or arbitrary mood string to one of the 6 canonical MoodType values
 */
export function normalizeMood(rawMood?: any): MoodType {
  if (!rawMood) return 'good';
  const lower = String(rawMood).toLowerCase().trim();
  if (lower === 'very_low' || lower === 'bad') return 'very_low';
  if (lower === 'low' || lower === 'stressed') return 'low';
  if (lower === 'okay' || lower === 'neutral') return 'okay';
  if (lower === 'good') return 'good';
  if (lower === 'great') return 'great';
  if (lower === 'excellent') return 'excellent';
  return 'good';
}

export function getMoodMeta(mood?: string): MoodMeta {
  const normalized = normalizeMood(mood);
  return MOOD_DEFINITIONS[normalized] || MOOD_DEFINITIONS.good;
}

export interface MoodMonthlyStats {
  averageEnergy: number | null;
  averageMoodScore: number | null;
  mostCommonMood: MoodMeta | null;
  mostCommonMoodCount: number;
  moodStreak: number;
  totalDaysLogged: number;
  trend: 'improving' | 'stable' | 'declining';
  trendScoreDiff: number;
  distribution: Array<{
    meta: MoodMeta;
    count: number;
    percentage: number;
  }>;
}

/**
 * Computes monthly stats: Average energy, most common mood, streak, distribution, and 14-day trend.
 */
export function calculateMoodStats(
  allJournals: DailyJournal[],
  year: number,
  month: number
): MoodMonthlyStats {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthJournals = allJournals.filter(
    (j) => j.date && j.date.startsWith(prefix) && (j.mood || j.energy_level || j.content)
  );

  const totalDaysLogged = monthJournals.length;

  // Energy & mood scores
  let totalEnergy = 0;
  let energyCount = 0;
  let totalMoodScore = 0;
  let moodCount = 0;

  const moodCounts: Record<MoodType, number> = {
    very_low: 0,
    low: 0,
    okay: 0,
    good: 0,
    great: 0,
    excellent: 0,
    bad: 0,
    neutral: 0,
    stressed: 0,
  };

  monthJournals.forEach((j) => {
    if (j.energy_level && j.energy_level >= 1 && j.energy_level <= 5) {
      totalEnergy += j.energy_level;
      energyCount++;
    }
    if (j.mood) {
      const norm = normalizeMood(j.mood);
      const meta = getMoodMeta(norm);
      totalMoodScore += meta.score;
      moodCount++;
      moodCounts[norm] = (moodCounts[norm] || 0) + 1;
    }
  });

  const averageEnergy = energyCount > 0 ? Number((totalEnergy / energyCount).toFixed(1)) : null;
  const averageMoodScore = moodCount > 0 ? Number((totalMoodScore / moodCount).toFixed(1)) : null;

  // Most common mood
  let maxCount = 0;
  let mostCommonType: MoodType = 'good';
  SELECTABLE_MOODS.forEach((m) => {
    const count = moodCounts[m.type] || 0;
    if (count > maxCount) {
      maxCount = count;
      mostCommonType = m.type;
    }
  });

  const mostCommonMood = maxCount > 0 ? getMoodMeta(mostCommonType) : null;

  // Distribution
  const distribution = SELECTABLE_MOODS.map((meta) => {
    const count = moodCounts[meta.type] || 0;
    const percentage = totalDaysLogged > 0 ? Math.round((count / totalDaysLogged) * 100) : 0;
    return {
      meta,
      count,
      percentage,
    };
  });

  // Calculate mood streak: consecutive calendar days ending today (or yesterday if today not logged yet)
  const todayInfo = getTodayDateInfo();
  const journalDateMap = new Map<string, DailyJournal>();
  allJournals.forEach((j) => {
    if (j.date && (j.mood || j.energy_level)) {
      journalDateMap.set(j.date, j);
    }
  });

  let streak = 0;
  const cursor = new Date(todayInfo.year, todayInfo.month - 1, todayInfo.day);

  // Check today first
  const todayKey = formatDateKey(todayInfo.year, todayInfo.month, todayInfo.day);
  let checkDate = cursor;
  if (!journalDateMap.has(todayKey)) {
    // If today is not logged yet, check if yesterday was logged to continue streak
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = formatDateKey(
      checkDate.getFullYear(),
      checkDate.getMonth() + 1,
      checkDate.getDate()
    );
    if (journalDateMap.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Trend: Compare past 7 days average vs prior 7 days average
  const todayDate = new Date();
  const past7DaysScores: number[] = [];
  const prior7DaysScores: number[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const entry = journalDateMap.get(key);
    if (entry && entry.mood) {
      past7DaysScores.push(getMoodMeta(entry.mood).score);
    }
  }

  for (let i = 7; i < 14; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const entry = journalDateMap.get(key);
    if (entry && entry.mood) {
      prior7DaysScores.push(getMoodMeta(entry.mood).score);
    }
  }

  const avgPast = past7DaysScores.length > 0
    ? past7DaysScores.reduce((a, b) => a + b, 0) / past7DaysScores.length
    : 0;
  const avgPrior = prior7DaysScores.length > 0
    ? prior7DaysScores.reduce((a, b) => a + b, 0) / prior7DaysScores.length
    : 0;

  const trendDiff = avgPrior > 0 && avgPast > 0 ? avgPast - avgPrior : 0;
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (trendDiff >= 0.3) trend = 'improving';
  else if (trendDiff <= -0.3) trend = 'declining';

  return {
    averageEnergy,
    averageMoodScore,
    mostCommonMood,
    mostCommonMoodCount: maxCount,
    moodStreak: streak,
    totalDaysLogged,
    trend,
    trendScoreDiff: Number(trendDiff.toFixed(2)),
    distribution,
  };
}

export interface MoodVsHabitsInsight {
  highCompletionDaysCount: number;
  lowCompletionDaysCount: number;
  highCompletionAvgEnergy: number | null;
  lowCompletionAvgEnergy: number | null;
  highCompletionCommonMood: MoodMeta | null;
  lowCompletionCommonMood: MoodMeta | null;
  allCompletedMoodHighlight: string;
  energyComparisonHighlight: string;
  correlationSummary: string;
}

/**
 * Correlates habit completion with mood and energy for the given month.
 */
export function calculateMoodVsHabits(
  journals: DailyJournal[],
  entries: Record<string, boolean>,
  habits: Habit[],
  year: number,
  month: number
): MoodVsHabitsInsight {
  const daysInMonth = getDaysInMonth(year, month);
  const journalMap = new Map<string, DailyJournal>();
  journals.forEach((j) => {
    if (j.date) journalMap.set(j.date, j);
  });

  const highDaysEnergy: number[] = [];
  const lowDaysEnergy: number[] = [];
  const highDaysMoods: MoodType[] = [];
  const lowDaysMoods: MoodType[] = [];
  const perfectDaysMoods: MoodType[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(year, month, day);
    const scheduled = getDayScheduledHabits(habits, dateStr);
    if (scheduled.length === 0) continue;

    const completed = scheduled.filter((h) => !!entries[`${h.id}_${dateStr}`]).length;
    const rate = completed / scheduled.length;
    const journal = journalMap.get(dateStr);

    if (journal && (journal.mood || journal.energy_level)) {
      const normMood = normalizeMood(journal.mood);
      const energy = journal.energy_level;

      if (rate >= 0.8) {
        if (energy) highDaysEnergy.push(energy);
        if (journal.mood) highDaysMoods.push(normMood);
      } else if (rate <= 0.5) {
        if (energy) lowDaysEnergy.push(energy);
        if (journal.mood) lowDaysMoods.push(normMood);
      }

      if (rate === 1.0 && journal.mood) {
        perfectDaysMoods.push(normMood);
      }
    }
  }

  const avgHighEnergy = highDaysEnergy.length > 0
    ? Number((highDaysEnergy.reduce((a, b) => a + b, 0) / highDaysEnergy.length).toFixed(1))
    : null;

  const avgLowEnergy = lowDaysEnergy.length > 0
    ? Number((lowDaysEnergy.reduce((a, b) => a + b, 0) / lowDaysEnergy.length).toFixed(1))
    : null;

  const getMostFrequent = (arr: MoodType[]): MoodMeta | null => {
    if (arr.length === 0) return null;
    const countMap: Record<string, number> = {};
    arr.forEach((m) => {
      countMap[m] = (countMap[m] || 0) + 1;
    });
    let top = arr[0];
    let max = 0;
    for (const [k, v] of Object.entries(countMap)) {
      if (v > max) {
        max = v;
        top = k as MoodType;
      }
    }
    return getMoodMeta(top);
  };

  const highCompletionCommonMood = getMostFrequent(highDaysMoods);
  const lowCompletionCommonMood = getMostFrequent(lowDaysMoods);
  const perfectCommonMood = getMostFrequent(perfectDaysMoods);

  const allCompletedMoodHighlight = perfectCommonMood
    ? `On days you completed all scheduled habits, your mood was usually ${perfectCommonMood.label} ${perfectCommonMood.emoji}`
    : highCompletionCommonMood
    ? `On days with high habit completion (≥80%), your mood was usually ${highCompletionCommonMood.label} ${highCompletionCommonMood.emoji}`
    : 'Log habits and mood consistently to discover how routine execution elevates your day';

  let energyComparisonHighlight = 'Energy levels track closely with daily habit momentum.';
  if (avgHighEnergy !== null && avgLowEnergy !== null) {
    energyComparisonHighlight = `Average energy on high-completion days was ${avgHighEnergy} ⭐ vs ${avgLowEnergy} ⭐ on lower completion days`;
  } else if (avgHighEnergy !== null) {
    energyComparisonHighlight = `Energy averaged ${avgHighEnergy} ⭐ on your highest completion days`;
  }

  let correlationSummary = 'Your data shows that daily routine consistency builds sustained mental clarity and vitality.';
  if (avgHighEnergy !== null && avgLowEnergy !== null && avgHighEnergy > avgLowEnergy) {
    correlationSummary = `Completing your daily habits corresponds to a +${Number((avgHighEnergy - avgLowEnergy).toFixed(1))} ⭐ boost in personal energy.`;
  }

  return {
    highCompletionDaysCount: highDaysMoods.length,
    lowCompletionDaysCount: lowDaysMoods.length,
    highCompletionAvgEnergy: avgHighEnergy,
    lowCompletionAvgEnergy: avgLowEnergy,
    highCompletionCommonMood,
    lowCompletionCommonMood,
    allCompletedMoodHighlight,
    energyComparisonHighlight,
    correlationSummary,
  };
}

/**
 * Returns average mood and energy for a specific week number (1-5) of a month.
 */
export function getWeeklyMoodSummary(
  journals: DailyJournal[],
  year: number,
  month: number,
  weekNumber: number
): {
  averageMood: MoodMeta | null;
  averageEnergy: number | null;
  daysLogged: number;
} {
  const weekRanges: Record<number, [number, number]> = {
    1: [1, 7],
    2: [8, 14],
    3: [15, 21],
    4: [22, 28],
    5: [29, 31],
  };

  const range = weekRanges[weekNumber] || [1, 7];
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const weekJournals = journals.filter((j) => {
    if (!j.date || !j.date.startsWith(prefix)) return false;
    const day = parseInt(j.date.slice(8, 10), 10);
    return day >= range[0] && day <= range[1] && (j.mood || j.energy_level);
  });

  if (weekJournals.length === 0) {
    return { averageMood: null, averageEnergy: null, daysLogged: 0 };
  }

  let energySum = 0;
  let energyCount = 0;
  const moodScores: number[] = [];

  weekJournals.forEach((j) => {
    if (j.energy_level) {
      energySum += j.energy_level;
      energyCount++;
    }
    if (j.mood) {
      const meta = getMoodMeta(j.mood);
      moodScores.push(meta.score);
    }
  });

  const averageEnergy = energyCount > 0 ? Number((energySum / energyCount).toFixed(1)) : null;

  let averageMood: MoodMeta | null = null;
  if (moodScores.length > 0) {
    const avgScore = Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length);
    const closest = SELECTABLE_MOODS.find((m) => m.score === avgScore) || MOOD_DEFINITIONS.good;
    averageMood = closest;
  }

  return {
    averageMood,
    averageEnergy,
    daysLogged: weekJournals.length,
  };
}

/**
 * Returns most frequent mood and average energy for the entire month.
 */
export function getMonthlyMoodSummary(
  journals: DailyJournal[],
  year: number,
  month: number
): {
  mostFrequentMood: MoodMeta | null;
  mostFrequentCount: number;
  averageEnergy: number | null;
  totalLogged: number;
} {
  const stats = calculateMoodStats(journals, year, month);
  return {
    mostFrequentMood: stats.mostCommonMood,
    mostFrequentCount: stats.mostCommonMoodCount,
    averageEnergy: stats.averageEnergy,
    totalLogged: stats.totalDaysLogged,
  };
}
