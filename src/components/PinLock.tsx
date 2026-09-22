import React, { useState, useEffect } from 'react';
import { Lock, Delete, ArrowRight, CheckCircle2, AlertCircle, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';

interface PinLockProps {
  onUnlock: () => void;
  onVisitorAccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const PinLock: React.FC<PinLockProps> = ({
  onUnlock,
  onVisitorAccess,
  onClose,
  isModal = false,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      // Check automatically when 4 digits entered
      if (newPin.length === 4) {
        verify(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const verify = async (code: string) => {
    try {
      const res = await api.verifyPassword(code);
      if (res.success) {
        setIsSuccess(true);
        setError(null);
        setTimeout(() => {
          onUnlock();
        }, 350);
      } else {
        throw new Error();
      }
    } catch {
      setIsShaking(true);
      setError('Incorrect password');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  // Keyboard input support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length > 0) {
          verify(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const keypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150'
          : 'min-h-screen w-full flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-slate-950 transition-colors'
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-[#FFFFFF] dark:bg-slate-900 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-[#EBE7DF] dark:border-slate-800 flex flex-col items-center relative transition-colors"
      >
        {/* Optional Close Button for modal */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#8C8377] dark:text-slate-400 hover:text-[#2D2A26] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#F4EFEA] dark:bg-slate-800 flex items-center justify-center text-[#8C7A6B] dark:text-slate-300 mb-5 border border-[#E8DFC8]/40 dark:border-slate-700 shadow-xs">
          {isSuccess ? (
            <CheckCircle2 className="w-7 h-7 text-[#5B8266] dark:text-emerald-400" />
          ) : (
            <Lock className="w-6 h-6 text-[#786C5E] dark:text-slate-300" />
          )}
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-serif font-bold text-[#2D2A26] dark:text-white tracking-tight text-center">
          Vignesh Habit Tracker
        </h1>
        <p className="text-sm text-[#7D766C] dark:text-slate-400 mt-1.5 mb-7 text-center font-normal">
          Enter your PIN to continue
        </p>

        {/* 4-Digit PIN Dots Indicator */}
        <motion.div
          animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3.5 mb-6"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? isSuccess
                      ? 'bg-[#5B8266] dark:bg-emerald-500 scale-110'
                      : 'bg-[#4A453E] dark:bg-slate-200 scale-110'
                    : 'bg-[#E5E0D8] dark:bg-slate-800 border border-[#D5CFC5] dark:border-slate-700'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error Message */}
        <div className="h-6 mb-4 flex items-center justify-center">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5 text-xs font-medium text-[#C05746] dark:text-rose-400"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {keypadButtons.flat().map((btnKey, idx) => {
            if (btnKey === 'clear') {
              return (
                <button
                  key={idx}
                  id="pin-clear-btn"
                  type="button"
                  onClick={handleClear}
                  className="h-14 rounded-2xl flex items-center justify-center text-xs font-medium text-[#8C8377] dark:text-slate-400 hover:bg-[#F4EFEA] dark:hover:bg-slate-800 active:bg-[#ECE5DC] dark:active:bg-slate-700 transition-colors"
                >
                  Clear
                </button>
              );
            }

            if (btnKey === 'backspace') {
              return (
                <button
                  key={idx}
                  id="pin-backspace-btn"
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 rounded-2xl flex items-center justify-center text-[#786C5E] dark:text-slate-300 hover:bg-[#F4EFEA] dark:hover:bg-slate-800 active:bg-[#ECE5DC] dark:active:bg-slate-700 transition-colors"
                  aria-label="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }

            return (
              <button
                key={idx}
                id={`pin-btn-${btnKey}`}
                type="button"
                onClick={() => handleDigit(btnKey)}
                className="h-14 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#ECE6DC] dark:border-slate-700 hover:bg-[#F3EEE6] dark:hover:bg-slate-700/80 active:bg-[#EAE2D5] dark:active:bg-slate-700 active:scale-95 text-[#2D2A26] dark:text-white text-xl font-medium flex items-center justify-center shadow-2xs transition-all select-none"
              >
                {btnKey}
              </button>
            );
          })}
        </div>

        {/* Visitor View-Only Option */}
        {onVisitorAccess && (
          <div className="mt-4 pt-4 border-t border-[#F0EBE1] dark:border-slate-800 w-full text-center">
            <button
              type="button"
              id="pin-visitor-btn"
              onClick={onVisitorAccess}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#5B8266] dark:text-emerald-400 hover:bg-[#EBF3EE] dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Continue as Visitor (View-Only Mode)</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
