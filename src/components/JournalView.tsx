import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookMarked,
  Sparkles,
  LayoutDashboard,
  Calendar,
  FileText,
  Share2,
  Plus,
  Search,
  Command,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  KnowledgeNote,
  DailyJournal,
  Habit,
  HabitEntry,
  KnowledgeCategory,
  KnowledgeTemplate,
  ViewTab,
} from '../types';
import { api } from '../api';
import { localStorageService } from '../services/localStorageService';
import { JournalDashboard } from './journal/JournalDashboard';
import { DailyJournalModule } from './journal/DailyJournalModule';
import { NotesExplorer } from './journal/NotesExplorer';
import { KnowledgeGraph } from './journal/KnowledgeGraph';
import { NoteEditor } from './journal/NoteEditor';
import { CommandPalette } from './journal/CommandPalette';
import { TemplateModal } from './journal/TemplateModal';

interface JournalViewProps {
  habits?: Habit[];
  entries?: HabitEntry[] | Record<string, boolean>;
  isUnlocked?: boolean;
  onRequireUnlock?: () => void;
  onSwitchTab?: (tab: ViewTab) => void;
  className?: string;
  initialJournals?: DailyJournal[];
  onUpdateJournals?: (journals: DailyJournal[]) => void;
}

type JournalSubView = 'dashboard' | 'daily' | 'notes' | 'graph';

export const JournalView: React.FC<JournalViewProps> = ({
  habits = [],
  entries = [],
  isUnlocked = true,
  onRequireUnlock,
  onSwitchTab,
  className = '',
  initialJournals,
  onUpdateJournals,
}) => {
  // Navigation inside the Journal page
  const [activeSubView, setActiveSubView] = useState<JournalSubView>('dashboard');

  // Core Data Collections
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [journals, setJournals] = useState<DailyJournal[]>(() => initialJournals || []);
  const [isLoading, setIsLoading] = useState(true);

  // Active Note being viewed/edited in NoteEditor (null = explorer view)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Toast notification message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Fetch initial notes and journal data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch notes from server or localStorage fallback
      let fetchedNotes: KnowledgeNote[] = [];
      try {
        const res = await api.getNotes({ archived: 'all' });
        if (res && Array.isArray(res.notes)) {
          fetchedNotes = res.notes;
        }
      } catch (netErr) {
        console.warn('Backend notes fetch error, loading from local cache:', netErr);
      }

      // If server returned empty, check localStorage
      if (fetchedNotes.length === 0) {
        const cached = localStorageService.getNotes();
        if (cached && cached.length > 0) {
          fetchedNotes = cached.map((c: any) => ({
            id: c.id,
            title: c.title || 'Untitled Note',
            content: c.content || '',
            category: c.category || 'Daily Journal',
            tags: c.tags || ['#note'],
            type: c.type || 'note',
            pinned: Boolean(c.pinned),
            favorite: Boolean(c.favorite),
            archived: Boolean(c.archived),
            color: c.color || '#10B981',
            created_at: c.createdAt || c.created_at || new Date().toISOString(),
            updated_at: c.updatedAt || c.updated_at || new Date().toISOString(),
          }));
        }
      }

      setNotes(fetchedNotes);

      // 2. Fetch journal entries
      let fetchedJournals: DailyJournal[] = [];
      try {
        const jRes = await api.getJournal();
        if (jRes && Array.isArray(jRes.journal)) {
          fetchedJournals = jRes.journal;
        }
      } catch (jErr) {
        console.warn('Backend journal fetch error, loading from local cache:', jErr);
        fetchedJournals = localStorageService.getJournals();
      }

      setJournals(fetchedJournals);
    } catch (err) {
      console.error('Error loading second brain data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // CRUD Operations on Notes
  const handleCreateNote = async (initialCategory: KnowledgeCategory = 'Daily Journal', initialContent = '') => {
    if (!isUnlocked && onRequireUnlock) {
      onRequireUnlock();
      return;
    }

    const defaultTitle = `Untitled Note ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    try {
      const res = await api.createNote({
        title: defaultTitle,
        content: initialContent || `# ${defaultTitle}\n\nStart jotting down thoughts... Type [[ to link other notes.\n`,
        category: initialCategory,
        tags: ['#note'],
        pinned: false,
        favorite: false,
      });

      if (res && res.note) {
        setNotes((prev) => [res.note, ...prev]);
        setActiveNoteId(res.note.id);
        setActiveSubView('notes');
        showToast('Created new note');
      }
    } catch (err: any) {
      console.error('Error creating note:', err);
      // Offline fallback
      const offlineId = `note-${Date.now()}`;
      const newNote: KnowledgeNote = {
        id: offlineId,
        title: defaultTitle,
        content: initialContent || `# ${defaultTitle}\n\n`,
        category: initialCategory,
        tags: ['#note'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(offlineId);
      setActiveSubView('notes');
      showToast('Created note (cached offline)');
    }
  };

  const handleSaveNote = async (updatedFields: Partial<KnowledgeNote>) => {
    if (!activeNoteId) return;

    // Optimistic local update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, ...updatedFields, updated_at: new Date().toISOString() }
          : n
      )
    );

    try {
      await api.updateNote(activeNoteId, updatedFields);
    } catch (err) {
      console.warn('Server update error, saved in local state:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!isUnlocked && onRequireUnlock) {
      onRequireUnlock();
      return;
    }

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }

    try {
      await api.deleteNote(noteId);
      showToast('Note deleted');
    } catch (err) {
      console.warn('Server delete notice:', err);
      showToast('Note deleted locally');
    }
  };

  const handleDuplicateNote = async (noteId: string) => {
    if (!isUnlocked && onRequireUnlock) {
      onRequireUnlock();
      return;
    }

    try {
      const res = await api.duplicateNote(noteId);
      if (res && res.note) {
        setNotes((prev) => [res.note, ...prev]);
        setActiveNoteId(res.note.id);
        showToast('Duplicated note');
      }
    } catch (err) {
      const existing = notes.find((n) => n.id === noteId);
      if (existing) {
        const cloned: KnowledgeNote = {
          ...existing,
          id: `note-${Date.now()}`,
          title: `${existing.title} (Copy)`,
          pinned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setNotes((prev) => [cloned, ...prev]);
        setActiveNoteId(cloned.id);
        showToast('Duplicated note locally');
      }
    }
  };

  const handleRenameNoteCascade = async (id: string, oldTitle: string, newTitle: string) => {
    try {
      const res = await api.renameNoteCascade(id, oldTitle, newTitle);
      if (res) {
        // Refresh all notes to capture cascading link replacements
        loadData();
        showToast(`Renamed note & updated ${res.referencesUpdated} internal links`);
      }
    } catch (err) {
      console.error('Rename error:', err);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n))
      );
      showToast('Renamed note');
    }
  };

  const handleTogglePin = (noteId: string, currentPin: boolean) => {
    const nextPin = !currentPin;
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pinned: nextPin } : n))
    );
    api.updateNote(noteId, { pinned: nextPin });
    showToast(nextPin ? 'Pinned note' : 'Unpinned note');
  };

  const handleToggleFavorite = (noteId: string, currentFav: boolean) => {
    const nextFav = !currentFav;
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, favorite: nextFav } : n))
    );
    api.updateNote(noteId, { favorite: nextFav });
    showToast(nextFav ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleToggleArchive = (noteId: string, currentArchived: boolean) => {
    const nextArchived = !currentArchived;
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, archived: nextArchived } : n))
    );
    api.updateNote(noteId, { archived: nextArchived });
    showToast(nextArchived ? 'Note archived' : 'Note restored from archive');
  };

  // CRUD Operations on Daily Journal
  const handleSaveJournal = async (payload: Partial<DailyJournal>) => {
    if (!payload.date) return;

    // Optimistically update
    let optimisticUpdated: DailyJournal[] = [];
    setJournals((prev) => {
      const idx = prev.findIndex((j) => (payload.id && j.id === payload.id) || j.date === payload.date);
      if (idx >= 0) {
        optimisticUpdated = [...prev];
        optimisticUpdated[idx] = { ...optimisticUpdated[idx], ...payload, updated_at: new Date().toISOString() };
      } else {
        optimisticUpdated = [{ ...payload, created_at: new Date().toISOString() } as DailyJournal, ...prev];
      }
      if (onUpdateJournals) onUpdateJournals(optimisticUpdated);
      return optimisticUpdated;
    });

    try {
      const res = await api.saveJournal(payload as any);
      if (res && res.entry) {
        setJournals((prev) => {
          const next = prev.map((j) => (j.date === payload.date || (payload.id && j.id === payload.id) ? res.entry : j));
          if (!next.some((j) => j.id === res.entry.id || j.date === res.entry.date)) {
            next.unshift(res.entry);
          }
          if (onUpdateJournals) onUpdateJournals(next);
          return next;
        });
        localStorageService.saveJournal(res.entry);
      } else {
        localStorageService.saveJournal(payload as any);
      }
    } catch (err) {
      console.warn('Server journal save notice:', err);
      localStorageService.saveJournal(payload as any);
    }
  };

  const handleDeleteJournal = async (idOrDate: string) => {
    if (!isUnlocked && onRequireUnlock) {
      onRequireUnlock();
      return;
    }

    setJournals((prev) => {
      const next = prev.filter((j) => j.date !== idOrDate && j.id !== idOrDate);
      if (onUpdateJournals) onUpdateJournals(next);
      return next;
    });

    try {
      await api.deleteJournal(idOrDate);
      showToast('Journal entry deleted');
    } catch (err) {
      console.warn('Server delete notice:', err);
      showToast('Journal entry deleted');
    }
  };

  // Open note by title from internal [[link]] (handles #headings and |aliases)
  const handleOpenNoteByTitle = (title: string, heading?: string) => {
    const rawTarget = title.split('#')[0].split('|')[0].trim();
    const clean = rawTarget.toLowerCase();
    const existing = notes.find((n) => n.title.toLowerCase().trim() === clean);
    if (existing) {
      setActiveNoteId(existing.id);
      setActiveSubView('notes');
    } else {
      // Create new note with this clean title
      handleCreateNote('Learning', `# ${rawTarget}\n\n${heading ? `## ${heading}\n\n` : ''}`);
    }
  };

  // Active note entity
  const activeNote = useMemo(() => {
    if (!activeNoteId) return null;
    return notes.find((n) => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  return (
    <div className={`space-y-6 ${className}`} id="obsidian-journal-system-root">
      {/* Navigation Sub-Tabs & Second Brain Command Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-3 sm:p-4 border border-[#ECE6DC] dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#ECE6DC] dark:border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveSubView('dashboard');
              setActiveNoteId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
              activeSubView === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white font-semibold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubView('daily');
              setActiveNoteId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
              activeSubView === 'daily'
                ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white font-semibold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Daily Journal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
              activeSubView === 'notes'
                ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white font-semibold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Notes Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubView('graph');
              setActiveNoteId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
              activeSubView === 'graph'
                ? 'bg-white dark:bg-slate-800 text-[#2D2A26] dark:text-white font-semibold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Knowledge Graph</span>
          </button>
        </div>

        {/* Global Search & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Command Palette Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E0D9CE] dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Search notes & commands (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Search Second Brain</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-[10px] font-mono text-stone-500">
              Ctrl+K
            </kbd>
          </button>

          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E0D9CE] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-medium cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* + New Note Button */}
          <button
            type="button"
            onClick={() => handleCreateNote()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B8266] text-white hover:bg-[#4A6E54] text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main Sub-View Content */}
      <div className="transition-all duration-200">
        {/* 1. SECOND BRAIN DASHBOARD */}
        {activeSubView === 'dashboard' && (
          <JournalDashboard
            notes={notes}
            journals={journals}
            habits={habits}
            habitEntries={entries}
            onOpenDailyJournal={(date) => {
              setActiveSubView('daily');
            }}
            onOpenNote={(noteId) => {
              setActiveNoteId(noteId);
              setActiveSubView('notes');
            }}
            onCreateNewNote={() => handleCreateNote()}
            onOpenGraph={() => setActiveSubView('graph')}
            onOpenAllNotes={() => setActiveSubView('notes')}
          />
        )}

        {/* 2. DAILY JOURNAL MODULE */}
        {activeSubView === 'daily' && (
          <DailyJournalModule
            entries={journals}
            habits={habits}
            habitEntries={entries}
            onSaveJournal={handleSaveJournal}
            onDeleteJournal={handleDeleteJournal}
            onInternalLinkClick={handleOpenNoteByTitle}
            existingNoteTitles={notes.map((n) => n.title)}
          />
        )}

        {/* 3. NOTES WORKSPACE & EXPLORER / EDITOR */}
        {activeSubView === 'notes' && (
          activeNote ? (
            /* Open note in Editor mode */
            <NoteEditor
              note={activeNote}
              allNotes={notes}
              journals={journals}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onDuplicateNote={handleDuplicateNote}
              onRenameNoteCascade={handleRenameNoteCascade}
              onOpenNoteByTitle={handleOpenNoteByTitle}
              onOpenNoteById={(id) => setActiveNoteId(id)}
              onClose={() => setActiveNoteId(null)}
              isUnlocked={isUnlocked}
              onRequestUnlock={onRequireUnlock}
            />
          ) : (
            /* Browse all notes in Explorer */
            <NotesExplorer
              notes={notes}
              selectedNoteId={activeNoteId}
              onSelectNote={(noteId) => setActiveNoteId(noteId)}
              onCreateNewNote={(cat) => handleCreateNote(cat)}
              onDuplicateNote={handleDuplicateNote}
              onTogglePin={handleTogglePin}
              onToggleFavorite={handleToggleFavorite}
              onToggleArchive={handleToggleArchive}
              onDeleteNote={handleDeleteNote}
            />
          )
        )}

        {/* 4. KNOWLEDGE GRAPH VIEW */}
        {activeSubView === 'graph' && (
          <KnowledgeGraph
            notes={notes}
            journals={journals}
            onSelectNote={(noteId) => {
              if (noteId.startsWith('journal-')) {
                setActiveSubView('daily');
              } else if (noteId.startsWith('unresolved:')) {
                const rawTitle = noteId.replace('unresolved:', '');
                const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
                handleCreateNote('Note', formattedTitle);
              } else {
                setActiveNoteId(noteId);
                setActiveSubView('notes');
              }
            }}
          />
        )}
      </div>

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        journals={journals}
        onOpenNote={(noteId) => {
          setActiveNoteId(noteId);
          setActiveSubView('notes');
        }}
        onOpenJournal={(date) => {
          setActiveSubView('daily');
        }}
        onCreateNewNote={() => handleCreateNote()}
        onOpenGraph={() => setActiveSubView('graph')}
      />

      {/* Template Selection Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(tmpl) => {
          handleCreateNote(tmpl.category, tmpl.content);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-medium shadow-xl border border-stone-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
