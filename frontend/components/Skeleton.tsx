'use client';

import React from 'react';

/* ─────────────────────────────────────────────────────────────
   Skeleton — layout-shaped loading placeholders.
   Mirrors the editorial hierarchy so the app feels responsive
   while data is in-flight.
   Component DS §11.3 SkeletonState.
───────────────────────────────────────────────────────────── */

const base =
  'rounded-full bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse';

// ── Atoms ────────────────────────────────────────────────────

export function SkeletonLine({
  width = '100%',
  height = '14px',
  className = '',
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`${base} ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}

export function SkeletonCircle({
  size = 44,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-full bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

// ── StoryCard skeleton ───────────────────────────────────────
// Mirrors StoryCardLarge: category chip + headline + summary lines + footer

export function StoryCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-3 rounded-[16px] border border-narvo-ink/[0.07] bg-narvo-cloud p-3 dark:border-white/[0.07] dark:bg-narvo-ink lg:rounded-[20px] lg:p-4 ${className}`}
      aria-hidden
      role="presentation"
    >
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine width="52px" height="16px" className="rounded-full!" />
        <SkeletonLine width="64px" height="16px" className="rounded-full!" />
      </div>
      <div className="space-y-1.5">
        <SkeletonLine height="18px" />
        <SkeletonLine width="78%" height="18px" />
      </div>
      <div className="space-y-1.5">
        <SkeletonLine height="12px" />
        <SkeletonLine width="72%" height="12px" />
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <SkeletonLine width="100px" height="11px" />
        <div className="flex gap-1.5">
          <SkeletonCircle size={32} />
          <SkeletonCircle size={32} />
          <SkeletonCircle size={32} />
        </div>
      </div>
    </div>
  );
}

// ── List row skeleton ────────────────────────────────────────
// Mirrors StoryNewsListCard / QueueItem: thumb + text block + trailing

export function ListRowSkeleton({ count = 1, className = '' }: { count?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-3 rounded-2xl ${className}`}
          aria-hidden
          role="presentation"
        >
          <div
            className="shrink-0 rounded-[14px] bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse"
            style={{ width: 68, height: 68 }}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonLine width="70%" height="16px" />
            <SkeletonLine width="48%" height="12px" />
          </div>
          <SkeletonCircle size={34} />
        </div>
      ))}
    </>
  );
}

/** Alias used by listen page — matches BriefingSkeleton shape */
export { BriefingSkeleton as BriefingCardSkeleton };

// ── Article / detail heading skeleton ───────────────────────

export function HeadlineSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden role="presentation">
      <SkeletonLine width="40%" height="12px" />
      <div className="space-y-2">
        <SkeletonLine height="36px" />
        <SkeletonLine width="88%" height="36px" />
        <SkeletonLine width="60%" height="36px" />
      </div>
      <div className="flex gap-2 pt-1">
        <SkeletonLine width="72px" height="22px" className="rounded-full!" />
        <SkeletonLine width="64px" height="22px" className="rounded-full!" />
      </div>
    </div>
  );
}

// ── Generic multi-line text skeleton ────────────────────────

export function TextSkeleton({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ['100%', '92%', '78%', '88%', '68%', '82%'];
  return (
    <div className={`space-y-2 ${className}`} aria-hidden role="presentation">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} height="14px" />
      ))}
    </div>
  );
}

// ── Feed page skeleton ───────────────────────────────────────
// 2-col grid of story cards — used while dashboard is loading

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5"
      aria-busy="true"
      aria-label="Loading stories"
    >
      {Array.from({ length: count }, (_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Briefing skeleton ────────────────────────────────────────

export function BriefingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[28px] bg-narvo-teal/10 dark:bg-narvo-teal/20 p-6 space-y-4 ${className}`}
      aria-hidden
      role="presentation"
    >
      <SkeletonLine width="60px" height="10px" />
      <div className="space-y-2">
        <SkeletonLine height="24px" />
        <SkeletonLine width="72%" height="24px" />
      </div>
      <SkeletonLine width="50%" height="14px" />
      <div className="flex gap-3 pt-2">
        <div className="flex-1 h-[48px] rounded-full bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse" />
        <div className="flex-1 h-[48px] rounded-full bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse" />
      </div>
    </div>
  );
}
