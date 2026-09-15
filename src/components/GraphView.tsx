import React, { useState, useMemo, useRef } from 'react';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Circle,
  Flame,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Check,
  Layers,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { Habit, HabitCategory } from '../types';
import { MONTH_NAMES, WEEKDAYS, getDaysInMonth, formatDateKey, getDayOfWeek, isSameDay } from '../utils/date';
import { getCategoryMeta, CATEGORIES_META } from '../utils/categories';
import { getHabitOpportunities, getDayProgress, isHabitScheduledOnDate } from '../utils/scheduler';

interface GraphViewProps {
  habits: Habit[];
  entries: Record<string, boolean>; // key: `${habit_id}_${date}`
  currentMonth: number; // 1-12
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
  onToggleEntry: (habitId: string, dateStr: string, currentCompleted: boolean) => void;
  onSelectHabit?: (habit: Habit) => void;
  streakDays: number;
  bestStreakDays: number;
  habitStreaks?: Record<string, { current: number; best: number; totalCompletions: number }>;
}

type Timeframe = '7d' | '14d' | '30d' | '90d' | 'month' | 'year';
type GraphMode = 'trend' | 'compare' | 'cumulative' | 'rhythm' | 'category';

const HABIT_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
];

export const GraphView: React.FC<GraphViewProps> = ({
  habits,
  entries,
  currentMonth,
  currentYear,
  onMonthChange,
  onToggleEntry,
  onSelectHabit,
  streakDays,
  bestStreakDays,
  habitStreaks,
}) => {
  // Navigation & filter states
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [graphMode, setGraphMode] = useState<GraphMode>('trend');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  const [showTargetBenchmark, setShowTargetBenchmark] = useState<boolean>(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [pinnedDateStr, setPinnedDateStr] = useState<string | null>(null);

  // For multi-habit comparison: which habits are active on the graph
  const activeHabits = useMemo(
    () => habits.filter((h) => (h.status || 'active') === 'active'),
    [habits]
  );

  const [visibleCompareHabitIds, setVisibleCompareHabitIds] = useState<Set<string>>(() => {
    return new Set(activeHabits.slice(0, 5).map((h) => h.id));
  });

  // Ensure newly added habits have a visible state if none selected
  const habitColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeHabits.forEach((h, idx) => {
      map[h.id] = HABIT_COLORS[idx % HABIT_COLORS.length];
    });
    return map;
  }, [activeHabits]);

  // Filtered habits according to category
  const filteredHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      if (selectedCategory !== 'all' && h.category !== selectedCategory) return false;
      if (selectedHabitId !== 'all' && h.id !== selectedHabitId) return false;
      return true;
    });
  }, [activeHabits, selectedCategory, selectedHabitId]);

  // ----------------------------------------------------
  // Generate date list based on selected timeframe
  // ----------------------------------------------------
  const dateList = useMemo(() => {
    const dates: Array<{
      dateStr: string;
      label: string;
      shortLabel: string;
      dayOfWeek: number;
      dayNum: number;
      monthNum: number;
      yearNum: number;
      isToday: boolean;
    }> = [];

    const now = new Date();
    const todayStr = formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if (timeframe === 'month') {
      const days = getDaysInMonth(currentYear, currentMonth);
      for (let d = 1; d <= days; d++) {
        const dStr = formatDateKey(currentYear, currentMonth, d);
        const dateObj = new Date(currentYear, currentMonth - 1, d);
        dates.push({
          dateStr: dStr,
          label: `${MONTH_NAMES[currentMonth - 1].slice(0, 3)} ${d}`,
          shortLabel: `${d}`,
          dayOfWeek: dateObj.getDay(),
          dayNum: d,
          monthNum: currentMonth,
          yearNum: currentYear,
          isToday: dStr === todayStr,
        });
      }
      return dates;
    }

    let dayCount = 30;
    if (timeframe === '7d') dayCount = 7;
    if (timeframe === '14d') dayCount = 14;
    if (timeframe === '30d') dayCount = 30;
    if (timeframe === '90d') dayCount = 90;
    if (timeframe === 'year') dayCount = 365;

    for (let i = dayCount - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth() + 1;
      const d = targetDate.getDate();
      const dStr = formatDateKey(y, m, d);

      dates.push({
        dateStr: dStr,
        label: `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`,
        shortLabel: dayCount <= 14 ? WEEKDAYS[targetDate.getDay()].slice(0, 3) : `${d}`,
        dayOfWeek: targetDate.getDay(),
        dayNum: d,
        monthNum: m,
        yearNum: y,
        isToday: dStr === todayStr,
      });
    }

    return dates;
  }, [timeframe, currentMonth, currentYear]);

  // ----------------------------------------------------
  // Calculate daily data points for trend & cumulative
  // ----------------------------------------------------
  const trendData = useMemo(() => {
    let runningCumulative = 0;

    const points = dateList.map((item, index) => {
      // Calculate daily stats for filtered habits
      const targetHabits = filteredHabits.length > 0 ? filteredHabits : activeHabits;
      let scheduledCount = 0;
      let completedCount = 0;

      targetHabits.forEach((h) => {
        if (isHabitScheduledOnDate(h, item.dateStr)) {
          scheduledCount++;
          if (entries[`${h.id}_${item.dateStr}`]) {
            completedCount++;
          }
        }
      });

      const percentage = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
      runningCumulative += completedCount;

      return {
        ...item,
        index,
        scheduledCount,
        completedCount,
        percentage,
        cumulative: runningCumulative,
      };
    });

    // Compute 7-day rolling moving average for the percentage
    const withMovingAvg = points.map((pt, idx) => {
      const windowStart = Math.max(0, idx - 6);
      const windowSlice = points.slice(windowStart, idx + 1);
      const avgPct =
        windowSlice.length > 0
          ? Math.round(windowSlice.reduce((sum, p) => sum + p.percentage, 0) / windowSlice.length)
          : pt.percentage;

      return {
        ...pt,
        movingAvg: avgPct,
      };
    });

    return withMovingAvg;
  }, [dateList, filteredHabits, activeHabits, entries]);

  // ----------------------------------------------------
  // Calculate Multi-Habit comparison data
  // ----------------------------------------------------
  const compareData = useMemo(() => {
    return activeHabits.map((habit) => {
      const habitPoints = dateList.map((item) => {
        const isScheduled = isHabitScheduledOnDate(habit, item.dateStr);
        const isDone = Boolean(entries[`${habit.id}_${item.dateStr}`]);
        return {
          dateStr: item.dateStr,
          isScheduled,
          isDone,
        };
      });

      // Calculate rolling 7-day consistency or total completed in range
      const totalOpportunities = habitPoints.filter((p) => p.isScheduled).length;
      const totalDone = habitPoints.filter((p) => p.isDone).length;
      const consistencyPct =
        totalOpportunities > 0 ? Math.round((totalDone / totalOpportunities) * 100) : 0;

      return {
        habit,
        color: habitColorMap[habit.id] || '#10B981',
        points: habitPoints,
        totalOpportunities,
        totalDone,
        consistencyPct,
      };
    });
  }, [activeHabits, dateList, entries, habitColorMap]);

  // ----------------------------------------------------
  // Day of Week Rhythm Bar Chart Data
  // ----------------------------------------------------
  const rhythmData = useMemo(() => {
    const days = [
      { name: 'Sun', full: 'Sunday', completed: 0, scheduled: 0 },
      { name: 'Mon', full: 'Monday', completed: 0, scheduled: 0 },
      { name: 'Tue', full: 'Tuesday', completed: 0, scheduled: 0 },
      { name: 'Wed', full: 'Wednesday', completed: 0, scheduled: 0 },
      { name: 'Thu', full: 'Thursday', completed: 0, scheduled: 0 },
      { name: 'Fri', full: 'Friday', completed: 0, scheduled: 0 },
      { name: 'Sat', full: 'Saturday', completed: 0, scheduled: 0 },
    ];

    trendData.forEach((pt) => {
      days[pt.dayOfWeek].completed += pt.completedCount;
      days[pt.dayOfWeek].scheduled += pt.scheduledCount;
    });

    const withPercentages = days.map((d) => ({
      ...d,
      pct: d.scheduled > 0 ? Math.round((d.completed / d.scheduled) * 100) : 0,
    }));

    // Find highest & lowest
    let highest = withPercentages[0];
    let lowest = withPercentages[0];
    withPercentages.forEach((d) => {
      if (d.pct > highest.pct) highest = d;
      if (d.pct < lowest.pct && d.scheduled > 0) lowest = d;
    });

    return {
      days: withPercentages,
      highest,
      lowest,
    };
  }, [trendData]);

  // ----------------------------------------------------
  // Category Breakdown Data
  // ----------------------------------------------------
  const categoryData = useMemo(() => {
    const catMap: Record<string, { completed: number; scheduled: number; count: number }> = {};

    activeHabits.forEach((h) => {
      const cat = h.category || 'general';
      if (!catMap[cat]) {
        catMap[cat] = { completed: 0, scheduled: 0, count: 0 };
      }
      catMap[cat].count++;
    });

    dateList.forEach((item) => {
      activeHabits.forEach((h) => {
        const cat = h.category || 'general';
        if (isHabitScheduledOnDate(h, item.dateStr)) {
          catMap[cat].scheduled++;
          if (entries[`${h.id}_${item.dateStr}`]) {
            catMap[cat].completed++;
          }
        }
      });
    });

    const list = Object.keys(catMap).map((cat) => {
      const item = catMap[cat];
      const pct = item.scheduled > 0 ? Math.round((item.completed / item.scheduled) * 100) : 0;
      const meta = getCategoryMeta(cat);
      return {
        category: cat,
        meta,
        completed: item.completed,
        scheduled: item.scheduled,
        pct,
        count: item.count,
      };
    });

    const totalCompleted = list.reduce((sum, c) => sum + c.completed, 0);

    return {
      list: list.sort((a, b) => b.pct - a.pct),
      totalCompleted,
    };
  }, [activeHabits, dateList, entries]);

  // ----------------------------------------------------
  // Aggregate Metrics for Selected Range
  // ----------------------------------------------------
  const summaryMetrics = useMemo(() => {
    const totalScheduled = trendData.reduce((acc, p) => acc + p.scheduledCount, 0);
    const totalCompleted = trendData.reduce((acc, p) => acc + p.completedCount, 0);
    const avgPercentage =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    // Peak day
    let peakDay = trendData[0] || null;
    trendData.forEach((p) => {
      if (peakDay && p.percentage > peakDay.percentage && p.scheduledCount > 0) {
        peakDay = p;
      }
    });

    // Momentum (comparing last half vs first half of trend)
    const mid = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, mid);
    const secondHalf = trendData.slice(mid);

    const firstSum = firstHalf.reduce((s, p) => s + p.completedCount, 0);
    const firstPoss = firstHalf.reduce((s, p) => s + p.scheduledCount, 0);
    const firstPct = firstPoss > 0 ? Math.round((firstSum / firstPoss) * 100) : 0;

    const secondSum = secondHalf.reduce((s, p) => s + p.completedCount, 0);
    const secondPoss = secondHalf.reduce((s, p) => s + p.scheduledCount, 0);
    const secondPct = secondPoss > 0 ? Math.round((secondSum / secondPoss) * 100) : 0;

    const delta = secondPct - firstPct;

    return {
      totalScheduled,
      totalCompleted,
      avgPercentage,
      peakDay,
      delta,
      momentum:
        delta > 3 ? 'accelerating' : delta < -3 ? 'declining' : 'steady',
    };
  }, [trendData]);

  // Selected or active point for inspection
  const activeInspectionDateStr =
    pinnedDateStr ||
    (hoveredPointIndex !== null && trendData[hoveredPointIndex]
      ? trendData[hoveredPointIndex].dateStr
      : trendData[trendData.length - 1]?.dateStr);

  const activeDayHabits = useMemo(() => {
    if (!activeInspectionDateStr) return [];
    return activeHabits.map((h) => {
      const scheduled = isHabitScheduledOnDate(h, activeInspectionDateStr);
      const completed = Boolean(entries[`${h.id}_${activeInspectionDateStr}`]);
      return {
        habit: h,
        scheduled,
        completed,
      };
    });
  }, [activeInspectionDateStr, activeHabits, entries]);

  // ----------------------------------------------------
  // SVG Chart Geometry Constants & Math
  // ----------------------------------------------------
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;

  // X & Y scalers
  const getX = (index: number) => {
    if (trendData.length <= 1) return paddingLeft + chartInnerWidth / 2;
    return paddingLeft + (index / (trendData.length - 1)) * chartInnerWidth;
  };

  const getYPercent = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return paddingTop + chartInnerHeight - (clamped / 100) * chartInnerHeight;
  };

  const maxCumulative = useMemo(() => {
    const last = trendData[trendData.length - 1]?.cumulative || 10;
    return Math.max(10, Math.ceil(last * 1.15));
  }, [trendData]);

  const getYCumulative = (val: number) => {
    return paddingTop + chartInnerHeight - (val / maxCumulative) * chartInnerHeight;
  };

  // Build SVG path using Catmull-Rom or cubic Bezier smoothing
  const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Path data for trend line
  const trendLinePoints = trendData.map((pt, i) => ({
    x: getX(i),
    y: getYPercent(pt.percentage),
  }));
  const trendPathD = buildSmoothPath(trendLinePoints);

  // Area under trend path
  const trendAreaD = trendLinePoints.length > 0
    ? `${trendPathD} L ${trendLinePoints[trendLinePoints.length - 1].x} ${paddingTop + chartInnerHeight} L ${trendLinePoints[0].x} ${paddingTop + chartInnerHeight} Z`
    : '';

  // Moving average line points
  const movingAvgPoints = trendData.map((pt, i) => ({
    x: getX(i),
    y: getYPercent(pt.movingAvg),
  }));
  const movingAvgPathD = buildSmoothPath(movingAvgPoints);

  // Cumulative line points
  const cumulativePoints = trendData.map((pt, i) => ({
    x: getX(i),
    y: getYCumulative(pt.cumulative),
  }));
  const cumulativePathD = buildSmoothPath(cumulativePoints);
  const cumulativeAreaD = cumulativePoints.length > 0
    ? `${cumulativePathD} L ${cumulativePoints[cumulativePoints.length - 1].x} ${paddingTop + chartInnerHeight} L ${cumulativePoints[0].x} ${paddingTop + chartInnerHeight} Z`
    : '';

  // Toggle habit visibility in compare mode
  const toggleCompareHabit = (id: string) => {
    setVisibleCompareHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Month navigation handlers
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

  // Active hover data point
  const activeHoverPoint =
    hoveredPointIndex !== null ? trendData[hoveredPointIndex] : null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Toolbar & Controls */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/40 text-[#3D6B4E] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800 flex items-center justify-center shadow-2xs">
              <LineChartIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight">
                  Graph View & Trends
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] dark:bg-slate-700 text-[#7D766C] dark:text-slate-300 px-2 py-0.5 rounded-full border border-[#E5DFD5] dark:border-slate-600">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
                Visual completion curves, comparative habit trajectories, and compounding consistency
              </p>
            </div>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center flex-wrap gap-1.5 bg-[#FAF8F5] dark:bg-slate-900/60 p-1.5 rounded-2xl border border-[#E5DFD5] dark:border-slate-700">
            {(
              [
                { id: '7d', label: '7D' },
                { id: '14d', label: '14D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'month', label: 'Month' },
                { id: 'year', label: 'Year' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === t.id
                    ? 'bg-[#5B8266] text-white shadow-2xs'
                    : 'text-[#635B50] dark:text-slate-300 hover:bg-[#FFFFFF] dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Bar: Mode Selector & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F0EBE1] dark:border-slate-700/60">
          {/* Graph Visualization Modes */}
          <div className="flex items-center flex-wrap gap-1 sm:gap-1.5">
            <button
              id="graph-mode-trend"
              type="button"
              onClick={() => setGraphMode('trend')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                graphMode === 'trend'
                  ? 'bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Completion Trend</span>
            </button>

            <button
              id="graph-mode-compare"
              type="button"
              onClick={() => setGraphMode('compare')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                graphMode === 'compare'
                  ? 'bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compare Habits</span>
            </button>

            <button
              id="graph-mode-cumulative"
              type="button"
              onClick={() => setGraphMode('cumulative')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                graphMode === 'cumulative'
                  ? 'bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Compounding Growth</span>
            </button>

            <button
              id="graph-mode-rhythm"
              type="button"
              onClick={() => setGraphMode('rhythm')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                graphMode === 'rhythm'
                  ? 'bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Day Rhythm</span>
            </button>

            <button
              id="graph-mode-category"
              type="button"
              onClick={() => setGraphMode('category')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                graphMode === 'category'
                  ? 'bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-700 text-[#736A5E] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>
          </div>

          {/* Month Stepper when Timeframe === 'month' */}
          {timeframe === 'month' && (
            <div className="flex items-center gap-1 bg-[#FAF8F5] dark:bg-slate-900/60 p-1 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-[#5C554B] dark:text-slate-300 hover:bg-[#FFFFFF] dark:hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-serif font-bold text-[#2D2A26] dark:text-white px-2">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-[#5C554B] dark:text-slate-300 hover:bg-[#FFFFFF] dark:hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Summary Metric Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Completion % */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Consistency</span>
            <Sparkles className="w-4 h-4 text-[#5B8266]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {summaryMetrics.avgPercentage}%
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                summaryMetrics.avgPercentage >= 80
                  ? 'bg-[#EBF3EE] text-[#2C523A] dark:bg-emerald-950/50 dark:text-emerald-300'
                  : summaryMetrics.avgPercentage >= 50
                  ? 'bg-[#FEF6E8] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-[#FDF2F0] text-[#991B1B] dark:bg-rose-950/50 dark:text-rose-300'
              }`}
            >
              {summaryMetrics.avgPercentage >= 80
                ? 'High Momentum'
                : summaryMetrics.avgPercentage >= 50
                ? 'Building'
                : 'Getting Started'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            Across {trendData.length} days in selected view
          </p>
        </div>

        {/* Total Logged Checks */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completions</span>
            <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {summaryMetrics.totalCompleted}
            </span>
            <span className="text-xs text-[#8C8377] dark:text-slate-400">
              / {summaryMetrics.totalScheduled} scheduled
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            Atomic habit repetitions logged
          </p>
        </div>

        {/* 7-Day Momentum Trajectory */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Momentum Trend</span>
            {summaryMetrics.delta >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-[#5B8266]" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-[#C05746]" />
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-serif font-bold ${
                summaryMetrics.delta > 0
                  ? 'text-[#5B8266]'
                  : summaryMetrics.delta < 0
                  ? 'text-[#C05746]'
                  : 'text-[#2D2A26] dark:text-white'
              }`}
            >
              {summaryMetrics.delta > 0 ? `+${summaryMetrics.delta}%` : `${summaryMetrics.delta}%`}
            </span>
            <span className="text-xs font-semibold text-[#8C8377] dark:text-slate-400">
              vs prior period
            </span>
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            {summaryMetrics.delta > 0
              ? 'Consistency trajectory accelerating'
              : summaryMetrics.delta < 0
              ? 'Slight drop in recent habits'
              : 'Maintaining stable consistency'}
          </p>
        </div>

        {/* Peak Performance Day */}
        <div className="bg-[#FFFFFF] dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8377] dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Best Day</span>
            <Flame className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white">
              {summaryMetrics.peakDay ? summaryMetrics.peakDay.label : '—'}
            </span>
            {summaryMetrics.peakDay && (
              <span className="text-xs font-bold text-[#D97706]">
                {summaryMetrics.peakDay.percentage}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-1">
            {summaryMetrics.peakDay
              ? `${summaryMetrics.peakDay.completedCount} of ${summaryMetrics.peakDay.scheduledCount} habits completed`
              : 'Keep logging daily habits'}
          </p>
        </div>
      </div>

      {/* 3. MAIN GRAPH CANVAS SECTION */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
        {/* Top Graph Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
              {graphMode === 'trend' && 'Daily Habit Completion Rate'}
              {graphMode === 'compare' && 'Multi-Habit Comparative Trajectories'}
              {graphMode === 'cumulative' && 'Compounding Habit Growth (Cumulative Checks)'}
              {graphMode === 'rhythm' && 'Day-of-Week Habit Rhythm'}
              {graphMode === 'category' && 'Category Completion Breakdown'}
            </h3>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-0.5">
              {graphMode === 'trend' &&
                'Track your daily completion percentage over time with optional 7-day smoothing'}
              {graphMode === 'compare' &&
                'Compare multiple habits on the same scale to see which habits thrive together'}
              {graphMode === 'cumulative' &&
                'Visualize your cumulative consistency accumulating like compound interest'}
              {graphMode === 'rhythm' &&
                'Identify your most productive days vs days requiring extra discipline'}
              {graphMode === 'category' &&
                'Compare health, career, learning, personal, and finance habit execution'}
            </p>
          </div>

          {/* Graph Specific Toggles */}
          {graphMode === 'trend' && (
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-[#5C554B] dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showMovingAverage}
                  onChange={(e) => setShowMovingAverage(e.target.checked)}
                  className="rounded text-[#5B8266] focus:ring-0 cursor-pointer"
                />
                <span className="inline-block w-2.5 h-0.5 bg-[#3B82F6] rounded" />
                <span>7-Day Moving Avg</span>
              </label>

              <label className="flex items-center gap-1.5 text-[#5C554B] dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTargetBenchmark}
                  onChange={(e) => setShowTargetBenchmark(e.target.checked)}
                  className="rounded text-[#5B8266] focus:ring-0 cursor-pointer"
                />
                <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-[#F59E0B]" />
                <span>80% Goal</span>
              </label>
            </div>
          )}

          {/* Filter dropdown for single habit or category in Trend / Cumulative */}
          {(graphMode === 'trend' || graphMode === 'cumulative') && (
            <div className="flex items-center gap-2">
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#4A453E] dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">All Habits (Combined)</option>
                {activeHabits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#4A453E] dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">All Categories</option>
                {Object.values(CATEGORIES_META).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* GRAPH 1: TREND (Daily % with smooth Bezier + 7D avg)  */}
        {/* ---------------------------------------------------- */}
        {graphMode === 'trend' && (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none overflow-visible"
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8266" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5B8266" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = getYPercent(pct);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#F0EBE1] dark:text-slate-700"
                      strokeWidth="1"
                      strokeDasharray={pct === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-[#8C8377] dark:fill-slate-400 font-medium"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* 80% Consistency Goal Benchmark Line */}
              {showTargetBenchmark && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={getYPercent(80)}
                    x2={svgWidth - paddingRight}
                    y2={getYPercent(80)}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.75"
                  />
                  <text
                    x={svgWidth - paddingRight}
                    y={getYPercent(80) - 5}
                    textAnchor="end"
                    className="text-[9px] fill-[#D97706] font-bold"
                  >
                    Target 80%
                  </text>
                </g>
              )}

              {/* Area fill under trend curve */}
              {trendAreaD && <path d={trendAreaD} fill="url(#trendGradient)" />}

              {/* 7-Day Moving Average Line */}
              {showMovingAverage && movingAvgPathD && (
                <path
                  d={movingAvgPathD}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
              )}

              {/* Main Trend Line */}
              {trendPathD && (
                <path
                  d={trendPathD}
                  fill="none"
                  stroke="#5B8266"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X Axis Date Labels */}
              {trendData.map((pt, i) => {
                // Show label every N items depending on total points
                const step = trendData.length > 30 ? 7 : trendData.length > 14 ? 3 : 1;
                const showLabel = i % step === 0 || i === trendData.length - 1;
                const x = getX(i);

                return (
                  <g key={pt.dateStr}>
                    {showLabel && (
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className={`text-[9px] font-medium ${
                          pt.isToday
                            ? 'fill-[#5B8266] font-bold'
                            : 'fill-[#8C8377] dark:fill-slate-400'
                        }`}
                      >
                        {pt.shortLabel}
                      </text>
                    )}

                    {/* Interactive hover zone & dot */}
                    <circle
                      cx={x}
                      cy={getYPercent(pt.percentage)}
                      r={hoveredPointIndex === i ? 6 : pt.isToday ? 4 : 2.5}
                      className={`transition-all duration-150 ${
                        hoveredPointIndex === i
                          ? 'fill-[#5B8266] stroke-4 stroke-white dark:stroke-slate-800'
                          : pt.percentage >= 80
                          ? 'fill-[#5B8266]'
                          : pt.percentage > 0
                          ? 'fill-[#8FB89A]'
                          : 'fill-[#D5CDBD] dark:fill-slate-600'
                      }`}
                    />

                    {/* Invisible hover trigger column */}
                    <rect
                      x={x - (chartInnerWidth / trendData.length) / 2}
                      y={paddingTop}
                      width={Math.max(12, chartInnerWidth / trendData.length)}
                      height={chartInnerHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onClick={() => setPinnedDateStr(pt.dateStr)}
                    />
                  </g>
                );
              })}

              {/* Vertical Crosshair Line on Hover */}
              {hoveredPointIndex !== null && trendData[hoveredPointIndex] && (
                <g>
                  <line
                    x1={getX(hoveredPointIndex)}
                    y1={paddingTop}
                    x2={getX(hoveredPointIndex)}
                    y2={paddingTop + chartInnerHeight}
                    stroke="#5B8266"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  {/* Floating tooltip badge */}
                  <g
                    transform={`translate(${Math.min(
                      svgWidth - 110,
                      Math.max(50, getX(hoveredPointIndex))
                    )}, ${Math.max(20, getYPercent(trendData[hoveredPointIndex].percentage) - 30)})`}
                  >
                    <rect
                      x="-45"
                      y="-16"
                      width="90"
                      height="26"
                      rx="8"
                      className="fill-[#2D2A26] dark:fill-slate-900 shadow-md"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      className="text-[10px] fill-white font-bold"
                    >
                      {trendData[hoveredPointIndex].percentage}% ({trendData[hoveredPointIndex].completedCount}/{trendData[hoveredPointIndex].scheduledCount})
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* GRAPH 2: MULTI-HABIT COMPARISON (Color-coded lines)  */}
        {/* ---------------------------------------------------- */}
        {graphMode === 'compare' && (
          <div className="space-y-4">
            {/* Interactive Habit Legend Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <span className="text-xs font-semibold text-[#8C8377] dark:text-slate-400 mr-1">
                Toggle Habits:
              </span>
              {compareData.map(({ habit, color, consistencyPct }) => {
                const isVisible = visibleCompareHabitIds.has(habit.id);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => toggleCompareHabit(habit.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isVisible
                        ? 'bg-[#FFFFFF] dark:bg-slate-700 shadow-2xs border-[#D5DFD8] dark:border-slate-600 text-[#2D2A26] dark:text-white'
                        : 'opacity-40 bg-[#FAF8F5] dark:bg-slate-800 border-transparent text-[#8C8377]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate max-w-[120px]">{habit.name}</span>
                    <span className="text-[10px] text-[#8C8377] dark:text-slate-400">
                      {consistencyPct}%
                    </span>
                  </button>
                );
              })}
            </div>

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none overflow-visible"
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              {/* Horizontal Grid */}
              {[0, 50, 100].map((pct) => {
                const y = getYPercent(pct);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#F0EBE1] dark:text-slate-700"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-[#8C8377] dark:fill-slate-400 font-medium"
                    >
                      {pct === 100 ? 'Done' : pct === 0 ? 'Missed' : ''}
                    </text>
                  </g>
                );
              })}

              {/* Render lines for each enabled habit */}
              {compareData
                .filter(({ habit }) => visibleCompareHabitIds.has(habit.id))
                .map(({ habit, color, points }) => {
                  // Compute rolling 7-day or status curve
                  const linePts = points.map((p, i) => {
                    const x = getX(i);
                    const y = getYPercent(p.isDone ? 100 : p.isScheduled ? 0 : 50);
                    return { x, y };
                  });

                  const pathD = buildSmoothPath(linePts);

                  return (
                    <g key={habit.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.85"
                      />
                      {linePts.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPointIndex === i ? 4 : 2}
                          fill={color}
                        />
                      ))}
                    </g>
                  );
                })}

              {/* X Axis Dates */}
              {trendData.map((pt, i) => {
                const step = trendData.length > 30 ? 7 : trendData.length > 14 ? 3 : 1;
                const showLabel = i % step === 0 || i === trendData.length - 1;
                const x = getX(i);

                return (
                  <g key={pt.dateStr}>
                    {showLabel && (
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className="text-[9px] fill-[#8C8377] dark:fill-slate-400 font-medium"
                      >
                        {pt.shortLabel}
                      </text>
                    )}

                    <rect
                      x={x - (chartInnerWidth / trendData.length) / 2}
                      y={paddingTop}
                      width={Math.max(12, chartInnerWidth / trendData.length)}
                      height={chartInnerHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onClick={() => setPinnedDateStr(pt.dateStr)}
                    />
                  </g>
                );
              })}

              {hoveredPointIndex !== null && (
                <line
                  x1={getX(hoveredPointIndex)}
                  y1={paddingTop}
                  x2={getX(hoveredPointIndex)}
                  y2={paddingTop + chartInnerHeight}
                  stroke="#8C8377"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
            </svg>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* GRAPH 3: CUMULATIVE HABIT CHECKS (Atomic Growth)     */}
        {/* ---------------------------------------------------- */}
        {graphMode === 'cumulative' && (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none overflow-visible"
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              <defs>
                <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal steps */}
              {[0, Math.round(maxCumulative / 2), maxCumulative].map((val) => {
                const y = getYCumulative(val);
                return (
                  <g key={val}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#F0EBE1] dark:text-slate-700"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-[#8C8377] dark:fill-slate-400 font-medium"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area & Line */}
              {cumulativeAreaD && <path d={cumulativeAreaD} fill="url(#cumulativeGrad)" />}
              {cumulativePathD && (
                <path
                  d={cumulativePathD}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Points */}
              {trendData.map((pt, i) => {
                const x = getX(i);
                const y = getYCumulative(pt.cumulative);
                const step = trendData.length > 30 ? 7 : 3;
                const showLabel = i % step === 0 || i === trendData.length - 1;

                return (
                  <g key={pt.dateStr}>
                    {showLabel && (
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className="text-[9px] fill-[#8C8377] dark:fill-slate-400 font-medium"
                      >
                        {pt.shortLabel}
                      </text>
                    )}

                    <circle
                      cx={x}
                      cy={y}
                      r={hoveredPointIndex === i ? 6 : 3}
                      className={
                        hoveredPointIndex === i
                          ? 'fill-[#3B82F6] stroke-3 stroke-white dark:stroke-slate-800'
                          : 'fill-[#3B82F6]'
                      }
                    />

                    <rect
                      x={x - (chartInnerWidth / trendData.length) / 2}
                      y={paddingTop}
                      width={Math.max(12, chartInnerWidth / trendData.length)}
                      height={chartInnerHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onClick={() => setPinnedDateStr(pt.dateStr)}
                    />
                  </g>
                );
              })}

              {/* Hover Tooltip */}
              {hoveredPointIndex !== null && trendData[hoveredPointIndex] && (
                <g
                  transform={`translate(${Math.min(
                    svgWidth - 90,
                    Math.max(50, getX(hoveredPointIndex))
                  )}, ${Math.max(20, getYCumulative(trendData[hoveredPointIndex].cumulative) - 30)})`}
                >
                  <rect
                    x="-45"
                    y="-16"
                    width="90"
                    height="24"
                    rx="8"
                    className="fill-[#1E3A8A] shadow-md"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    className="text-[10px] fill-white font-bold"
                  >
                    {trendData[hoveredPointIndex].cumulative} total checks
                  </text>
                </g>
              )}
            </svg>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* GRAPH 4: DAY OF WEEK RHYTHM BAR GRAPH                */}
        {/* ---------------------------------------------------- */}
        {graphMode === 'rhythm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {rhythmData.days.map((d) => {
                const isBest = d.name === rhythmData.highest.name;
                const isLowest = d.name === rhythmData.lowest.name;

                return (
                  <div
                    key={d.name}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                      isBest
                        ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border-[#C3DCC8] dark:border-emerald-800 shadow-2xs'
                        : isLowest
                        ? 'bg-[#FAF0E6] dark:bg-amber-950/40 border-[#ECDCCB] dark:border-amber-800'
                        : 'bg-[#FAF8F5] dark:bg-slate-700/60 border-[#E5DFD5] dark:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                      {d.name}
                    </span>
                    <span className="text-[10px] text-[#8C8377] dark:text-slate-400">
                      {d.completed}/{d.scheduled}
                    </span>

                    {/* Vertical Bar Container */}
                    <div className="w-full bg-[#E5DFD5] dark:bg-slate-600 h-28 rounded-xl my-2 relative overflow-hidden flex items-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isBest
                            ? 'bg-[#5B8266]'
                            : isLowest
                            ? 'bg-[#D97706]'
                            : 'bg-[#3B82F6]'
                        }`}
                        style={{ height: `${Math.max(6, d.pct)}%` }}
                      />
                    </div>

                    <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                      {d.pct}%
                    </span>

                    {isBest && (
                      <span className="text-[9px] font-bold text-[#2C523A] dark:text-emerald-300 mt-1 uppercase tracking-wider">
                        Peak
                      </span>
                    )}
                    {isLowest && !isBest && (
                      <span className="text-[9px] font-bold text-[#92400E] dark:text-amber-300 mt-1 uppercase tracking-wider">
                        Opportunity
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rhythm Insights Callout */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-700/40 border border-[#E5DFD5] dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#5B8266]" />
                <p className="text-xs text-[#5C554B] dark:text-slate-300">
                  Your peak power day is <strong>{rhythmData.highest.full}</strong> ({rhythmData.highest.pct}%). Your lowest consistency occurs on <strong>{rhythmData.lowest.full}</strong> ({rhythmData.lowest.pct}%).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* GRAPH 5: CATEGORY BREAKDOWN                          */}
        {/* ---------------------------------------------------- */}
        {graphMode === 'category' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryData.list.map((cat) => (
                <div
                  key={cat.category}
                  className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-700/50 border border-[#E5DFD5] dark:border-slate-600 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.meta.emoji}</span>
                      <div>
                        <h4 className="text-xs font-bold text-[#2D2A26] dark:text-white">
                          {cat.meta.label}
                        </h4>
                        <span className="text-[10px] text-[#8C8377] dark:text-slate-400">
                          {cat.count} habits • {cat.completed} checks
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
                      {cat.pct}%
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-[#E5DFD5] dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B8266] rounded-full transition-all duration-300"
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. DAY INSPECTOR PANEL (Connected directly to interactive logging!) */}
      {activeInspectionDateStr && (
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0EBE1] dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#5B8266]" />
              <h4 className="text-sm sm:text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                Day Inspector: {activeInspectionDateStr}
              </h4>
              {pinnedDateStr && (
                <button
                  type="button"
                  onClick={() => setPinnedDateStr(null)}
                  className="text-[10px] text-[#8C8377] dark:text-slate-400 hover:text-[#2D2A26] underline ml-2"
                >
                  Unpin
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7D766C] dark:text-slate-400">
                Click checkboxes below to toggle completion for this date:
              </span>
            </div>
          </div>

          {/* List of habits scheduled for this day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeDayHabits.map(({ habit, scheduled, completed }) => {
              const meta = getCategoryMeta(habit.category);
              return (
                <div
                  key={habit.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    completed
                      ? 'bg-[#F2F8F4] dark:bg-emerald-950/30 border-[#CDE5D4] dark:border-emerald-800'
                      : scheduled
                      ? 'bg-[#FAF8F5] dark:bg-slate-700/60 border-[#E5DFD5] dark:border-slate-600'
                      : 'opacity-50 bg-[#FAF8F5] dark:bg-slate-800 border-dashed border-[#E5DFD5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <button
                      type="button"
                      disabled={!scheduled}
                      onClick={() => onToggleEntry(habit.id, activeInspectionDateStr, completed)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        completed
                          ? 'bg-[#5B8266] text-white'
                          : scheduled
                          ? 'border border-[#C5BFB5] hover:border-[#5B8266]'
                          : 'border border-dashed border-[#D5CDBD] text-[#A8A196]'
                      }`}
                      title={scheduled ? 'Toggle completion' : 'Not scheduled for this day'}
                    >
                      {completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="truncate">
                      <span className="text-xs font-semibold text-[#2D2A26] dark:text-white truncate block">
                        {habit.name}
                      </span>
                      <span className="text-[10px] text-[#8C8377] dark:text-slate-400">
                        {meta.emoji} {meta.label} {!scheduled && '• Off day'}
                      </span>
                    </div>
                  </div>

                  {completed && (
                    <span className="text-[10px] font-bold text-[#5B8266] shrink-0">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
