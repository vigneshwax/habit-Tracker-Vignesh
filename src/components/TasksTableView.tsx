import React, { useState, useMemo } from 'react';
import { HRTask, TaskPriority, TaskStatus } from '../types';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  User,
  ArrowUpDown,
} from 'lucide-react';

interface TasksTableViewProps {
  tasks: HRTask[];
  onOpenNewTaskModal: () => void;
  onEditTask: (task: HRTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
}

export const TasksTableView: React.FC<TasksTableViewProps> = ({
  tasks,
  onOpenNewTaskModal,
  onEditTask,
  onDeleteTask,
  onToggleStatus,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.category));
    return ['All', ...Array.from(set)];
  }, [tasks]);

  // Filter & Sort
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
        if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
        if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchAssignee = (t.assignedTo || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchNotes && !matchAssignee) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') {
          cmp = (a.date || '').localeCompare(b.date || '');
        } else if (sortBy === 'priority') {
          const pRank = { High: 3, Medium: 2, Low: 1 };
          cmp = (pRank[a.priority] || 0) - (pRank[b.priority] || 0);
        } else if (sortBy === 'status') {
          cmp = (a.status || '').localeCompare(b.status || '');
        } else if (sortBy === 'title') {
          cmp = (a.title || '').localeCompare(b.title || '');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [tasks, selectedCategory, selectedPriority, selectedStatus, searchQuery, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'priority' | 'status' | 'title') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, notes, assignee..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* New Task Action */}
          <button
            type="button"
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Task
          </button>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="All">Priority: All</option>
            <option value="High">Priority: High</option>
            <option value="Medium">Priority: Medium</option>
            <option value="Low">Priority: Low</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="All">Status: All</option>
            <option value="Pending">Status: Pending</option>
            <option value="In Progress">Status: In Progress</option>
            <option value="Completed">Status: Completed</option>
            <option value="Deferred">Status: Deferred</option>
          </select>

          {(selectedCategory !== 'All' || selectedPriority !== 'All' || selectedStatus !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedPriority('All');
                setSelectedStatus('All');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th
                  onClick={() => toggleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Task Title & Description <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th
                  onClick={() => toggleSort('priority')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Priority <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Date & Time <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Follow-Up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching HR tasks found. Try adjusting your filters or click "Add New Task".
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === 'Completed';
                  const isFollowUpDue = task.followUpDate && task.followUpDate <= todayStr && !isCompleted;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(task.id)}
                          className={`p-1 rounded-lg transition ${
                            isCompleted
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'text-slate-400 hover:text-emerald-500'
                          }`}
                          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div
                          className={`font-semibold text-sm ${
                            isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {task.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            task.priority === 'High'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : task.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {task.date}
                        </div>
                        {task.time && <div className="text-[11px] text-slate-400 mt-0.5">{task.time}</div>}
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {task.assignedTo ? (
                          <div className="flex items-center gap-1 font-medium">
                            <User className="w-3 h-3 text-slate-400" /> {task.assignedTo}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Follow-Up */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.followUpDate ? (
                          <span
                            className={`flex items-center gap-1 font-medium text-xs ${
                              isFollowUpDue
                                ? 'text-amber-700 dark:text-amber-300 font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {isFollowUpDue && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                            {task.followUpDate}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
