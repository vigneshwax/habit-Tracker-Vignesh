import { Habit } from '../types';
import { getDaysInMonth, formatDateKey } from './date';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Normalizes weekday string or index to weekday index 0-6 (0 = Sunday, 6 = Saturday)
 */
export function normalizeWeekdayIndex(day: string | number): number {
  if (typeof day === 'number') {
    return (day % 7 + 7) % 7;
  }
  if (day === undefined || day === null) return -1;
  const clean = String(day).trim().toLowerCase();
  const num = parseInt(clean, 10);
  if (!isNaN(num) && (clean === String(num) || /^[0-6]$/.test(clean))) {
    return (num % 7 + 7) % 7;
  }
  const index = WEEKDAYS.findIndex((w) => w.toLowerCase() === clean);
  if (index !== -1) return index;
  const shortIndex = WEEKDAYS_SHORT.findIndex((w) => w.toLowerCase() === clean);
  if (shortIndex !== -1) return shortIndex;
  // Check 3-letter prefix
  const prefixIndex = WEEKDAYS.findIndex((w) => w.toLowerCase().startsWith(clean.slice(0, 3)));
  if (prefixIndex !== -1) return prefixIndex;
  return -1;
}

/**
 * Returns which week of the month (1-5) a given day belongs to:
 * Week 1: Days 1–7
 * Week 2: Days 8–14
 * Week 3: Days 15–21
 * Week 4: Days 22–28
 * Week 5: Days 29–end of month
 */
export function getMonthWeekNumber(dayOfMonth: number): number {
  if (dayOfMonth <= 7) return 1;
  if (dayOfMonth <= 14) return 2;
  if (dayOfMonth <= 21) return 3;
  if (dayOfMonth <= 28) return 4;
  return 5;
}

/**
 * Single Central Scheduling Engine
 * Determines valid tracking dates and opportunities for any habit in a given month.
 * Paused and archived habits have 0 scheduled opportunities.
 */
export function getScheduledDates(habit: Habit, month: number, year: number): string[] {
  // Paused or archived habits have no scheduled tracking dates in active tracking
  if (habit.status === 'archived' || habit.status === 'paused') {
    return [];
  }

  const daysInMonth = getDaysInMonth(year, month);
  const scheduled: string[] = [];
  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily') {
    for (let day = 1; day <= daysInMonth; day++) {
      scheduled.push(formatDateKey(year, month, day));
    }
    return scheduled;
  }

  if (frequency === 'specific_days') {
    const rawDays = habit.schedule_days || [];
    const targetIndices = new Set(
      rawDays
        .map((d) => normalizeWeekdayIndex(d))
        .filter((idx) => idx >= 0 && idx <= 6)
    );

    // If no specific days configured, fallback to every day
    if (targetIndices.size === 0) {
      for (let day = 1; day <= daysInMonth; day++) {
        scheduled.push(formatDateKey(year, month, day));
      }
      return scheduled;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      if (targetIndices.has(dayOfWeek)) {
        scheduled.push(formatDateKey(year, month, day));
      }
    }
    return scheduled;
  }

  if (frequency === 'weekly_target' || frequency === 'monthly_target') {
    // For weekly and monthly targets, every day of the month is an available opportunity
    for (let day = 1; day <= daysInMonth; day++) {
      scheduled.push(formatDateKey(year, month, day));
    }
    return scheduled;
  }

  // Default fallback
  for (let day = 1; day <= daysInMonth; day++) {
    scheduled.push(formatDateKey(year, month, day));
  }
  return scheduled;
}

/**
 * Checks if a habit is scheduled on a specific date (YYYY-MM-DD).
 * Returns false if habit is paused or archived.
 */
export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.status === 'archived' || habit.status === 'paused') {
    return false;
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily' || frequency === 'weekly_target' || frequency === 'monthly_target') {
    return true;
  }

  if (frequency === 'specific_days') {
    const rawDays = habit.schedule_days || [];
    const targetIndices = new Set(
      rawDays
        .map((d) => normalizeWeekdayIndex(d))
        .filter((idx) => idx >= 0 && idx <= 6)
    );

    if (targetIndices.size === 0) return true;

    const dateObj = new Date(year, month - 1, day);
    return targetIndices.has(dateObj.getDay());
  }

  return true;
}

/**
 * Calculates total scheduled opportunities for a habit in a month.
 * Returns 0 if habit is paused or archived.
 */
export function getHabitOpportunities(habit: Habit, month: number, year: number): number {
  if (habit.status === 'archived' || habit.status === 'paused') {
    return 0;
  }

  const daysInMonth = getDaysInMonth(year, month);
  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily') {
    return daysInMonth;
  }

  if (frequency === 'specific_days') {
    return getScheduledDates(habit, month, year).length;
  }

  if (frequency === 'weekly_target') {
    const targetPerWeek = habit.target_count && habit.target_count > 0 ? habit.target_count : 3;
    const w1 = Math.min(7, targetPerWeek);
    const w2 = Math.min(7, targetPerWeek);
    const w3 = Math.min(7, targetPerWeek);
    const w4 = Math.min(7, targetPerWeek);
    const remainingDays = Math.max(0, daysInMonth - 28);
    const w5 = Math.min(remainingDays, targetPerWeek);
    return w1 + w2 + w3 + w4 + w5;
  }

  if (frequency === 'monthly_target') {
    const target = habit.target_count && habit.target_count > 0 ? habit.target_count : 20;
    return Math.min(daysInMonth, target);
  }

  return daysInMonth;
}

/**
 * Calculates habit progress:
 * Formula: Completed scheduled entries / Total scheduled opportunities * 100
 * Paused/archived habits with 0 opportunities return percentage 100% or 0% depending on context.
 */
export function getHabitProgress(
  habit: Habit,
  month: number,
  year: number,
  entries: Record<string, boolean>
): { completed: number; opportunities: number; percentage: number } {
  if (habit.status === 'archived' || habit.status === 'paused') {
    return { completed: 0, opportunities: 0, percentage: 100 };
  }

  const daysInMonth = getDaysInMonth(year, month);
  let completed = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    if (entries[`${habit.id}_${dateKey}`]) {
      completed++;
    }
  }

  const opportunities = getHabitOpportunities(habit, month, year);
  const percentage = opportunities > 0 ? Math.min(100, Math.round((completed / opportunities) * 100)) : 0;

  return {
    completed,
    opportunities,
    percentage,
  };
}

/**
 * Returns all active habits scheduled for a specific date
 */
export function getDayScheduledHabits(habits: Habit[], dateStr: string): Habit[] {
  return habits.filter((h) => h.status === 'active' && isHabitScheduledOnDate(h, dateStr));
}

/**
 * Calculates day progress & consistency status.
 * Requirement: Day is counted as consistent if >= 70% of scheduled habits for that day are completed.
 */
export function getDayProgress(
  habits: Habit[],
  dateStr: string,
  entries: Record<string, boolean>
): { totalScheduled: number; completedCount: number; percentage: number; isSuccessful: boolean } {
  const scheduledHabits = getDayScheduledHabits(habits, dateStr);
  const totalScheduled = scheduledHabits.length;

  if (totalScheduled === 0) {
    return { totalScheduled: 0, completedCount: 0, percentage: 0, isSuccessful: false };
  }

  let completedCount = 0;
  scheduledHabits.forEach((h) => {
    if (entries[`${h.id}_${dateStr}`]) {
      completedCount++;
    }
  });

  const percentage = Math.round((completedCount / totalScheduled) * 100);
  const isSuccessful = percentage >= 70; // >= 70% rule

  return {
    totalScheduled,
    completedCount,
    percentage,
    isSuccessful,
  };
}

/**
 * Centralized streak calculations for all habits and overall consistency streak
 */
export function calculateConsistencyStreaks(
  habits: Habit[],
  entries: Record<string, boolean>
): {
  streak: number;
  bestStreak: number;
  completedToday: boolean;
  habitStreaks: Record<string, { current: number; best: number; totalCompletions: number }>;
} {
  const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');
  const now = new Date();
  const todayStr = formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Helper to check if a day achieved >= 70% consistency
  const isDaySuccessful = (dateStr: string) => {
    const dayStats = getDayProgress(activeHabits, dateStr, entries);
    return dayStats.isSuccessful;
  };

  const hasCompletedToday = isDaySuccessful(todayStr);

  // 1. Overall Current Streak
  let currentStreak = 0;
  const checkDate = new Date(now);
  if (!hasCompletedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = formatDateKey(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate());
    if (isDaySuccessful(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Overall Best Streak (find maximum consecutive successful days)
  const completedDateKeys = new Set<string>();
  Object.keys(entries).forEach((k) => {
    if (entries[k]) {
      const parts = k.split('_');
      if (parts.length === 2) {
        completedDateKeys.add(parts[1]);
      }
    }
  });

  const sortedDates = Array.from(completedDateKeys).sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    if (isDaySuccessful(dateStr)) {
      const cDate = new Date(dateStr + 'T00:00:00');
      if (prevDate) {
        const diffDays = Math.round((cDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          runningStreak++;
        } else if (diffDays > 1) {
          runningStreak = 1;
        }
      } else {
        runningStreak = 1;
      }
      if (runningStreak > bestStreak) bestStreak = runningStreak;
      prevDate = cDate;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  // 3. Individual Habit Streaks
  const habitStreaks: Record<string, { current: number; best: number; totalCompletions: number }> = {};

  for (const habit of habits) {
    let totalCompletions = 0;
    const hDoneDates = new Set<string>();

    Object.keys(entries).forEach((key) => {
      if (key.startsWith(`${habit.id}_`) && entries[key]) {
        const dStr = key.slice(habit.id.length + 1);
        hDoneDates.add(dStr);
        totalCompletions++;
      }
    });

    // Calculate current streak along scheduled days
    let hCurrent = 0;
    const hCheck = new Date(now);
    const todayScheduled = isHabitScheduledOnDate(habit, todayStr);
    const doneToday = hDoneDates.has(todayStr);

    if (todayScheduled && !doneToday) {
      hCheck.setDate(hCheck.getDate() - 1);
    }

    let safetyCount = 0;
    while (safetyCount < 365) {
      safetyCount++;
      const dStr = formatDateKey(hCheck.getFullYear(), hCheck.getMonth() + 1, hCheck.getDate());
      const isSched = isHabitScheduledOnDate(habit, dStr);

      if (isSched) {
        if (hDoneDates.has(dStr)) {
          hCurrent++;
          hCheck.setDate(hCheck.getDate() - 1);
        } else {
          break;
        }
      } else {
        // Not a scheduled day for this habit (e.g. weekend for weekday-only habit) -> skip backwards without breaking streak
        hCheck.setDate(hCheck.getDate() - 1);
      }
    }

    // Calculate best streak
    const sortedDone = Array.from(hDoneDates).sort();
    let hBest = 0;
    let hRun = 0;
    let lastValidDate: Date | null = null;

    for (const dStr of sortedDone) {
      const cDate = new Date(dStr + 'T00:00:00');
      if (lastValidDate) {
        const diffDays = Math.round((cDate.getTime() - lastValidDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          hRun++;
        } else if (diffDays > 1) {
          // Check if intervening days were scheduled
          let broken = false;
          const tempDate = new Date(lastValidDate);
          tempDate.setDate(tempDate.getDate() + 1);
          while (tempDate < cDate) {
            const checkStr = formatDateKey(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
            if (isHabitScheduledOnDate(habit, checkStr)) {
              broken = true;
              break;
            }
            tempDate.setDate(tempDate.getDate() + 1);
          }

          if (broken) {
            hRun = 1;
          } else {
            hRun++;
          }
        }
      } else {
        hRun = 1;
      }

      if (hRun > hBest) hBest = hRun;
      lastValidDate = cDate;
    }
    hBest = Math.max(hBest, hCurrent);

    habitStreaks[habit.id] = {
      current: hCurrent,
      best: hBest,
      totalCompletions,
    };
  }

  return {
    streak: currentStreak,
    bestStreak,
    completedToday: hasCompletedToday,
    habitStreaks,
  };
}

/**
 * Calculates V3 Unified Daily Dashboard Score (0 - 100)
 */
export function calculateDashboardScore(
  habits: Habit[],
  entries: Record<string, boolean>
): {
  score: number;
  grade: string;
  motivationalMessage: string;
  completedTodayCount: number;
  totalScheduledToday: number;
  weeklyProgressPct: number;
  currentStreak: number;
} {
  const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');
  const now = new Date();
  const todayStr = formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const todayScheduled = getDayScheduledHabits(activeHabits, todayStr);
  let todayCompleted = 0;
  let priorityWeightedCompleted = 0;
  let priorityWeightedTotal = 0;

  todayScheduled.forEach((h) => {
    const weight = h.priority === 'high' ? 1.5 : h.priority === 'low' ? 0.8 : 1.0;
    priorityWeightedTotal += weight;
    if (entries[`${h.id}_${todayStr}`]) {
      todayCompleted++;
      priorityWeightedCompleted += weight;
    }
  });

  const todayRatio = priorityWeightedTotal > 0 ? priorityWeightedCompleted / priorityWeightedTotal : 1.0;

  // Calculate Last 7 Days Weekly Progress
  let past7TotalScheduled = 0;
  let past7Completed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const scheduled = getDayScheduledHabits(activeHabits, dStr);
    past7TotalScheduled += scheduled.length;
    scheduled.forEach((h) => {
      if (entries[`${h.id}_${dStr}`]) {
        past7Completed++;
      }
    });
  }

  const weeklyProgressPct = past7TotalScheduled > 0 ? Math.round((past7Completed / past7TotalScheduled) * 100) : 100;
  const streaks = calculateConsistencyStreaks(activeHabits, entries);

  // Score Formula: 50% Today's execution + 40% 7-Day Consistency + 10% Streak Momentum Bonus
  const todayComponent = todayRatio * 50;
  const weeklyComponent = (weeklyProgressPct / 100) * 40;
  const streakBonus = Math.min(10, streaks.streak * 2);

  const rawScore = Math.round(todayComponent + weeklyComponent + streakBonus);
  const score = Math.max(0, Math.min(100, rawScore));

  let grade = 'A';
  let motivationalMessage = 'Outstanding consistency! You are crushing your daily goals.';

  if (score >= 90) {
    grade = 'S';
    motivationalMessage = '🔥 Unstoppable momentum! Every priority is on track.';
  } else if (score >= 75) {
    grade = 'A';
    motivationalMessage = '⚡ Great focus! Solid execution across all scheduled habits.';
  } else if (score >= 60) {
    grade = 'B';
    motivationalMessage = '🌱 Steady progress. A little push today will lock in your streak.';
  } else if (score >= 40) {
    grade = 'C';
    motivationalMessage = '💪 Time to refocus. Knock out one quick habit right now.';
  } else {
    grade = 'D';
    motivationalMessage = '✨ Fresh day, fresh start. Start small with your highest priority.';
  }

  return {
    score,
    grade,
    motivationalMessage,
    completedTodayCount: todayCompleted,
    totalScheduledToday: todayScheduled.length,
    weeklyProgressPct,
    currentStreak: streaks.streak,
  };
}

/**
 * Habit Risk Detection
 * Flags habits that have missed 2 or more scheduled opportunities in a row or < 50% compliance recently.
 */
export function getHabitRiskStatus(
  habit: Habit,
  entries: Record<string, boolean>
): {
  isAtRisk: boolean;
  consecutiveMisses: number;
  recentRate: number;
  riskSeverity: 'low' | 'medium' | 'high';
  reason: string;
} {
  if (habit.status === 'paused' || habit.status === 'archived') {
    return { isAtRisk: false, consecutiveMisses: 0, recentRate: 100, riskSeverity: 'low', reason: 'Habit is not currently active' };
  }

  const now = new Date();
  let consecutiveMisses = 0;
  let scheduledCount = 0;
  let completedCount = 0;

  // Look back over the past 14 days
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

    if (isHabitScheduledOnDate(habit, dStr)) {
      scheduledCount++;
      const isDone = Boolean(entries[`${habit.id}_${dStr}`]);
      if (isDone) {
        completedCount++;
      } else if (scheduledCount === consecutiveMisses + 1) {
        consecutiveMisses++;
      }
    }
  }

  const recentRate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 100;
  const isAtRisk = consecutiveMisses >= 2 || (scheduledCount >= 4 && recentRate < 50);

  let riskSeverity: 'low' | 'medium' | 'high' = 'low';
  let reason = 'Consistent';

  if (consecutiveMisses >= 4 || recentRate < 30) {
    riskSeverity = 'high';
    reason = `Missed ${consecutiveMisses} consecutive scheduled sessions`;
  } else if (consecutiveMisses >= 2 || recentRate < 50) {
    riskSeverity = 'medium';
    reason = `Recent completion dropped to ${recentRate}%`;
  }

  return {
    isAtRisk,
    consecutiveMisses,
    recentRate,
    riskSeverity,
    reason,
  };
}

/**
 * Calculates Habit Trend (+% or -% compared to previous week)
 */
export function getHabitTrend(
  habit: Habit,
  entries: Record<string, boolean>
): {
  trendDirection: 'up' | 'down' | 'stable';
  changePercentage: number;
  currentWeekRate: number;
  previousWeekRate: number;
} {
  const now = new Date();
  let thisWeekSched = 0;
  let thisWeekDone = 0;
  let lastWeekSched = 0;
  let lastWeekDone = 0;

  // Current 7 days (days 0 to 6)
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (isHabitScheduledOnDate(habit, dStr)) {
      thisWeekSched++;
      if (entries[`${habit.id}_${dStr}`]) thisWeekDone++;
    }
  }

  // Previous 7 days (days 7 to 13)
  for (let i = 7; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (isHabitScheduledOnDate(habit, dStr)) {
      lastWeekSched++;
      if (entries[`${habit.id}_${dStr}`]) lastWeekDone++;
    }
  }

  const currentWeekRate = thisWeekSched > 0 ? Math.round((thisWeekDone / thisWeekSched) * 100) : 0;
  const previousWeekRate = lastWeekSched > 0 ? Math.round((lastWeekDone / lastWeekSched) * 100) : 0;
  const diff = currentWeekRate - previousWeekRate;

  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (diff > 5) trendDirection = 'up';
  else if (diff < -5) trendDirection = 'down';

  return {
    trendDirection,
    changePercentage: Math.abs(diff),
    currentWeekRate,
    previousWeekRate,
  };
}

/**
 * Calculates end-of-month completion forecast based on current pace
 */
export function calculateCompletionForecast(
  habit: Habit,
  month: number,
  year: number,
  entries: Record<string, boolean>
): {
  currentCompleted: number;
  totalOpportunities: number;
  projectedCompletions: number;
  projectedPercentage: number;
  onTrackForGoal: boolean;
} {
  const opportunities = getHabitOpportunities(habit, month, year);
  if (opportunities === 0) {
    return { currentCompleted: 0, totalOpportunities: 0, projectedCompletions: 0, projectedPercentage: 100, onTrackForGoal: true };
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = getDaysInMonth(year, month);

  let currentCompleted = 0;
  let elapsedOpportunities = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = formatDateKey(year, month, d);
    const isPastOrToday = (year < currentYear) || (year === currentYear && (month < currentMonth || (month === currentMonth && d <= currentDay)));
    
    if (isHabitScheduledOnDate(habit, dStr)) {
      if (isPastOrToday) {
        elapsedOpportunities++;
        if (entries[`${habit.id}_${dStr}`]) {
          currentCompleted++;
        }
      }
    }
  }

  const currentVelocity = elapsedOpportunities > 0 ? currentCompleted / elapsedOpportunities : 1;
  const remainingOpportunities = Math.max(0, opportunities - elapsedOpportunities);
  const projectedRemaining = Math.round(remainingOpportunities * currentVelocity);
  const projectedCompletions = Math.min(opportunities, currentCompleted + projectedRemaining);
  const projectedPercentage = Math.round((projectedCompletions / opportunities) * 100);

  return {
    currentCompleted,
    totalOpportunities: opportunities,
    projectedCompletions,
    projectedPercentage,
    onTrackForGoal: projectedPercentage >= 80,
  };
}

