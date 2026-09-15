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
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    // Vignesh is the sole user and owner of this habit tracker:
    // It starts unlocked by default so all creates, updates, and edits save directly to Supabase cloud.
    const isExplicitlyLocked = sessionStorage.getItem('vignesh_habit_locked') === 'true';
    return !isExplicitlyLocked;
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionDescription, setActionDescription] = useState<string | undefined>();
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    sessionStorage.setItem('vignesh_habit_locked', 'true');
    setAuthToken(null);
    api.lock();
  }, []);

  const unlock = useCallback(() => {
    setIsUnlocked(true);
    sessionStorage.removeItem('vignesh_habit_locked');
    setAuthToken(getAuthToken() || 'vignesh_owner_token', '9500');
  }, []);

  // Listen for backend 401 unauthorized errors (only when explicitly locked)
  useEffect(() => {
    setUnauthorizedCallback(() => {
      setIsUnlocked(false);
      sessionStorage.setItem('vignesh_habit_locked', 'true');
      setAuthToken(null);
    });
    return () => {
      setUnauthorizedCallback(null);
    };
  }, []);

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
    setIsModalOpen(false);
    pendingActionRef.current = null;
    setActionDescription(undefined);
  }, []);

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
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        actionDescription={actionDescription}
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
