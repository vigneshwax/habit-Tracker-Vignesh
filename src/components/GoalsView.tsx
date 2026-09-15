import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Goal, Habit, HabitCategory } from '../types';
import { useProtectedAction } from '../context/ProtectedActionContext';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Link2,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react';

interface GoalsViewProps {
  habits: Habit[];
  entries?: Record<string, boolean>;
  onRefreshHabits?: () => void;
  onAddHabitForGoal?: (goalId: string) => void;
}

export function GoalsView({ habits, entries, onRefreshHabits, onAddHabitForGoal }: GoalsViewProps) {
  const { executeProtected } = useProtectedAction();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formCategory, setFormCategory] = useState<HabitCategory>('fitness');
  const [formTargetDate, setFormTargetDate] = useState<string>('');
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'active' | 'completed' | 'paused'>('active');
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  // Delete Goal Confirmation Modal State
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const res = await api.getGoals();
      setGoals(res.goals || []);
    } catch (err) {
      console.warn('Error loading goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const openAddModal = () => {
    executeProtected(() => {
      setEditingGoal(null);
      setModalError('');
      setFormTitle('');
      setFormDesc('');
      setFormCategory('fitness');
      setFormTargetDate('');
      setFormProgress(0);
      setFormStatus('active');
      setSelectedHabitIds([]);
      setIsModalOpen(true);
    }, 'Add Vision Goal');
  };

  const openEditModal = (goal: Goal) => {
    executeProtected(() => {
      setEditingGoal(goal);
      setModalError('');
      setFormTitle(goal.title);
      setFormDesc(goal.description || '');
      setFormCategory(goal.category || 'fitness');
      setFormTargetDate(goal.target_date || '');
      setFormProgress(goal.progress || 0);
      setFormStatus(goal.status || 'active');
      // Linked habits
      const linked = habits.filter((h) => h.goal_id === goal.id).map((h) => h.id);
      setSelectedHabitIds(linked);
      setIsModalOpen(true);
    }, `Edit Goal: ${goal.title}`);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    executeProtected(async () => {
      setIsSaving(true);
      setModalError('');
      try {
        let savedGoalId = editingGoal?.id;
        if (editingGoal) {
          await api.editGoal(editingGoal.id, {
            title: formTitle.trim(),
            description: formDesc.trim(),
            category: formCategory,
            target_date: formTargetDate || undefined,
            progress: formProgress,
            status: formStatus,
          });
        } else {
          const res = await api.addGoal({
            title: formTitle.trim(),
            description: formDesc.trim(),
            category: formCategory,
            target_date: formTargetDate || undefined,
            progress: formProgress,
            status: formStatus,
          });
          savedGoalId = res.goal.id;
        }

        // Update linked habits
        if (savedGoalId) {
          for (const habit of habits) {
            const isSelected = selectedHabitIds.includes(habit.id);
            const wasLinked = habit.goal_id === savedGoalId;

            if (isSelected && !wasLinked) {
              await api.editHabit(habit.id, { goal_id: savedGoalId });
            } else if (!isSelected && wasLinked) {
              await api.editHabit(habit.id, { goal_id: null });
            }
          }
          if (onRefreshHabits) onRefreshHabits();
        }

        setIsModalOpen(false);
        showToast(editingGoal ? 'Vision goal updated successfully.' : 'New vision goal created.');
        loadGoals();
      } catch (err: any) {
        console.error('Error saving goal:', err);
        setModalError(err?.message || 'Error saving goal. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, editingGoal ? `Update Goal "${editingGoal.title}"` : 'Create Vision Goal');
  };

  const openDeleteModal = (goal: Goal) => {
    executeProtected(() => {
      setGoalToDelete(goal);
      setDeleteError('');
    }, `Delete Goal: ${goal.title}`);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    executeProtected(async () => {
      setIsDeleting(true);
      setDeleteError('');
      try {
        await api.deleteGoal(goalToDelete.id);

        // Unlink habits locally and notify parent
        for (const h of habits.filter((habit) => habit.goal_id === goalToDelete.id)) {
          try {
            await api.editHabit(h.id, { goal_id: null });
          } catch (e) {
            console.warn('Error unlinking habit:', e);
          }
        }

        // Optimistic update
        setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
        showToast(`Vision goal "${goalToDelete.title}" was deleted.`);
        setGoalToDelete(null);

        if (onRefreshHabits) onRefreshHabits();
        loadGoals();
      } catch (err: any) {
        console.error('Error deleting goal:', err);
        setDeleteError(err?.message || 'Failed to delete vision goal. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }, `Confirm Delete Goal: ${goalToDelete.title}`);
  };

  const handleQuickProgressUpdate = async (goal: Goal, newProgress: number) => {
    executeProtected(async () => {
      const clamped = Math.max(0, Math.min(100, newProgress));
      const newStatus = clamped === 100 ? 'completed' : goal.status;
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, progress: clamped, status: newStatus } : g)));
      try {
        await api.editGoal(goal.id, { progress: clamped, status: newStatus });
      } catch (err) {
        loadGoals();
      }
    }, `Update Goal Progress: ${goal.title}`);
  };

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'all') return true;
    return (g.status || 'active') === activeFilter;
  });

  return (
    <div id="v3-goals-view" className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Personal Growth Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Vision & Major Goals
          </h2>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Connect high-level aspirations to daily micro-disciplines. Track the bridge between your vision and daily execution.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Vision Goal
        </button>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {(['active', 'completed', 'paused', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                activeFilter === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab} ({goals.filter((g) => (tab === 'all' ? true : (g.status || 'active') === tab)).length})
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <strong>{filteredGoals.length}</strong> goal{filteredGoals.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading your goals...</div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No {activeFilter} goals found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Create your first major goal (e.g. "Run 10km Marathon", "Read 12 Books", "Pass AWS Architect Certification") and link daily habits to it!
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGoals.map((goal) => {
            const linkedHabits = habits.filter((h) => h.goal_id === goal.id);
            const isCompleted = goal.status === 'completed' || goal.progress === 100;

            return (
              <div
                key={goal.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 sm:p-6 shadow-sm transition-all space-y-4 ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {/* Top header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                        {goal.category}
                      </span>
                      {goal.status === 'paused' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Paused
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Achieved
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                      {goal.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(goal)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title="Delete Vision Goal"
                      aria-label={`Delete Vision Goal ${goal.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {goal.description}
                  </p>
                )}

                {/* Target Date */}
                {goal.target_date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Target: <strong>{goal.target_date}</strong></span>
                  </div>
                )}

                {/* Progress Bar & Slider */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Progress
                    </span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">Quick adjust:</span>
                    <div className="flex items-center gap-1">
                      {[25, 50, 75, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickProgressUpdate(goal, val)}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-750 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-600 dark:text-slate-300 rounded font-semibold transition-all"
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Linked Habits Hierarchy */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Linked Daily Habits ({linkedHabits.length})</span>
                  </div>

                  {linkedHabits.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No habits linked yet. Edit this goal to attach habits!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedHabits.map((h) => (
                        <span
                          key={h.id}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {h.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'Create Vision Goal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Run 10km Marathon, Read 12 Books"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Description / Why it matters
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Why is this important to you? What will success feel like?"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as HabitCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  >
                    <option value="fitness">Fitness</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="learning">Learning</option>
                    <option value="mindset">Mindset</option>
                    <option value="career">Career</option>
                    <option value="creativity">Creativity</option>
                    <option value="financial">Financial</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Progress ({formProgress}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Link Habits Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Link Supporting Habits
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  {habits.map((h) => {
                    const isChecked = selectedHabitIds.includes(h.id);
                    return (
                      <label
                        key={h.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHabitIds((prev) => [...prev, h.id]);
                            } else {
                              setSelectedHabitIds((prev) => prev.filter((id) => id !== h.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{h.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">({h.category})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                {editingGoal ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingGoal;
                      setIsModalOpen(false);
                      openDeleteModal(target);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Goal</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Delete Vision Goal Confirmation Modal */}
      {goalToDelete && (
        <div
          id="delete-goal-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            id="delete-goal-modal"
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setGoalToDelete(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white">
                Delete Vision Goal?
              </h3>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">
                &ldquo;{goalToDelete.title}&rdquo;
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to delete this vision goal? This action will permanently remove the goal from your tracker.
              </p>
            </div>

            {/* Linked habits status info */}
            {(() => {
              const linked = habits.filter((h) => h.goal_id === goalToDelete.id);
              if (linked.length > 0) {
                return (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{linked.length} linked habit{linked.length > 1 ? 's' : ''} will remain safe</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-normal">
                      Your daily habits and check-in history will <strong>not be deleted</strong>. They will simply be detached from this goal.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {linked.map((h) => (
                        <span
                          key={h.id}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-semibold border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 shadow-2xs"
                        >
                          {h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                  No active habits are currently linked to this goal.
                </div>
              );
            })()}

            {/* Error banner if any */}
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-goal-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Vision Goal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D2A26] text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl border border-[#4A453E] dark:border-slate-300 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
