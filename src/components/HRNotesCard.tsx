import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckSquare,
  Pin,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Tag,
  Palette,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookMarked,
  NotebookPen,
  ArrowRight,
} from 'lucide-react';
import { HRNote, HRChecklistItem } from '../types';
import { localStorageService } from '../services/localStorageService';
import { googleSheetsService } from '../services/googleSheetsService';
import { useProtectedAction } from '../context/ProtectedActionContext';

interface HRNotesCardProps {
  className?: string;
  title?: string;
  subtitle?: string;
  onOpenFullJournal?: () => void;
  showFullJournalLink?: boolean;
}

const COLOR_OPTIONS = [
  { id: 'default', label: 'Classic Paper', bg: 'bg-[#FAF8F5] dark:bg-slate-800/80', border: 'border-[#E8E2D8] dark:border-slate-700' },
  { id: 'emerald', label: 'Sage Green', bg: 'bg-[#F2F7F4] dark:bg-emerald-950/30', border: 'border-[#D5E5DA] dark:border-emerald-800/60' },
  { id: 'amber', label: 'Warm Cream', bg: 'bg-[#FEF9EE] dark:bg-amber-950/25', border: 'border-[#F4E6C8] dark:border-amber-800/50' },
  { id: 'blue', label: 'Soft Sky', bg: 'bg-[#F0F6FD] dark:bg-blue-950/25', border: 'border-[#D2E4F9] dark:border-blue-800/50' },
  { id: 'purple', label: 'Lavender', bg: 'bg-[#F7F2FA] dark:bg-purple-950/25', border: 'border-[#E7DBF3] dark:border-purple-800/50' },
  { id: 'rose', label: 'Blush Rose', bg: 'bg-[#FDF3F2] dark:bg-rose-950/25', border: 'border-[#F8D8D5] dark:border-rose-800/50' },
];

export const HRNotesCard: React.FC<HRNotesCardProps> = ({
  className = '',
  title = 'My Journal',
  subtitle = 'Personal reflections, daily thoughts, ideas & checklists',
  onOpenFullJournal,
  showFullJournalLink = false,
}) => {
  const [notes, setNotes] = useState<HRNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<'text' | 'checklist'>('text');
  const [formCategory, setFormCategory] = useState('Daily Journal');
  const [formPinned, setFormPinned] = useState(false);
  const [formColor, setFormColor] = useState('default');
  const [formChecklistItems, setFormChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const { executeProtected } = useProtectedAction();

  // Load notes on mount and listen to Google Sheets updates
  useEffect(() => {
    setNotes(localStorageService.getNotes());
    const unsub = googleSheetsService.onDataUpdated(({ notes: updatedNotes }) => {
      setNotes(updatedNotes);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('text');
    setFormCategory('Daily Journal');
    setFormPinned(false);
    setFormColor('default');
    setFormChecklistItems([]);
    setNewChecklistText('');
    setIsCreating(false);
    setEditingNoteId(null);
  };

  const handleStartCreate = (defaultTitle?: string, defaultCategory?: string, defaultType?: 'text' | 'checklist') => {
    executeProtected(() => {
      resetForm();
      if (defaultTitle) setFormTitle(defaultTitle);
      if (defaultCategory) setFormCategory(defaultCategory);
      if (defaultType) setFormType(defaultType);
      setIsCreating(true);
    }, 'Create New Journal Entry');
  };

  const handleStartEdit = (note: HRNote) => {
    executeProtected(() => {
      setEditingNoteId(note.id);
      setFormTitle(note.title);
      setFormContent(note.content);
      setFormType((note.type as 'checklist' | 'text') || 'text');
      setFormCategory(note.category || 'Daily Journal');
      setFormPinned(note.pinned);
      setFormColor(note.color || 'default');
      setFormChecklistItems(note.checklistItems ? [...note.checklistItems] : []);
      setIsCreating(true);
    }, `Edit Entry "${note.title}"`);
  };

  const handleSaveNote = () => {
    if (!formTitle.trim() && !formContent.trim() && formChecklistItems.length === 0) {
      return;
    }

    executeProtected(() => {
      if (editingNoteId) {
        const updated = localStorageService.updateNote(editingNoteId, {
          title: formTitle.trim() || 'Untitled Journal Entry',
          content: formContent.trim(),
          type: formType,
          category: formCategory.trim() || 'Daily Journal',
          pinned: formPinned,
          color: formColor,
          checklistItems: formType === 'checklist' ? formChecklistItems : undefined,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)));
      } else {
        const created = localStorageService.createNote({
          title: formTitle.trim() || 'Untitled Journal Entry',
          content: formContent.trim(),
          type: formType,
          category: formCategory.trim() || 'Daily Journal',
          pinned: formPinned,
          color: formColor,
          checklistItems: formType === 'checklist' ? formChecklistItems : undefined,
        });
        setNotes((prev) => [created, ...prev]);
      }
      googleSheetsService.triggerDebouncedPush();
      resetForm();
    }, editingNoteId ? 'Update Journal Entry' : 'Save Journal Entry');
  };

  const handleDeleteNote = (id: string, title: string) => {
    executeProtected(() => {
      localStorageService.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      googleSheetsService.triggerDebouncedPush();
      if (editingNoteId === id) resetForm();
    }, `Delete Journal Entry "${title}"`);
  };

  const handleTogglePin = (note: HRNote) => {
    executeProtected(() => {
      const updated = localStorageService.updateNote(note.id, { pinned: !note.pinned });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      googleSheetsService.triggerDebouncedPush();
    }, `${note.pinned ? 'Unpin' : 'Pin'} Note "${note.title}"`);
  };

  const handleToggleChecklistItem = (noteId: string, itemId: string) => {
    // Immediate React State & LocalStorage update
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote || !targetNote.checklistItems) return;

    const updatedItems = targetNote.checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const updated = localStorageService.updateNote(noteId, { checklistItems: updatedItems });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    googleSheetsService.triggerDebouncedPush();
  };

  const handleAddFormChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setFormChecklistItems((prev) => [
      ...prev,
      {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: newChecklistText.trim(),
        completed: false,
      },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveFormChecklistItem = (id: string) => {
    setFormChecklistItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Filtered Notes
  const defaultCategories = ['Daily Journal', 'Reflections', 'Ideas', 'Personal', 'Checklists'];
  const categories = Array.from(new Set([...defaultCategories, ...notes.map((n) => n.category || 'Daily Journal').filter(Boolean)]));

  const filteredNotes = notes.filter((n) => {
    const matchesCategory = selectedCategory === 'all' || (n.category || 'Daily Journal') === selectedCategory;
    const matchesSearch =
      searchTerm.trim() === '' ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.checklistItems?.some((i) => i.text.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Pinned vs Regular Notes
  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const regularNotes = filteredNotes.filter((n) => !n.pinned);

  const getColorConfig = (colorId?: string) => {
    return COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[0];
  };

  return (
    <div
      id="hr-notes-records-section"
      className={`bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-[#ECE6DC] dark:border-slate-700/80 shadow-xs space-y-5 transition-all duration-300 ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE1] dark:border-slate-700/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-[#EBF3EE] dark:bg-emerald-950/40 text-[#40684C] dark:text-emerald-300 border border-[#D5E5D9] dark:border-emerald-800 shadow-2xs">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-bold text-[#2D2A26] dark:text-white">
                {title}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-slate-700 text-[10px] font-semibold text-[#7D766C] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-600">
                {notes.length}
              </span>
            </div>
            <p className="text-xs text-[#7D766C] dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showFullJournalLink && onOpenFullJournal && (
            <button
              type="button"
              onClick={onOpenFullJournal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8F5] dark:bg-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 border border-[#E5DFD5] dark:border-slate-600 text-[#4A453E] dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <span>Full Journal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {!isCreating && (
            <button
              type="button"
              onClick={() => handleStartCreate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#5B8266] hover:bg-[#4E7058] active:scale-95 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8377] dark:text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search journal entries, thoughts, checklists..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-slate-100 placeholder:text-[#A0988A] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B8266] dark:focus:border-emerald-400 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A0988A] hover:text-[#2D2A26] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#5B8266] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736A5E] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F2ECE4]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#5B8266] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736A5E] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F2ECE4]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline Create / Edit Form */}
      {isCreating && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FDFBF7] dark:bg-slate-900 border-2 border-[#5B8266]/30 dark:border-emerald-500/30 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D8] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-serif text-[#2D2A26] dark:text-white">
                {editingNoteId ? 'Edit Journal Entry' : 'New Journal Entry'}
              </span>
              <div className="flex items-center bg-[#FAF8F5] dark:bg-slate-800 p-0.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setFormType('text')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    formType === 'text'
                      ? 'bg-[#5B8266] text-white shadow-2xs'
                      : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26]'
                  }`}
                >
                  Reflection
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('checklist')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    formType === 'checklist'
                      ? 'bg-[#5B8266] text-white shadow-2xs'
                      : 'text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26]'
                  }`}
                >
                  Checklist
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="p-1 rounded-lg text-[#8C8377] hover:text-[#2D2A26] dark:text-slate-400 dark:hover:text-white hover:bg-[#EAE4D9] dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Journal entry title or headline..."
              className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-white placeholder:text-[#A0988A] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B8266]"
            />

            {formType === 'text' ? (
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your journal thoughts, reflections, or ideas here..."
                rows={4}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-white placeholder:text-[#A0988A] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B8266] resize-none"
              />
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFormChecklistItem();
                      }
                    }}
                    placeholder="Add checklist item and press Enter..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-white placeholder:text-[#A0988A] focus:outline-none focus:border-[#5B8266]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFormChecklistItem}
                    className="px-3 py-2 rounded-xl bg-[#5B8266] hover:bg-[#4E7058] text-white text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    Add
                  </button>
                </div>

                {formChecklistItems.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {formChecklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E8E2D8] dark:border-slate-700/80 text-xs"
                      >
                        <span className="flex-1 text-[#2D2A26] dark:text-slate-100">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormChecklistItem(item.id)}
                          className="text-[#C05746] hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Note Metadata controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                {/* Category selection */}
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#8C8377] dark:text-slate-400" />
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Daily Journal"
                    className="w-28 px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#2D2A26] dark:text-white focus:outline-none"
                  />
                </div>

                {/* Color choices */}
                <div className="flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-[#8C8377] dark:text-slate-400" />
                  <div className="flex items-center gap-1">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormColor(col.id)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                          formColor === col.id ? 'scale-110 ring-2 ring-[#5B8266]' : 'opacity-70 hover:opacity-100'
                        } ${col.bg} ${col.border}`}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Pin toggle */}
                <button
                  type="button"
                  onClick={() => setFormPinned(!formPinned)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    formPinned
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-slate-800 text-[#7D766C] dark:text-slate-400 border-[#E5DFD5] dark:border-slate-700'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${formPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{formPinned ? 'Pinned' : 'Pin'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7D766C] dark:text-slate-300 hover:bg-[#EAE4D9] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-4 py-1.5 rounded-xl bg-[#5B8266] hover:bg-[#4E7058] text-white text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-[#ECE6DC] dark:border-slate-800">
          <BookMarked className="w-8 h-8 mx-auto text-[#A0988A] dark:text-slate-500 mb-2 opacity-60" />
          <p className="text-xs font-semibold text-[#4A453E] dark:text-slate-300">No journal entries found</p>
          <p className="text-[11px] text-[#8C8377] dark:text-slate-400 mt-0.5">
            Capture your thoughts, daily reflections, ideas, or personal checklists in your journal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Pinned Entries ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          {regularNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <div className="text-xs font-semibold text-[#8C8377] dark:text-slate-400 pt-2">
                  Journal Entries ({regularNotes.length})
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regularNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  function renderNoteCard(note: HRNote) {
    const colorCfg = getColorConfig(note.color);

    return (
      <div
        key={note.id}
        className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${colorCfg.bg} ${colorCfg.border} hover:shadow-xs hover:border-[#5B8266]/40 dark:hover:border-emerald-600/40`}
      >
        <div>
          {/* Top card bar */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {note.type === 'checklist' ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#5B8266] dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <BookMarked className="w-3.5 h-3.5 text-[#8C8377] dark:text-slate-400 shrink-0 mt-0.5" />
              )}
              <h4 className="text-xs font-serif font-bold text-[#2D2A26] dark:text-white truncate">
                {note.title}
              </h4>
            </div>

            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleTogglePin(note)}
                className={`p-1 rounded-lg text-xs cursor-pointer transition-colors ${
                  note.pinned
                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                    : 'text-[#A0988A] hover:text-amber-600 dark:text-slate-500'
                }`}
                title={note.pinned ? 'Unpin' : 'Pin to top'}
              >
                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleStartEdit(note)}
                className="p-1 rounded-lg text-[#A0988A] hover:text-[#5B8266] dark:text-slate-500 dark:hover:text-emerald-400 cursor-pointer"
                title="Edit journal entry"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleDeleteNote(note.id, note.title)}
                className="p-1 rounded-lg text-[#A0988A] hover:text-[#C05746] dark:text-slate-500 dark:hover:text-rose-400 cursor-pointer"
                title="Delete journal entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content / Checklist display */}
          {note.type === 'checklist' && note.checklistItems && note.checklistItems.length > 0 ? (
            <div className="space-y-1.5 my-2.5">
              {note.checklistItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2 text-xs text-[#4A453E] dark:text-slate-300 cursor-pointer select-none group/item"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(note.id, item.id)}
                    className="mt-0.5 rounded text-[#5B8266] focus:ring-[#5B8266] dark:bg-slate-900 border-[#D5CDC0] dark:border-slate-600 cursor-pointer"
                  >
                  </input>
                  <span
                    className={`flex-1 transition-all ${
                      item.completed
                        ? 'line-through text-[#A0988A] dark:text-slate-500 opacity-70'
                        : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5C554B] dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6 my-2">
              {note.content || <span className="italic text-[#A0988A]">No content</span>}
            </p>
          )}
        </div>

        {/* Footer info: Category and date */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#ECE6DC] dark:border-slate-700/60 text-[10px] text-[#8C8377] dark:text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/60 font-medium border border-[#E5DFD5] dark:border-slate-700/60">
            {note.category || 'Daily Journal'}
          </span>
          <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}</span>
        </div>
      </div>
    );
  }
};

export const MyJournalCard = HRNotesCard;
