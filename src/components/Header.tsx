import React, { useState, useEffect } from 'react';
import {
  Check,
  RefreshCw,
  AlertCircle,
  Lock,
  Unlock,
  LayoutGrid,
  Calendar as CalendarIcon,
  BarChart3,
  ChevronDown,
  Zap,
  BookOpen,
  BookMarked,
  Target,
  Smile,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Database,
} from 'lucide-react';
import { SaveStatus, ViewTab } from '../types';

interface HeaderProps {
  currentMonth?: number; // 1-12
  currentYear?: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onCurrentMonth?: () => void;
  saveStatus: SaveStatus;
  isUnlocked?: boolean;
  onLock: () => void;
  onUnlockRequest?: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  googleSheetsStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  isGoogleSheetsLinked?: boolean;
  onOpenGoogleSheets?: () => void;
  isDatabaseSyncing?: boolean;
}

interface NavItem {
  id: ViewTab;
  label: React.ReactNode;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Today', icon: Zap },
  { id: 'journal', label: <><span className="hidden sm:inline lg:hidden xl:inline">My </span>Journal</>, icon: BookMarked },
  { id: 'goals', label: <><span className="hidden sm:inline lg:hidden xl:inline">Vision & </span>Goals</>, icon: Target },
  { id: 'grid', label: <><span className="hidden sm:inline lg:hidden xl:inline">Grid </span>View</>, icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'analytics', label: <>Analytics<span className="hidden sm:inline lg:hidden xl:inline"> & Trends</span></>, icon: BarChart3 },
  { id: 'review', label: <>Review<span className="hidden sm:inline lg:hidden xl:inline"> & Reflect</span></>, icon: BookOpen },
  { id: 'mood', label: <>Mood<span className="hidden sm:inline lg:hidden xl:inline"> Tracker</span></>, icon: Smile },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  saveStatus,
  isUnlocked = false,
  onLock,
  onUnlockRequest,
  activeTab,
  onTabChange,
  onExport,
  isDarkMode = false,
  onToggleTheme,
  googleSheetsStatus = 'idle',
  isGoogleSheetsLinked = false,
  onOpenGoogleSheets,
  isDatabaseSyncing = false,
}) => {
  const [isManuallyHidden, setIsManuallyHidden] = useState(false);

  // State: tabs are hidden only when manually toggled by user
  const isHidden = isManuallyHidden;

  // Toggle navigation tabs collapse/expand manually
  const handleToggleNav = () => {
    setIsManuallyHidden((prev) => !prev);
  };

  return (
    <header className="bg-[#FFFFFF] dark:bg-slate-900 border-b border-[#ECE6DC] dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 transition-all duration-300">
        {/* Top row: Brand, Save Status & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Brand & Personal Identifier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight">
                Vignesh Habit Tracker
              </h1>
            </div>

            {/* Mobile quick actions */}
            <div className="flex md:hidden items-center gap-1.5">
              {isDatabaseSyncing && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#EBF3EE] dark:bg-emerald-950/70 border border-[#5B8266]/40 dark:border-emerald-600/50 text-[11px] font-semibold text-[#2C523A] dark:text-emerald-300 shadow-2xs animate-pulse"
                  title="Syncing with database in the background..."
                >
                  <RefreshCw className="w-3 h-3 animate-spin text-[#5B8266] dark:text-emerald-400" />
                  <span>Syncing...</span>
                </div>
              )}
              {/* Mobile Edit Status Indicator */}
              <button
                type="button"
                id="mobile-lock-status-btn"
                onClick={isUnlocked ? onLock : onUnlockRequest}
                className={`p-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs select-none ${
                  isUnlocked
                    ? 'bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2C523A] dark:text-emerald-300 border-[#5B8266]/40 dark:border-emerald-500/50'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736A5E] dark:text-slate-300 border-[#E5DFD5] dark:border-slate-700 hover:text-[#2D2A26] dark:hover:text-white'
                }`}
                title={isUnlocked ? 'Editing Unlocked. Tap to Lock.' : 'Public View Only. Tap to Unlock Editing with Password.'}
                aria-label={isUnlocked ? 'Lock editing' : 'Unlock editing with Password'}
              >
                {isUnlocked ? (
                  <Unlock className="w-4 h-4 text-[#2C523A] dark:text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                id="mobile-nav-toggle-btn"
                onClick={handleToggleNav}
                className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
                  isHidden
                    ? 'bg-[#EBF3EE] dark:bg-emerald-950/50 text-[#386345] dark:text-emerald-300 border border-[#5B8266]/30 dark:border-emerald-500/40'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736A5E] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-700 hover:text-[#2D2A26] dark:hover:text-white'
                }`}
                title={isHidden ? 'Show Navigation Tabs' : 'Hide Navigation Tabs'}
                aria-label={isHidden ? 'Show Navigation Tabs' : 'Hide Navigation Tabs'}
                aria-expanded={!isHidden}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ease-out ${
                    isHidden
                      ? 'rotate-0 text-[#5B8266] dark:text-emerald-400'
                      : 'rotate-180 text-[#736A5E] dark:text-slate-400'
                  }`}
                />
              </button>
              {onToggleTheme && (
                <button
                  id="mobile-theme-toggle-btn"
                  type="button"
                  onClick={onToggleTheme}
                  className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 text-[#736A5E] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white text-xs font-semibold cursor-pointer transition-all active:scale-95"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label="Toggle dark and light mode"
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sync status & Actions on Desktop (CSS Selector: div#root > div > header > div > div > div:nth-of-type(2)) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0" id="header-desktop-actions">
            {/* Visual Edit Protection Indicator: Compact Icon Button */}
            {isUnlocked ? (
              <button
                type="button"
                id="header-edit-unlocked-indicator"
                onClick={onLock}
                className="p-2 rounded-xl bg-[#EBF3EE] dark:bg-emerald-950/60 hover:bg-[#DEECE2] dark:hover:bg-emerald-950/80 border border-[#5B8266]/35 dark:border-emerald-500/40 text-[#2C523A] dark:text-emerald-300 transition-all cursor-pointer select-none active:scale-95 shadow-2xs"
                title="Editing is Unlocked (15-minute session active). Click to lock back to View Only."
                aria-label="Lock editing back to View Only"
              >
                <Unlock className="w-4 h-4 text-[#2C523A] dark:text-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                id="header-view-only-indicator"
                onClick={onUnlockRequest}
                className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-[#736A5E] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white transition-all cursor-pointer select-none active:scale-95 shadow-2xs"
                title="View Only mode. Click to unlock with password."
                aria-label="Unlock editing with password"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {/* Live Save Status & Background Database Sync Indicator */}
            <div className="flex items-center">
              {isDatabaseSyncing ? (
                <div
                  id="database-syncing-indicator"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs select-none transition-all duration-300 animate-pulse"
                  title="Background database synchronization is running quietly. Web view and all features remain completely responsive."
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="tracking-tight">Syncing in background...</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              ) : saveStatus === 'saving' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#E8E2D8] dark:border-slate-700 text-xs text-[#8C7A6B] dark:text-slate-400 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C7A6B]" />
                  <span>Saving...</span>
                </div>
              ) : saveStatus === 'saved' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F7F2] dark:bg-emerald-950/40 border border-[#D3E8D8] dark:border-emerald-800 text-xs font-medium text-[#40684C] dark:text-emerald-300 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-[#5B8266]" />
                  <span>{isGoogleSheetsLinked ? 'Sheet Synced ✓' : 'Saved ✓'}</span>
                </div>
              ) : saveStatus === 'error' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF2F0] dark:bg-rose-950/40 border border-[#F5D5D0] dark:border-rose-800 text-xs text-[#C05746] dark:text-rose-300 shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Sync Error</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#E8E2D8] dark:border-slate-700 text-xs text-[#7D766C] dark:text-slate-400 shadow-2xs"
                  title={isGoogleSheetsLinked ? 'Primary Database: Google Sheet (Two-Way Live Sync Active)' : 'Persistent Local Storage Engine Active'}
                >
                  <span className={`w-2 h-2 rounded-full ${isGoogleSheetsLinked ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-[#5B8266] ring-2 ring-[#5B8266]/30'}`} />
                  <span className="font-medium text-[#4A453E] dark:text-slate-300">{isGoogleSheetsLinked ? 'Google Sheet' : 'Persistent Storage'}</span>
                </div>
              )}
            </div>

            {/* Google Sheets Live Database Center Quick Button */}
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all active:scale-95 shadow-2xs hover:shadow-xs ${
                isGoogleSheetsLinked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-[#FAF8F5] dark:bg-slate-800 border-[#E8E2D8] dark:border-slate-700 text-[#736A5E] dark:text-slate-300 hover:text-[#2D2A26] dark:hover:text-white'
              }`}
              title={
                isGoogleSheetsLinked
                  ? 'Google Sheet Database is connected. Click to open live sync center.'
                  : 'Connect Google Sheet Database for two-way live spreadsheet synchronization.'
              }
            >
              {googleSheetsStatus === 'syncing' ? (
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-semibold">Reflecting to Sheet...</span>
                </div>
              ) : googleSheetsStatus === 'synced' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-semibold">Sheet Synced ✓</span>
                </div>
              ) : googleSheetsStatus === 'error' ? (
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span className="text-[11px] font-semibold">Sheet Error</span>
                </div>
              ) : isGoogleSheetsLinked ? (
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25" />
                  <span className="text-[11px] font-medium">Sheet Linked</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-[#8C8377] dark:text-slate-400" />
                  <span className="text-[11px]">Google Sheet</span>
                </div>
              )}
            </button>

            {/* Theme Toggle Button (Desktop) */}
            {onToggleTheme && (
              <button
                id="header-theme-toggle-desktop"
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 border border-[#E5DFD5] dark:border-slate-700 text-xs font-semibold text-[#5C554B] dark:text-slate-300 transition-all cursor-pointer select-none active:scale-95"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle dark and light mode"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden lg:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden lg:inline">Dark</span>
                  </>
                )}
              </button>
            )}

            {/* Nav Tabs Manual Collapse/Expand Toggle (Desktop) */}
            <button
              id="header-nav-toggle-desktop"
              type="button"
              onClick={handleToggleNav}
              className={`group inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8266] dark:focus-visible:ring-emerald-400 ${
                isHidden
                  ? 'bg-[#EBF3EE] dark:bg-emerald-950/50 text-[#2D5438] dark:text-emerald-300 border border-[#5B8266]/35 dark:border-emerald-500/40 shadow-xs hover:bg-[#E2EDE6] dark:hover:bg-emerald-950/70'
                  : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#5C554B] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-700 hover:bg-[#F2ECE4] dark:hover:bg-slate-700/90 hover:text-[#2D2A26] dark:hover:text-white hover:border-[#D5CDC0] dark:hover:border-slate-600'
              }`}
              title={isHidden ? 'Show Navigation Tabs' : 'Hide Navigation Tabs'}
              aria-label={isHidden ? 'Show Navigation Tabs' : 'Hide Navigation Tabs'}
              aria-expanded={!isHidden}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-out ${
                  isHidden
                    ? 'rotate-0 text-[#5B8266] dark:text-emerald-400'
                    : 'rotate-180 text-[#8C8377] dark:text-slate-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom row: Main Navigation Views */}
        <div
          id="header-nav-tabs"
          className={`w-full grid transition-[grid-template-rows,opacity] duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[grid-template-rows,opacity] ${
            isHidden
              ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
              : 'grid-rows-[1fr] opacity-100 pointer-events-auto'
          }`}
        >
          <div
            className={`overflow-hidden min-h-0 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity,filter] ${
              isHidden
                ? '-translate-y-3 opacity-0 scale-[0.99] blur-[1px] pointer-events-none'
                : 'translate-y-0 opacity-100 scale-100 blur-0 pointer-events-auto'
            }`}
          >
            <div className="mt-2.5 pt-2.5 border-t border-[#F0EBE1] dark:border-slate-800/80 w-full transition-colors duration-300">
              <div
                className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 sm:gap-2 w-full"
                role="tablist"
                aria-label="Application views"
              >
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`tab-${item.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onTabChange(item.id)}
                      className={`group relative inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap w-full transform transition-all duration-200 ease-out will-change-transform active:scale-[0.96] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8266] dark:focus-visible:ring-emerald-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 ${
                        isActive
                          ? 'bg-[#5B8266] text-white shadow-[0_2px_8px_rgba(91,130,102,0.3)] dark:shadow-[0_2px_12px_rgba(16,185,129,0.22)] font-bold'
                          : 'bg-[#FAF8F5] dark:bg-slate-800/90 text-[#635B50] dark:text-slate-300 border border-[#E5DFD5] dark:border-slate-700/80 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 hover:text-[#2D2A26] dark:hover:text-white hover:border-[#D5CDC0] dark:hover:border-slate-600 hover:shadow-2xs'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-white dark:bg-emerald-300 shadow-xs" />
                      )}
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 ${
                          isActive
                            ? 'text-white'
                            : 'text-[#7D766C] dark:text-slate-400 group-hover:text-[#2D2A26] dark:group-hover:text-white'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

