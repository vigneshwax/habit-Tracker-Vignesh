import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Save,
  Trash2,
  Copy,
  Pin,
  Star,
  Tag,
  Palette,
  ExternalLink,
  Link2,
  Clock,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  FilePlus,
  BookOpen,
  ListTodo,
  CheckSquare,
  Hash,
  AlertCircle,
  Folder,
  Table,
  FileSpreadsheet,
} from 'lucide-react';
import { KnowledgeNote, DailyJournal, KnowledgeBacklink, KnowledgeCategory } from '../../types';
import {
  extractInternalLinks,
  extractTags,
  calculateReadingStats,
  buildBacklinksMap,
  getCategoryStyle,
  DraftStorage,
  parseSpreadsheetPaste,
  formatTableToMarkdown,
} from '../../utils/markdownUtils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TableEditorModal } from './TableEditorModal';
import { ObsidianMarkdownEditor } from './ObsidianMarkdownEditor';

interface NoteEditorProps {
  note: KnowledgeNote;
  allNotes: KnowledgeNote[];
  journals?: DailyJournal[];
  onSaveNote: (updatedNote: Partial<KnowledgeNote>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onDuplicateNote: (noteId: string) => Promise<void>;
  onRenameNoteCascade: (id: string, oldTitle: string, newTitle: string) => Promise<void>;
  onOpenNoteByTitle: (title: string) => void;
  onOpenNoteById: (id: string) => void;
  onClose: () => void;
  isUnlocked?: boolean;
  onRequestUnlock?: () => void;
}

const NOTE_CATEGORIES: KnowledgeCategory[] = [
  'Daily Journal',
  'Learning',
  'Ideas',
  'Projects',
  'Books',
  'Personal',
  'Career',
  'Goals',
  'Checklists',
  'Meeting Notes',
  'References',
];

const COLOR_OPTIONS = [
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Slate', hex: '#64748B' },
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allNotes,
  journals = [],
  onSaveNote,
  onDeleteNote,
  onDuplicateNote,
  onRenameNoteCascade,
  onOpenNoteByTitle,
  onOpenNoteById,
  onClose,
  isUnlocked = true,
  onRequestUnlock,
}) => {
  // Form states
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [category, setCategory] = useState<KnowledgeCategory>(note.category || 'Daily Journal');
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [pinned, setPinned] = useState(Boolean(note.pinned));
  const [favorite, setFavorite] = useState(Boolean(note.favorite));
  const [color, setColor] = useState(note.color || '#10B981');

  // Tag input state
  const [newTagInput, setNewTagInput] = useState('');

  // Mode: 'edit' | 'split' | 'preview'
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split');

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  // Renaming confirmation modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [pendingNewTitle, setPendingNewTitle] = useState('');

  // Missing link creation modal
  const [missingLinkToCreate, setMissingLinkToCreate] = useState<string | null>(null);

  // Table Editor modal state
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);

  // Autocomplete state for [[ internal link
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
    setCategory(note.category || 'Daily Journal');
    setTags(note.tags || []);
    setPinned(Boolean(note.pinned));
    setFavorite(Boolean(note.favorite));
    setColor(note.color || '#10B981');
    setSaveStatus('saved');
  }, [note.id]);

  // Draft recovery check
  useEffect(() => {
    const draft = DraftStorage.getNoteDraft(note.id);
    if (draft && draft.content && draft.content !== note.content) {
      const confirmRestore = window.confirm(
        `Recover unsaved draft for "${note.title}" found from previous session?`
      );
      if (confirmRestore) {
        setContent(draft.content);
        if (draft.title) setTitle(draft.title);
        setSaveStatus('dirty');
      } else {
        DraftStorage.clearNoteDraft(note.id);
      }
    }
  }, [note.id]);

  // Outgoing links & Backlinks calculation
  const outgoingLinks = useMemo(() => {
    return extractInternalLinks(content);
  }, [content]);

  const backlinksMap = useMemo(() => {
    return buildBacklinksMap(allNotes, journals);
  }, [allNotes, journals]);

  const backlinks = useMemo(() => {
    const byId = backlinksMap[note.id] || [];
    const byTitle = backlinksMap[note.title.toLowerCase().trim()] || [];
    // Deduplicate
    const combined = [...byId];
    byTitle.forEach((b) => {
      if (!combined.some((item) => item.sourceId === b.sourceId)) {
        combined.push(b);
      }
    });
    return combined;
  }, [backlinksMap, note.id, note.title]);

  // Related notes by shared tags
  const relatedNotes = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    return allNotes
      .filter((n) => n.id !== note.id && !n.archived)
      .map((n) => {
        const commonTags = (n.tags || []).filter((t) => tags.includes(t));
        return { note: n, count: commonTags.length };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((item) => item.note);
  }, [allNotes, note.id, tags]);

  // Reading stats
  const readingStats = useMemo(() => calculateReadingStats(content), [content]);

  // Debounced Autosave
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback(
    (newContent: string, newTags: string[], newCat: string, newColor: string, newPin: boolean, newFav: boolean) => {
      setSaveStatus('dirty');
      DraftStorage.saveNoteDraft(note.id, { content: newContent, title });

      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

      autosaveTimeout.current = setTimeout(async () => {
        try {
          setSaveStatus('saving');
          await onSaveNote({
            content: newContent,
            tags: newTags,
            category: newCat,
            color: newColor,
            pinned: newPin,
            favorite: newFav,
          });
          setSaveStatus('saved');
          setLastSavedTime(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          DraftStorage.clearNoteDraft(note.id);
        } catch (err) {
          console.error('Autosave error:', err);
          setSaveStatus('error');
        }
      }, 1200);
    },
    [note.id, title, onSaveNote]
  );

  // Filtered suggestions for [[ wikilink autocomplete
  const filteredSuggestions = useMemo(() => {
    const q = linkQuery.toLowerCase().trim();
    return allNotes
      .filter(
        (n) =>
          n.id !== note.id &&
          (n.title.toLowerCase().includes(q) ||
            (n.tags || []).some((t) => t.toLowerCase().includes(q)) ||
            (n.category || '').toLowerCase().includes(q))
      )
      .slice(0, 7);
  }, [allNotes, note.id, linkQuery]);

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutosave(val, tags, category, color, pinned, favorite);

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

  // Insert markdown token at cursor
  const insertToken = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);
    const replacement = `${before}${selection}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    triggerAutosave(newContent, tags, category, color, pinned, favorite);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
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
      setContent(newContent);
      triggerAutosave(newContent, tags, category, color, pinned, favorite);
      setShowLinkSuggestions(false);
      setTimeout(() => {
        textarea.focus();
        const newCursor = matchStart + suggestedTitle.length + 4;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  };

  // Quick insert default 3x3 table
  const insertQuickTable = () => {
    const sampleTable = [
      '| Column 1 | Column 2 | Column 3 |',
      '| :--- | :---: | ---: |',
      '| Item A | Details | Active |',
      '| Item B | Details | Inactive |',
    ].join('\n');
    insertToken('\n\n' + sampleTable + '\n\n');
  };

  // Handle clicking on an internal wikilink (supports #heading)
  const handleInternalLinkClick = (clickedTitle: string, heading?: string) => {
    const cleanTitle = clickedTitle.split('#')[0].trim();
    const existing = allNotes.find(
      (n) => n.title.toLowerCase().trim() === cleanTitle.toLowerCase()
    );

    if (existing) {
      onOpenNoteById(existing.id);
    } else {
      // Prompt user to create note if it doesn't exist
      setMissingLinkToCreate(cleanTitle);
    }
  };

  // Confirm creating missing linked note
  const handleCreateMissingNote = async () => {
    if (!missingLinkToCreate) return;
    try {
      await onSaveNote({
        title: missingLinkToCreate,
        content: `# ${missingLinkToCreate}\n\nReferenced from [[${note.title}]].\n\n`,
        category: 'Learning',
        tags: ['#note'],
      });
      setMissingLinkToCreate(null);
      onOpenNoteByTitle(missingLinkToCreate);
    } catch (err) {
      console.error('Error creating linked note:', err);
    }
  };

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!tags.includes(formatted)) {
      const updated = [...tags, formatted];
      setTags(updated);
      triggerAutosave(content, updated, category, color, pinned, favorite);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    triggerAutosave(content, updated, category, color, pinned, favorite);
  };

  // Title renaming cascade
  const handleInitiateRename = () => {
    setPendingNewTitle(title);
    setShowRenameModal(true);
  };

  const handleExecuteRename = async () => {
    if (!pendingNewTitle.trim()) return;
    try {
      await onRenameNoteCascade(note.id, note.title, pendingNewTitle.trim());
      setTitle(pendingNewTitle.trim());
      setShowRenameModal(false);
    } catch (err) {
      console.error('Error during rename:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#ECE6DC] dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full min-h-[640px]">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Notes Explorer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Title & Rename trigger */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1815] dark:text-white truncate max-w-xs sm:max-w-md">
              {title}
            </h2>
            <button
              type="button"
              onClick={handleInitiateRename}
              className="p-1 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-md hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Rename note & update internal references"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
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
                <span>Saved ({lastSavedTime})</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Unsaved changes</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-600 dark:text-red-400">Save failed</span>
              </>
            )}
          </div>

          {/* View Mode Toggle: Edit / Split / Preview */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-slate-400'
              }`}
              title="Edit Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-slate-400'
              }`}
              title="Split View (Live Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-slate-400'
              }`}
              title="Reading Preview Mode"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pin toggle */}
          <button
            type="button"
            onClick={() => {
              const val = !pinned;
              setPinned(val);
              triggerAutosave(content, tags, category, color, val, favorite);
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              pinned
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                : 'border-stone-200 dark:border-slate-700 text-stone-500 hover:bg-stone-50 dark:hover:bg-slate-800'
            }`}
            title={pinned ? 'Unpin note' : 'Pin note to top'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => {
              const val = !favorite;
              setFavorite(val);
              triggerAutosave(content, tags, category, color, pinned, val);
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              favorite
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                : 'border-stone-200 dark:border-slate-700 text-stone-500 hover:bg-stone-50 dark:hover:bg-slate-800'
            }`}
            title={favorite ? 'Remove favorite' : 'Mark as favorite'}
          >
            <Star className={`w-4 h-4 ${favorite ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Duplicate note */}
          <button
            type="button"
            onClick={() => onDuplicateNote(note.id)}
            className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-500 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            title="Duplicate note"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete note */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Permanently delete note "${note.title}"?`)) {
                onDeleteNote(note.id);
              }
            }}
            className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note Metadata Strip: Category, Tags, Color, Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-stone-50/70 dark:bg-slate-900/50 border-b border-[#ECE6DC] dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Selector */}
          <div className="flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-stone-400" />
            <select
              aria-label="Note category"
              value={category}
              onChange={(e) => {
                const newCat = e.target.value as KnowledgeCategory;
                setCategory(newCat);
                triggerAutosave(content, tags, newCat, color, pinned, favorite);
              }}
              className="py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              {NOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Color Accent Picker */}
          <div className="flex items-center gap-1 pl-2 border-l border-stone-200 dark:border-slate-700">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setColor(c.hex);
                  triggerAutosave(content, tags, category, c.hex, pinned, favorite);
                }}
                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                  color === c.hex ? 'scale-125 ring-2 ring-offset-1 ring-stone-400' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Accent: ${c.name}`}
              />
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-stone-200 dark:border-slate-700">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-[11px] font-mono"
              >
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-red-500 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                placeholder="+ tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-[11px] focus:outline-none focus:w-24 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Word Count & Read Time */}
        <div className="flex items-center gap-3 text-stone-400 dark:text-slate-500 font-mono text-[11px]">
          <span>{readingStats.wordCount} words</span>
          <span>•</span>
          <span>{readingStats.minutes} min read</span>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden relative">
        {/* Editor & Preview Column (8 cols on large) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[#ECE6DC] dark:border-slate-800 overflow-y-auto p-3 sm:p-5">
          <ObsidianMarkdownEditor
            value={content}
            onChange={(newVal) => handleContentChange(newVal)}
            placeholder="Write your note in Markdown... Type # for headings, - for lists, [[Note Title]] to link notes, or paste tables."
            allNotes={allNotes}
            existingNoteTitles={allNotes.map((n) => n.title)}
            onInternalLinkClick={handleInternalLinkClick}
            saveStatus={saveStatus}
            lastSavedTime={lastSavedTime}
            defaultMode="live"
            minHeight="480px"
          />
        </div>

        {/* Second Brain Knowledge Sidebar: Backlinks, Outgoing links, Related notes (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 bg-[#FAF8F5]/60 dark:bg-slate-900/50 overflow-y-auto space-y-5 text-xs">
          {/* Backlinks Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-slate-200">
                <Link2 className="w-3.5 h-3.5 text-[#5B8266]" />
                <span>Backlinks ({backlinks.length})</span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">Notes that link here</span>
            </div>

            {backlinks.length === 0 ? (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-dashed border-stone-200 dark:border-slate-700 text-stone-400 dark:text-slate-500 text-center text-[11px]">
                No backlinks yet. Reference this note with <code className="text-[#5B8266]">[[{note.title}]]</code> in other notes!
              </div>
            ) : (
              <div className="space-y-2">
                {backlinks.map((b, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (b.sourceId.startsWith('journal-')) {
                        // It's a daily journal
                      } else {
                        onOpenNoteById(b.sourceId);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 hover:border-[#5B8266] transition-colors cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800 dark:text-slate-200 group-hover:text-[#5B8266] transition-colors">
                        {b.sourceTitle}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-700 text-stone-500">
                        {b.sourceCategory}
                      </span>
                    </div>
                    {b.snippet && (
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 italic font-mono bg-stone-50 dark:bg-slate-900/60 p-1.5 rounded-lg">
                        {b.snippet}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Links */}
          <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-slate-200">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span>Outgoing Links ({outgoingLinks.length})</span>
              </div>
            </div>

            {outgoingLinks.length === 0 ? (
              <p className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                No outgoing links in this note.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {outgoingLinks.map((target, idx) => {
                  const exists = allNotes.some(
                    (n) => n.title.toLowerCase().trim() === target.toLowerCase().trim()
                  );
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInternalLinkClick(target)}
                      className={`px-2 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        exists
                          ? 'bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300 border-[#CDE1D4] dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/80'
                      }`}
                    >
                      [[{target}]] {!exists && <span className="text-[10px] ml-0.5">(new)</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Related Notes by Tags */}
          {relatedNotes.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Related Knowledge</span>
              </div>
              <div className="space-y-1.5">
                {relatedNotes.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onOpenNoteById(rel.id)}
                    className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:border-stone-400 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium text-stone-800 dark:text-slate-200 truncate">{rel.title}</span>
                    <span className="text-[10px] text-stone-400">{rel.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Rename Note & Cascade References */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-stone-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-white">
              Rename Note & Cascade Links
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              Renaming will update this note&apos;s title and automatically replace all occurrences of{' '}
              <code className="text-[#5B8266] font-mono">[[{note.title}]]</code> with the new title across all notes and daily journal entries.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                New Note Title
              </label>
              <input
                type="text"
                value={pendingNewTitle}
                onChange={(e) => setPendingNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5B8266]"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRename}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#5B8266] text-white hover:bg-[#4A6E54] cursor-pointer"
              >
                Rename & Update All Links
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Missing Internal Link */}
      {missingLinkToCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200 dark:border-slate-800 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-[#5B8266]">
              <FilePlus className="w-5 h-5" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                Create Missing Note?
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              Note <strong className="text-stone-900 dark:text-white">&ldquo;{missingLinkToCreate}&rdquo;</strong> does not exist yet. Would you like to create it now with bi-directional backlinks?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMissingLinkToCreate(null)}
                className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateMissingNote}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#5B8266] text-white hover:bg-[#4A6E54] cursor-pointer"
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Interactive Table Editor */}
      <TableEditorModal
        isOpen={isTableEditorOpen}
        onClose={() => setIsTableEditorOpen(false)}
        onInsertTable={(tableMarkdown) => {
          insertToken('\n\n' + tableMarkdown + '\n\n');
        }}
      />
    </div>
  );
};
