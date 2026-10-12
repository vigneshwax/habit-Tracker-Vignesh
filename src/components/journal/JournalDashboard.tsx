import React, { useMemo } from 'react';
import {
  Sparkles,
  BookMarked,
  Plus,
  Flame,
  FileText,
  Calendar,
  Share2,
  CheckCircle2,
  Pin,
  Star,
  ArrowRight,
  TrendingUp,
  Smile,
  Zap,
  Tag,
  Folder,
  Layers,
} from 'lucide-react';
import { KnowledgeNote, DailyJournal, Habit, HabitEntry, MOOD_TRACKER_MAP, MoodTrackerValue } from '../../types';
import { getCategoryStyle, buildGraphData } from '../../utils/markdownUtils';

interface JournalDashboardProps {
  notes: KnowledgeNote[];
  journals: DailyJournal[];
  habits?: Habit[];
  habitEntries?: HabitEntry[] | Record<string, boolean>;
  onOpenDailyJournal: (date?: string) => void;
  onOpenNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onOpenGraph: () => void;
  onOpenAllNotes: () => void;
  className?: string;
}

export const JournalDashboard: React.FC<JournalDashboardProps> = ({
  notes,
  journals,
  habits = [],
  habitEntries = [],
  onOpenDailyJournal,
  onOpenNote,
  onCreateNewNote,
  onOpenGraph,
  onOpenAllNotes,
  className = '',
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's journal entry
  const todayEntry = useMemo(() => {
    return journals.find((j) => j.date === todayStr);
  }, [journals, todayStr]);

  // Streak calculation for daily writing
  const writingStreak = useMemo(() => {
    if (!journals || journals.length === 0) return 0;
    const dateSet = new Set(journals.filter((j) => j.content && j.content.trim().length > 0).map((j) => j.date));
    let streak = 0;
    const checkDate = new Date();

    // Check if written today or yesterday
    const todayFormatted = checkDate.toISOString().split('T')[0];
    if (!dateSet.has(todayFormatted)) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayFormatted = checkDate.toISOString().split('T')[0];
      if (!dateSet.has(yesterdayFormatted)) {
        return 0;
      }
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (dateSet.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [journals]);

  // Today's Habit completion stats
  const habitSummary = useMemo(() => {
    if (!habits || habits.length === 0) return { total: 0, completed: 0, pct: 0 };
    const active = habits.filter((h) => (h.status || 'active') === 'active');
    let completed = 0;

    active.forEach((h) => {
      let isDone = false;
      if (Array.isArray(habitEntries)) {
        isDone = habitEntries.some((e) => e.habit_id === h.id && e.date === todayStr && e.completed);
      } else if (typeof habitEntries === 'object') {
        isDone = Boolean(habitEntries[`${h.id}_${todayStr}`]);
      }
      if (isDone) completed++;
    });

    const pct = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;
    return { total: active.length, completed, pct };
  }, [habits, habitEntries, todayStr]);

  // Graph links count
  const graphData = useMemo(() => buildGraphData(notes, journals), [notes, journals]);

  // Pinned & Favorite notes
  const pinnedNotes = useMemo(() => notes.filter((n) => n.pinned && !n.archived).slice(0, 4), [notes]);
  const favoriteNotes = useMemo(() => notes.filter((n) => n.favorite && !n.archived).slice(0, 4), [notes]);

  // Recently updated notes
  const recentNotes = useMemo(() => {
    return [...notes]
      .filter((n) => !n.archived)
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 5);
  }, [notes]);

  // Weekly Activity (last 7 days bar)
  const weeklyActivity = useMemo(() => {
    const days: Array<{ date: string; label: string; hasEntry: boolean; wordCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const entry = journals.find((j) => j.date === ds);
      const dayLabel = d.toLocaleDateString([], { weekday: 'narrow' });
      const words = entry && entry.content ? entry.content.split(/\s+/).filter(Boolean).length : 0;
      days.push({
        date: ds,
        label: dayLabel,
        hasEntry: Boolean(entry && entry.content),
        wordCount: words,
      });
    }
    return days;
  }, [journals]);

  // Current Date display string
  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  return (
    <div className={`space-y-6 ${className}`} id="second-brain-dashboard-view">
      {/* Hero Welcome Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 border border-[#ECE6DC] dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#5B8266]/15 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#3F684B] dark:text-emerald-300 border border-[#D5E5DA] dark:border-emerald-800/80 text-xs font-semibold">
              <BookMarked className="w-3.5 h-3.5 text-[#5B8266] dark:text-emerald-400" />
              <span>Obsidian Knowledge Hub</span>
              <span className="w-1 h-1 rounded-full bg-[#5B8266]" />
              <span className="font-normal">{formattedToday}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1815] dark:text-white tracking-tight">
              Personal Knowledge & Second Brain
            </h1>
            <p className="text-sm text-[#7D766C] dark:text-slate-300 leading-relaxed">
              Capture fleeting thoughts, connect ideas with Obsidian <code className="text-[#5B8266] font-mono">[[links]]</code>, track daily habits, and synthesize your personal digital second brain.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenDailyJournal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#5B8266] text-white hover:bg-[#4A6E54] text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Today&apos;s Journal</span>
            </button>

            <button
              type="button"
              onClick={onCreateNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-[#E0D9CE] dark:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-600 text-stone-800 dark:text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#5B8266]" />
              <span>New Note</span>
            </button>

            <button
              type="button"
              onClick={onOpenGraph}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-[#E0D9CE] dark:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-600 text-stone-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              title="Interactive Knowledge Graph"
            >
              <Share2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row: Streak, Total Entries, Total Notes, Graph Connections */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Writing Streak */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Daily Writing Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-white">
            {writingStreak} <span className="text-xs font-sans font-normal text-stone-500">days</span>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-slate-400">
            {writingStreak > 0 ? 'Consistency compounding daily' : 'Write today to start streak!'}
          </p>
        </div>

        {/* 2. Total Journal Entries */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Journal Entries</span>
            <BookMarked className="w-4 h-4 text-[#5B8266]" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-white">
            {journals.length}
          </div>
          <p className="text-[11px] text-stone-400 dark:text-slate-400">
            Recorded daily reflections
          </p>
        </div>

        {/* 3. Knowledge Notes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Knowledge Notes</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-white">
            {notes.filter((n) => !n.archived).length}
          </div>
          <p className="text-[11px] text-stone-400 dark:text-slate-400">
            Active second brain files
          </p>
        </div>

        {/* 4. Graph Connections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Linked Connections</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-white">
            {graphData.edges.length}
          </div>
          <p className="text-[11px] text-stone-400 dark:text-slate-400">
            Bi-directional wiki connections
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Journal & Habit Card on left, Recent Notes on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Today's Journal Card & Habit Summary */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Journal Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5B8266] animate-pulse" />
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white">
                  Today&apos;s Journal Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenDailyJournal(todayStr)}
                className="text-xs font-semibold text-[#5B8266] hover:text-[#4A6E54] dark:text-emerald-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{todayEntry ? 'Edit Entry' : 'Write Entry'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayEntry ? (
              <div className="space-y-3">
                {/* Mood & Energy badge */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {todayEntry.mood && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <span>{MOOD_TRACKER_MAP[todayEntry.mood as MoodTrackerValue]?.emoji || '🙂'}</span>
                      <span className="font-medium capitalize">{todayEntry.mood}</span>
                    </span>
                  )}
                  {todayEntry.energy_level && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Energy {todayEntry.energy_level}/5</span>
                    </span>
                  )}
                  {todayEntry.highlights && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] truncate max-w-xs">
                      ✨ {todayEntry.highlights}
                    </span>
                  )}
                </div>

                {/* Content snippet */}
                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-[#FAF8F5] dark:bg-slate-900/60 p-3.5 rounded-2xl border border-stone-200/70 dark:border-slate-800 font-sans">
                  {todayEntry.content || 'Highlights logged for today.'}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FAF8F5]/80 dark:bg-slate-900/40 border border-dashed border-stone-200 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  You haven&apos;t written your journal entry for today yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenDailyJournal(todayStr)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#5B8266] text-white hover:bg-[#4A6E54] cursor-pointer shadow-2xs"
                >
                  Start Today&apos;s Entry
                </button>
              </div>
            )}

            {/* Weekly Activity Heatstrip */}
            <div className="pt-3 border-t border-stone-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                <span>Last 7 Days Journaling:</span>
                <span className="font-mono text-[10px]">
                  {weeklyActivity.filter((d) => d.hasEntry).length} of 7 days written
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weeklyActivity.map((day) => (
                  <div
                    key={day.date}
                    onClick={() => onOpenDailyJournal(day.date)}
                    className={`p-2 rounded-xl text-center transition-all cursor-pointer ${
                      day.hasEntry
                        ? 'bg-[#EBF3EE] dark:bg-emerald-950/60 border border-[#CDE1D4] dark:border-emerald-800 text-[#2E5A39] dark:text-emerald-300 font-bold'
                        : 'bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-slate-500 hover:bg-stone-200'
                    }`}
                    title={`${day.date}: ${day.hasEntry ? `${day.wordCount} words` : 'No entry'}`}
                  >
                    <div className="text-[10px] uppercase font-mono">{day.label}</div>
                    <div className="mt-1 flex justify-center">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          day.hasEntry ? 'bg-[#5B8266]' : 'bg-stone-300 dark:bg-slate-700'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Habits Completion Summary */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-[#5B8266]" />
                <span>Today&apos;s Habits Progress</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {habitSummary.completed} of {habitSummary.total} daily habits completed ({habitSummary.pct}%)
              </p>
            </div>
            <div className="w-24 sm:w-32 h-2.5 bg-stone-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-[#5B8266] rounded-full transition-all duration-300"
                style={{ width: `${habitSummary.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Recently Updated & Pinned Knowledge */}
        <div className="lg:col-span-5 space-y-5">
          {/* Pinned & Favorites Notes Card */}
          {(pinnedNotes.length > 0 || favoriteNotes.length > 0) && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <span>Pinned & Key Knowledge</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenAllNotes}
                  className="text-[11px] text-[#5B8266] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2">
                {[...pinnedNotes, ...favoriteNotes.filter((f) => !pinnedNotes.some((p) => p.id === f.id))].slice(0, 4).map((n) => {
                  const catStyle = getCategoryStyle(n.category);
                  return (
                    <div
                      key={n.id}
                      onClick={() => onOpenNote(n.id)}
                      className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-stone-200/80 dark:border-slate-800 hover:border-[#5B8266] transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {n.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                          {n.favorite && <Star className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />}
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate group-hover:text-[#5B8266] transition-colors">
                            {n.title}
                          </h4>
                        </div>
                        <p className="text-[10px] text-stone-400 dark:text-slate-400 truncate mt-0.5">
                          {n.content ? n.content.replace(/[#*`[\]]/g, '').slice(0, 50) : 'Empty'}
                        </p>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {n.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Knowledge Notes Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#5B8266]" />
                <span>Recently Modified Notes</span>
              </span>
              <button
                type="button"
                onClick={onOpenAllNotes}
                className="text-[11px] text-[#5B8266] hover:underline cursor-pointer"
              >
                Browse ({notes.length})
              </button>
            </div>

            {recentNotes.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No notes created yet.</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((n) => {
                  const catStyle = getCategoryStyle(n.category);
                  return (
                    <div
                      key={n.id}
                      onClick={() => onOpenNote(n.id)}
                      className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-stone-200/80 dark:border-slate-800 hover:border-stone-300 transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-semibold text-stone-800 dark:text-slate-200 truncate group-hover:text-[#5B8266]">
                          {n.title}
                        </h4>
                        <span className="text-[10px] font-mono text-stone-400">
                          {new Date(n.updated_at || n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {n.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
