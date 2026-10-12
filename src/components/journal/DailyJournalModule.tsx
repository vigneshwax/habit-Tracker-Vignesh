import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  Trash2,
  Maximize2,
  Minimize2,
  Smile,
  Zap,
  TrendingUp,
  Heart,
  Trophy,
  Compass,
  ListTodo,
  Check,
  CheckCircle2,
  Clock,
  BookOpen,
  Eye,
  Edit3,
  Columns,
  CheckSquare,
  Layers,
  Tag,
  Link2,
  Table,
  FileSpreadsheet,
} from 'lucide-react';
import {
  DailyJournal,
  Habit,
  HabitEntry,
  MoodType,
  MOOD_TRACKER_OPTIONS,
  MOOD_TRACKER_MAP,
  MoodTrackerValue,
  KnowledgeNote,
} from '../../types';
import {
  DraftStorage,
  parseSpreadsheetPaste,
  formatTableToMarkdown,
} from '../../utils/markdownUtils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TableEditorModal } from './TableEditorModal';
import { ObsidianMarkdownEditor } from './ObsidianMarkdownEditor';

interface DailyJournalModuleProps {
  entries: DailyJournal[];
  habits?: Habit[];
  habitEntries?: HabitEntry[] | Record<string, boolean>;
  allNotes?: KnowledgeNote[];
  onSaveJournal: (payload: Partial<DailyJournal>) => Promise<void>;
  onDeleteJournal: (idOrDate: string) => Promise<void>;
  onInternalLinkClick?: (title: string, heading?: string) => void;
  existingNoteTitles?: Set<string> | string[];
  className?: string;
}

const JOURNAL_TEMPLATES = [
  {
    id: 'daily-reflection',
    label: 'Daily Reflection',
    icon: Sparkles,
    template: `## 🌅 Daily Reflection

### 🌟 Today's Highlights & Wins
- 

### 💡 Key Insights & Mindset Shift
- 

### 🧭 What I Can Improve Tomorrow
- `,
  },
  {
    id: 'morning-priming',
    label: 'Morning Priming',
    icon: Zap,
    template: `## ☀️ Morning Priming & Intentions

### 🎯 Top 3 High-Impact Outcomes
1. 
2. 
3. 

### 🧘 Daily Anchor Affirmation
> Today I bring focus, patience, and persistent effort to every moment.

### 🔋 Energy & Readiness Ritual
- [ ] 30m Workout & Stretch
- [ ] Hydration (1L morning water)
- [ ] Zero distractions deep work block`,
  },
  {
    id: 'gratitude-journal',
    label: 'Gratitude Journal',
    icon: Heart,
    template: `## 🌱 Gratitude & Appreciation

Three specific things I am deeply grateful for today:
1. 
2. 
3. 

### Why this matters to me:
`,
  },
  {
    id: 'evening-review',
    label: 'Evening Review',
    icon: MoonIcon,
    template: `## 🌙 Evening Wind-Down Review

### 🏆 Scorecard of the Day
- **Physical Mastery**: 
- **Mental Focus**: 
- **Emotional Clarity**: 

### 📘 Tomorrow's Priorities
1. 
2. 
3. `,
  },
  {
    id: 'free-writing',
    label: 'Free-Writing (Zen)',
    icon: BookOpen,
    template: '',
  },
];

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export const DailyJournalModule: React.FC<DailyJournalModuleProps> = ({
  entries,
  habits = [],
  habitEntries = [],
  allNotes = [],
  onSaveJournal,
  onDeleteJournal,
  onInternalLinkClick,
  existingNoteTitles,
  className = '',
}) => {
  // Current selected date (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Table Editor modal state
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);

  // Textarea & Autocomplete states for [[ internal links
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Form states for selected date
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodTrackerValue>('good');
  const [energyLevel, setEnergyLevel] = useState<number>(4);
  const [productivity, setProductivity] = useState<number>(4);
  const [highlights, setHighlights] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [priorities, setPriorities] = useState('');
  const [tags, setTags] = useState<string[]>(['#journal']);
  const [newTagInput, setNewTagInput] = useState('');

  // UI modes: 'editor' | 'split' | 'preview' (default 'split' for live output and preview)
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split');
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('All changes synced');

  // Find existing journal entry for selected date
  const currentEntry = useMemo(() => {
    return entries.find((e) => e.date === selectedDate);
  }, [entries, selectedDate]);

  // Load entry into form when selectedDate or entries update
  useEffect(() => {
    if (currentEntry) {
      setContent(currentEntry.content || '');
      setMood((currentEntry.mood as MoodTrackerValue) || 'good');
      setEnergyLevel(currentEntry.energy_level || 4);
      setProductivity(currentEntry.productivity || 4);
      setHighlights(currentEntry.highlights || '');
      setGratitude(currentEntry.gratitude || '');
      setWins(currentEntry.wins || '');
      setChallenges(currentEntry.challenges || '');
      setPriorities(currentEntry.priorities || '');
      setTags(currentEntry.tags || ['#journal']);
    } else {
      // Check for unsaved draft
      const draft = DraftStorage.getJournalDraft(selectedDate);
      if (draft) {
        setContent(draft.content || '');
        setHighlights(draft.highlights || '');
        setGratitude(draft.gratitude || '');
        setWins(draft.wins || '');
        setChallenges(draft.challenges || '');
        setPriorities(draft.priorities || '');
      } else {
        setContent('');
        setHighlights('');
        setGratitude('');
        setWins('');
        setChallenges('');
        setPriorities('');
        setMood('good');
        setEnergyLevel(4);
        setProductivity(4);
        setTags(['#journal']);
      }
    }
    setSaveStatus('saved');
  }, [selectedDate, currentEntry]);

  // Debounced Autosave
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback(
    (payload: {
      content: string;
      highlights: string;
      gratitude: string;
      wins: string;
      challenges: string;
      priorities: string;
      mood: MoodTrackerValue;
      energyLevel: number;
      productivity: number;
      tags: string[];
    }) => {
      setSaveStatus('dirty');
      DraftStorage.saveJournalDraft(selectedDate, payload);

      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

      autosaveTimeout.current = setTimeout(async () => {
        try {
          setSaveStatus('saving');
          await onSaveJournal({
            date: selectedDate,
            content: payload.content,
            highlights: payload.highlights,
            gratitude: payload.gratitude,
            wins: payload.wins,
            challenges: payload.challenges,
            priorities: payload.priorities,
            mood: payload.mood as MoodType,
            energy_level: payload.energyLevel,
            productivity: payload.productivity,
            tags: payload.tags,
          });
          setSaveStatus('saved');
          setLastSavedTime(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          DraftStorage.clearJournalDraft(selectedDate);
        } catch (err) {
          console.error('Journal autosave error:', err);
          setSaveStatus('error');
        }
      }, 1200);
    },
    [selectedDate, onSaveJournal]
  );

  const handleFieldChange = (field: string, value: any) => {
    let nextContent = content;
    let nextHighlights = highlights;
    let nextGratitude = gratitude;
    let nextWins = wins;
    let nextChallenges = challenges;
    let nextPriorities = priorities;
    let nextMood = mood;
    let nextEnergy = energyLevel;
    let nextProductivity = productivity;
    let nextTags = tags;

    if (field === 'content') {
      setContent(value);
      nextContent = value;
    } else if (field === 'highlights') {
      setHighlights(value);
      nextHighlights = value;
    } else if (field === 'gratitude') {
      setGratitude(value);
      nextGratitude = value;
    } else if (field === 'wins') {
      setWins(value);
      nextWins = value;
    } else if (field === 'challenges') {
      setChallenges(value);
      nextChallenges = value;
    } else if (field === 'priorities') {
      setPriorities(value);
      nextPriorities = value;
    } else if (field === 'mood') {
      setMood(value);
      nextMood = value;
    } else if (field === 'energyLevel') {
      setEnergyLevel(value);
      nextEnergy = value;
    } else if (field === 'productivity') {
      setProductivity(value);
      nextProductivity = value;
    }

    triggerAutosave({
      content: nextContent,
      highlights: nextHighlights,
      gratitude: nextGratitude,
      wins: nextWins,
      challenges: nextChallenges,
      priorities: nextPriorities,
      mood: nextMood,
      energyLevel: nextEnergy,
      productivity: nextProductivity,
      tags: nextTags,
    });
  };

  // Insert markdown token at cursor in journal textarea
  const insertToken = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);
    const replacement = `${before}${selection}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    handleFieldChange('content', newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  // Filtered suggestions for [[ wikilink autocomplete
  const filteredSuggestions = useMemo(() => {
    if (!allNotes || allNotes.length === 0) return [];
    const q = linkQuery.toLowerCase().trim();
    return allNotes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (n.category || '').toLowerCase().includes(q)
      )
      .slice(0, 7);
  }, [allNotes, linkQuery]);

  const handleContentInput = (val: string) => {
    handleFieldChange('content', val);

    // Detect if user typed '[[' for link suggestions
    const cursor = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const linkMatch = textBeforeCursor.match(/\[\[([^\]]*)$/);
    if (linkMatch) {
      setShowLinkSuggestions(true);
      setLinkQuery(linkMatch[1].toLowerCase());
      setSelectedSuggestionIndex(0);
    } else {
      setShowLinkSuggestions(false);
    }
  };

  // Keyboard navigation inside [[ link suggestions
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showLinkSuggestions) {
      const hasCreateOption = Boolean(linkQuery.trim());
      const totalCount = filteredSuggestions.length + (hasCreateOption ? 1 : 0);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % Math.max(1, totalCount));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + totalCount) % Math.max(1, totalCount));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (totalCount > 0) {
          e.preventDefault();
          if (selectedSuggestionIndex < filteredSuggestions.length) {
            insertSuggestedLink(filteredSuggestions[selectedSuggestionIndex].title);
          } else if (hasCreateOption) {
            insertSuggestedLink(linkQuery.trim());
          }
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowLinkSuggestions(false);
        return;
      }
    }
  };

  // Automatic paste handling for Excel / Google Sheets tabular data
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteData = e.clipboardData.getData('text/plain');
    if (pasteData && pasteData.includes('\t') && pasteData.includes('\n')) {
      e.preventDefault();
      const parsed = parseSpreadsheetPaste(pasteData);
      const mdTable = formatTableToMarkdown(parsed);
      insertToken('\n\n' + mdTable + '\n\n');
    }
  };

  // Insert wikilink from suggestion
  const insertSuggestedLink = (suggestedTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBefore = content.slice(0, cursor);
    const match = textBefore.match(/\[\[([^\]]*)$/);
    if (match) {
      const matchStart = cursor - match[0].length;
      const newContent =
        content.slice(0, matchStart) +
        `[[${suggestedTitle}]]` +
        content.slice(cursor);
      handleFieldChange('content', newContent);
      setShowLinkSuggestions(false);
      setTimeout(() => {
        textarea.focus();
        const newCursor = matchStart + suggestedTitle.length + 4;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  };

  // Date Navigation
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Formatted date string
  const formattedSelectedDate = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  }, [selectedDate]);

  // Today's Habit Completion calculation for the selected date
  const habitSummary = useMemo(() => {
    if (!habits || habits.length === 0) return { total: 0, completed: 0, pct: 0 };
    const activeHabits = habits.filter((h) => (h.status || 'active') === 'active');
    let completedCount = 0;

    activeHabits.forEach((h) => {
      let isDone = false;
      if (Array.isArray(habitEntries)) {
        isDone = habitEntries.some((e) => e.habit_id === h.id && e.date === selectedDate && e.completed);
      } else if (typeof habitEntries === 'object') {
        isDone = Boolean(habitEntries[`${h.id}_${selectedDate}`]);
      }
      if (isDone) completedCount++;
    });

    const pct = activeHabits.length > 0 ? Math.round((completedCount / activeHabits.length) * 100) : 0;
    return { total: activeHabits.length, completed: completedCount, pct };
  }, [habits, habitEntries, selectedDate]);

  // Apply template
  const applyTemplate = (templateContent: string) => {
    if (!templateContent) return;
    if (content.trim().length > 0) {
      if (window.confirm('Append template to current journal text?')) {
        const appended = `${content}\n\n${templateContent}`;
        handleFieldChange('content', appended);
      }
    } else {
      handleFieldChange('content', templateContent);
    }
  };

  // Keyboard shortcut Esc to exit Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-[#ECE6DC] dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col ${
        isZenMode
          ? 'fixed inset-0 z-50 rounded-none border-none p-4 sm:p-8 overflow-y-auto bg-stone-50 dark:bg-slate-950'
          : ''
      } ${className}`}
      id="obsidian-daily-journal-module"
    >
      {/* Date Ribbon & Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 backdrop-blur-xs">
        {/* Date Selector with Next / Prev */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShiftDate(-1)}
            className="p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4 text-stone-600 dark:text-slate-300" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-[#5B8266]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => handleShiftDate(1)}
            className="p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4 text-stone-600 dark:text-slate-300" />
          </button>

          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#3F684B] dark:text-emerald-300 border border-[#D5E5DA] dark:border-emerald-800 hover:bg-[#DEEFE3] cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        {/* Action Controls & Autosave Badge */}
        <div className="flex items-center gap-2">
          {/* Autosave status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-slate-800 text-[11px] font-mono text-stone-600 dark:text-slate-300">
            {saveStatus === 'saving' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{lastSavedTime}</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Draft</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-500">Error saving</span>
              </>
            )}
          </div>

          {/* Mode switch: Editor / Split / Preview */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors ${
                viewMode === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
              title="Editor View Only"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-[#2E5A39] dark:text-emerald-300 shadow-2xs font-semibold ring-1 ring-emerald-500/30'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
              title="Split View: Live Typing & Output Preview"
            >
              <Columns className="w-3.5 h-3.5 text-[#5B8266]" />
              <span className="text-[11px]">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
              title="Full Output Preview Only"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Preview</span>
            </button>
          </div>

          {/* Zen Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isZenMode
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300'
                : 'border-stone-200 dark:border-slate-700 text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            title={isZenMode ? 'Exit Zen Mode (Esc)' : 'Zen Distraction-Free Mode'}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Delete entry */}
          {currentEntry && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete journal entry for ${selectedDate}?`)) {
                  onDeleteJournal(selectedDate);
                }
              }}
              className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
              title="Delete this journal entry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Journal Body */}
      <div className={`p-4 sm:p-6 space-y-6 ${isZenMode ? 'max-w-3xl mx-auto' : ''}`}>
        {/* Templates Quick Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Templates:</span>
          </span>
          {JOURNAL_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => applyTemplate(tmpl.template)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 hover:border-stone-300 transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tmpl.label}</span>
              </button>
            );
          })}
        </div>

        {/* Daily Stats Grid: Mood, Energy, Productivity, Habit Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Mood Picker */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-500" />
                <span>Daily Mood</span>
              </span>
              <span className="text-[11px] font-mono capitalize text-[#5B8266]">
                {MOOD_TRACKER_MAP[mood]?.label || mood}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {MOOD_TRACKER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFieldChange('mood', opt.value)}
                  className={`p-1.5 rounded-xl text-center text-sm transition-transform cursor-pointer ${
                    mood === opt.value
                      ? 'scale-110 ring-2 ring-[#5B8266] bg-white dark:bg-slate-700 shadow-sm'
                      : 'opacity-70 hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  title={`${opt.label} (${opt.score}/6)`}
                >
                  <span>{opt.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Energy Level Rating (1-5) */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Energy Level</span>
              </span>
              <span className="text-[11px] font-mono text-[#5B8266]">{energyLevel}/5</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleFieldChange('energyLevel', lvl)}
                  className={`flex-1 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    energyLevel >= lvl
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-200 dark:bg-slate-700 text-stone-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Productivity Score (1-5) */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Productivity</span>
              </span>
              <span className="text-[11px] font-mono text-[#5B8266]">{productivity}/5</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleFieldChange('productivity', lvl)}
                  className={`flex-1 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    productivity >= lvl
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-200 dark:bg-slate-700 text-stone-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Habit Completion Summary Widget */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#5B8266]" />
                <span>Habits Today</span>
              </span>
              <span className="text-[11px] font-mono text-[#5B8266] font-bold">
                {habitSummary.pct}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400">
              <span>{habitSummary.completed} of {habitSummary.total} done</span>
              <div className="w-20 h-2 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5B8266] rounded-full transition-all duration-300"
                  style={{ width: `${habitSummary.pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Structured Guided Inputs Accordion / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Highlights & Wins */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Today&apos;s Highlights & Wins</span>
            </label>
            <input
              type="text"
              placeholder="What was the standout highlight or victory of your day?"
              value={highlights}
              onChange={(e) => handleFieldChange('highlights', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 text-stone-800 dark:text-slate-200"
            />
          </div>

          {/* Gratitude */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Gratitude & Appreciation</span>
            </label>
            <input
              type="text"
              placeholder="What are you grateful for today?"
              value={gratitude}
              onChange={(e) => handleFieldChange('gratitude', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 text-stone-800 dark:text-slate-200"
            />
          </div>

          {/* Lessons Learned */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              <span>Challenges & Lessons Learned</span>
            </label>
            <input
              type="text"
              placeholder="What challenged you, and what did it teach you?"
              value={challenges}
              onChange={(e) => handleFieldChange('challenges', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 text-stone-800 dark:text-slate-200"
            />
          </div>

          {/* Tomorrow's Priorities */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tomorrow&apos;s Top Priorities</span>
            </label>
            <input
              type="text"
              placeholder="Top 3 things to conquer tomorrow..."
              value={priorities}
              onChange={(e) => handleFieldChange('priorities', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30 text-stone-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Obsidian Markdown Editor (Live Formatted, Heading shortcuts, Tables & [[Wikilinks]]) */}
        <ObsidianMarkdownEditor
          value={content}
          onChange={(newVal) => handleFieldChange('content', newVal)}
          placeholder="Reflect freely on your day... Type # for headings, - for lists, [[Note Title]] to link notes, or paste tables."
          allNotes={allNotes}
          existingNoteTitles={existingNoteTitles}
          onInternalLinkClick={onInternalLinkClick}
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          defaultMode="live"
          minHeight="420px"
        />
      </div>

      {/* Modal: Interactive Table Editor */}
      <TableEditorModal
        isOpen={isTableEditorOpen}
        onClose={() => setIsTableEditorOpen(false)}
        onInsertTable={(tableMarkdown) => {
          const updated = (content ? content + '\n\n' : '') + tableMarkdown + '\n\n';
          handleFieldChange('content', updated);
        }}
      />
    </div>
  );
};
