import React, { useState, useMemo, useEffect } from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_OPTIONS, MOOD_TRACKER_MAP } from '../../types';
import { Sparkles, Calendar, TrendingUp, Zap, BarChart3, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES, formatDateKey } from '../../utils/date';

interface MoodAnalyticsViewProps {
  entries: MoodTrackerEntry[];
  currentMonth: number;
  currentYear: number;
  onMonthChange?: (month: number, year: number) => void;
}

export type AnalyticsRange = 'month' | '7d' | '30d' | '90d' | 'all' | 'custom';

export const MoodAnalyticsView: React.FC<MoodAnalyticsViewProps> = ({
  entries,
  currentMonth,
  currentYear,
  onMonthChange,
}) => {
  // Default to 'month' ("This Month")
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Custom date range state
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [customStart, setCustomStart] = useState<string>(
    formatDateKey(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth() + 1, thirtyDaysAgo.getDate())
  );
  const [customEnd, setCustomEnd] = useState<string>(
    formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
  );

  useEffect(() => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    let newM = selectedMonth - 1;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const handleNextMonth = () => {
    let newM = selectedMonth + 1;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const handleCurrentMonth = () => {
    const nowDate = new Date();
    const m = nowDate.getMonth() + 1;
    const y = nowDate.getFullYear();
    setSelectedMonth(m);
    setSelectedYear(y);
    if (onMonthChange) onMonthChange(m, y);
  };

  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    score: number;
    energy?: number;
    moodLabel: string;
    emoji: string;
    note?: string;
    x: number;
    y: number;
  } | null>(null);

  // Filter entries based on active range
  const filteredEntries = useMemo(() => {
    if (entries.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return entries
      .filter((e) => {
        if (!e.date) return false;
        const [y, m, d] = e.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d);

        if (range === 'month') {
          return y === selectedYear && m === selectedMonth;
        }
        if (range === 'custom') {
          if (customStart && e.date < customStart) return false;
          if (customEnd && e.date > customEnd) return false;
          return true;
        }
        if (range === '7d') {
          const diffDays = (today.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 7;
        }
        if (range === '30d') {
          const diffDays = (today.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 30;
        }
        if (range === '90d') {
          const diffDays = (today.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 90;
        }
        return true; // 'all'
      })
      .sort((a, b) => a.date.localeCompare(b.date)); // chronological order for line charts
  }, [entries, range, selectedMonth, selectedYear, customStart, customEnd]);

  // Distribution data
  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {
      very_low: 0,
      low: 0,
      okay: 0,
      good: 0,
      great: 0,
      excellent: 0,
    };

    filteredEntries.forEach((e) => {
      if (counts[e.mood] !== undefined) {
        counts[e.mood] += 1;
      }
    });

    const total = filteredEntries.length || 1;
    return MOOD_TRACKER_OPTIONS.map((opt) => ({
      ...opt,
      count: counts[opt.value] || 0,
      percentage: Math.round(((counts[opt.value] || 0) / total) * 100),
    }));
  }, [filteredEntries]);

  // Max count for distribution bar scaling
  const maxDistCount = Math.max(...distributionData.map((d) => d.count), 1);

  // Helper formatting for chart dates
  const formatChartDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    }
    return dateStr;
  };

  const hasData = filteredEntries.length > 0;

  // Chart dimensions
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingLeft = 90;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/40 border border-[#D5E5D9] dark:border-emerald-800 flex items-center justify-center text-[#5B8266] dark:text-emerald-300">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-[#2D2A26] dark:text-white">
              Mood Analytics & Patterns
            </h3>
            <p className="text-[11px] text-[#8C8377] dark:text-slate-400">
              Showing actual logs for {filteredEntries.length} {filteredEntries.length === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {/* Range Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* Monthly Filter Pill: "<" "This mon" ">" */}
          {range === 'month' ? (
            <div className="inline-flex items-center bg-[#2D2A26] dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-2xs overflow-hidden border border-[#2D2A26] dark:border-white">
              <button
                type="button"
                onClick={handlePrevMonth}
                id="analytics-prev-month-btn"
                title="Previous Month"
                aria-label="Previous Month"
                className="px-2 py-1.5 hover:bg-[#3E3A35] dark:hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                id="analytics-current-month-btn"
                title={
                  selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()
                    ? 'Viewing this month'
                    : 'Click to reset to this month'
                }
                className="px-2.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer hover:opacity-90 border-x border-white/20 dark:border-slate-800/20"
              >
                {selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()
                  ? 'This mon'
                  : `${MONTH_NAMES[selectedMonth - 1].slice(0, 3)} ${selectedYear}`}
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                id="analytics-next-month-btn"
                title="Next Month"
                aria-label="Next Month"
                className="px-2 py-1.5 hover:bg-[#3E3A35] dark:hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRange('month')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-[#FAF8F5] dark:bg-slate-750 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#ECE6DC] dark:border-slate-700"
            >
              This mon
            </button>
          )}

          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((p) => {
            const isActive = range === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setRange(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-750 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#ECE6DC] dark:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-bar: Monthly Navigator or Custom Range Pickers */}
      {range === 'month' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-slate-800/80 px-4 py-3 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
              className="p-1.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 text-[#2D2A26] dark:text-white border border-[#E5DFD5] dark:border-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-serif font-bold text-[#2D2A26] dark:text-white min-w-[130px] sm:min-w-[150px] text-center">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
              className="p-1.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 text-[#2D2A26] dark:text-white border border-[#E5DFD5] dark:border-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FFFFFF] dark:bg-slate-700 text-[#5B8266] dark:text-emerald-400 border border-[#E5DFD5] dark:border-slate-600 hover:bg-[#EBF3EE] dark:hover:bg-slate-650 transition-all cursor-pointer"
            >
              Current Month
            </button>
          </div>
          <span className="text-[11px] text-[#8C8377] dark:text-slate-400 font-medium">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} logged in {MONTH_NAMES[selectedMonth - 1]}
          </span>
        </div>
      )}

      {range === 'custom' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-slate-800/80 px-4 py-3 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <label className="flex items-center gap-1.5 text-[#5C554B] dark:text-slate-300 font-semibold">
              From:
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-[#FFFFFF] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#2D2A26] dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[#5C554B] dark:text-slate-300 font-semibold">
              To:
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-[#FFFFFF] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-[#2D2A26] dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 cursor-pointer"
              />
            </label>
          </div>
          <span className="text-[11px] text-[#8C8377] dark:text-slate-400 font-medium">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} in selected range
          </span>
        </div>
      )}

      {!hasData ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 mx-auto flex items-center justify-center text-2xl mb-3">
            📊
          </div>
          <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
            No Mood Records in this Range
          </h4>
          <p className="text-xs text-[#7D766C] dark:text-slate-400 max-w-sm mx-auto mt-1">
            Log your daily mood check-in to unlock trend lines and distribution insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Mood Trend (Line Chart 1-6) */}
          <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                  Line Chart
                </span>
                <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
                  Mood Trend (1–6 Scale)
                </h4>
              </div>
              <div className="text-right text-xs text-[#8C8377] dark:text-slate-400">
                Avg: <strong className="text-[#2D2A26] dark:text-slate-200">
                  {(
                    filteredEntries.reduce((a, b) => a + (b.mood_score || 4), 0) /
                    filteredEntries.length
                  ).toFixed(1)} / 6
                </strong>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[500px]"
              >
                {/* Horizontal Grid lines and Labels for 1 to 6 */}
                {[
                  { score: 6, label: '6 • 🤩 Excellent' },
                  { score: 5, label: '5 • 😄 Great' },
                  { score: 4, label: '4 • 🙂 Good' },
                  { score: 3, label: '3 • 😐 Okay' },
                  { score: 2, label: '2 • 😕 Low' },
                  { score: 1, label: '1 • 😞 Very Low' },
                ].map((row) => {
                  const y = paddingTop + graphHeight - ((row.score - 1) / 5) * graphHeight;
                  return (
                    <g key={row.score}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#ECE6DC"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        className="dark:stroke-slate-700"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#8C8377"
                        className="dark:fill-slate-400 font-medium"
                      >
                        {row.label}
                      </text>
                    </g>
                  );
                })}

                {/* Plot line */}
                {(() => {
                  const points = filteredEntries.map((e, idx) => {
                    const x =
                      filteredEntries.length === 1
                        ? paddingLeft + graphWidth / 2
                        : paddingLeft + (idx / (filteredEntries.length - 1)) * graphWidth;
                    const score = e.mood_score || 4;
                    const y = paddingTop + graphHeight - ((score - 1) / 5) * graphHeight;
                    return { x, y, entry: e };
                  });

                  const pathD = points.reduce((acc, p, i) => {
                    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  // Area fill
                  const areaD =
                    points.length > 1
                      ? `${pathD} L ${points[points.length - 1].x} ${
                          paddingTop + graphHeight
                        } L ${points[0].x} ${paddingTop + graphHeight} Z`
                      : '';

                  return (
                    <g>
                      {/* Gradient fill */}
                      <defs>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5B8266" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#5B8266" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {areaD && <path d={areaD} fill="url(#moodGradient)" />}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#5B8266"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points */}
                      {points.map((p, idx) => {
                        const meta = MOOD_TRACKER_MAP[p.entry.mood];
                        return (
                          <g
                            key={idx}
                            className="cursor-pointer group"
                            onMouseEnter={() =>
                              setHoveredPoint({
                                date: p.entry.date,
                                score: p.entry.mood_score || 4,
                                moodLabel: meta?.label || p.entry.mood,
                                emoji: meta?.emoji || '🙂',
                                note: p.entry.note,
                                x: p.x,
                                y: p.y,
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="5"
                              className="fill-[#5B8266] stroke-white dark:stroke-slate-800 transition-transform group-hover:scale-125"
                              strokeWidth="2"
                            />
                            {/* Date label along X axis */}
                            {(filteredEntries.length <= 14 ||
                              idx % Math.ceil(filteredEntries.length / 10) === 0 ||
                              idx === filteredEntries.length - 1) && (
                              <text
                                x={p.x}
                                y={chartHeight - paddingBottom + 16}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#8C8377"
                                className="dark:fill-slate-400 font-medium"
                              >
                                {formatChartDate(p.entry.date)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Chart 2: Energy Trend (Line Chart 1-5) */}
          <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Energy Tracker
                </span>
                <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
                  Energy Trend (1–5 Scale)
                </h4>
              </div>
              <div className="text-right text-xs text-[#8C8377] dark:text-slate-400">
                Avg: <strong className="text-[#2D2A26] dark:text-slate-200">
                  {(
                    filteredEntries.reduce((a, b) => a + (b.energy_level || 3), 0) /
                    filteredEntries.length
                  ).toFixed(1)} / 5 ⭐
                </strong>
              </div>
            </div>

            {/* SVG Line Chart for Energy */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[500px]"
              >
                {/* Horizontal Grid lines and Labels for 1 to 5 */}
                {[
                  { level: 5, label: '5 ⭐ Peak' },
                  { level: 4, label: '4 ⭐ High' },
                  { level: 3, label: '3 ⭐ Medium' },
                  { level: 2, label: '2 ⭐ Low' },
                  { level: 1, label: '1 ⭐ Drained' },
                ].map((row) => {
                  const y = paddingTop + graphHeight - ((row.level - 1) / 4) * graphHeight;
                  return (
                    <g key={row.level}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#ECE6DC"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        className="dark:stroke-slate-700"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#8C8377"
                        className="dark:fill-slate-400 font-medium"
                      >
                        {row.label}
                      </text>
                    </g>
                  );
                })}

                {/* Plot line */}
                {(() => {
                  const points = filteredEntries.map((e, idx) => {
                    const x =
                      filteredEntries.length === 1
                        ? paddingLeft + graphWidth / 2
                        : paddingLeft + (idx / (filteredEntries.length - 1)) * graphWidth;
                    const energy = e.energy_level || 3;
                    const y = paddingTop + graphHeight - ((energy - 1) / 4) * graphHeight;
                    return { x, y, entry: e };
                  });

                  const pathD = points.reduce((acc, p, i) => {
                    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  // Area fill
                  const areaD =
                    points.length > 1
                      ? `${pathD} L ${points[points.length - 1].x} ${
                          paddingTop + graphHeight
                        } L ${points[0].x} ${paddingTop + graphHeight} Z`
                      : '';

                  return (
                    <g>
                      <defs>
                        <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {areaD && <path d={areaD} fill="url(#energyGradient)" />}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points */}
                      {points.map((p, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              date: p.entry.date,
                              score: p.entry.mood_score || 4,
                              energy: p.entry.energy_level || 3,
                              moodLabel: MOOD_TRACKER_MAP[p.entry.mood]?.label || p.entry.mood,
                              emoji: MOOD_TRACKER_MAP[p.entry.mood]?.emoji || '🙂',
                              note: p.entry.note,
                              x: p.x,
                              y: p.y,
                            })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            className="fill-[#F59E0B] stroke-white dark:stroke-slate-800 transition-transform group-hover:scale-125"
                            strokeWidth="2"
                          />
                          {(filteredEntries.length <= 14 ||
                            idx % Math.ceil(filteredEntries.length / 10) === 0 ||
                            idx === filteredEntries.length - 1) && (
                            <text
                              x={p.x}
                              y={chartHeight - paddingBottom + 16}
                              textAnchor="middle"
                              fontSize="9"
                              fill="#8C8377"
                              className="dark:fill-slate-400 font-medium"
                            >
                              {formatChartDate(p.entry.date)}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Chart 3: Mood Distribution (Bar Chart) */}
          <div className="lg:col-span-2 bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  Distribution Breakdown
                </span>
                <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
                  Mood Frequency Distribution
                </h4>
              </div>
              <div className="text-xs text-[#8C8377] dark:text-slate-400">
                {filteredEntries.length} total logged sessions
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {distributionData.map((d) => {
                const heightRatio = Math.max((d.count / maxDistCount) * 100, 4);
                return (
                  <div
                    key={d.value}
                    className="flex flex-col items-center bg-[#FAF8F5] dark:bg-slate-750 p-4 rounded-2xl border border-[#ECE6DC] dark:border-slate-700"
                  >
                    <div className="text-2xl mb-2">{d.emoji}</div>
                    <div className="text-xs font-bold text-[#2D2A26] dark:text-slate-200">
                      {d.label}
                    </div>
                    <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mb-3">
                      Score {d.score}
                    </div>

                    {/* Bar visualization */}
                    <div className="w-full h-24 bg-[#ECE6DC]/60 dark:bg-slate-700 rounded-xl flex items-end p-1 relative overflow-hidden">
                      <div
                        className="w-full rounded-lg transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                        style={{
                          height: `${heightRatio}%`,
                          backgroundColor:
                            d.score >= 5 ? '#5B8266' : d.score >= 3 ? '#3B82F6' : '#EF4444',
                        }}
                      >
                        {d.count > 0 && <span>{d.count}</span>}
                      </div>
                    </div>

                    <div className="mt-2 text-center">
                      <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
                        {d.count} {d.count === 1 ? 'day' : 'days'}
                      </span>
                      <span className="text-[10px] text-[#8C8377] dark:text-slate-400 block">
                        {d.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card */}
      {hoveredPoint && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2D2A26] dark:bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#4A453E] dark:border-slate-600 flex items-center gap-3 text-xs animate-in fade-in duration-150">
          <span className="text-xl">{hoveredPoint.emoji}</span>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{hoveredPoint.date}</span>
              <span className="text-emerald-400">• {hoveredPoint.moodLabel}</span>
              <span className="text-slate-300 font-normal">
                (Score: {hoveredPoint.score}/6)
              </span>
              {hoveredPoint.energy && (
                <span className="text-amber-400 font-normal">
                  • Energy {hoveredPoint.energy}/5 ⭐
                </span>
              )}
            </div>
            {hoveredPoint.note && (
              <div className="text-slate-300 text-[11px] italic max-w-xs truncate mt-0.5">
                "{hoveredPoint.note}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
