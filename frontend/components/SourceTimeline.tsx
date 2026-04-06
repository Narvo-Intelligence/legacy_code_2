'use client';

import React from 'react';
import { COPY } from '@/lib/narvo-app-copy';

/* ─────────────────────────────────────────────────────────────
   SourceTimeline — confidence trail with coloured role dots.
   Component DS §7.3 SourceTimeline / §11 trust family.
   Source roles: PRIMARY (teal) · SUPPORTING (butter) · CONTEXT (alert/red-leaning)
   "Forensic, not decorative. Spacing matters more than ornament."
───────────────────────────────────────────────────────────── */

/** Role assigned by Gemini's assign_source_roles(). Matches backend SOURCE_ROLES. */
export type SourceRole = 'PRIMARY' | 'SUPPORTING' | 'CONTEXT';

export type SourceEntry = {
  name: string;
  role?: SourceRole;
  timestamp?: string;
};

export type SourceTimelineProps = {
  /** Pass either plain strings (backward-compat) or SourceEntry objects */
  sources: string[] | SourceEntry[];
  loading?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
};

// Role → dot colour + optional label
const ROLE_CONFIG: Record<SourceRole, { dot: string; label: string }> = {
  PRIMARY: {
    dot: 'bg-narvo-teal dark:bg-narvo-mint',
    label: COPY.source_role_primary,
  },
  SUPPORTING: {
    dot: 'bg-narvo-butter',
    label: COPY.source_role_supporting,
  },
  CONTEXT: {
    dot: 'bg-narvo-vermilion/80',
    label: COPY.source_role_context,
  },
};

function normalise(sources: string[] | SourceEntry[]): SourceEntry[] {
  return sources.map((s) => (typeof s === 'string' ? { name: s } : s));
}

export function SourceTimeline({
  sources,
  loading,
  className = '',
  variant = 'light',
}: SourceTimelineProps) {
  const list = normalise(sources).filter((s) => s.name.trim());
  const isDark = variant === 'dark';

  const labelMuted = isDark ? 'text-white/45' : 'text-narvo-ink/45 dark:text-white/45';
  const bodyMuted  = isDark ? 'text-white/55' : 'text-narvo-ink/55 dark:text-white/55';
  const rowText    = isDark ? 'text-white/85' : 'text-narvo-ink/85 dark:text-white/85';
  const roleText   = isDark ? 'text-white/35' : 'text-narvo-ink/35 dark:text-white/35';
  const lineColor  = isDark ? 'bg-white/10'   : 'bg-narvo-ink/10 dark:bg-white/10';

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

      {/* Timeline vertical track */}
      <div className="relative pl-5">
        {/* Vertical rule */}
        <div className={`absolute left-[7px] top-2 bottom-2 w-px ${lineColor}`} aria-hidden />

        <ul className="space-y-4">
          {list.slice(0, 8).map((entry, i) => {
            const roleCfg = entry.role ? ROLE_CONFIG[entry.role] : null;
            return (
              <li key={`${entry.name}-${i}`} className="relative flex items-start gap-2.5">
                {/* Dot */}
                <span
                  className={`absolute -left-5 mt-1 flex h-[14px] w-[14px] items-center justify-center`}
                  aria-hidden
                >
                  <span
                    className={`h-[10px] w-[10px] rounded-full ring-[3px] ring-white dark:ring-narvo-ink/90 ${
                      roleCfg ? roleCfg.dot : 'bg-narvo-teal/60 dark:bg-narvo-mint/60'
                    }`}
                  />
                </span>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-medium leading-snug ${rowText}`}>
                    {entry.name}
                  </span>
                  {(entry.timestamp || roleCfg) ? (
                    <p className={`mt-0.5 font-mono text-[10px] ${roleText}`}>
                      {[roleCfg?.label, entry.timestamp].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {list.length > 8 ? (
          <p className={`mt-3 pl-0 font-mono text-xs ${bodyMuted}`}>
            +{list.length - 8} more
          </p>
        ) : null}
      </div>
    </div>
  );
}
