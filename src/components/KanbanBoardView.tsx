import React from 'react';
import { HRTask, TaskStatus } from '../types';
import {
  Clock,
  TrendingUp,
  CheckCircle2,
  PauseCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';

interface KanbanBoardViewProps {
  tasks: HRTask[];
  onOpenNewTaskModal: () => void;
  onEditTask: (task: HRTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; icon: React.ReactNode; bgClass: string; borderClass: string }[] = [
  {
    id: 'Pending',
    label: 'Pending',
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
  },
  {
    id: 'In Progress',
    label: 'In Progress',
    icon: <TrendingUp className="w-4 h-4 text-indigo-500" />,
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
  },
  {
    id: 'Completed',
    label: 'Completed',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
  },
  {
    id: 'Deferred',
    label: 'Deferred',
    icon: <PauseCircle className="w-4 h-4 text-slate-500" />,
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/30',
  },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  onOpenNewTaskModal,
  onEditTask,
  onDeleteTask,
  onUpdateStatus,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Kanban Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Operational Kanban Flow
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag or click status progression arrows to advance HR workflows
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewTaskModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      {/* 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-3 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${col.bgClass}`}>{col.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No {col.label.toLowerCase()} tasks
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const isFollowUpDue = task.followUpDate && task.followUpDate <= todayStr && col.id !== 'Completed';

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition space-y-2.5"
                      >
                        {/* Badges row */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {task.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              task.priority === 'High'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : task.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          onClick={() => onEditTask(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {task.title}
                        </h4>

                        {/* Description */}
                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Meta info: Date, Assignee, Follow-up */}
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {task.date}
                          </span>
                          {task.assignedTo && (
                            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <User className="w-3 h-3" /> {task.assignedTo}
                            </span>
                          )}
                        </div>

                        {isFollowUpDue && (
                          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3 text-amber-500" /> Follow-up: {task.followUpDate}
                          </div>
                        )}

                        {/* Actions & Progression Bar */}
                        <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                          {/* Quick stage progression */}
                          <div className="flex items-center gap-1">
                            {col.id === 'In Progress' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'Pending')}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                                title="Move back to Pending"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'In Progress')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-md hover:bg-indigo-100 transition"
                              >
                                Start <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'In Progress' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'Completed')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md hover:bg-emerald-100 transition"
                              >
                                Complete <CheckCircle2 className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'Completed' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'Pending')}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded transition text-[10px]"
                                title="Reopen as Pending"
                              >
                                Reopen
                              </button>
                            )}
                            {col.id !== 'Deferred' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'Deferred')}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                                title="Defer task"
                              >
                                <PauseCircle className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'Deferred' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'Pending')}
                                className="px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-md"
                              >
                                Restore
                              </button>
                            )}
                          </div>

                          {/* Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
