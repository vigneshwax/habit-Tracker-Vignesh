import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, TrendingUp, TrendingDown, CheckCircle2, Calendar, Award } from 'lucide-react';
import { Habit } from '../types';
import { WEEKDAYS, MONTH_NAMES, formatDateToISO, getTodayDateInfo } from '../utils/date';
import { getDayScheduledHabits } from '../utils/scheduler';

interface TodaySparklineCardProps {
  habits: Habit[];
  entries: Record<string, boolean>;
  onSwitchToGrid?: () => void;
}

interface DayDataPoint {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  shortDate: string;
  displayLabel: string;
  isToday: boolean;
  completed: number;
  scheduled: number;
  completionRate: number;
}

export const TodaySparklineCard: React.FC<TodaySparklineCardProps> = ({
  habits,
  entries,
  onSwitchToGrid,
}) => {
  const activeHabits = useMemo(
    () => habits.filter((h) => (h.status || 'active') !== 'archived'),
    [habits]
  );

  // Generate the last 7 calendar days ending today
  const last7DaysData: DayDataPoint[] = useMemo(() => {
    const data: DayDataPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = formatDateToISO(d);
      const dayOfWeekIndex = d.getDay();
      const dayName = WEEKDAYS[dayOfWeekIndex];
      const dayNumber = d.getDate();
      const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3);
      const shortDate = `${monthShort} ${dayNumber}`;
      const isToday = i === 0;

      // Scheduled habits for this day
      const scheduledOnDay = getDayScheduledHabits(activeHabits, dateStr);
      const scheduledCount = scheduledOnDay.length;

      // Count of completed habits on this day
      const completedCount = activeHabits.filter(
        (h) => !!entries[`${h.id}_${dateStr}`]
      ).length;

      const completionRate =
        scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

      data.push({
        dateStr,
        dayName,
        dayNumber,
        shortDate,
        displayLabel: isToday ? 'Today' : dayName,
        isToday,
        completed: completedCount,
        scheduled: scheduledCount,
        completionRate,
      });
    }

    return data;
  }, [activeHabits, entries]);

  // Aggregate statistics for the 7-day period
  const totalCompleted7Days = useMemo(
    () => last7DaysData.reduce((acc, curr) => acc + curr.completed, 0),
    [last7DaysData]
  );

  const avgCompletedPerDay = useMemo(() => {
    const avg = totalCompleted7Days / 7;
    return avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(1);
  }, [totalCompleted7Days]);

  const peakDay = useMemo(() => {
    return last7DaysData.reduce((max, curr) => (curr.completed > max.completed ? curr : max), last7DaysData[0]);
  }, [last7DaysData]);

  const todayData = last7DaysData[last7DaysData.length - 1];
  const yesterdayData = last7DaysData[last7DaysData.length - 2];
  const diffFromYesterday = todayData ? todayData.completed - (yesterdayData?.completed || 0) : 0;

  // First 3-4 days vs last 3-4 days trend
  const firstHalfSum = last7DaysData.slice(0, 3).reduce((a, b) => a + b.completed, 0);
  const secondHalfSum = last7DaysData.slice(4).reduce((a, b) => a + b.completed, 0);
  const isTrendingUp = secondHalfSum >= firstHalfSum;

  return (
    <div
      id="today-7day-sparkline-card"
      className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6 transition-all"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EBE1] dark:border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/40 text-[#5B8266] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                7-Day Velocity
              </span>
              <span className="text-xs text-[#8C8377] dark:text-slate-400 font-medium">
                {last7DaysData[0]?.shortDate} – {todayData?.shortDate} (Today)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#2D2A26] dark:text-white mt-0.5">
              Habits Completed (Last 7 Days)
            </h3>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 flex items-center gap-1.5">
            <span className="text-[11px] text-[#7D766C] dark:text-slate-400 font-medium">7-Day Total:</span>
            <span className="text-xs font-bold text-[#2D2A26] dark:text-white">
              {totalCompleted7Days} done
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 flex items-center gap-1.5">
            <span className="text-[11px] text-[#7D766C] dark:text-slate-400 font-medium">Daily Avg:</span>
            <span className="text-xs font-bold text-[#5B8266] dark:text-emerald-400">
              {avgCompletedPerDay}/day
            </span>
          </div>

          {diffFromYesterday !== 0 && (
            <div
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                diffFromYesterday > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              {diffFromYesterday > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{diffFromYesterday} vs yday</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{diffFromYesterday} vs yday</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Sparkline Chart Area */}
      <div className="mt-4 pt-1">
        <div className="h-28 sm:h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={last7DaysData}
              margin={{ top: 12, right: 12, left: 12, bottom: 4 }}
            >
              <defs>
                <linearGradient id="sparklineEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8266" stopOpacity={0.35} />
                  <stop offset="70%" stopColor="#5B8266" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#5B8266" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="displayLabel"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const isCurrent = payload.value === 'Today';
                  return (
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      fill={isCurrent ? '#5B8266' : '#8C8377'}
                      className={`text-[11px] ${
                        isCurrent ? 'font-bold fill-[#5B8266] dark:fill-emerald-400' : 'font-medium fill-[#8C8377] dark:fill-slate-400'
                      }`}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <YAxis hide domain={[0, 'dataMax + 1']} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DayDataPoint;
                    return (
                      <div className="bg-[#FFFFFF] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 shadow-md rounded-xl p-2.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#2D2A26] dark:text-white">
                          <span>{data.dayName}, {data.shortDate}</span>
                          {data.isToday && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#EBF3EE] text-[#5B8266] border border-[#D5E5D9]">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#5B8266]" />
                          <span className="text-[#5B8266] dark:text-emerald-400 font-bold">
                            {data.completed} completed {data.completed === 1 ? 'habit' : 'habits'}
                          </span>
                        </div>
                        {data.scheduled > 0 && (
                          <div className="text-[10px] text-[#8C8377] dark:text-slate-400 mt-0.5">
                            {data.completed} of {data.scheduled} scheduled ({data.completionRate}%)
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#5B8266"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#sparklineEmeraldGrad)"
                activeDot={{
                  r: 5,
                  fill: '#5B8266',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
                dot={({ cx, cy, payload, index }) => {
                  const isCurrent = payload.isToday;
                  const isMax = peakDay && payload.dateStr === peakDay.dateStr && peakDay.completed > 0;
                  return (
                    <circle
                      key={`sparkline-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={isCurrent ? 4.5 : isMax ? 3.5 : 2.5}
                      fill={isCurrent ? '#5B8266' : isMax ? '#3B82F6' : '#FAF8F5'}
                      stroke={isCurrent ? '#FFFFFF' : '#5B8266'}
                      strokeWidth={1.8}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Day-by-Day Pill Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-[#F4EFE6] dark:border-slate-700/60">
          {last7DaysData.map((day) => {
            const isToday = day.isToday;
            const hasCompleted = day.completed > 0;
            return (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all ${
                  isToday
                    ? 'bg-[#EBF3EE] dark:bg-emerald-950/40 border border-[#CDE1D2] dark:border-emerald-800 shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-750/70 border border-[#EDE7DD] dark:border-slate-700/60'
                }`}
              >
                <span
                  className={`text-[10px] font-bold ${
                    isToday
                      ? 'text-[#41684C] dark:text-emerald-300 font-extrabold'
                      : 'text-[#8C8377] dark:text-slate-400'
                  }`}
                >
                  {day.dayName.slice(0, 3)}
                </span>
                <span
                  className={`text-xs sm:text-sm font-bold mt-0.5 ${
                    isToday
                      ? 'text-[#2D2A26] dark:text-white'
                      : hasCompleted
                      ? 'text-[#3D3A36] dark:text-slate-200'
                      : 'text-[#A0988D] dark:text-slate-500'
                  }`}
                >
                  {day.completed}
                </span>
                <span className="text-[9px] text-[#A0988D] dark:text-slate-500">
                  {day.dayNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
