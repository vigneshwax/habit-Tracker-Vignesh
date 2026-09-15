import React, { useState } from 'react';
import { MoodTrackerEntry, MOOD_TRACKER_MAP } from '../../types';
import { api } from '../../api';
import { Trash2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useProtectedAction } from '../../context/ProtectedActionContext';

interface DeleteMoodModalProps {
  isOpen: boolean;
  entry: MoodTrackerEntry | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export const DeleteMoodModal: React.FC<DeleteMoodModalProps> = ({
  isOpen,
  entry,
  onClose,
  onDeleted,
}) => {
  if (!isOpen || !entry) return null;

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { executeProtected } = useProtectedAction();

  const meta = MOOD_TRACKER_MAP[entry.mood];

  const handleDelete = async () => {
    executeProtected(async () => {
      setIsDeleting(true);
      setErrorMessage('');
      try {
        await api.deleteMood(entry.id);
        onDeleted(entry.id);
        onClose();
      } catch (err: any) {
        console.error('Failed to delete mood entry:', err);
        setErrorMessage(err?.message || 'Failed to delete mood entry.');
      } finally {
        setIsDeleting(false);
      }
    }, `Delete Mood Entry for ${entry.date}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="delete-mood-modal"
        className="bg-[#FFFFFF] dark:bg-slate-800 rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8C8377] hover:text-[#2D2A26] dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-serif font-bold text-[#2D2A26] dark:text-white">
            Delete this mood entry?
          </h3>
          <p className="text-xs text-[#7D766C] dark:text-slate-400 mt-1">
            This will permanently remove your mood check-in for <strong>{entry.date}</strong> from your records.
          </p>

          <div className="mt-4 p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-750 border border-[#ECE6DC] dark:border-slate-700 flex items-center gap-3">
            <span className="text-2xl">{meta?.emoji || '🙂'}</span>
            <div className="text-xs">
              <div className="font-bold text-[#2D2A26] dark:text-slate-200">
                {meta?.label || entry.mood} • Score {entry.mood_score}/6
              </div>
              <div className="text-[#8C8377] dark:text-slate-400 mt-0.5">
                Energy: {entry.energy_level || 3} / 5 Stars
              </div>
              {entry.note && (
                <div className="text-[#4A453E] dark:text-slate-300 italic mt-1 line-clamp-1">
                  "{entry.note}"
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[#F0EBE1] dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#7D766C] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
