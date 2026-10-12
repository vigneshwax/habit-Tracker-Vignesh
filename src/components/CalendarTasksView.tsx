import React, { useState } from 'react';
import { HRTask } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  User,
  X,
} from 'lucide-react';

interface CalendarTasksViewProps {
  tasks: HRTask[];
  onOpenNewTaskModal: (date?: string) => void;
  onEditTask: (task: HRTask) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarTasksView: React.FC<CalendarTasksViewProps> = ({
  tasks,
  onOpenNewTaskModal,
  onEditTask,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().slice(0, 10));

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create 42 grid cells (6 rows x 7 cols)
  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Leading days of next month
  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Group tasks by date
  const tasksByDate = new Map<string, HRTask[]>();
  tasks.forEach((t) => {
    const list = tasksByDate.get(t.date) || [];
    list.push(t);
    tasksByDate.set(t.date, list);
  });

  const todayStr = today.toISOString().slice(0, 10);
  const selectedDayTasks = selectedDate ? tasksByDate.get(selectedDate) || [] : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header Navigation */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scheduled HR operations and follow-up deadlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpenNewTaskModal(selectedDate || todayStr)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Calendar Grid (3 Cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            {WEEK_DAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {calendarCells.map((cell, idx) => {
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[95px] p-1.5 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500 inset-ring'
                      : cell.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400'
                  }`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Pills */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium border ${
                          task.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                            : task.priority === 'High'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] font-bold text-slate-400 px-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Drawer (1 Col) */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Day Schedule
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select a day'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {selectedDayTasks.length} Task{selectedDayTasks.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto">
              {selectedDayTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tasks scheduled on this day.
                </div>
              ) : (
                selectedDayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onEditTask(t)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {t.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t.time}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {t.title}
                    </div>
                    {t.assignedTo && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {t.assignedTo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenNewTaskModal(selectedDate || todayStr)}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Task on This Day
          </button>
        </div>
      </div>
    </div>
  );
};
