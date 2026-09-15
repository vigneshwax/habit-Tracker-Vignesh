import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { WeeklyPlan } from '../types';
import { Target, CheckSquare, Sparkles, Check, AlertCircle, Calendar } from 'lucide-react';
import { useProtectedAction } from '../context/ProtectedActionContext';

interface WeeklyPlanningCardProps {
  year: number;
  month: number;
  weekNumber: number;
  onSaved?: () => void;
}

export function WeeklyPlanningCard({ year, month, weekNumber, onSaved }: WeeklyPlanningCardProps) {
  const [mainGoal, setMainGoal] = useState<string>('');
  const [p1, setP1] = useState<string>('');
  const [p2, setP2] = useState<string>('');
  const [p3, setP3] = useState<string>('');
  const [targetPct, setTargetPct] = useState<number>(85);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;
    async function loadPlan() {
      try {
        const res = await api.getWeeklyPlans(year, month);
        if (isMounted && res.plans) {
          const currentPlan = res.plans.find((p) => p.week_number === weekNumber);
          if (currentPlan) {
            setMainGoal(currentPlan.main_goal || '');
            setP1(currentPlan.priority_1 || '');
            setP2(currentPlan.priority_2 || '');
            setP3(currentPlan.priority_3 || '');
            setTargetPct(currentPlan.target_percentage || 85);
          } else {
            setMainGoal('');
            setP1('');
            setP2('');
            setP3('');
            setTargetPct(85);
          }
        }
      } catch (err) {
        // silent fallback
      }
    }
    loadPlan();
    return () => {
      isMounted = false;
    };
  }, [year, month, weekNumber]);

  const { executeProtected } = useProtectedAction();

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeProtected(async () => {
      setIsSaving(true);
      setSaveStatus('idle');
      try {
        await api.saveWeeklyPlan({
          year,
          month,
          week_number: weekNumber,
          main_goal: mainGoal,
          priority_1: p1,
          priority_2: p2,
          priority_3: p3,
          target_percentage: targetPct,
        });
        setSaveStatus('saved');
        if (onSaved) onSaved();
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setSaveStatus('error');
      } finally {
        setIsSaving(false);
      }
    }, 'Save Weekly Priorities');
  };

  return (
    <div id="v3-weekly-planning-card" className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Week {weekNumber} Planning & Priorities
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set 1 primary weekly outcome and your 3 non-negotiables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
              <AlertCircle className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        {/* Main Weekly Goal */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1">
            ⭐ Main Weekly Milestone
          </label>
          <input
            type="text"
            value={mainGoal}
            onChange={(e) => setMainGoal(e.target.value)}
            placeholder="e.g. Complete 5 gym sessions & finish Chapter 4"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 3 Top Priorities */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            🎯 Top 3 Non-Negotiable Habits / Actions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder="1. Priority #1 (e.g. 7am workout)"
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="2. Priority #2 (e.g. 0 junk food)"
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              value={p3}
              onChange={(e) => setP3(e.target.value)}
              placeholder="3. Priority #3 (e.g. 30m reading)"
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Target Consistency slider & Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Target Consistency: {targetPct}%
            </span>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={targetPct}
              onChange={(e) => setTargetPct(parseInt(e.target.value, 10))}
              className="accent-purple-600 w-32"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? 'Saving...' : 'Lock In Weekly Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
