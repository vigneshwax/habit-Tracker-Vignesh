import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAuthToken, getAuthToken, setUnauthorizedCallback } from '../api';
import { ProtectedActionModal } from '../components/ProtectedActionModal';

interface ProtectedActionContextType {
  isUnlocked: boolean;
  executeProtected: (action: () => void | Promise<void>, description?: string) => void;
  requestUnlock: (description?: string) => void;
  lock: () => void;
  unlock: () => void;
}

const ProtectedActionContext = createContext<ProtectedActionContextType | null>(null);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export const ProtectedActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always require password 9500 on refresh / new page load
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionDescription, setActionDescription] = useState<string | undefined>();
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setAuthToken(null);
    api.lock();
  }, []);

  const unlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  // Whenever user switches to another tab or hides the page, lock immediately so returning requires password 9500
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lock();
      }
    };

    const handleWindowBlur = () => {
      lock();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [lock]);

  // Listen for backend 401 unauthorized errors
  useEffect(() => {
    setUnauthorizedCallback(() => {
      setIsUnlocked(false);
      setAuthToken(null);
    });
    return () => {
      setUnauthorizedCallback(null);
    };
  }, []);

  // 15-minute inactivity auto-lock timer
  useEffect(() => {
    if (!isUnlocked) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log('[Auth] 15-minute inactivity timeout reached. Locking editor.');
        lock();
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [isUnlocked, lock]);

  // Execute a protected action
  const executeProtected = useCallback(
    (action: () => void | Promise<void>, description?: string) => {
      if (isUnlocked) {
        action();
      } else {
        pendingActionRef.current = action;
        setActionDescription(description);
        setIsModalOpen(true);
      }
    },
    [isUnlocked]
  );

  // Proactive unlock request (e.g. clicking "🔒 View Only" in header)
  const requestUnlock = useCallback((description?: string) => {
    pendingActionRef.current = null;
    setActionDescription(description);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    // Only allow closing if already unlocked (e.g. canceling an action when unlocked)
    if (isUnlocked) {
      setIsModalOpen(false);
      pendingActionRef.current = null;
      setActionDescription(undefined);
    }
  }, [isUnlocked]);

  const handleModalSuccess = useCallback(() => {
    unlock();
    setIsModalOpen(false);
    setActionDescription(undefined);

    const pending = pendingActionRef.current;
    pendingActionRef.current = null;

    if (pending) {
      // Auto-continue the originally attempted action!
      try {
        pending();
      } catch (err) {
        console.error('Failed to execute resumed protected action:', err);
      }
    }
  }, [unlock]);

  // If not unlocked, keep entry modal open so entering the website requires password 9500
  const isGateOpen = isModalOpen || !isUnlocked;

  return (
    <ProtectedActionContext.Provider
      value={{
        isUnlocked,
        executeProtected,
        requestUnlock,
        lock,
        unlock,
      }}
    >
      {children}
      <ProtectedActionModal
        isOpen={isGateOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        actionDescription={isUnlocked ? actionDescription : undefined}
        dismissable={isUnlocked}
      />
    </ProtectedActionContext.Provider>
  );
};

export const useProtectedAction = () => {
  const context = useContext(ProtectedActionContext);
  if (!context) {
    throw new Error('useProtectedAction must be used within a ProtectedActionProvider');
  }
  return context;
};
