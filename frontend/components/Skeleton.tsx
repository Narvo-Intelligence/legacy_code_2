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

// ── Dashboard feed skeletons ─────────────────────────────────
// Match StoryCardLarge `feedVariant="trending"` (row + left thumb) and
// `feedVariant="latest"` (stacked) so skeleton → real cards does not jump layout.

const feedShellBase =
  'relative overflow-hidden bg-narvo-cloud dark:bg-narvo-ink border border-narvo-ink/[0.08] dark:border-white/[0.09] shadow-[0_8px_28px_-12px_rgba(23,50,74,0.12)] dark:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.4)] rounded-[16px] max-lg:max-w-full lg:rounded-[20px]';

const uniformFeedH = 'min-h-[132px] h-auto w-full max-w-full';

/** Mirrors trending card: left image rail + body (reduces CLS vs plain StoryCardSkeleton). */
export function StoryCardFeedTrendingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`${feedShellBase} flex flex-row items-stretch ${uniformFeedH} h-full border-l-4 border-l-narvo-vermilion pl-0 ${className}`}
      aria-hidden
      role="presentation"
    >
      <div
        className="relative w-[min(30vw,96px)] shrink-0 self-stretch min-h-0 overflow-hidden rounded-l-[16px] rounded-r-none sm:w-[34%] sm:max-w-[160px] sm:rounded-l-[18px] lg:max-w-[172px] lg:rounded-l-[20px] bg-narvo-ink/[0.07] dark:bg-white/[0.07] animate-pulse"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden p-2.5 sm:p-3">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5 shrink-0">
          <SkeletonLine width="44px" height="14px" className="rounded-full!" />
          <SkeletonLine width="56px" height="14px" className="rounded-full!" />
        </div>
        <div className="min-w-0 shrink-0 space-y-1.5">
          <SkeletonLine height="16px" />
          <SkeletonLine width="82%" height="16px" />
        </div>
        <SkeletonLine width="70%" height="12px" className="mt-1 shrink-0" />
        <div className="mt-auto flex shrink-0 items-center justify-between gap-2 pt-1">
          <SkeletonLine width="88px" height="10px" />
          <div className="flex gap-1">
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors latest card: dashed shell, no side thumb. */
export function StoryCardFeedLatestSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`${feedShellBase} flex flex-col ${uniformFeedH} h-full border-dashed border-narvo-ink/16 dark:border-white/12 bg-narvo-mist/30 dark:bg-white/[0.025] p-2.5 sm:p-3 ${className}`}
      aria-hidden
      role="presentation"
    >
      <div className="mb-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5 shrink-0">
        <SkeletonLine width="48px" height="14px" className="rounded-full!" />
        <SkeletonLine width="60px" height="14px" className="rounded-full!" />
      </div>
      <div className="min-w-0 shrink-0 space-y-1.5">
        <SkeletonLine height="16px" />
        <SkeletonLine width="78%" height="16px" />
      </div>
      <SkeletonLine width="65%" height="12px" className="mt-1 shrink-0" />
      <div className="mt-auto flex shrink-0 items-center justify-between gap-2 pt-1">
        <SkeletonLine width="96px" height="10px" />
        <div className="flex gap-1">
          <SkeletonCircle size={32} />
          <SkeletonCircle size={32} />
          <SkeletonCircle size={32} />
        </div>
      </div>
    </div>
  );
}

// ── Feed page skeleton ───────────────────────────────────────
// 2-col grid — first half slots mirror trending row, rest mirror latest column

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  const trendingSlots = Math.ceil(count / 2);
  const latestSlots = Math.max(0, count - trendingSlots);
  return (
    <div
      className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5"
      aria-busy="true"
      aria-label="Loading stories"
    >
      {Array.from({ length: trendingSlots }, (_, i) => (
        <StoryCardFeedTrendingSkeleton key={`t-${i}`} />
      ))}
      {Array.from({ length: latestSlots }, (_, i) => (
        <StoryCardFeedLatestSkeleton key={`l-${i}`} />
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
