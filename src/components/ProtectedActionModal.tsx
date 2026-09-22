import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';

interface ProtectedActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionDescription?: string;
}

export const ProtectedActionModal: React.FC<ProtectedActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionDescription,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open and reset state
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsLoading(false);
      setIsShaking(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const verifyWithCode = async (code: string) => {
    if (isLoading || !code.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.verifyPassword(code.trim());
      if (res.success) {
        setIsLoading(false);
        onSuccess();
      } else {
        throw new Error(res.message || 'Incorrect editing password');
      }
    } catch (err: any) {
      setIsLoading(false);
      setIsShaking(true);
      let displayMessage = 'Incorrect editing password. Please try again.';
      if (err?.message && !err.message.toLowerCase().includes('unable to save')) {
        displayMessage = err.message;
      } else if (err?.message?.toLowerCase().includes('unable to save')) {
        displayMessage = 'Connection issue while verifying password. Please try again.';
      }
      setError(displayMessage);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
        inputRef.current?.focus();
      }, 600);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim() || isLoading) return;
    await verifyWithCode(pin.trim());
  };

  const handleKeypadDigit = (digit: string) => {
    if (!isLoading && pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        verifyWithCode(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (!isLoading) {
      setPin((prev) => prev.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    if (!isLoading) {
      setPin('');
      setError(null);
      inputRef.current?.focus();
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (pin.length > 0) {
          handleClear();
        } else {
          onClose();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length > 0) {
          verifyWithCode(pin);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Direct character input
        e.preventDefault();
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          setError(null);
          if (nextPin.length === 4) {
            verifyWithCode(nextPin);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      id="protected-action-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <motion.div
        id="protected-action-modal-card"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[330px] sm:max-w-[360px] my-auto bg-[#FFFFFF] dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-[#ECE6DC] dark:border-slate-700 shadow-2xl overflow-hidden max-h-[min(94dvh,560px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-3.5 sm:p-4.5 pb-2 sm:pb-2.5 text-center border-b border-[#F2ECE4] dark:border-slate-700/80 shrink-0">
          <button
            type="button"
            id="protected-action-close-btn"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-1.5 rounded-lg text-[#8C8377] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-xl bg-[#FBF7F0] dark:bg-amber-950/40 border border-[#F0E4D2] dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1.5 shadow-2xs">
            <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>

          <h3 className="text-sm sm:text-base font-serif font-bold text-[#2D2A26] dark:text-white flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
            <span>Protected Action</span>
          </h3>
          <p className="mt-0.5 text-[11px] sm:text-xs text-[#736A5E] dark:text-slate-300 font-medium">
            Enter your editing password to make changes.
          </p>
          {actionDescription && (
            <p className="mt-1 text-[10px] sm:text-[11px] text-[#5B8266] dark:text-emerald-400 font-semibold bg-[#EBF3EE] dark:bg-emerald-950/40 py-0.5 px-2 rounded-md inline-block max-w-[90%] truncate">
              Target: {actionDescription}
            </p>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleVerify} className="p-3.5 sm:p-4.5 pt-2.5 sm:pt-3 space-y-2.5 sm:space-y-3 overflow-y-auto flex-1">
          {/* Input for Mobile Keyboards, Password Managers & Screen Readers */}
          <input
            ref={inputRef}
            id="protected-password-input"
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(null);
            }}
            disabled={isLoading}
            className="sr-only"
            aria-label="Editing password"
            autoComplete="current-password"
          />

          {/* Password Header & Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label
                htmlFor="protected-password-input"
                className="text-[11px] sm:text-xs font-semibold text-[#5C554B] dark:text-slate-300 cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                Editing Password
              </label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin(!showPin)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#7D766C] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white transition-colors cursor-pointer"
                aria-label={showPin ? 'Hide password' : 'Show password'}
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            {/* Visual Slots */}
            <div
              id="protected-pin-display"
              onClick={() => inputRef.current?.focus()}
              className="flex items-center justify-center gap-2 sm:gap-2.5 py-0.5 cursor-pointer select-none"
            >
              {[0, 1, 2, 3].map((idx) => {
                const digit = pin[idx];
                const isFilled = digit !== undefined;
                const isCurrent = pin.length === idx && !isLoading;

                return (
                  <motion.div
                    key={idx}
                    id={`pin-slot-${idx}`}
                    animate={isFilled ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`w-10 h-11 sm:w-12 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg font-bold font-mono transition-all duration-150 ${
                      isFilled
                        ? 'bg-[#FAF8F5] dark:bg-slate-900 border-2 border-[#5B8266] dark:border-emerald-500 text-[#2D2A26] dark:text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#FAF8F5] dark:bg-slate-900 border-2 border-[#5B8266] dark:border-emerald-400 ring-2 sm:ring-3 ring-[#5B8266]/20 dark:ring-emerald-500/25'
                        : 'bg-[#FAF8F5] dark:bg-slate-900/80 border border-[#E5DFD5] dark:border-slate-700 text-transparent'
                    }`}
                  >
                    {isFilled ? (
                      showPin ? (
                        <span>{digit}</span>
                      ) : (
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#2D2A26] dark:bg-slate-100" />
                      )
                    ) : isCurrent ? (
                      <span className="w-0.5 h-4 bg-[#5B8266] dark:bg-emerald-400 animate-pulse rounded-full" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5CDC0] dark:bg-slate-700" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick On-Screen Touch Keypad */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 pt-0.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadDigit(digit)}
                disabled={isLoading}
                className="h-9 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#FAF8F5] dark:bg-slate-900/90 border border-[#EBE5DB] dark:border-slate-700 text-sm sm:text-base font-bold text-[#423C33] dark:text-slate-200 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || pin.length === 0}
              className="h-9 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#FAF8F5] dark:bg-slate-900/90 border border-[#EBE5DB] dark:border-slate-700 text-[11px] sm:text-xs font-semibold text-[#8C8377] dark:text-slate-400 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer select-none disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDigit('0')}
              disabled={isLoading}
              className="h-9 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#FAF8F5] dark:bg-slate-900/90 border border-[#EBE5DB] dark:border-slate-700 text-sm sm:text-base font-bold text-[#423C33] dark:text-slate-200 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
              className="h-9 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#FAF8F5] dark:bg-slate-900/90 border border-[#EBE5DB] dark:border-slate-700 text-[11px] sm:text-xs font-semibold text-[#8C8377] dark:text-slate-400 hover:bg-[#F2ECE4] dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer select-none disabled:opacity-40 flex items-center justify-center"
              aria-label="Backspace"
            >
              ⌫
            </button>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2 rounded-lg bg-[#FDF2F0] dark:bg-rose-950/40 border border-[#F5D5D0] dark:border-rose-800 flex items-center gap-1.5 text-[11px] font-semibold text-[#C05746] dark:text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons: Cancel and Unlock */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              id="protected-action-cancel-btn"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-9 sm:h-10 px-3 rounded-lg sm:rounded-xl bg-[#FAF8F5] dark:bg-slate-700 border border-[#E5DFD5] dark:border-slate-600 text-xs font-bold text-[#5C554B] dark:text-slate-200 hover:bg-[#F2ECE4] dark:hover:bg-slate-600 active:scale-95 transition-all cursor-pointer select-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="protected-action-unlock-btn"
              disabled={isLoading || !pin.trim()}
              className="flex-1 h-9 sm:h-10 px-3 rounded-lg sm:rounded-xl bg-[#5B8266] hover:bg-[#4D7157] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
