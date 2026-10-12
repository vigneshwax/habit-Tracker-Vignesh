import React, { useState } from 'react';
import { KeepNote, ChecklistItem, NoteColor } from '../types';
import {
  Pin,
  Plus,
  CheckSquare,
  AlignLeft,
  Trash2,
  Edit2,
  Tag,
  Palette,
} from 'lucide-react';

interface KeepNotesViewProps {
  notes: KeepNote[];
  onOpenNewNoteModal: () => void;
  onEditNote: (note: KeepNote) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onToggleChecklistItem: (noteId: string, itemId: string) => void;
  onChangeColor: (noteId: string, color: NoteColor) => void;
}

const NOTE_COLOR_STYLES: Record<string, { bg: string; border: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800' },
};

const COLOR_PALETTE: NoteColor[] = ['amber', 'blue', 'emerald', 'purple', 'rose', 'cyan', 'slate'];

export const KeepNotesView: React.FC<KeepNotesViewProps> = ({
  notes,
  onOpenNewNoteModal,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onToggleChecklistItem,
  onChangeColor,
}) => {
  const [activeColorPickerNoteId, setActiveColorPickerNoteId] = useState<string | null>(null);

  const pinnedNotes = notes.filter((n) => n.pinned);
  const otherNotes = notes.filter((n) => !n.pinned);

  const renderNoteCard = (note: KeepNote) => {
    const style = NOTE_COLOR_STYLES[note.color || 'amber'] || NOTE_COLOR_STYLES.amber;
    const isChecklist = note.type === 'checklist';

    return (
      <div
        key={note.id}
        className={`relative flex flex-col justify-between p-4 rounded-2xl border ${style.border} ${style.bg} shadow-xs hover:shadow-md transition space-y-3`}
      >
        {/* Top Header: Title & Pin */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {note.title}
            </h3>
            <button
              type="button"
              onClick={() => onTogglePin(note.id)}
              className={`p-1 rounded-lg transition shrink-0 ${
                note.pinned
                  ? 'text-amber-500'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className={`w-4 h-4 ${note.pinned ? 'fill-amber-500 rotate-45' : ''}`} />
            </button>
          </div>

          {/* Tag if present */}
          {note.category && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              <Tag className="w-3 h-3" /> {note.category}
            </div>
          )}

          {/* Text Content */}
          {note.content && (
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          )}

          {/* Interactive Checklist Items */}
          {isChecklist && note.checklistItems && note.checklistItems.length > 0 && (
            <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              {note.checklistItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2 text-xs cursor-pointer group select-none"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleChecklistItem(note.id, item.id)}
                    className="w-3.5 h-3.5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span
                    className={`leading-tight transition ${
                      item.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-slate-400">
          <span className="text-[10px]">
            {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-1 relative">
            {/* Color picker popup */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveColorPickerNoteId(
                    activeColorPickerNoteId === note.id ? null : note.id
                  )
                }
                className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                title="Change Note Color"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {activeColorPickerNoteId === note.id && (
                <div className="absolute bottom-full right-0 mb-1.5 p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 z-20">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onChangeColor(note.id, c);
                        setActiveColorPickerNoteId(null);
                      }}
                      className={`w-5 h-5 rounded-full border border-slate-300 ${
                        NOTE_COLOR_STYLES[c]?.bg || 'bg-amber-100'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onEditNote(note)}
              className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
              title="Edit Note"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteNote(note.id)}
              className="p-1 hover:text-red-600 rounded"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="max-w-2xl mx-auto">
        <div
          onClick={onOpenNewNoteModal}
          className="flex items-center justify-between p-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md cursor-pointer transition"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Take a note or create checklist...
          </span>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <CheckSquare className="w-4 h-4 text-indigo-500" />
            </span>
            <span className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <Plus className="w-4 h-4 text-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-amber-500" /> Pinned Notes ({pinnedNotes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {/* Other Notes Section */}
      <div className="space-y-3">
        {pinnedNotes.length > 0 && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Other Notes ({otherNotes.length})
          </h3>
        )}
        {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No keep notes created yet. Click the bar above to create an HR memo or onboarding checklist.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherNotes.map((note) => renderNoteCard(note))}
          </div>
        )}
      </div>
    </div>
  );
};
