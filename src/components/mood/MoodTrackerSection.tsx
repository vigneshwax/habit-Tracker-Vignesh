import React, { useState, useEffect } from 'react';
import { MoodTrackerEntry } from '../../types';
import { api } from '../../api';
import { getLocalDateString, MONTH_NAMES } from '../../utils/date';
import { useProtectedAction } from '../../context/ProtectedActionContext';
import { TodayMoodCard } from './TodayMoodCard';
import { MoodSummaryStats } from './MoodSummaryStats';
import { MoodAnalyticsView } from './MoodAnalyticsView';
import { MoodCalendarView } from './MoodCalendarView';
import { MoodHistoryView } from './MoodHistoryView';
import { EditMoodModal } from './EditMoodModal';
import { DeleteMoodModal } from './DeleteMoodModal';
import { Smile, Calendar, History, BarChart3, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface MoodTrackerSectionProps {
  currentMonth: number;
  currentYear: number;
  isUnlocked: boolean;
  onRequireUnlock: () => void;
  onMonthChange: (month: number, year: number) => void;
}

export type MoodSubSection = 'today' | 'history' | 'calendar' | 'analytics';

export const MoodTrackerSection: React.FC<MoodTrackerSectionProps> = ({
  currentMonth,
  currentYear,
  isUnlocked,
  onRequireUnlock,
  onMonthChange,
}) => {
  const todayStr = getLocalDateString();

  const [activeSection, setActiveSection] = useState<MoodSubSection>('today');
  const [moodEntries, setMoodEntries] = useState<MoodTrackerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingEntry, setEditingEntry] = useState<MoodTrackerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<MoodTrackerEntry | null>(null);

  // Load mood entries from /api/moods
  const fetchMoods = async () => {
    try {
      setIsLoading(true);
      const res = await api.getMoods();
      if (res.moods) {
        setMoodEntries(res.moods);
      }
    } catch (err) {
      console.error('Failed to load mood entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoods();
  }, []);

  // Today's entry
  const todayEntry = moodEntries.find((m) => m.date === todayStr) || null;

  // Handler when today's mood is saved or updated
  const handleMoodSaved = (saved: MoodTrackerEntry) => {
    setMoodEntries((prev) => {
      const idx = prev.findIndex((m) => m.date === saved.date || m.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  const { executeProtected } = useProtectedAction();

  // Protected Edit Action
  const handleRequestEdit = (entry: MoodTrackerEntry) => {
    executeProtected(() => {
      setEditingEntry(entry);
    }, `Edit Mood Entry: ${entry.date}`);
  };

  // Protected Delete Action
  const handleRequestDelete = (entry: MoodTrackerEntry) => {
    executeProtected(() => {
      setDeletingEntry(entry);
    }, `Delete Mood Entry: ${entry.date}`);
  };

  const handleEntryUpdated = (updated: MoodTrackerEntry) => {
    setMoodEntries((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
  };

  const handleEntryDeleted = (deletedId: string) => {
    setMoodEntries((prev) => prev.filter((m) => m.id !== deletedId));
  };

  const handlePrevMonth = () => {
    let newM = currentMonth - 1;
    let newY = currentYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    onMonthChange(newM, newY);
  };

  const handleNextMonth = () => {
    let newM = currentMonth + 1;
    let newY = currentYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    onMonthChange(newM, newY);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
  };

  const now = new Date();
  const isCurrentMonth =
    currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

  return (
    <div className="space-y-6">
      {/* Mood Tracker Section Header */}
      <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
                Emotional Health OS
              </span>
              <span className="text-xs text-[#8C8377] dark:text-slate-400">
                public.mood_tracker
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
              Mood Tracker
            </h2>
            <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1 max-w-xl">
              Track daily feelings, energy levels, emotional trends, and long-term well-being with Supabase persistence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Monthly Filter: "<" "This mon" ">" */}
            <div className="flex items-center bg-[#FAF8F5] dark:bg-slate-750 p-1 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                id="mood-prev-month-btn"
                title="Previous Month"
                aria-label="Previous Month"
                className="p-1.5 sm:p-2 rounded-xl text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                id="mood-current-month-btn"
                title={isCurrentMonth ? 'Currently viewing this month' : 'Click to reset to this month'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCurrentMonth
                    ? 'bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-700 text-[#2D2A26] dark:text-white hover:bg-[#F2ECE4] dark:hover:bg-slate-650'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {isCurrentMonth ? 'This mon' : `${MONTH_NAMES[currentMonth - 1].slice(0, 3)} ${currentYear}`}
                </span>
                {!isCurrentMonth && (
                  <span className="text-[10px] text-[#5B8266] dark:text-emerald-400 font-bold ml-0.5">
                    •
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                id="mood-next-month-btn"
                title="Next Month"
                aria-label="Next Month"
                className="p-1.5 sm:p-2 rounded-xl text-[#7D766C] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={fetchMoods}
              className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-[#4A453E] dark:text-slate-300 border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
              title="Refresh Moods"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-[#F0EBE1] dark:border-slate-700 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'today', label: "Today's Mood", icon: Smile },
              { id: 'history', label: 'Mood History', icon: History },
              { id: 'calendar', label: 'Mood Calendar', icon: Calendar },
              { id: 'analytics', label: 'Mood Analytics', icon: BarChart3 },
            ] as const
          ).map((tab) => {
            const isActive = activeSection === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#5B8266] text-white shadow-xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-750 text-[#7D766C] dark:text-slate-300 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#ECE6DC] dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards (Visible across all views for quick context) */}
      <MoodSummaryStats entries={moodEntries} />

      {/* Sub-section views */}
      {activeSection === 'today' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <TodayMoodCard
            existingEntry={todayEntry}
            allEntries={moodEntries}
            isUnlocked={isUnlocked}
            onSaved={handleMoodSaved}
            onRequireUnlock={onRequireUnlock}
          />

          {/* Mood Tracker Calendar on this page */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
                  Monthly Mood Calendar
                </h3>
                <p className="text-xs text-[#8C8377] dark:text-slate-400">
                  Visual daily log of your emotions and vitality for {MONTH_NAMES[currentMonth - 1]} {currentYear}.
                </p>
              </div>
            </div>

            <MoodCalendarView
              entries={moodEntries}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onMonthChange={onMonthChange}
              onEdit={handleRequestEdit}
              onDelete={handleRequestDelete}
              onAddForDate={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>

          {/* Recent 5 History items preview */}
          {moodEntries.length > 0 && (
            <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] dark:border-slate-700 mb-4">
                <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                  Recent Check-ins
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('history')}
                  className="text-xs font-bold text-[#5B8266] hover:underline cursor-pointer"
                >
                  View All History →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {moodEntries.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 flex items-start gap-3"
                  >
                    <span className="text-2xl">
                      {entry.mood === 'excellent'
                        ? '🤩'
                        : entry.mood === 'great'
                        ? '😄'
                        : entry.mood === 'good'
                        ? '🙂'
                        : entry.mood === 'okay'
                        ? '😐'
                        : entry.mood === 'low'
                        ? '😕'
                        : '😞'}
                    </span>
                    <div className="text-xs flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2D2A26] dark:text-white capitalize">
                          {entry.mood.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-[#8C8377] dark:text-slate-400 font-mono">
                          {entry.date}
                        </span>
                      </div>
                      <div className="text-[#8C8377] dark:text-slate-400 mt-0.5">
                        Score: {entry.mood_score}/6 • Energy: {entry.energy_level || 3}⭐
                      </div>
                      {entry.note && (
                        <p className="text-[#4A453E] dark:text-slate-300 italic text-[11px] mt-1 line-clamp-1">
                          "{entry.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'history' && (
        <div className="animate-in fade-in duration-200">
          <MoodHistoryView
            entries={moodEntries}
            onEdit={handleRequestEdit}
            onDelete={handleRequestDelete}
          />
        </div>
      )}

      {activeSection === 'calendar' && (
        <div className="animate-in fade-in duration-200">
          <MoodCalendarView
            entries={moodEntries}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={onMonthChange}
            onEdit={handleRequestEdit}
            onDelete={handleRequestDelete}
            onAddForDate={() => setActiveSection('today')}
          />
        </div>
      )}

      {activeSection === 'analytics' && (
        <div className="animate-in fade-in duration-200">
          <MoodAnalyticsView
            entries={moodEntries}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={onMonthChange}
          />
        </div>
      )}

      {/* Edit Modal (Password protected) */}
      <EditMoodModal
        isOpen={!!editingEntry}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onUpdated={handleEntryUpdated}
      />

      {/* Delete Confirmation Modal (Password protected) */}
      <DeleteMoodModal
        isOpen={!!deletingEntry}
        entry={deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onDeleted={handleEntryDeleted}
      />
    </div>
  );
};
