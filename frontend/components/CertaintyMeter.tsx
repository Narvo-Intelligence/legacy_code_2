'use client';

import React from 'react';

export type CertaintyMeterProps = {
  /** 0–100 */
  value: number;
  label?: string;
  className?: string;
};

/**
 * Single-glance confidence — Component DS trust family; mono caption + bar.
 */
export function CertaintyMeter({ value, label = 'Confidence', className = '' }: CertaintyMeterProps) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
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
