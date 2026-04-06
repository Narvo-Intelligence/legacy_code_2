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
      className={`rounded-[20px] lg:rounded-[28px] border border-narvo-ink/[0.07] dark:border-white/[0.07] bg-narvo-cloud dark:bg-narvo-ink p-4 lg:p-6 space-y-4 ${className}`}
      aria-hidden
      role="presentation"
    >
      {/* chip row */}
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine width="60px" height="18px" className="rounded-full!" />
        <SkeletonLine width="72px" height="18px" className="rounded-full!" />
      </div>
      {/* headline */}
      <div className="space-y-2">
        <SkeletonLine height="22px" />
        <SkeletonLine width="82%" height="22px" />
      </div>
      {/* summary */}
      <div className="space-y-2">
        <SkeletonLine height="14px" />
        <SkeletonLine width="90%" height="14px" />
        <SkeletonLine width="68%" height="14px" />
      </div>
      {/* footer row */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="120px" height="12px" />
        <div className="flex gap-2">
          <SkeletonCircle size={38} />
          <SkeletonCircle size={38} />
          <SkeletonCircle size={42} />
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
            style={{ width: 58, height: 58 }}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonLine width="70%" height="16px" />
            <SkeletonLine width="48%" height="12px" />
          </div>
          <SkeletonCircle size={36} />
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
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
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
