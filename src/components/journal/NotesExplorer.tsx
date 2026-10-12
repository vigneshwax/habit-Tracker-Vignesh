import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Star,
  Pin,
  Tag,
  Search,
  Grid,
  List,
  Plus,
  Trash2,
  Copy,
  Archive,
  ArrowUpDown,
  BookMarked,
  Sparkles,
  Calendar,
  Layers,
  MoreVertical,
  Edit2,
  Check,
} from 'lucide-react';
import { KnowledgeNote, KnowledgeCategory } from '../../types';
import { getCategoryStyle } from '../../utils/markdownUtils';

interface NotesExplorerProps {
  notes: KnowledgeNote[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: (category?: KnowledgeCategory) => void;
  onDuplicateNote: (noteId: string) => void;
  onTogglePin: (noteId: string, currentPin: boolean) => void;
  onToggleFavorite: (noteId: string, currentFav: boolean) => void;
  onToggleArchive: (noteId: string, currentArchived: boolean) => void;
  onDeleteNote: (noteId: string) => void;
  className?: string;
}

const CATEGORIES_LIST: KnowledgeCategory[] = [
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

export const NotesExplorer: React.FC<NotesExplorerProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNewNote,
  onDuplicateNote,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDeleteNote,
  className = '',
}) => {
  // Navigation / Folder selection
  // 'all' | 'favorites' | 'pinned' | 'archived' | category name | '#tag'
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'title-asc' | 'title-desc'>('updated');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Confirmation delete modal
  const [noteToDelete, setNoteToDelete] = useState<KnowledgeNote | null>(null);

  // Extract all tags with counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.archived) return;
      (n.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [notes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.archived) return;
      const cat = n.category || 'Note';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Counts for special folders
  const specialCounts = useMemo(() => {
    return {
      all: notes.filter((n) => !n.archived).length,
      favorites: notes.filter((n) => n.favorite && !n.archived).length,
      pinned: notes.filter((n) => n.pinned && !n.archived).length,
      archived: notes.filter((n) => n.archived).length,
    };
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // 1. Folder / category / tag match
      if (selectedFolder === 'all') {
        if (n.archived) return false;
      } else if (selectedFolder === 'favorites') {
        if (!n.favorite || n.archived) return false;
      } else if (selectedFolder === 'pinned') {
        if (!n.pinned || n.archived) return false;
      } else if (selectedFolder === 'archived') {
        if (!n.archived) return false;
      } else if (selectedFolder.startsWith('#')) {
        if (n.archived || !(n.tags || []).includes(selectedFolder)) return false;
      } else {
        // Specific category
        if (n.archived || (n.category || '').toLowerCase() !== selectedFolder.toLowerCase()) {
          return false;
        }
      }

      // 2. Search query match
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = (n.content || '').toLowerCase().includes(q);
        const matchesTag = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTag) return false;
      }

      return true;
    });
  }, [notes, selectedFolder, searchQuery]);

  // Sorted notes
  const sortedNotes = useMemo(() => {
    const list = [...filteredNotes];
    list.sort((a, b) => {
      // Keep pinned on top if not in archived view
      if (selectedFolder !== 'archived') {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
      }

      if (sortOption === 'updated') {
        const tA = new Date(a.updated_at || a.created_at).getTime();
        const tB = new Date(b.updated_at || b.created_at).getTime();
        return tB - tA;
      }
      if (sortOption === 'created') {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return tB - tA;
      }
      if (sortOption === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === 'title-desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
    return list;
  }, [filteredNotes, sortOption, selectedFolder]);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-[#ECE6DC] dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[640px] ${className}`}
      id="obsidian-notes-explorer"
    >
      {/* Sidebar: Folders, Categories, Tags (Collapsible / fixed on left) */}
      <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/80 dark:bg-slate-950/60 p-4 space-y-5 shrink-0 flex flex-col">
        {/* New Note Button */}
        <button
          type="button"
          onClick={() => onCreateNewNote(selectedFolder.startsWith('#') || ['all', 'favorites', 'pinned', 'archived'].includes(selectedFolder) ? undefined : selectedFolder)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#5B8266] text-white hover:bg-[#4A6E54] font-medium text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Knowledge Note</span>
        </button>

        {/* Core System Folders */}
        <div className="space-y-1 text-xs">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400 dark:text-slate-500 px-2 py-1">
            Workspaces
          </div>
          <button
            type="button"
            onClick={() => setSelectedFolder('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              selectedFolder === 'all'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs border border-stone-200/80 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5B8266]" />
              <span>All Notes</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">{specialCounts.all}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFolder('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              selectedFolder === 'favorites'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs border border-stone-200/80 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Favorites</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">{specialCounts.favorites}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFolder('pinned')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              selectedFolder === 'pinned'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs border border-stone-200/80 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-500" />
              <span>Pinned Notes</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">{specialCounts.pinned}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFolder('archived')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              selectedFolder === 'archived'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs border border-stone-200/80 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-stone-400" />
              <span>Archived</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">{specialCounts.archived}</span>
          </button>
        </div>

        {/* Categories / Folders */}
        <div className="space-y-1 text-xs overflow-y-auto max-h-48 pr-1">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400 dark:text-slate-500 px-2 py-1">
            Knowledge Folders
          </div>
          {CATEGORIES_LIST.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedFolder.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFolder(cat)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs border border-stone-200/80 dark:border-slate-700'
                    : 'text-stone-600 dark:text-slate-400 hover:bg-stone-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Folder className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{cat}</span>
                </span>
                <span className="text-[10px] font-mono text-stone-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tags Browser */}
        {Object.keys(tagCounts).length > 0 && (
          <div className="space-y-1 text-xs pt-3 border-t border-stone-200 dark:border-slate-800">
            <div className="text-[10px] font-mono uppercase font-bold text-stone-400 dark:text-slate-500 px-2 py-1 flex items-center justify-between">
              <span>Tags</span>
              <Tag className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {Object.entries(tagCounts).map(([t, count]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedFolder(t)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                    selectedFolder === t
                      ? 'bg-[#5B8266] text-white font-bold'
                      : 'bg-stone-200/70 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-300'
                  }`}
                >
                  {t} ({count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Notes List & Grid Workspace (Right side) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar: Search, Layout Toggle, Sorting */}
        <div className="p-4 sm:p-5 border-b border-[#ECE6DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search note titles, content, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5B8266]/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                aria-label="Sort notes"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs font-medium focus:outline-none cursor-pointer text-stone-700 dark:text-slate-300"
              >
                <option value="updated">Recently Modified</option>
                <option value="created">Date Created</option>
                <option value="title-asc">Title (A - Z)</option>
                <option value="title-desc">Title (Z - A)</option>
              </select>
            </div>

            {/* Layout Toggle: Grid vs List */}
            <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('list')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Notes List / Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-stone-400">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-stone-700 dark:text-slate-300">
                No Notes in this View
              </h4>
              <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mt-1">
                {searchQuery
                  ? `No notes match "${searchQuery}". Try a different keyword.`
                  : 'Create a new knowledge note to start building your digital second brain!'}
              </p>
              <button
                type="button"
                onClick={() => onCreateNewNote()}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-2xl bg-[#5B8266] text-white hover:bg-[#4A6E54] cursor-pointer shadow-xs"
              >
                + Create Note
              </button>
            </div>
          ) : layoutMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedNotes.map((note) => {
                const catStyle = getCategoryStyle(note.category);
                const isSelected = selectedNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note.id)}
                    className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'bg-[#FAF8F5] dark:bg-slate-800 border-[#5B8266] ring-2 ring-[#5B8266]/30 shadow-sm'
                        : 'bg-white dark:bg-slate-800/90 border-[#ECE6DC] dark:border-slate-800 hover:border-stone-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top strip: category badge & action buttons */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {note.category || 'Note'}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Pin */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(note.id, Boolean(note.pinned));
                            }}
                            className={`p-1 rounded-md text-stone-400 hover:text-amber-500 transition-colors ${
                              note.pinned ? 'text-amber-500' : ''
                            }`}
                            title={note.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          {/* Favorite */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(note.id, Boolean(note.favorite));
                            }}
                            className={`p-1 rounded-md text-stone-400 hover:text-rose-500 transition-colors ${
                              note.favorite ? 'text-rose-500 fill-rose-500' : ''
                            }`}
                            title={note.favorite ? 'Unfavorite' : 'Favorite'}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-serif font-bold text-sm text-[#1A1815] dark:text-white line-clamp-2 leading-snug group-hover:text-[#5B8266] transition-colors mb-2">
                        {note.title}
                      </h3>

                      {/* Excerpt snippet */}
                      <p className="text-xs text-stone-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3 font-sans">
                        {note.content
                          ? note.content.replace(/[#*`[\]]/g, '').trim() || 'Empty note...'
                          : 'Empty note...'}
                      </p>
                    </div>

                    {/* Bottom strip: Tags & Date */}
                    <div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {note.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-700/80 text-stone-600 dark:text-slate-300 font-mono"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 dark:text-slate-500 border-t border-stone-100 dark:border-slate-800 pt-2">
                        <span>
                          {new Date(note.updated_at || note.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateNote(note.id);
                            }}
                            className="p-1 hover:text-stone-700 dark:hover:text-white"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleArchive(note.id, Boolean(note.archived));
                            }}
                            className="p-1 hover:text-stone-700 dark:hover:text-white"
                            title={note.archived ? 'Unarchive' : 'Archive'}
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteToDelete(note);
                            }}
                            className="p-1 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="divide-y divide-stone-100 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80">
              {sortedNotes.map((note) => {
                const catStyle = getCategoryStyle(note.category);
                const isSelected = selectedNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note.id)}
                    className={`flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#FAF8F5] dark:bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {note.category || 'Note'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                            {note.title}
                          </h4>
                          {note.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                          {note.favorite && <Star className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-stone-400 dark:text-slate-400 truncate max-w-md mt-0.5">
                          {note.content ? note.content.replace(/[#*`[\]]/g, '').trim() : 'Empty note'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-stone-400 hidden sm:inline-block">
                        {new Date(note.updated_at || note.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note);
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Delete Dialog */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200 dark:border-slate-800 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Permanently Delete Note?
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-stone-900 dark:text-white">&ldquo;{noteToDelete.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(noteToDelete.id);
                  setNoteToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
