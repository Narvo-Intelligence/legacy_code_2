'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

export interface BannerItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  /** Top-of-viewport banner (e.g. network, session). */
  banner: (message: string, variant?: ToastVariant, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(`b-${id}`);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(`b-${id}`);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success', duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const banner = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 5200) => {
      const id = `b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setBanners((prev) => [...prev.slice(-1), { id, message, variant, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismissBanner(id), duration);
        timers.current.set(`b-${id}`, timer);
      }
    },
    [dismissBanner]
  );

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast]);
  const error = useCallback((msg: string) => toast(msg, 'error', 4500), [toast]);
  const info = useCallback((msg: string) => toast(msg, 'info'), [toast]);
  const warning = useCallback((msg: string) => toast(msg, 'warning', 4000), [toast]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, banner }}>
      {children}
      <BannerStack banners={banners} onDismiss={dismissBanner} />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Stack renderers ─────────────────────────────────────────────────────────

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 26 };

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ReactNode; border: string; bg: string; text: string }
> = {
  success: {
    icon: <CheckCircle2 size={16} aria-hidden />,
    border: 'border-narvo-mint/40 dark:border-narvo-mint/30',
    bg: 'bg-white/95 dark:bg-[#162330]/95',
    text: 'text-narvo-teal dark:text-narvo-mint',
  },
  error: {
    icon: <AlertCircle size={16} aria-hidden />,
    border: 'border-narvo-vermilion/35 dark:border-narvo-vermilion/30',
    bg: 'bg-white/95 dark:bg-[#1e1210]/95',
    text: 'text-narvo-vermilion',
  },
  info: {
    icon: <Info size={16} aria-hidden />,
    border: 'border-narvo-ink/12 dark:border-white/12',
    bg: 'bg-white/95 dark:bg-[#111c28]/95',
    text: 'text-narvo-teal dark:text-narvo-mint',
  },
  warning: {
    icon: <AlertTriangle size={16} aria-hidden />,
    border: 'border-narvo-butter/50 dark:border-narvo-butter/35',
    bg: 'bg-white/95 dark:bg-[#1a1810]/95',
    text: 'text-[#8d7417] dark:text-narvo-butter',
  },
};

function BannerStack({
  banners,
  onDismiss,
}: {
  banners: BannerItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed top-14 sm:top-16 left-0 right-0 z-[55] flex flex-col items-center gap-2 px-3 pointer-events-none"
    >
      <AnimatePresence initial={false} mode="sync">
        {banners.map((t) => {
          const cfg = VARIANT_CONFIG[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING}
              role="status"
              className={`pointer-events-auto w-full max-w-2xl flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl ${cfg.border} ${cfg.bg}`}
            >
              <span className={`shrink-0 ${cfg.text}`}>{cfg.icon}</span>
              <p className="flex-1 text-sm font-medium text-narvo-ink dark:text-white leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="shrink-0 p-1 rounded-full text-narvo-ink/35 dark:text-white/35 hover:text-narvo-ink dark:hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 w-full max-w-[min(92vw,380px)] pointer-events-none"
    >
      <AnimatePresence initial={false} mode="sync">
        {toasts.map((t) => {
          const cfg = VARIANT_CONFIG[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={SPRING}
              role="status"
              className={`pointer-events-auto w-full flex items-center gap-3 rounded-[18px] border px-4 py-3 shadow-[0_12px_36px_-8px_rgba(23,50,74,0.22)] dark:shadow-black/40 backdrop-blur-xl ${cfg.border} ${cfg.bg}`}
            >
              <span className={`shrink-0 ${cfg.text}`}>{cfg.icon}</span>
              <p className="flex-1 text-sm font-medium text-narvo-ink dark:text-white leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="shrink-0 p-1 rounded-full text-narvo-ink/35 dark:text-white/35 hover:text-narvo-ink dark:hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
