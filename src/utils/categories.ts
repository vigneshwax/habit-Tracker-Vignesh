import { HabitCategory, HabitFrequency } from '../types';

export interface CategoryMeta {
  id: string;
  label: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
}

export const CATEGORIES_META: Record<string, CategoryMeta> = {
  health: {
    id: 'health',
    label: 'Health',
    emoji: '🏃',
    badgeBg: 'bg-[#EBF3EE]',
    badgeText: 'text-[#2C523A]',
    borderColor: 'border-[#D5E5D9]',
    accentColor: '#5B8266',
  },
  career: {
    id: 'career',
    label: 'Career',
    emoji: '💼',
    badgeBg: 'bg-[#F6EFFB]',
    badgeText: 'text-[#5B3175]',
    borderColor: 'border-[#E7D6F3]',
    accentColor: '#80499C',
  },
  learning: {
    id: 'learning',
    label: 'Learning',
    emoji: '📚',
    badgeBg: 'bg-[#EFF4FB]',
    badgeText: 'text-[#2A486F]',
    borderColor: 'border-[#D4E0F0]',
    accentColor: '#4A729E',
  },
  personal: {
    id: 'personal',
    label: 'Personal',
    emoji: '🧘',
    badgeBg: 'bg-[#FAF0E6]',
    badgeText: 'text-[#7D5226]',
    borderColor: 'border-[#ECDCCB]',
    accentColor: '#A06D3B',
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    emoji: '💰',
    badgeBg: 'bg-[#FEF6E8]',
    badgeText: 'text-[#875F18]',
    borderColor: 'border-[#F6E3B8]',
    accentColor: '#B8821F',
  },
  general: {
    id: 'general',
    label: 'General',
    emoji: '✨',
    badgeBg: 'bg-[#F4EFEA]',
    badgeText: 'text-[#5C554B]',
    borderColor: 'border-[#E5DDD0]',
    accentColor: '#7D766C',
  },
};

export interface FrequencyMeta {
  id: HabitFrequency;
  label: string;
  short: string;
  description: string;
}

export const FREQUENCIES_META: Record<HabitFrequency, FrequencyMeta> = {
  daily: {
    id: 'daily',
    label: 'Daily',
    short: 'Daily',
    description: 'Tracked every day of the month',
  },
  specific_days: {
    id: 'specific_days',
    label: 'Specific Days',
    short: 'Custom',
    description: 'Tracked only on selected days of the week',
  },
  weekly_target: {
    id: 'weekly_target',
    label: 'Weekly Target',
    short: 'Weekly',
    description: 'Target number of completions per calendar week',
  },
  monthly_target: {
    id: 'monthly_target',
    label: 'Monthly Target',
    short: 'Monthly',
    description: 'Target total completions across the whole month',
  },
};

export function getCategoryMeta(category?: string): CategoryMeta {
  if (!category) return CATEGORIES_META.general;
  const key = category.toLowerCase().trim();
  return (
    CATEGORIES_META[key] || {
      id: key,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      emoji: '✨',
      badgeBg: 'bg-[#F4EFEA]',
      badgeText: 'text-[#5C554B]',
      borderColor: 'border-[#E5DDD0]',
      accentColor: '#7D766C',
    }
  );
}

export function getFrequencyMeta(frequency?: string): FrequencyMeta {
  if (!frequency) return FREQUENCIES_META.daily;
  const key = frequency.toLowerCase().trim() as HabitFrequency;
  return (
    FREQUENCIES_META[key] || {
      id: 'daily',
      label: frequency.charAt(0).toUpperCase() + frequency.slice(1),
      short: 'Daily',
      description: 'Tracked daily',
    }
  );
}


export const WEEKDAY_LABELS = [
  { dayIndex: 0, short: 'Sun', full: 'Sunday' },
  { dayIndex: 1, short: 'Mon', full: 'Monday' },
  { dayIndex: 2, short: 'Tue', full: 'Tuesday' },
  { dayIndex: 3, short: 'Wed', full: 'Wednesday' },
  { dayIndex: 4, short: 'Thu', full: 'Thursday' },
  { dayIndex: 5, short: 'Fri', full: 'Friday' },
  { dayIndex: 6, short: 'Sat', full: 'Saturday' },
];

export function formatHabitFrequency(habit?: {
  frequency?: string;
  schedule_days?: any[];
  target_count?: number;
  target_days?: number;
}): string {
  if (!habit) return 'Daily';
  const freq = (habit.frequency || 'daily').toLowerCase();

  if (freq === 'daily') return 'Daily';

  if (freq === 'specific_days') {
    const days = habit.schedule_days || [];
    if (days.length === 0) return 'Daily';
    if (days.length === 7) return 'Daily';

    const indices: number[] = [];
    for (const d of days) {
      if (typeof d === 'number') {
        indices.push((d % 7 + 7) % 7);
      } else if (typeof d === 'string') {
        const num = parseInt(d, 10);
        if (!isNaN(num)) {
          indices.push((num % 7 + 7) % 7);
        } else {
          const clean = d.trim().toLowerCase();
          const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].findIndex((w) =>
            clean.startsWith(w)
          );
          if (idx >= 0) indices.push(idx);
        }
      }
    }

    const uniqueSorted = Array.from(new Set(indices)).sort((a, b) => a - b);
    if (uniqueSorted.length === 0) return 'Specific Days';
    if (uniqueSorted.length === 5 && uniqueSorted.join(',') === '1,2,3,4,5') return 'Mon–Fri';
    if (uniqueSorted.length === 2 && uniqueSorted.join(',') === '0,6') return 'Weekends';

    return uniqueSorted.map((i) => WEEKDAY_LABELS[i]?.short || '').join(' ');
  }

  if (freq === 'weekly_target') {
    const target = habit.target_count || habit.target_days || 3;
    return `${target}/week`;
  }

  if (freq === 'monthly_target') {
    const target = habit.target_count || habit.target_days || 15;
    return `${target}/month`;
  }

  return 'Daily';
}

