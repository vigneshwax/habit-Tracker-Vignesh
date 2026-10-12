import React from 'react';
import { HRTask, KeepNote, ViewTab } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  FolderOpen,
  Pin,
  Calendar,
  User,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  tasks: HRTask[];
  notes: KeepNote[];
  onNavigateTab: (tab: ViewTab) => void;
  onOpenNewTaskModal: () => void;
  onOpenNewNoteModal: () => void;
  onOpenExportModal: () => void;
  onSyncNow: () => void;
  onToggleTaskStatus: (taskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  notes,
  onNavigateTab,
  onOpenNewTaskModal,
  onOpenNewNoteModal,
  onOpenExportModal,
  onSyncNow,
  onToggleTaskStatus,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
  const highPriorityTasks = tasks.filter((t) => t.priority === 'High' && t.status !== 'Completed').length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Follow-up reminders (due today or within 48 hours)
  const todayStr = new Date().toISOString().slice(0, 10);
  const urgentFollowUps = tasks.filter(
    (t) => t.followUpDate && t.status !== 'Completed' && t.followUpDate <= todayStr
  );

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  const pinnedNotes = notes.filter((n) => n.pinned).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <span>Command Center Active</span>
              <span>•</span>
              <span>vigneshwaran.ofcl@gmail.com</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              HR Operations & Task Command Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Real-time synchronization across 3 data tiers: LocalStorage (0ms) • Google Sheets Cloud • Multi-Sheet Excel engine
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Quick Add Task
            </button>
            <button
              type="button"
              onClick={onSyncNow}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Cloud
            </button>
            <button
              type="button"
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export Excel
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-300">Overall Task Execution Velocity</span>
            <span className="font-bold text-indigo-300">
              {completionPercentage}% Completed ({completedTasks}/{totalTasks})
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Follow-up reminder alert if any */}
      {urgentFollowUps.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {urgentFollowUps.length} Urgent Follow-Up Alert{urgentFollowUps.length > 1 ? 's' : ''} Today
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {urgentFollowUps.map((t) => t.title).join(' • ')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="text-xs font-bold text-amber-800 dark:text-amber-200 underline shrink-0 hover:text-amber-950"
          >
            View in Tasks Table &rarr;
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tasks</span>
            <span className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              <FolderOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{totalTasks}</div>
          <div className="text-xs text-slate-500 mt-1">Logged in local workspace</div>
        </div>

        {/* Pending */}
        <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending
            </span>
            <span className="p-2 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-900 dark:text-amber-300 mt-2">{pendingTasks}</div>
          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">Awaiting action</div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              In Progress
            </span>
            <span className="p-2 bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-900 dark:text-indigo-300 mt-2">{inProgressTasks}</div>
          <div className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">Under active review</div>
        </div>

        {/* Completed */}
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Completed
            </span>
            <span className="p-2 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-300 mt-2">{completedTasks}</div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Finalized & archived</div>
        </div>
      </div>

      {/* Main Grid: Priority / Active Tasks & Notes Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Priority Tasks */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Active Priority Tasks
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {highPriorityTasks} high-priority tasks requiring executive attention
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              All Tasks ({totalTasks}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks
              .filter((t) => t.status !== 'Completed')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id)}
                      className="p-1 text-slate-400 hover:text-emerald-500 rounded transition shrink-0"
                      title="Mark as Completed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {task.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {task.date}
                        </span>
                        {task.assignedTo && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.assignedTo}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        task.priority === 'High'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : task.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        task.status === 'In Progress'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Col: Category Breakdown & Keep Notes Preview */}
        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Department & Category Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinned Notes Preview */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <Pin className="w-4 h-4 text-amber-500" /> Pinned Keep Notes
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('notes')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                All Notes &rarr;
              </button>
            </div>

            <div className="space-y-2">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onNavigateTab('notes')}
                  className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer hover:shadow-xs transition"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {note.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {note.content || `${note.checklistItems?.length || 0} checklist items`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
