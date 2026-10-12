import { HRTask, HRNote } from '../types';
import { localStorageService } from './localStorageService';

export interface SyncStatusState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  message: string;
  lastSyncTime?: string;
  lastPullTime?: string;
}

type SyncListener = (state: SyncStatusState) => void;
type DataUpdateListener = (data: { tasks: HRTask[]; notes: HRNote[] }) => void;

class GoogleSheetsService {
  private debounceTimer: any = null;
  private intervalTimer: any = null;
  private delayedPullTimer: any = null;
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataUpdateListener> = new Set();
  private currentState: SyncStatusState = {
    status: 'idle',
    message: 'Local offline storage ready',
  };

  constructor() {
    this.updateCurrentState({
      status: 'idle',
      message: 'Local offline storage ready',
      lastSyncTime: localStorageService.getGoogleConfig().lastSyncTime,
      lastPullTime: localStorageService.getGoogleConfig().lastPullTime,
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  public onDataUpdated(listener: DataUpdateListener): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('[GoogleSheetsService] Listener notification error:', err);
      }
    });
  }

  private updateCurrentState(partial: Partial<SyncStatusState>): void {
    this.currentState = { ...this.currentState, ...partial };
    this.notifyListeners();
  }

  // ==========================================
  // CONFLICT PROTECTION
  // ==========================================
  /**
   * Never overwrite a form while user is actively typing or editing.
   * Checks whether the user is currently focused on input, textarea, select, or contenteditable.
   */
  public isUserActivelyTyping(): boolean {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    if (!active) return false;

    const tagName = active.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    if ((active as HTMLElement).isContentEditable) {
      return true;
    }
    return false;
  }

  // ==========================================
  // SYNC LIFECYCLE INITIALIZATION
  // ==========================================
  public initAutoSync(): () => void {
    if (typeof window === 'undefined') return () => {};

    // 1. Initial pull on startup
    setTimeout(() => {
      this.pullFromSheet(false);
    }, 1500);

    // 2. Tab focus / visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.pullFromSheet(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 3. Periodic polling every 25 seconds
    this.intervalTimer = setInterval(() => {
      this.pullFromSheet(false);
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (this.intervalTimer) clearInterval(this.intervalTimer);
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (this.delayedPullTimer) clearTimeout(this.delayedPullTimer);
    };
  }

  // ==========================================
  // DEBOUNCED PUSH (2-3 seconds)
  // ==========================================
  public triggerDebouncedPush(): void {
    const { databaseUrl } = localStorageService.getGoogleConfig();
    if (!databaseUrl || !databaseUrl.trim()) {
      return; // Not configured, silently keep in offline mode
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.pushToSheet();
    }, 2500); // 2.5s debounce
  }

  // ==========================================
  // PUSH TO GOOGLE SHEETS
  // ==========================================
  public async pushToSheet(): Promise<{ success: boolean; message: string }> {
    const { databaseUrl } = localStorageService.getGoogleConfig();
    if (!databaseUrl || !databaseUrl.trim()) {
      return { success: false, message: 'Google Sheets URL not configured' };
    }

    if (!navigator.onLine) {
      this.updateCurrentState({
        status: 'offline',
        message: 'Offline: Changes saved locally in LocalStorage',
      });
      return { success: false, message: 'Offline mode active' };
    }

    if (this.isSyncing) {
      return { success: false, message: 'Sync in progress' };
    }

    this.isSyncing = true;
    this.updateCurrentState({ status: 'syncing', message: 'Syncing to Google Sheets...' });

    try {
      const tasks = localStorageService.getTasks();
      const notes = localStorageService.getNotes();

      const payload = {
        action: 'push',
        tasks,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(databaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Plain text avoids CORS preflight blockage on Google Apps Script
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets responded with HTTP ${response.status}`);
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        // If Google Apps Script redirects or returns non-JSON text, assume success if status is ok
        data = { success: true };
      }

      const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorageService.setLastSyncTime(syncTime);

      this.updateCurrentState({
        status: 'synced',
        message: `Synced with Google Sheets (${syncTime})`,
        lastSyncTime: syncTime,
      });

      setTimeout(() => {
        if (this.currentState.status === 'synced') {
          this.updateCurrentState({ status: 'idle', message: 'Local storage active' });
        }
      }, 4000);

      return { success: true, message: 'Successfully synced to Google Sheets' };
    } catch (err: any) {
      console.warn('[GoogleSheetsService] Push failed (non-blocking fallback to LocalStorage):', err);
      this.updateCurrentState({
        status: 'error',
        message: 'Could not sync to Google Sheets. Local data safely preserved.',
      });
      return { success: false, message: err?.message || 'Sync error' };
    } finally {
      this.isSyncing = false;
    }
  }

  // ==========================================
  // PULL FROM GOOGLE SHEETS
  // ==========================================
  public async pullFromSheet(isManual = false): Promise<{ success: boolean; message: string }> {
    const { databaseUrl } = localStorageService.getGoogleConfig();
    if (!databaseUrl || !databaseUrl.trim()) {
      if (isManual) {
        return { success: false, message: 'Google Sheets URL not configured' };
      }
      return { success: false, message: 'Not configured' };
    }

    if (!navigator.onLine) {
      if (isManual) {
        this.updateCurrentState({
          status: 'offline',
          message: 'Offline: Cannot pull from Google Sheets without internet',
        });
      }
      return { success: false, message: 'Offline mode' };
    }

    // CONFLICT PROTECTION: Check if user is typing
    if (this.isUserActivelyTyping()) {
      // Delay pull by 6 seconds so user is never interrupted
      if (this.delayedPullTimer) clearTimeout(this.delayedPullTimer);
      this.delayedPullTimer = setTimeout(() => {
        this.pullFromSheet(false);
      }, 6000);
      return { success: false, message: 'Pull delayed: User is currently typing' };
    }

    if (this.isSyncing) {
      return { success: false, message: 'Sync in progress' };
    }

    this.isSyncing = true;
    if (isManual) {
      this.updateCurrentState({ status: 'syncing', message: 'Pulling latest data from Google Sheet...' });
    }

    try {
      const url = new URL(databaseUrl);
      url.searchParams.set('action', 'pull');
      url.searchParams.set('_t', Date.now().toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Google Sheets responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && (Array.isArray(data.tasks) || Array.isArray(data.notes))) {
        // Double-check user didn't start typing during fetch
        if (this.isUserActivelyTyping()) {
          return { success: false, message: 'Pull aborted: User is actively typing' };
        }

        const pulledTasks: HRTask[] = Array.isArray(data.tasks)
          ? data.tasks.map((t: any) => localStorageService.normalizeTask(t))
          : localStorageService.getTasks();

        const pulledNotes: HRNote[] = Array.isArray(data.notes)
          ? data.notes.map((n: any) => localStorageService.normalizeNote(n))
          : localStorageService.getNotes();

        // Save to LocalStorage
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          localStorageService.saveTasks(pulledTasks);
        }
        if (Array.isArray(data.notes) && data.notes.length > 0) {
          localStorageService.saveNotes(pulledNotes);
        }

        const pullTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        localStorageService.setLastPullTime(pullTime);

        this.updateCurrentState({
          status: 'synced',
          message: `Pulled from Google Sheet (${pullTime})`,
          lastPullTime: pullTime,
        });

        // Notify app components to update React state
        this.dataListeners.forEach((listener) => {
          try {
            listener({ tasks: pulledTasks, notes: pulledNotes });
          } catch (err) {
            console.error('[GoogleSheetsService] Error notifying data listener:', err);
          }
        });

        setTimeout(() => {
          if (this.currentState.status === 'synced') {
            this.updateCurrentState({ status: 'idle', message: 'Local storage active' });
          }
        }, 3000);

        return { success: true, message: 'Data successfully pulled from Google Sheets' };
      } else {
        return { success: false, message: 'No tasks or notes found in Google Sheet response' };
      }
    } catch (err: any) {
      if (isManual) {
        console.warn('[GoogleSheetsService] Pull error:', err);
        this.updateCurrentState({
          status: 'error',
          message: 'Unable to reach Google Sheets. Local storage data intact.',
        });
      }
      return { success: false, message: err?.message || 'Pull failed' };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
