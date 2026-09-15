import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DailyJournal, MoodType } from '../types';
import {
  MOOD_DEFINITIONS,
  SELECTABLE_MOODS,
  normalizeMood,
  getMoodMeta,
  ENERGY_LEVELS,
} from '../utils/mood';
import {
  formatDateKey,
  formatDateToISO,
  parseISODate,
  getDatesInRange,
  formatShortDate,
  formatFullDateDisplay,
  MONTH_NAMES,
  getDaysInMonth,
  getTodayDateInfo,
} from '../utils/date';
import { api } from '../api';
import {
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Smile,
  BarChart2,
  Clock,
  Filter,
  Info,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

export type MoodDateRange = '7d' | '30d' | '90d' | 'month' | 'custom';
export type GraphDisplayMode = 'all' | 'mood' | 'energy' | 'distribution';

interface MoodGraphViewProps {
  journals: DailyJournal[];
  currentYear: number;
  currentMonth: number;
  onMonthChange?: (month: number, year: number) => void;
  onSelectDateToEdit?: (dateStr: string) => void;
}

export const MoodGraphView: React.FC<MoodGraphViewProps> = ({
  journals: propJournals,
  currentYear,
  currentMonth,
  onMonthChange,
  onSelectDateToEdit,
}) => {
  const todayInfo = getTodayDateInfo();
  const todayStr = formatDateKey(todayInfo.year, todayInfo.month, todayInfo.day);

  // Range and filter state
  const [dateRange, setDateRange] = useState<MoodDateRange>('month');
  const [displayMode, setDisplayMode] = useState<GraphDisplayMode>('all');

  // Month navigation state (defaults to current active month)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Custom date range state
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatDateToISO(d);
  }, []);
  const [customStart, setCustomStart] = useState<string>(thirtyDaysAgo);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Local journals cache when fetching ranges outside current month
  const [rangeJournals, setRangeJournals] = useState<DailyJournal[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hovered data point for tooltip
  const [hoveredPoint, setHoveredPoint] = useState<{
    dateStr: string;
    x: number;
    y: number;
    mood?: MoodType;
    moodScore?: number;
    energy?: number;
    content?: string;
  } | null>(null);

  // Sync with prop changes if month changes from outside
  useEffect(() => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  }, [currentYear, currentMonth]);

  // Compute start and end dates based on filter
  const { startDateStr, endDateStr } = useMemo(() => {
    if (dateRange === 'month') {
      const days = getDaysInMonth(selectedYear, selectedMonth);
      const start = formatDateKey(selectedYear, selectedMonth, 1);
      const end = formatDateKey(selectedYear, selectedMonth, days);
      return { startDateStr: start, endDateStr: end };
    }

    if (dateRange === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { startDateStr: formatDateToISO(d), endDateStr: todayStr };
    }

    if (dateRange === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { startDateStr: formatDateToISO(d), endDateStr: todayStr };
    }

    if (dateRange === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 89);
      return { startDateStr: formatDateToISO(d), endDateStr: todayStr };
    }

    // Custom
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    return { startDateStr: s, endDateStr: e };
  }, [dateRange, selectedYear, selectedMonth, todayStr, customStart, customEnd]);

  // Fetch journals for this range if needed (e.g. multi-month ranges or past months)
  useEffect(() => {
    let isCancelled = false;

    async function loadRangeData() {
      setIsLoading(true);
      try {
        let res;
        if (dateRange === 'month') {
          res = await api.getJournal({ year: selectedYear, month: selectedMonth });
        } else {
          res = await api.getJournal({ startDate: startDateStr, endDate: endDateStr });
        }
        if (!isCancelled && res.journal) {
          setRangeJournals(res.journal);
        }
      } catch (err) {
        console.warn('Could not fetch journal range:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadRangeData();
    return () => {
      isCancelled = true;
    };
  }, [dateRange, selectedYear, selectedMonth, startDateStr, endDateStr]);

  // Active journals merged
  const activeJournals = useMemo(() => {
    const source = rangeJournals !== null ? rangeJournals : propJournals;
    // Filter to range
    return source.filter((j) => j.date >= startDateStr && j.date <= endDateStr);
  }, [rangeJournals, propJournals, startDateStr, endDateStr]);

  // Map of journal by date for fast lookup
  const journalMap = useMemo(() => {
    const map = new Map<string, DailyJournal>();
    activeJournals.forEach((j) => {
      map.set(j.date, j);
    });
    return map;
  }, [activeJournals]);

  // All calendar dates in the selected range in chronological order
  const allDatesInRange = useMemo(() => {
    return getDatesInRange(startDateStr, endDateStr);
  }, [startDateStr, endDateStr]);

  // Daily points: chronological dates with mapped mood score (1-6) and energy (1-5)
  const chartTimeline = useMemo(() => {
    return allDatesInRange.map((dateStr) => {
      const j = journalMap.get(dateStr);
      let moodType: MoodType | undefined;
      let moodScore: number | undefined;
      let energyLevel: number | undefined;
      let content: string | undefined;

      if (j) {
        if (j.mood) {
          moodType = normalizeMood(j.mood);
          moodScore = MOOD_DEFINITIONS[moodType]?.score;
        }
        if (typeof j.energy_level === 'number' && j.energy_level >= 1 && j.energy_level <= 5) {
          energyLevel = j.energy_level;
        }
        if (j.content) {
          content = j.content;
        }
      }

      return {
        dateStr,
        hasEntry: !!j,
        moodType,
        moodScore, // 1 to 6, or undefined if missing
        energyLevel, // 1 to 5, or undefined if missing
        content,
      };
    });
  }, [allDatesInRange, journalMap]);

  // Only the points with actual recorded mood (chronological)
  const validMoodPoints = useMemo(() => {
    return chartTimeline
      .map((item, index) => ({ ...item, timelineIndex: index }))
      .filter((item) => typeof item.moodScore === 'number');
  }, [chartTimeline]);

  // Only the points with actual recorded energy (chronological)
  const validEnergyPoints = useMemo(() => {
    return chartTimeline
      .map((item, index) => ({ ...item, timelineIndex: index }))
      .filter((item) => typeof item.energyLevel === 'number');
  }, [chartTimeline]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalDays = allDatesInRange.length;
    const moodDays = validMoodPoints.length;
    const energyDays = validEnergyPoints.length;

    let moodSum = 0;
    validMoodPoints.forEach((p) => {
      moodSum += p.moodScore || 0;
    });
    const avgMood = moodDays > 0 ? Number((moodSum / moodDays).toFixed(1)) : null;

    let energySum = 0;
    validEnergyPoints.forEach((p) => {
      energySum += p.energyLevel || 0;
    });
    const avgEnergy = energyDays > 0 ? Number((energySum / energyDays).toFixed(1)) : null;

    // Mood distribution
    const counts: Record<MoodType, number> = {
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
    validMoodPoints.forEach((p) => {
      if (p.moodType) {
        counts[p.moodType] = (counts[p.moodType] || 0) + 1;
      }
    });

    // Dominant mood
    let maxCount = 0;
    let dominantType: MoodType | null = null;
    SELECTABLE_MOODS.forEach((m) => {
      if (counts[m.type] > maxCount) {
        maxCount = counts[m.type];
        dominantType = m.type;
      }
    });

    const distributionList = SELECTABLE_MOODS.map((m) => {
      const count = counts[m.type] || 0;
      const pct = moodDays > 0 ? Math.round((count / moodDays) * 100) : 0;
      return {
        ...m,
        count,
        percentage: pct,
      };
    });

    return {
      totalDays,
      moodDays,
      energyDays,
      avgMood,
      avgEnergy,
      dominantMood: dominantType ? MOOD_DEFINITIONS[dominantType] : null,
      dominantCount: maxCount,
      distribution: distributionList,
    };
  }, [allDatesInRange.length, validMoodPoints, validEnergyPoints]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    let newYear = selectedYear;
    let newMonth = selectedMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth, newYear);
    }
  };

  const handleNextMonth = () => {
    let newYear = selectedYear;
    let newMonth = selectedMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth, newYear);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(todayInfo.year);
    setSelectedMonth(todayInfo.month);
    if (onMonthChange) {
      onMonthChange(todayInfo.month, todayInfo.year);
    }
  };

  // Dimensions for SVG Graphs
  const svgWidth = 840;
  const svgHeight = 260;
  const padLeft = 85;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const totalDates = Math.max(allDatesInRange.length, 1);

  // Scale X: maps timeline index (0 to totalDates - 1) to X pixel
  const getX = (timelineIndex: number) => {
    if (totalDates <= 1) return padLeft + plotWidth / 2;
    return padLeft + (timelineIndex / (totalDates - 1)) * plotWidth;
  };

  // Scale Y for Mood (1 to 6)
  // 6 (excellent) -> top (padTop)
  // 1 (very_low) -> bottom (padTop + plotHeight)
  const getYMood = (score: number) => {
    const normalized = (score - 1) / 5; // 0 for score 1, 1 for score 6
    return padTop + plotHeight - normalized * plotHeight;
  };

  // Scale Y for Energy (1 to 5)
  // 5 (peak) -> top (padTop)
  // 1 (depleted) -> bottom (padTop + plotHeight)
  const getYEnergy = (level: number) => {
    const normalized = (level - 1) / 4; // 0 for level 1, 1 for level 5
    return padTop + plotHeight - normalized * plotHeight;
  };

  // Build SVG path for valid points in chronological order
  const buildLinePath = (
    points: Array<{ timelineIndex: number; yValue: number }>,
    getY: (val: number) => number
  ) => {
    if (points.length === 0) return '';
    return points
      .map((pt, i) => {
        const x = getX(pt.timelineIndex).toFixed(1);
        const y = getY(pt.yValue).toFixed(1);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Mood Path
  const moodPath = useMemo(() => {
    const pts = validMoodPoints.map((p) => ({
      timelineIndex: p.timelineIndex,
      yValue: p.moodScore as number,
    }));
    return buildLinePath(pts, getYMood);
  }, [validMoodPoints]);

  // Energy Path
  const energyPath = useMemo(() => {
    const pts = validEnergyPoints.map((p) => ({
      timelineIndex: p.timelineIndex,
      yValue: p.energyLevel as number,
    }));
    return buildLinePath(pts, getYEnergy);
  }, [validEnergyPoints]);

  // X Axis Ticks logic to prevent label collisions
  const xAxisTicks = useMemo(() => {
    const ticks: Array<{ index: number; dateStr: string; label: string }> = [];
    const count = allDatesInRange.length;
    let step = 1;
    if (count > 60) step = 10;
    else if (count > 30) step = 5;
    else if (count > 16) step = 3;
    else if (count > 8) step = 2;

    for (let i = 0; i < count; i += step) {
      ticks.push({
        index: i,
        dateStr: allDatesInRange[i],
        label: formatShortDate(allDatesInRange[i]),
      });
    }
    // Ensure last date is included if not too close
    const lastIndex = count - 1;
    if (ticks.length > 0 && lastIndex - ticks[ticks.length - 1].index > step / 2) {
      ticks.push({
        index: lastIndex,
        dateStr: allDatesInRange[lastIndex],
        label: formatShortDate(allDatesInRange[lastIndex]),
      });
    }
    return ticks;
  }, [allDatesInRange]);

  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* 1. Header & Range Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                <TrendingUp className="w-3.5 h-3.5" />
                Mood & Energy Trends
              </span>
              <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">
                Real Daily Journal Data
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
              Visual Rhythms & Distribution
            </h3>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-xl">
              Chronological trends connecting actual logged days. Missing mood days remain unplotted to maintain statistical integrity.
            </p>
          </div>

          {/* Date Range Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#FAF8F5] dark:bg-slate-700/60 border border-[#E5DFD5] dark:border-slate-600 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === 'month'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === '7d'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === '30d'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('90d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === '90d'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              90 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white shadow-2xs'
                  : 'text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Sub-bar: Monthly Navigator or Custom Range Pickers */}
        <div className="mt-4 pt-4 border-t border-[#ECE6DC] dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {dateRange === 'month' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 hover:bg-[#EAE4DC] dark:hover:bg-slate-600 text-[#2D2A26] dark:text-white border border-[#E5DFD5] dark:border-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white min-w-[130px] text-center">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 hover:bg-[#EAE4DC] dark:hover:bg-slate-600 text-[#2D2A26] dark:text-white border border-[#E5DFD5] dark:border-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="text-xs px-2.5 py-1 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 text-[#5B8266] dark:text-emerald-400 font-bold border border-[#E5DFD5] dark:border-slate-600 hover:bg-[#EBF3EE] transition-all cursor-pointer"
              >
                Current Month
              </button>
            </div>
          ) : dateRange === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-[#7D766C] dark:text-slate-400 font-semibold">
                From:
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#2D2A26] dark:text-white font-mono"
                />
              </label>
              <label className="flex items-center gap-1 text-[#7D766C] dark:text-slate-400 font-semibold">
                To:
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#2D2A26] dark:text-white font-mono"
                />
              </label>
            </div>
          ) : (
            <div className="text-xs text-[#7D766C] dark:text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#5B8266]" />
              <span>
                Showing <strong className="text-[#2D2A26] dark:text-white">{formatShortDate(startDateStr)}</strong> to{' '}
                <strong className="text-[#2D2A26] dark:text-white">{formatShortDate(endDateStr)}</strong> ({allDatesInRange.length} days total)
              </span>
            </div>
          )}

          {/* Graph Display Mode Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C8377] dark:text-slate-400 mr-1 hidden sm:inline">
              View:
            </span>
            {(['all', 'mood', 'energy', 'distribution'] as GraphDisplayMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                className={`px-2.5 py-1 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                  displayMode === mode
                    ? 'bg-[#5B8266] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26]'
                }`}
              >
                {mode === 'all' ? 'All Trends' : mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Days Logged */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Logged Entries</span>
            <Calendar className="w-4 h-4 text-[#5B8266]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2D2A26] dark:text-white">
            {summaryStats.moodDays}{' '}
            <span className="text-xs font-sans text-[#8C8377] font-normal">
              / {summaryStats.totalDays} days
            </span>
          </div>
          <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
            {summaryStats.totalDays > 0
              ? `${Math.round((summaryStats.moodDays / summaryStats.totalDays) * 100)}% logging rate`
              : 'No dates'}
          </div>
        </div>

        {/* Metric 2: Average Mood */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Mood</span>
            <Smile className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
            {summaryStats.avgMood !== null ? (
              <>
                <span>{summaryStats.avgMood}</span>
                <span className="text-xs font-sans text-[#8C8377] font-normal">/ 6</span>
                <span className="text-xl ml-1">
                  {summaryStats.avgMood >= 5.5
                    ? '🤩'
                    : summaryStats.avgMood >= 4.5
                    ? '😄'
                    : summaryStats.avgMood >= 3.5
                    ? '🙂'
                    : summaryStats.avgMood >= 2.5
                    ? '😐'
                    : summaryStats.avgMood >= 1.5
                    ? '😕'
                    : '😞'}
                </span>
              </>
            ) : (
              <span className="text-sm font-sans text-[#8C8377] italic">No logs</span>
            )}
          </div>
          <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
            Scale: 1 (Very Low) to 6 (Excellent)
          </div>
        </div>

        {/* Metric 3: Average Energy */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Energy</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
            {summaryStats.avgEnergy !== null ? (
              <>
                <span>{summaryStats.avgEnergy}</span>
                <span className="text-xs font-sans text-[#8C8377] font-normal">/ 5</span>
                <span className="text-amber-500 text-sm ml-1 font-sans">
                  {'⭐'.repeat(Math.round(summaryStats.avgEnergy))}
                </span>
              </>
            ) : (
              <span className="text-sm font-sans text-[#8C8377] italic">No logs</span>
            )}
          </div>
          <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
            Scale: 1 (Depleted) to 5 (Peak)
          </div>
        </div>

        {/* Metric 4: Dominant Mood */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Top Recorded Mood</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-2 truncate">
            {summaryStats.dominantMood ? (
              <>
                <span className="text-2xl">{summaryStats.dominantMood.emoji}</span>
                <span className="truncate">{summaryStats.dominantMood.label}</span>
              </>
            ) : (
              <span className="text-sm font-sans text-[#8C8377] italic">No entries</span>
            )}
          </div>
          <div className="text-[11px] text-[#7D766C] dark:text-slate-400 mt-1">
            {summaryStats.dominantCount > 0
              ? `${summaryStats.dominantCount} days recorded in period`
              : 'Log daily to reveal trend'}
          </div>
        </div>
      </div>

      {/* 3. GRAPH 1: MOOD TREND LINE GRAPH (X: Date, Y: 1-6) */}
      {(displayMode === 'all' || displayMode === 'mood') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-violet-500" />
                  Mood Level Trend (1–6)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold">
                  Chronological Connection
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                Each node maps directly to recorded database entries. Missing days are unplotted without artificial zeros.
              </p>
            </div>

            <div className="text-xs text-[#8C8377] dark:text-slate-400 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block"></span>
                Logged Mood Node
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-0.5 bg-violet-400 inline-block"></span>
                Trend Line
              </span>
            </div>
          </div>

          {/* SVG Chart Container */}
          {validMoodPoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/40 border border-dashed border-[#E5DFD5] dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-2xl mb-2">
                😐
              </div>
              <h4 className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
                No Mood Entries Found for this Period
              </h4>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-sm mt-1 mb-3">
                Log your mood in the Daily Card to start visualizing your emotional trends here.
              </p>
              {onSelectDateToEdit && (
                <button
                  type="button"
                  onClick={() => onSelectDateToEdit(todayStr)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#5B8266] hover:bg-[#4A6D53] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Log Today's Mood
                </button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-64 sm:h-72 select-none"
                style={{ minWidth: '600px' }}
              >
                {/* Gradients */}
                <defs>
                  <linearGradient id="moodLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="50%" stopColor="#0D9488" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines and Mood Labels (1 to 6) */}
                {[6, 5, 4, 3, 2, 1].map((level) => {
                  const y = getYMood(level);
                  const meta =
                    level === 6
                      ? MOOD_DEFINITIONS.excellent
                      : level === 5
                      ? MOOD_DEFINITIONS.great
                      : level === 4
                      ? MOOD_DEFINITIONS.good
                      : level === 3
                      ? MOOD_DEFINITIONS.okay
                      : level === 2
                      ? MOOD_DEFINITIONS.low
                      : MOOD_DEFINITIONS.very_low;

                  return (
                    <g key={level} className="text-xs">
                      {/* Gridline */}
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#ECE6DC"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        className="dark:stroke-slate-700"
                      />
                      {/* Y-Axis Label */}
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#7D766C] dark:fill-slate-400 text-[11px] font-medium"
                      >
                        {meta.emoji} {meta.label} ({level})
                      </text>
                    </g>
                  );
                })}

                {/* Left Y-Axis Vertical Line */}
                <line
                  x1={padLeft}
                  y1={padTop}
                  x2={padLeft}
                  y2={padTop + plotHeight}
                  stroke="#D1C7BA"
                  strokeWidth="1.5"
                  className="dark:stroke-slate-600"
                />

                {/* Bottom X-Axis Horizontal Line */}
                <line
                  x1={padLeft}
                  y1={padTop + plotHeight}
                  x2={svgWidth - padRight}
                  y2={padTop + plotHeight}
                  stroke="#D1C7BA"
                  strokeWidth="1.5"
                  className="dark:stroke-slate-600"
                />

                {/* X-Axis Date Ticks */}
                {xAxisTicks.map((tick) => {
                  const x = getX(tick.index);
                  const isToday = tick.dateStr === todayStr;
                  return (
                    <g key={tick.dateStr}>
                      <line
                        x1={x}
                        y1={padTop + plotHeight}
                        x2={x}
                        y2={padTop + plotHeight + 5}
                        stroke="#9C9488"
                        strokeWidth="1"
                        className="dark:stroke-slate-500"
                      />
                      <text
                        x={x}
                        y={padTop + plotHeight + 20}
                        textAnchor="middle"
                        className={`text-[10px] font-sans ${
                          isToday
                            ? 'fill-[#059669] dark:fill-emerald-400 font-bold'
                            : 'fill-[#7D766C] dark:fill-slate-400 font-medium'
                        }`}
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {/* Connecting Trend Line (Chronological only between recorded points) */}
                {moodPath && (
                  <path
                    d={moodPath}
                    fill="none"
                    stroke="url(#moodLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Valid Data Point Circles */}
                {validMoodPoints.map((pt) => {
                  const x = getX(pt.timelineIndex);
                  const y = getYMood(pt.moodScore as number);
                  const meta = pt.moodType ? MOOD_DEFINITIONS[pt.moodType] : MOOD_DEFINITIONS.good;
                  const isHovered = hoveredPoint?.dateStr === pt.dateStr;

                  return (
                    <g
                      key={pt.dateStr}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredPoint({
                          dateStr: pt.dateStr,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          mood: pt.moodType,
                          moodScore: pt.moodScore,
                          energy: pt.energyLevel,
                          content: pt.content,
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => {
                        if (onSelectDateToEdit) {
                          onSelectDateToEdit(pt.dateStr);
                        }
                      }}
                    >
                      {/* Pulse ring if hovered */}
                      {isHovered && (
                        <circle
                          cx={x}
                          cy={y}
                          r="10"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="2"
                          opacity="0.6"
                          className="animate-ping"
                        />
                      )}
                      {/* Outer border */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6.5 : 5}
                        fill="#FFFFFF"
                        stroke="#6D28D9"
                        strokeWidth="2"
                        className="dark:stroke-violet-400 transition-all"
                      />
                      {/* Inner dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 4 : 3}
                        fill={
                          pt.moodScore === 6
                            ? '#7C3AED'
                            : pt.moodScore === 5
                            ? '#0D9488'
                            : pt.moodScore === 4
                            ? '#059669'
                            : pt.moodScore === 3
                            ? '#2563EB'
                            : pt.moodScore === 2
                            ? '#D97706'
                            : '#E11D48'
                        }
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 4. GRAPH 2: ENERGY TREND LINE GRAPH (X: Date, Y: 1-5) */}
      {(displayMode === 'all' || displayMode === 'energy') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Energy Level Trend (1–5)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                  Vitality Pulse
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                Tracks daily physical and mental battery from 1 (Depleted) to 5 (Peak flow).
              </p>
            </div>

            <div className="text-xs text-[#8C8377] dark:text-slate-400 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Energy Point
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-400 inline-block"></span>
                Energy Line
              </span>
            </div>
          </div>

          {/* SVG Energy Chart */}
          {validEnergyPoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/40 border border-dashed border-[#E5DFD5] dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-2xl mb-2">
                ⚡
              </div>
              <h4 className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
                No Energy Ratings Recorded for this Period
              </h4>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-sm mt-1 mb-3">
                Rate your energy stars in the Daily Card to view vitality fluctuation graphs.
              </p>
              {onSelectDateToEdit && (
                <button
                  type="button"
                  onClick={() => onSelectDateToEdit(todayStr)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#5B8266] hover:bg-[#4A6D53] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Log Today's Energy
                </button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-64 sm:h-72 select-none"
                style={{ minWidth: '600px' }}
              >
                {/* Gradients */}
                <defs>
                  <linearGradient id="energyLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines (1 to 5) */}
                {[5, 4, 3, 2, 1].map((level) => {
                  const y = getYEnergy(level);
                  const stars = '⭐'.repeat(level);
                  const label =
                    level === 5
                      ? 'Peak (5)'
                      : level === 4
                      ? 'High (4)'
                      : level === 3
                      ? 'Steady (3)'
                      : level === 2
                      ? 'Low (2)'
                      : 'Depleted (1)';

                  return (
                    <g key={level} className="text-xs">
                      {/* Gridline */}
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#ECE6DC"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        className="dark:stroke-slate-700"
                      />
                      {/* Y-Axis Label */}
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#7D766C] dark:fill-slate-400 text-[11px] font-medium"
                      >
                        {label} {stars}
                      </text>
                    </g>
                  );
                })}

                {/* Left Y-Axis Vertical Line */}
                <line
                  x1={padLeft}
                  y1={padTop}
                  x2={padLeft}
                  y2={padTop + plotHeight}
                  stroke="#D1C7BA"
                  strokeWidth="1.5"
                  className="dark:stroke-slate-600"
                />

                {/* Bottom X-Axis Horizontal Line */}
                <line
                  x1={padLeft}
                  y1={padTop + plotHeight}
                  x2={svgWidth - padRight}
                  y2={padTop + plotHeight}
                  stroke="#D1C7BA"
                  strokeWidth="1.5"
                  className="dark:stroke-slate-600"
                />

                {/* X-Axis Date Ticks */}
                {xAxisTicks.map((tick) => {
                  const x = getX(tick.index);
                  const isToday = tick.dateStr === todayStr;
                  return (
                    <g key={tick.dateStr}>
                      <line
                        x1={x}
                        y1={padTop + plotHeight}
                        x2={x}
                        y2={padTop + plotHeight + 5}
                        stroke="#9C9488"
                        strokeWidth="1"
                        className="dark:stroke-slate-500"
                      />
                      <text
                        x={x}
                        y={padTop + plotHeight + 20}
                        textAnchor="middle"
                        className={`text-[10px] font-sans ${
                          isToday
                            ? 'fill-[#059669] dark:fill-emerald-400 font-bold'
                            : 'fill-[#7D766C] dark:fill-slate-400 font-medium'
                        }`}
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {/* Energy Trend Line */}
                {energyPath && (
                  <path
                    d={energyPath}
                    fill="none"
                    stroke="url(#energyLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Valid Energy Data Point Circles */}
                {validEnergyPoints.map((pt) => {
                  const x = getX(pt.timelineIndex);
                  const y = getYEnergy(pt.energyLevel as number);
                  const isHovered = hoveredPoint?.dateStr === pt.dateStr;

                  return (
                    <g
                      key={pt.dateStr}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredPoint({
                          dateStr: pt.dateStr,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          mood: pt.moodType,
                          moodScore: pt.moodScore,
                          energy: pt.energyLevel,
                          content: pt.content,
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => {
                        if (onSelectDateToEdit) {
                          onSelectDateToEdit(pt.dateStr);
                        }
                      }}
                    >
                      {/* Pulse ring if hovered */}
                      {isHovered && (
                        <circle
                          cx={x}
                          cy={y}
                          r="10"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          opacity="0.6"
                          className="animate-ping"
                        />
                      )}
                      {/* Outer circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6.5 : 5}
                        fill="#FFFFFF"
                        stroke="#D97706"
                        strokeWidth="2"
                        className="transition-all"
                      />
                      {/* Inner gold dot */}
                      <circle cx={x} cy={y} r={isHovered ? 4 : 3} fill="#F59E0B" />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 5. GRAPH 3: MOOD DISTRIBUTION BAR GRAPH */}
      {(displayMode === 'all' || displayMode === 'distribution') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#5B8266]" />
                  Mood Distribution Breakdown
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 border border-[#ECE6DC] dark:border-slate-600 font-semibold">
                  Exact Day Counts
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                Frequency of each emotional state across the {summaryStats.moodDays} logged days in this timeframe.
              </p>
            </div>

            <div className="text-xs text-[#8C8377] dark:text-slate-400">
              Total Logged: <strong className="text-[#2D2A26] dark:text-white">{summaryStats.moodDays} days</strong>
            </div>
          </div>

          {/* Distribution Bars */}
          <div className="space-y-3.5 pt-2">
            {summaryStats.distribution.map((item) => {
              const barColorClass =
                item.type === 'excellent'
                  ? 'bg-violet-500 dark:bg-violet-400'
                  : item.type === 'great'
                  ? 'bg-teal-500 dark:bg-teal-400'
                  : item.type === 'good'
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : item.type === 'okay'
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : item.type === 'low'
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-rose-500 dark:bg-rose-400';

              const badgeBg =
                item.type === 'excellent'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                  : item.type === 'great'
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                  : item.type === 'good'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : item.type === 'okay'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : item.type === 'low'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';

              return (
                <div key={item.type} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.emoji}</span>
                      <span className="font-serif font-bold text-[#2D2A26] dark:text-white">
                        {item.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeBg}`}>
                        Score: {item.score}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-[#2D2A26] dark:text-white">
                        {item.count} {item.count === 1 ? 'day' : 'days'}
                      </span>
                      <span className="text-[#8C8377] dark:text-slate-400 w-10 text-right">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="h-3.5 w-full bg-[#FAF8F5] dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-[#ECE6DC] dark:border-slate-600">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                      style={{
                        width: `${item.count > 0 ? Math.max(item.percentage, 3) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card on Hover */}
      {hoveredPoint && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#2D2A26] text-white p-3.5 rounded-2xl shadow-xl border border-white/10 max-w-xs text-xs backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/15">
              <span className="font-serif font-bold text-sm text-white">
                {formatFullDateDisplay(hoveredPoint.dateStr)}
              </span>
              {hoveredPoint.dateStr === todayStr && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  Today
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1.5">
              {hoveredPoint.mood ? (
                <div className="flex items-center gap-2">
                  <span className="text-base">{getMoodMeta(hoveredPoint.mood).emoji}</span>
                  <span className="font-bold text-white">
                    {getMoodMeta(hoveredPoint.mood).label}
                  </span>
                  <span className="text-white/70">
                    (Level {hoveredPoint.moodScore} / 6)
                  </span>
                </div>
              ) : (
                <div className="text-white/60 italic">No mood logged</div>
              )}

              {hoveredPoint.energy && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">⚡ Energy:</span>
                  <span className="font-bold text-white">{hoveredPoint.energy} / 5</span>
                  <span>{'⭐'.repeat(hoveredPoint.energy)}</span>
                </div>
              )}

              {hoveredPoint.content && (
                <div className="mt-2 pt-2 border-t border-white/10 text-white/80 italic line-clamp-3">
                  "{hoveredPoint.content}"
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-white/50 text-right">
              Click node to inspect or edit
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
