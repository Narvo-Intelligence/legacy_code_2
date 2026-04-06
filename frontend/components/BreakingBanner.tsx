'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, ChevronRight } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import { StatusPill } from '@/components/StatusPill';
import type { ApiNewsListItem } from '@/lib/narvo-api';

/* ─────────────────────────────────────────────────────────────
   BreakingBanner — urgent news strip.
   Component DS §11.5 BreakingBanner.
   "Strong but compact. Should not turn the entire layout hot."
───────────────────────────────────────────────────────────── */

export type BreakingBannerProps = {
  story: Pick<ApiNewsListItem, 'id' | 'title'>;
  className?: string;
};

export function BreakingBanner({ story, className = '' }: BreakingBannerProps) {
  return (
    <Link
      href={`/news/${story.id}`}
      className={`flex items-center gap-3 sm:gap-4 rounded-[20px] lg:rounded-[24px] border border-narvo-vermilion/30 bg-gradient-to-r from-narvo-vermilion/10 to-transparent dark:from-narvo-vermilion/20 px-3.5 py-3.5 sm:px-5 sm:py-4 text-left transition-all hover:border-narvo-vermilion/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-vermilion/35 ${className}`}
      aria-label={`${COPY.breaking_banner_kicker}: ${story.title ?? COPY.breaking_banner_read_more}`}
    >
      <span className="flex h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25">
        <Zap size={20} className="sm:w-[22px] sm:h-[22px]" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <StatusPill variant="breaking" className="mb-1.5">
          {COPY.breaking_banner_kicker}
        </StatusPill>
        <p className="text-[13px] sm:text-sm lg:text-base font-semibold text-narvo-ink dark:text-white leading-snug line-clamp-2 lg:line-clamp-none">
          {story.title ?? COPY.breaking_banner_read_more}
        </p>
      </div>

      <ChevronRight
        className="shrink-0 text-narvo-ink/35 dark:text-white/35"
        size={20}
        aria-hidden
      />
    </Link>
  );
}
