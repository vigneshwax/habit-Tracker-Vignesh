import { HRTask, KeepNote, GoogleSheetsConfig, UserPreferences } from '../types';

export const STORAGE_KEYS = {
  TASKS: 'hr_daily_tasks_records_v1',
  NOTES: 'hr_daily_note_records_v1',
  SHEETS_DB_URL: 'google_sheets_database_url_v1',
  SHEETS_SHEET_URL: 'google_sheets_sheet_url_v1',
  LAST_SYNC_TIME: 'google_sheets_last_sync_time_v1',
  LAST_PULL_TIME: 'google_sheets_last_pull_time_v1',
  USER_NAME: 'hr_tracker_user_name',
  THEME: 'hr_tracker_theme',
  AUTO_BACKUP_EXIT: 'hr_tracker_auto_backup_exit',
  EDIT_TOKEN: 'hr_edit_token_v1',
} as const;

// Realistic initial seed data for HR Task Tracker & Command Center
const SEED_TASKS: HRTask[] = [
  {
    id: 'task-1712574921001-a1b2',
    date: new Date().toISOString().slice(0, 10),
    time: '09:30 AM',
    title: 'Review Engineering Lead Candidate Profiles',
    description: 'Screen resume pipeline from LinkedIn & referrals for senior engineering positions.',
    category: 'Recruitment',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'Vigneshwaran',
    notes: 'Shortlist top 3 candidates for technical round before 3 PM.',
    followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-1712574921002-c3d4',
    date: new Date().toISOString().slice(0, 10),
    time: '11:00 AM',
    title: 'Monthly Payroll Deductions & PF Reconciliation',
    description: 'Audit monthly attendance records, tax TDS slips, and provident fund contribution reports.',
    category: 'Payroll',
    priority: 'High',
    status: 'Pending',
    assignedTo: 'Vigneshwaran',
    notes: 'Coordinate with Finance team to release disbursement schedule.',
    followUpDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-1712574921003-e5f6',
    date: new Date().toISOString().slice(0, 10),
    time: '02:00 PM',
    title: 'Conduct Q4 Onboarding Orientation for New Joiners',
    description: 'Walk new hires through company culture, benefits package, NDA policy, and IT asset signoff.',
    category: 'Employee Relations',
    priority: 'Medium',
    status: 'Completed',
    assignedTo: 'HR Operations',
    notes: 'All 4 new engineers welcomed and Slack/GitHub access provisioned successfully.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-1712574921004-g7h8',
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: '10:00 AM',
    title: 'Statutory Labor Law & POSH Policy Compliance Audit',
    description: 'Verify quarterly POSH committee meeting minutes and employee training certificates.',
    category: 'Compliance',
    priority: 'High',
    status: 'Pending',
    assignedTo: 'Vigneshwaran',
    notes: 'Upload mandatory compliance declaration to the central registry.',
    followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-1712574921005-i9j0',
    date: new Date().toISOString().slice(0, 10),
    time: '04:30 PM',
    title: 'Organize Leadership Communication Workshop',
    description: 'Draft itinerary and booking logistics for mid-level managers soft skills program.',
    category: 'Training & Dev',
    priority: 'Low',
    status: 'Deferred',
    assignedTo: 'Training Team',
    notes: 'Rescheduled pending confirmation from keynote speaker.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_NOTES: KeepNote[] = [
  {
    id: 'note-1712574921001-xyz89',
    title: 'HR Induction Checklist (Batch 2026)',
    content: 'Standard onboarding flow for all incoming corporate and technical employees.',
    type: 'checklist',
    checklistItems: [
      { id: 'item-1', text: 'Collect signed NDA & Offer Letter copies', completed: true },
      { id: 'item-2', text: 'Submit government ID & address proofs for background check', completed: true },
      { id: 'item-3', text: 'Enroll in Corporate Health & Term Insurance', completed: false },
      { id: 'item-4', text: 'Issue IT hardware badge & biometric registration', completed: true },
      { id: 'item-5', text: 'Assign buddy mentor & 30-day milestone tracker', completed: false },
    ],
    category: 'Onboarding',
    pinned: true,
    color: 'amber',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-1712574921002-abc45',
    title: 'Annual Performance Appraisal Timeline & Weightage',
    content: 'Review cycles commence on the 1st of every quarter. Self-evaluation: 30%, Peer review: 20%, Manager review: 50%. Final bonus bands determined by executive committee.',
    type: 'text',
    category: 'Policy',
    pinned: true,
    color: 'blue',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-1712574921003-def67',
    title: 'Campus Recruitment Drive Targets',
    content: 'Targeting 25 high-performing graduates across Computer Science and Data Analytics streams. Key dates: Pre-placement talk on 15th, coding assessment on 18th.',
    type: 'text',
    category: 'Recruitment',
    pinned: false,
    color: 'emerald',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const storage = {
  // --- Tasks Storage ---
  getTasks(): HRTask[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) {
        // Seed default tasks on initial load
        this.saveTasks(SEED_TASKS);
        return SEED_TASKS;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[Storage] Error reading tasks from LocalStorage:', err);
      return [];
    }
  },

  saveTasks(tasks: HRTask[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (err) {
      console.error('[Storage] Error saving tasks to LocalStorage:', err);
    }
  },

  // --- Keep Notes Storage ---
  getNotes(): KeepNote[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (!data) {
        this.saveNotes(SEED_NOTES);
        return SEED_NOTES;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[Storage] Error reading notes from LocalStorage:', err);
      return [];
    }
  },

  saveNotes(notes: KeepNote[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (err) {
      console.error('[Storage] Error saving notes to LocalStorage:', err);
    }
  },

  // --- Google Sheets Sync Configuration ---
  getSheetsConfig(): GoogleSheetsConfig {
    if (typeof window === 'undefined') {
      return {
        databaseUrl: '',
        sheetUrl: '',
        lastSyncTime: null,
        lastPullTime: null,
        autoSyncEnabled: true,
        syncIntervalSeconds: 25,
      };
    }
    return {
      databaseUrl: localStorage.getItem(STORAGE_KEYS.SHEETS_DB_URL) || '',
      sheetUrl: localStorage.getItem(STORAGE_KEYS.SHEETS_SHEET_URL) || '',
      lastSyncTime: localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || null,
      lastPullTime: localStorage.getItem(STORAGE_KEYS.LAST_PULL_TIME) || null,
      autoSyncEnabled: true,
      syncIntervalSeconds: 25,
    };
  },

  saveSheetsConfig(config: Partial<GoogleSheetsConfig>): void {
    if (typeof window === 'undefined') return;
    if (config.databaseUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SHEETS_DB_URL, config.databaseUrl.trim());
    }
    if (config.sheetUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SHEETS_SHEET_URL, config.sheetUrl.trim());
    }
    if (config.lastSyncTime !== undefined && config.lastSyncTime !== null) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, config.lastSyncTime);
    }
    if (config.lastPullTime !== undefined && config.lastPullTime !== null) {
      localStorage.setItem(STORAGE_KEYS.LAST_PULL_TIME, config.lastPullTime);
    }
  },

  // --- User Preferences ---
  getUserPreferences(): UserPreferences {
    if (typeof window === 'undefined') {
      return {
        userName: 'Vigneshwaran',
        theme: 'light',
        defaultView: 'dashboard',
        autoBackupOnExit: true,
      };
    }
    const theme = (localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | 'system') || 'light';
    const userName = localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Vigneshwaran';
    return {
      userName,
      theme,
      defaultView: 'dashboard',
      autoBackupOnExit: true,
    };
  },

  saveUserPreferences(prefs: Partial<UserPreferences>): void {
    if (typeof window === 'undefined') return;
    if (prefs.userName !== undefined) {
      localStorage.setItem(STORAGE_KEYS.USER_NAME, prefs.userName);
    }
    if (prefs.theme !== undefined) {
      localStorage.setItem(STORAGE_KEYS.THEME, prefs.theme);
    }
  },
};
