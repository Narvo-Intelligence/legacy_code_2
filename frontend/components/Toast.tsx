'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Download, Smartphone, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface BannerAction {
  label: string;
  onClick: () => void | Promise<void>;
  emphasis?: 'primary' | 'secondary';
}

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
  actions?: BannerAction[];
  dismissible?: boolean;
  title?: string;
  eyebrow?: string;
  meta?: string;
  placement?: 'top' | 'bottom-mobile';
  theme?: 'default' | 'story';
}

export interface BannerOptions {
  id?: string;
  variant?: ToastVariant;
  duration?: number;
  actions?: BannerAction[];
  dismissible?: boolean;
  title?: string;
  eyebrow?: string;
  meta?: string;
  placement?: 'top' | 'bottom-mobile';
  theme?: 'default' | 'story';
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  /** Banner surface for alerts, promos, or mobile-bottom install prompts. */
  banner: (message: string, options?: BannerOptions) => string;
  dismissBanner: (id: string) => void;
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
    (message: string, options: BannerOptions = {}) => {
      const id = options.id?.trim() || `b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const variant = options.variant ?? 'info';
      const duration = options.duration ?? 5200;
      const timerKey = `b-${id}`;
      const existingTimer = timers.current.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        timers.current.delete(timerKey);
      }
      setBanners((prev) => [
        ...prev.filter((item) => item.id !== id).slice(-1),
        {
          id,
          message,
          variant,
          duration,
          actions: options.actions?.slice(0, 2),
          dismissible: options.dismissible !== false,
          title: options.title,
          eyebrow: options.eyebrow,
          meta: options.meta,
          placement: options.placement ?? 'top',
          theme: options.theme ?? 'default',
        },
      ]);
      if (duration > 0) {
        const timer = setTimeout(() => dismissBanner(id), duration);
        timers.current.set(timerKey, timer);
      }
      return id;
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
    <ToastContext.Provider value={{ toast, success, error, info, warning, banner, dismissBanner }}>
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
  const topBanners = banners.filter((banner) => banner.placement !== 'bottom-mobile');
  const bottomMobileBanners = banners.filter((banner) => banner.placement === 'bottom-mobile');

  return (
    <>
      <BannerViewport banners={topBanners} onDismiss={onDismiss} placement="top" />
      <BannerViewport banners={bottomMobileBanners} onDismiss={onDismiss} placement="bottom-mobile" />
    </>
  );
}

function BannerViewport({
  banners,
  onDismiss,
  placement,
}: {
  banners: BannerItem[];
  onDismiss: (id: string) => void;
  placement: 'top' | 'bottom-mobile';
}) {
  if (banners.length === 0) return null;

  const viewportClassName =
    placement === 'bottom-mobile'
      ? 'fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-auto sm:top-16 left-0 right-0 z-[55] flex flex-col items-center gap-2 px-3 pointer-events-none'
      : 'fixed top-14 sm:top-16 left-0 right-0 z-[55] flex flex-col items-center gap-2 px-3 pointer-events-none';

  return (
    <div aria-live="polite" className={viewportClassName}>
      <AnimatePresence initial={false} mode="sync">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} onDismiss={onDismiss} placement={placement} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function runBannerAction(action: BannerAction) {
  try {
    const maybePromise = action.onClick();
    if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
      void (maybePromise as Promise<void>).catch(() => {});
    }
  } catch {
    /* ignore banner action errors */
  }
}

function BannerCard({
  banner,
  onDismiss,
  placement,
}: {
  banner: BannerItem;
  onDismiss: (id: string) => void;
  placement: 'top' | 'bottom-mobile';
}) {
  const cfg = VARIANT_CONFIG[banner.variant];
  const isStory = banner.theme === 'story';
  const isBottomMobile = placement === 'bottom-mobile';

  if (isStory) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: isBottomMobile ? 18 : -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: isBottomMobile ? 10 : -8, scale: 0.97 }}
        transition={SPRING}
        role="status"
        className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-[28px] border border-narvo-teal/16 bg-[linear-gradient(135deg,rgba(12,34,51,0.96),rgba(15,95,115,0.93))] px-4 py-4 shadow-[0_20px_60px_-14px_rgba(23,50,74,0.45)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-12 -top-14 h-32 w-32 rounded-full bg-narvo-mint/18 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-narvo-vermilion/18 blur-2xl" />
        </div>
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/12 text-white ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <Smartphone size={20} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              {banner.eyebrow ? (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                  <Download size={12} aria-hidden />
                  {banner.eyebrow}
                </p>
              ) : null}
              {banner.title ? (
                <p className="text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-lg">
                  {banner.title}
                </p>
              ) : null}
            </div>
            {banner.dismissible !== false ? (
              <button
                type="button"
                onClick={() => onDismiss(banner.id)}
                className="shrink-0 rounded-full p-1 text-white/55 transition-colors hover:text-white"
                aria-label="Dismiss"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed text-white/82">{banner.message}</p>

          {banner.meta ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/58">
              {banner.meta}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {banner.actions?.map((action) => (
              <button
                key={`${banner.id}-${action.label}`}
                type="button"
                onClick={() => runBannerAction(action)}
                className={
                  action.emphasis === 'secondary'
                    ? 'min-h-[46px] rounded-full border border-white/16 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/82 transition-colors hover:bg-white/[0.12] sm:min-h-0 sm:px-4 sm:py-2'
                    : 'min-h-[48px] rounded-full bg-white px-4 py-3 text-sm font-semibold text-narvo-ink shadow-[0_10px_28px_-12px_rgba(255,255,255,0.8)] transition-transform hover:scale-[1.01] sm:min-h-0 sm:px-4 sm:py-2'
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SPRING}
      role="status"
      className={`pointer-events-auto w-full max-w-2xl rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl ${cfg.border} ${cfg.bg}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`shrink-0 ${cfg.text}`}>{cfg.icon}</span>
          <div className="min-w-0 flex-1">
            {banner.title ? (
              <p className="mb-1 text-sm font-semibold text-narvo-ink dark:text-white">{banner.title}</p>
            ) : null}
            <p className="text-sm font-medium text-narvo-ink dark:text-white leading-snug">{banner.message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 sm:shrink-0">
          {banner.actions?.map((action) => (
            <button
              key={`${banner.id}-${action.label}`}
              type="button"
              onClick={() => runBannerAction(action)}
              className={
                action.emphasis === 'secondary'
                  ? 'rounded-full border border-narvo-ink/12 px-3 py-1.5 text-xs font-semibold text-narvo-ink transition-colors hover:border-narvo-ink/25 dark:border-white/15 dark:text-white dark:hover:border-white/30'
                  : 'rounded-full bg-narvo-teal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0b5162]'
              }
            >
              {action.label}
            </button>
          ))}
          {banner.dismissible !== false ? (
            <button
              type="button"
              onClick={() => onDismiss(banner.id)}
              className="shrink-0 p-1 rounded-full text-narvo-ink/35 dark:text-white/35 hover:text-narvo-ink dark:hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
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
