import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FileText,
  Calendar,
  Tag,
  Share2,
  Plus,
  ArrowRight,
  Hash,
  Sparkles,
  Command,
  X,
} from 'lucide-react';
import { KnowledgeNote, DailyJournal } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: KnowledgeNote[];
  journals: DailyJournal[];
  onOpenNote: (noteId: string) => void;
  onOpenJournal: (date?: string) => void;
  onCreateNewNote: () => void;
  onOpenGraph: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  journals,
  onOpenNote,
  onOpenJournal,
  onCreateNewNote,
  onOpenGraph,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'journals' | 'tags'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      id: string;
      type: 'command' | 'note' | 'journal' | 'tag';
      title: string;
      subtitle?: string;
      snippet?: string;
      icon: any;
      action: () => void;
    }> = [];

    // Commands if query is empty or matches command keywords
    if (!q || 'new note'.includes(q) || 'create'.includes(q)) {
      items.push({
        id: 'cmd-new-note',
        type: 'command',
        title: 'Create New Knowledge Note',
        subtitle: 'Start blank note or choose category',
        icon: Plus,
        action: () => {
          onClose();
          onCreateNewNote();
        },
      });
    }

    if (!q || 'today journal'.includes(q) || 'daily'.includes(q)) {
      items.push({
        id: 'cmd-today-journal',
        type: 'command',
        title: "Open Today's Daily Journal",
        subtitle: new Date().toLocaleDateString(),
        icon: Calendar,
        action: () => {
          onClose();
          onOpenJournal();
        },
      });
    }

    if (!q || 'graph'.includes(q) || 'interactive'.includes(q)) {
      items.push({
        id: 'cmd-graph',
        type: 'command',
        title: 'Open Knowledge Graph View',
        subtitle: 'Explore interconnected second brain nodes',
        icon: Share2,
        action: () => {
          onClose();
          onOpenGraph();
        },
      });
    }

    // Search Notes
    if (filterType === 'all' || filterType === 'notes') {
      notes.forEach((n) => {
        if (n.archived) return;
        const matchesTitle = !q || n.title.toLowerCase().includes(q);
        const matchesContent = !q ? false : (n.content || '').toLowerCase().includes(q);
        const matchesTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));

        if (matchesTitle || matchesContent || matchesTags) {
          let snippet = '';
          if (q && matchesContent && n.content) {
            const idx = n.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 30);
            const end = Math.min(n.content.length, idx + 60);
            snippet = '...' + n.content.slice(start, end).replace(/\n/g, ' ') + '...';
          }

          items.push({
            id: `note-${n.id}`,
            type: 'note',
            title: n.title,
            subtitle: `${n.category} • ${(n.tags || []).join(' ')}`,
            snippet,
            icon: FileText,
            action: () => {
              onClose();
              onOpenNote(n.id);
            },
          });
        }
      });
    }

    // Search Daily Journals
    if (filterType === 'all' || filterType === 'journals') {
      journals.forEach((j) => {
        if (!j.content) return;
        const matchesDate = !q || j.date.includes(q);
        const matchesContent = !q ? false : j.content.toLowerCase().includes(q);

        if (matchesDate || matchesContent) {
          items.push({
            id: `journal-${j.date}`,
            type: 'journal',
            title: `Daily Journal: ${j.date}`,
            subtitle: j.mood ? `Mood: ${j.mood}` : undefined,
            snippet: j.highlights || j.content.slice(0, 80),
            icon: Calendar,
            action: () => {
              onClose();
              onOpenJournal(j.date);
            },
          });
        }
      });
    }

    return items.slice(0, 15);
  }, [query, filterType, notes, journals, onClose, onCreateNewNote, onOpenJournal, onOpenGraph, onOpenNote]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[580px] animate-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a title, keyword, #tag, or date..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-[10px] font-mono text-stone-500 border border-stone-200 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-stone-50/70 dark:bg-slate-950/40 border-b border-stone-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] text-stone-400 mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer ${
              filterType === 'all'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('notes')}
            className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer ${
              filterType === 'notes'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60'
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => setFilterType('journals')}
            className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer ${
              filterType === 'journals'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60'
            }`}
          >
            Journals
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-stone-100 dark:divide-slate-800/60">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 dark:text-slate-500">
              No matching notes or commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300'
                      : 'hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-800 dark:text-slate-200'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      item.type === 'command'
                        ? 'bg-stone-100 dark:bg-slate-800 text-[#5B8266]'
                        : item.type === 'journal'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600'
                        : 'bg-blue-50 dark:bg-blue-950/80 text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs sm:text-sm truncate">
                        {item.title}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-[#5B8266] shrink-0" />
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                        {item.subtitle}
                      </p>
                    )}
                    {item.snippet && (
                      <p className="text-[11px] text-stone-400 dark:text-slate-500 line-clamp-1 italic mt-1 font-sans">
                        {item.snippet}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-slate-950/60 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-stone-400">
          <span>Navigate with ↑ ↓ • Select with Enter</span>
          <span>Cmd+K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
