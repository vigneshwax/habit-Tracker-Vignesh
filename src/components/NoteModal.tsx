import React, { useState, useEffect } from 'react';
import { KeepNote, ChecklistItem, NoteColor } from '../types';
import { X, CheckSquare, AlignLeft, Plus, Trash2, Pin } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Omit<KeepNote, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  noteToEdit?: KeepNote | null;
}

const COLOR_OPTIONS: { name: NoteColor; label: string; bgClass: string; borderClass: string }[] = [
  { name: 'amber', label: 'Amber', bgClass: 'bg-amber-100 dark:bg-amber-950/70', borderClass: 'border-amber-300 dark:border-amber-700' },
  { name: 'blue', label: 'Blue', bgClass: 'bg-blue-100 dark:bg-blue-950/70', borderClass: 'border-blue-300 dark:border-blue-700' },
  { name: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-100 dark:bg-emerald-950/70', borderClass: 'border-emerald-300 dark:border-emerald-700' },
  { name: 'purple', label: 'Purple', bgClass: 'bg-purple-100 dark:bg-purple-950/70', borderClass: 'border-purple-300 dark:border-purple-700' },
  { name: 'rose', label: 'Rose', bgClass: 'bg-rose-100 dark:bg-rose-950/70', borderClass: 'border-rose-300 dark:border-rose-700' },
  { name: 'cyan', label: 'Cyan', bgClass: 'bg-cyan-100 dark:bg-cyan-950/70', borderClass: 'border-cyan-300 dark:border-cyan-700' },
  { name: 'slate', label: 'Slate', bgClass: 'bg-slate-100 dark:bg-slate-800', borderClass: 'border-slate-300 dark:border-slate-700' },
];

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  noteToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'checklist'>('text');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [category, setCategory] = useState('General');
  const [pinned, setPinned] = useState(false);
  const [color, setColor] = useState<NoteColor>('amber');
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setType((noteToEdit.type as 'checklist' | 'text') || 'text');
      setChecklistItems(noteToEdit.checklistItems ? [...noteToEdit.checklistItems] : []);
      setCategory(noteToEdit.category || 'General');
      setPinned(noteToEdit.pinned);
      setColor((noteToEdit.color as NoteColor) || 'amber');
    } else {
      setTitle('');
      setContent('');
      setType('text');
      setChecklistItems([]);
      setCategory('General');
      setPinned(false);
      setColor('amber');
      setNewChecklistText('');
    }
  }, [noteToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        text: newChecklistText.trim(),
        completed: false,
      },
    ]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && checklistItems.length === 0) return;

    onSave(
      {
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        type,
        checklistItems: type === 'checklist' ? checklistItems : undefined,
        category: category.trim() || 'General',
        pinned,
        color,
      },
      noteToEdit ? noteToEdit.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {noteToEdit ? 'Edit Keep Note' : 'Create Keep Note'}
            </h2>
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`p-1.5 rounded-lg border transition ${
                pinned
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                  : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={pinned ? 'Pinned to top' : 'Pin note to top'}
            >
              <Pin className={`w-4 h-4 ${pinned ? 'fill-amber-500 rotate-45' : ''}`} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Note Type switcher */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setType('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                type === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Text Note
            </button>
            <button
              type="button"
              onClick={() => setType('checklist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                type === 'checklist'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Checklist Note
            </button>
          </div>

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className="w-full text-base font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Text Content */}
          <div>
            <textarea
              rows={type === 'checklist' ? 2 : 5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'checklist' ? 'Optional note summary...' : 'Take a note...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Checklist Editor if type is checklist */}
          {type === 'checklist' && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Checklist Items ({checklistItems.filter((i) => i.completed).length}/{checklistItems.length} completed)
              </label>

              {/* Items list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item bar */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add item..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          )}

          {/* Color & Category Picker */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Note Color
              </label>
              <div className="flex items-center gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={`w-6 h-6 rounded-full border-2 transition ${c.bgClass} ${
                      color === c.name ? 'ring-2 ring-indigo-500 scale-110 border-indigo-600' : 'border-slate-300'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Tag / Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Onboarding, Policy..."
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {noteToEdit ? 'Save Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
