import React, { useState, useMemo } from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_MAP, MoodTrackerValue } from '../../types';
import { Search, Filter, Edit3, Trash2, Calendar, Star, Sparkles, AlertCircle, ArrowUpDown } from 'lucide-react';

interface MoodHistoryViewProps {
  entries: MoodTrackerEntry[];
  onEdit: (entry: MoodTrackerEntry) => void;
  onDelete: (entry: MoodTrackerEntry) => void;
}

export const MoodHistoryView: React.FC<MoodHistoryViewProps> = ({
  entries,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search by note or date
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.date.toLowerCase().includes(q) ||
          (e.note && e.note.toLowerCase().includes(q)) ||
          e.mood.toLowerCase().includes(q)
      );
    }

    // Filter by mood category
    if (selectedMoodFilter !== 'all') {
      result = result.filter((e) => e.mood === selectedMoodFilter);
    }

    // Sort by date
    result.sort((a, b) =>
      sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

    return result;
  }, [entries, searchTerm, selectedMoodFilter, sortOrder]);

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return dateStr;
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 p-5 sm:p-7 shadow-xs">
      {/* Header with Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#F0EBE1] dark:border-slate-700 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B8266] bg-[#EBF3EE] dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#D5E5D9] dark:border-emerald-800">
            Log Archives
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white mt-1">
            Mood History
          </h3>
          <p className="text-xs text-[#8C8377] dark:text-slate-400">
            Reverse chronological timeline of daily check-ins ({filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'})
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8377] dark:text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes or date..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-xs text-[#2D2A26] dark:text-slate-200 placeholder:text-[#A69E92] focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30"
            />
          </div>

          {/* Mood Filter Dropdown */}
          <select
            value={selectedMoodFilter}
            onChange={(e) => setSelectedMoodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-xs font-bold text-[#4A453E] dark:text-slate-300 cursor-pointer focus:outline-none"
          >
            <option value="all">All Moods</option>
            <option value="excellent">🤩 Excellent</option>
            <option value="great">😄 Great</option>
            <option value="good">🙂 Good</option>
            <option value="okay">😐 Okay</option>
            <option value="low">😕 Low</option>
            <option value="very_low">😞 Very Low</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 text-[#4A453E] dark:text-slate-300 hover:bg-[#F2ECE4] cursor-pointer"
            title={`Sort ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History List */}
      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 mx-auto flex items-center justify-center text-2xl mb-3">
            🔍
          </div>
          <h4 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
            No matching entries found
          </h4>
          <p className="text-xs text-[#8C8377] dark:text-slate-400 mt-1">
            {searchTerm || selectedMoodFilter !== 'all'
              ? 'Try clearing your search filters.'
              : 'Log your first mood check-in today to start your timeline!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const meta = MOOD_TRACKER_MAP[entry.mood];
            return (
              <div
                key={entry.id}
                className="bg-[#FAF8F5] dark:bg-slate-750 rounded-2xl border border-[#ECE6DC] dark:border-slate-700 p-4 sm:p-5 hover:border-[#D5E5D9] dark:hover:border-slate-600 transition-all shadow-2xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Mood emoji & Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 flex items-center justify-center text-3xl shadow-2xs shrink-0">
                      {meta?.emoji || '🙂'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                          {meta?.label || entry.mood}
                        </span>
                        <span className="text-xs text-[#8C8377] dark:text-slate-400 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-[#ECE6DC] dark:border-slate-700">
                          Mood Score: {entry.mood_score}/6
                        </span>
                        <div className="flex items-center gap-0.5 text-xs text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>Energy: {entry.energy_level || 3}/5</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#8C8377] dark:text-slate-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateDisplay(entry.date)}</span>
                        <span className="text-[#D5CFC4] dark:text-slate-600">•</span>
                        <span className="font-mono text-[11px]">{entry.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 text-xs font-bold text-[#2D2A26] dark:text-slate-200 border border-[#ECE6DC] dark:border-slate-700 transition-colors cursor-pointer"
                      title="Edit mood entry (PIN required)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#5B8266]" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 border border-[#ECE6DC] dark:border-slate-700 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete mood entry (PIN required)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Reflection Note if present */}
                {entry.note && (
                  <div className="mt-3 pt-3 border-t border-[#ECE6DC] dark:border-slate-700">
                    <p className="text-xs text-[#4A453E] dark:text-slate-200 italic bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-[#ECE6DC]/60 dark:border-slate-700/60 leading-relaxed">
                      "{entry.note}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
