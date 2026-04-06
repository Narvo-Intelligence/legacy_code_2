'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COPY } from '@/lib/narvo-app-copy';

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 28 };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function Digit({ value }: { value: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={SPRING}
        className="inline-block tabular-nums"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export type DashboardLiveClockVariant = 'panel' | 'compact';

/** SSR + first client paint must match; real time only after mount. */
const TIME_PLACEHOLDER = '--:--:--';
const DATE_PLACEHOLDER = '—';

/**
 * Live clock — full panel for sidebar, compact row for mobile toolbar.
 */
export function DashboardLiveClock({ variant = 'panel' }: { variant?: DashboardLiveClockVariant }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ready = now != null;
  const h = ready ? now.getHours() : 0;
  const m = ready ? now.getMinutes() : 0;
  const s = ready ? now.getSeconds() : 0;
  const dateLine = ready
    ? now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : DATE_PLACEHOLDER;
  const dateCompact = ready
    ? now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : DATE_PLACEHOLDER;

  if (variant === 'compact') {
    return (
      <div
        className="rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-gradient-to-r from-narvo-teal/[0.07] via-narvo-mist/50 to-narvo-butter/12 dark:from-narvo-teal/18 dark:via-narvo-ink/60 dark:to-narvo-vermilion/10 px-3 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 shadow-sm"
        aria-label={COPY.dashboard_clock_a11y}
      >
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint shrink-0">
          {COPY.dashboard_clock_kicker}
        </span>
        <div className="flex items-baseline gap-0.5 font-mono text-lg sm:text-xl font-bold tabular-nums text-narvo-ink dark:text-white leading-none min-w-[7.5ch]">
          {ready ? (
            <>
              <Digit value={pad2(h)} />
              <span className="text-narvo-ink/35 dark:text-white/30" aria-hidden>
                :
              </span>
              <Digit value={pad2(m)} />
              <span className="text-narvo-ink/35 dark:text-white/30" aria-hidden>
                :
              </span>
              <span className="text-narvo-vermilion dark:text-narvo-butter w-[2.2ch] inline-flex justify-start">
                <Digit value={pad2(s)} />
              </span>
            </>
          ) : (
            <span className="text-narvo-ink/30 dark:text-white/25 tracking-tight" aria-hidden>
              {TIME_PLACEHOLDER}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] font-medium text-narvo-ink/60 dark:text-white/50 shrink-0">
          {dateCompact}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-[24px] border border-narvo-ink/8 dark:border-white/10 bg-gradient-to-br from-narvo-teal/[0.08] via-narvo-mist/40 to-narvo-butter/15 dark:from-narvo-teal/15 dark:via-narvo-ink/50 dark:to-narvo-vermilion/10 p-5 xl:p-6 overflow-hidden shadow-sm"
      aria-label={COPY.dashboard_clock_a11y}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint">
        {COPY.dashboard_clock_kicker}
      </p>
      <div className="mt-3 flex items-baseline gap-0.5 font-mono text-[2rem] xl:text-[2.35rem] font-bold tabular-nums text-narvo-ink dark:text-white leading-none tracking-tight min-w-[9ch]">
        {ready ? (
          <>
            <Digit value={pad2(h)} />
            <span className="text-narvo-ink/35 dark:text-white/30 animate-pulse" aria-hidden>
              :
            </span>
            <Digit value={pad2(m)} />
            <span className="text-narvo-ink/35 dark:text-white/30" aria-hidden>
              :
            </span>
            <span className="text-narvo-vermilion dark:text-narvo-butter w-[2.5ch] inline-flex justify-start">
              <Digit value={pad2(s)} />
            </span>
          </>
        ) : (
          <span className="text-narvo-ink/30 dark:text-white/25 tracking-tight" aria-hidden>
            {TIME_PLACEHOLDER}
          </span>
        )}
      </div>
      <motion.p
        key={ready ? dateLine : 'placeholder'}
        initial={ready ? { opacity: 0.5 } : false}
        animate={{ opacity: 1 }}
        className="mt-3 text-sm font-medium text-narvo-ink/70 dark:text-white/60 leading-snug"
      >
        {dateLine}
      </motion.p>
      <div
        className="mt-4 h-1 rounded-full bg-narvo-ink/8 dark:bg-white/10 overflow-hidden"
        aria-hidden
      >
        <motion.div
          className="h-full rounded-full bg-narvo-teal dark:bg-narvo-mint"
          animate={{ width: `${ready ? ((s + m * 60 + h * 3600) / 86400) * 100 : 0}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
  );
}
