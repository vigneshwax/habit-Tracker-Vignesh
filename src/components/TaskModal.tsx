import React, { useState, useEffect } from 'react';
import { HRTask, TaskPriority, TaskStatus, TaskCategory } from '../types';
import { X, Calendar, Clock, User, Tag, AlertCircle, FileText } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<HRTask, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  taskToEdit?: HRTask | null;
  initialDate?: string;
}

const CATEGORIES: TaskCategory[] = [
  'Recruitment',
  'Payroll',
  'Employee Relations',
  'Training & Dev',
  'Compliance',
  'Operations',
  'Performance',
  'General',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00 AM');
  const [category, setCategory] = useState<string>('Recruitment');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [assignedTo, setAssignedTo] = useState('Vigneshwaran');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDate(taskToEdit.date);
      setTime(taskToEdit.time || '10:00 AM');
      setCategory(taskToEdit.category || 'General');
      setPriority(taskToEdit.priority || 'Medium');
      setStatus(taskToEdit.status || 'Pending');
      setAssignedTo(taskToEdit.assignedTo || 'Vigneshwaran');
      setDescription(taskToEdit.description || '');
      setNotes(taskToEdit.notes || '');
      setFollowUpDate(taskToEdit.followUpDate || '');
    } else {
      setTitle('');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setTime('10:00 AM');
      setCategory('Recruitment');
      setPriority('Medium');
      setStatus('Pending');
      setAssignedTo('Vigneshwaran');
      setDescription('');
      setNotes('');
      setFollowUpDate('');
    }
  }, [taskToEdit, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(
      {
        title: title.trim(),
        date,
        time: time.trim(),
        category,
        priority,
        status,
        assignedTo: assignedTo.trim(),
        description: description.trim(),
        notes: notes.trim(),
        followUpDate: followUpDate || undefined,
      },
      taskToEdit ? taskToEdit.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {taskToEdit ? 'Edit HR Task' : 'Create New HR Task'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronized across LocalStorage & Google Sheets
              </p>
            </div>
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
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title / Activity Summary *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conduct Technical Interview with Senior HR Lead"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Grid row: Date, Time, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:30 AM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid row: Priority, Status, Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🔵 Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">⏳ Pending</option>
                <option value="In Progress">⚡ In Progress</option>
                <option value="Completed">✅ Completed</option>
                <option value="Deferred">⏸️ Deferred</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Assigned To
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Vigneshwaran"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Follow-Up Alert Date (Optional)
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Extended Description / Steps
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed agenda, candidate background, or action points..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Internal Updates & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Confidential notes, feedback, or follow-up outcomes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
