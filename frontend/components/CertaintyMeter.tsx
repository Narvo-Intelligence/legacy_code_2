'use client';

import React from 'react';
import { COPY } from '@/lib/narvo-app-copy';

export type CertaintyMeterProps = {
  /** 0–100 */
  value: number;
  label?: string;
  className?: string;
  /** `light` = article / reading surfaces; `dark` = high-contrast panels */
  variant?: 'light' | 'dark';
};

/**
 * Single-glance confidence — Component DS trust family; mono caption + bar.
 */
export function CertaintyMeter({
  value,
  label = COPY.news_confidence_meter_label,
  className = '',
  variant = 'light',
}: CertaintyMeterProps) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

  if (variant === 'dark') {
    return (
      <div className={className}>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-serif font-bold text-narvo-butter tabular-nums">{v}%</p>
        </div>
        <div
          className="h-2 rounded-full bg-white/15 overflow-hidden"
          role="progressbar"
          aria-valuenow={v}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${v} percent`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-narvo-mint/90 to-narvo-butter transition-[width] duration-500 ease-out"
            style={{ width: `${v}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-narvo-ink/45 dark:text-white/45">
          {label}
        </p>
        <p className="font-serif text-2xl font-bold tabular-nums text-narvo-teal dark:text-narvo-mint">{v}%</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-narvo-ink/[0.08] dark:bg-white/10"
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${v} percent`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-narvo-teal to-narvo-mint/90 transition-[width] duration-500 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
