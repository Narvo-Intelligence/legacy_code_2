'use client';

import React from 'react';
import { motion } from 'motion/react';

const BAR_HEIGHTS_PX = [9, 14, 22, 28, 20, 13, 10] as const;

/**
 * Subtle editorial “briefing line” — teal/mint bars only (vermilion stays on CTAs per design master).
 */
export function HeroBriefingWaveform({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      className="mb-4 flex h-9 w-full max-w-[11rem] items-end justify-center gap-1 sm:mb-5 sm:h-10 sm:max-w-[13rem] sm:gap-1.5 lg:justify-start"
      aria-hidden
    >
      {BAR_HEIGHTS_PX.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] shrink-0 rounded-full bg-narvo-teal/45 dark:bg-narvo-mint/40 sm:w-1"
          style={{ height: h, transformOrigin: '50% 100%' }}
          initial={false}
          animate={
            reduceMotion
              ? { scaleY: 1 }
              : {
                  scaleY: [0.55, 1, 0.72, 0.95, 0.55],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 2.1 + i * 0.14,
                  repeat: Infinity,
                  ease: [0.45, 0.05, 0.55, 0.95],
                }
          }
        />
      ))}
    </div>
  );
}

/** Soft concentric rings behind the primary hero listen control — low contrast, no vermilion. */
export function HeroListenRings({ reduceMotion, children }: { reduceMotion: boolean; children: React.ReactNode }) {
  if (reduceMotion) {
    return <>{children}</>;
  }
  return (
    <span className="relative inline-flex w-full min-w-0 flex-1 sm:w-auto sm:flex-none">
      <motion.span
        className="pointer-events-none absolute inset-[-6px] rounded-full border border-narvo-teal/20 dark:border-narvo-mint/25 sm:inset-[-8px]"
        aria-hidden
        animate={{ scale: [1, 1.06, 1], opacity: [0.55, 0.2, 0.55] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="pointer-events-none absolute inset-[-14px] rounded-full border border-narvo-teal/12 dark:border-narvo-mint/15 sm:inset-[-18px]"
        aria-hidden
        animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.12, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.45 }}
      />
      <span className="relative z-[1] flex min-w-0 flex-1 sm:flex-none">{children}</span>
    </span>
  );
}
