'use client';

import React from 'react';
import { Radio, Play } from 'lucide-react';

export type RadioStationCardProps = {
  name: string;
  country: string;
  stream: string;
  live: boolean;
  onPlay: () => void;
};

/**
 * Live stream row: live dot + station meta + play (side-by-side spec).
 */
export function RadioStationCard({ name, country, stream, live, onPlay }: RadioStationCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-4 sm:p-5 min-h-[72px]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-narvo-teal/12 dark:bg-narvo-teal/20 text-narvo-teal dark:text-narvo-mint">
        <Radio size={22} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-narvo-ink dark:text-white text-sm sm:text-base leading-tight">{name}</p>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/12 dark:bg-red-500/15 px-2 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Live</span>
            </span>
          ) : null}
        </div>
        <p className="font-mono text-[10px] sm:text-[11px] text-narvo-ink/45 dark:text-white/40 mt-1 uppercase tracking-wide truncate">
          {country} · {stream}
        </p>
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-md shadow-narvo-vermilion/20 active:scale-[0.96] transition-transform"
        aria-label={`Play ${name}`}
      >
        <Play size={18} fill="currentColor" aria-hidden />
      </button>
    </div>
  );
}
