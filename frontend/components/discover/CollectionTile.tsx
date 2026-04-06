'use client';

import React from 'react';

export type CollectionTileProps = {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
};

/**
 * Topic / category tile for Discover — horizontal strip of filters (Page spec side-by-side row).
 */
export function CollectionTile({ label, count, selected, onClick }: CollectionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-left transition-colors min-h-[44px] ${
        selected
          ? 'border-narvo-teal/50 bg-narvo-teal/12 dark:bg-narvo-teal/20 text-narvo-ink dark:text-white'
          : 'border-narvo-ink/10 dark:border-white/12 bg-narvo-cloud/80 dark:bg-narvo-ink/30 text-narvo-ink/80 dark:text-white/75 hover:border-narvo-teal/30'
      }`}
    >
      <span className="text-sm font-bold leading-tight line-clamp-1">{label}</span>
      {count != null && count > 0 ? (
        <span className="font-mono text-[10px] text-narvo-ink/40 dark:text-white/40 tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}
