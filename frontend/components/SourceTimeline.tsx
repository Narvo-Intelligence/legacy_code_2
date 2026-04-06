'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';

export type SourceTimelineProps = {
  sources: string[];
  loading?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
};

/**
 * Lightweight source trail — confidence without forensic density (Emotional Guidelines §3.2).
 */
export function SourceTimeline({
  sources,
  loading,
  className = '',
  variant = 'light',
}: SourceTimelineProps) {
  const list = sources.map((s) => s.trim()).filter(Boolean);
  const isDark = variant === 'dark';

  const labelMuted = isDark ? 'text-white/45' : 'text-narvo-ink/45 dark:text-white/45';
  const bodyMuted = isDark ? 'text-white/55' : 'text-narvo-ink/55 dark:text-white/55';
  const rowText = isDark ? 'text-white/85' : 'text-narvo-ink/85 dark:text-white/85';
  const moreText = isDark ? 'text-white/45' : 'text-narvo-ink/45 dark:text-white/45';

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        <p className={`text-[10px] font-mono uppercase tracking-widest ${labelMuted}`}>
          {COPY.news_sources_checked_label}
        </p>
        <p className={`text-sm ${bodyMuted}`}>{COPY.news_sources_loading}</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className={className}>
        <p className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${labelMuted}`}>
          {COPY.news_sources_checked_label}
        </p>
        <p className={`text-sm ${bodyMuted}`}>{COPY.news_sources_empty}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className={`text-[10px] font-mono uppercase tracking-widest mb-3 ${labelMuted}`}>
        {COPY.news_sources_checked_label}
      </p>
      <ul className="space-y-2">
        {list.slice(0, 8).map((name, i) => (
          <li key={`${name}-${i}`} className={`flex items-center gap-2 text-sm ${rowText}`}>
            <CheckCircle2 size={16} className="shrink-0 text-narvo-teal dark:text-narvo-mint" aria-hidden />
            <span className="truncate">{name}</span>
          </li>
        ))}
      </ul>
      {list.length > 8 ? (
        <p className={`mt-2 flex items-center gap-1 text-xs font-mono ${moreText}`}>
          <Circle size={12} aria-hidden /> +{list.length - 8} more
        </p>
      ) : null}
    </div>
  );
}
