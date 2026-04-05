'use client';

import React from 'react';

export type StatusPillVariant = 'breaking' | 'live' | 'saved' | 'downloading';

const STYLES: Record<StatusPillVariant, string> = {
  breaking:
    'bg-narvo-vermilion/12 text-narvo-vermilion border border-narvo-vermilion/25 dark:bg-narvo-vermilion/18',
  live: 'bg-narvo-vermilion text-white border border-narvo-vermilion/30',
  saved: 'bg-narvo-teal/12 text-narvo-teal border border-narvo-teal/20 dark:bg-narvo-teal/20',
  downloading:
    'bg-narvo-ink/[0.06] dark:bg-white/[0.08] text-narvo-ink/70 dark:text-white/65 border border-narvo-ink/10 dark:border-white/10',
};

export type StatusPillProps = {
  variant: StatusPillVariant;
  children: React.ReactNode;
  className?: string;
};

/** Mono metadata chip — breaking / live / saved / queue (Component DS §7 trust surfaces). */
export function StatusPill({ variant, children, className = '' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
