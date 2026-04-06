'use client';

import React from 'react';
import { COPY } from '@/lib/narvo-app-copy';

export type DashboardFeedFilter = 'all' | 'picked' | 'breaking';
export type DashboardSortOrder = 'newest' | 'oldest' | 'source';

const FEED_ITEMS: { id: DashboardFeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'picked', label: COPY.home_recommended },
  { id: 'breaking', label: COPY.home_breaking },
];

const SORT_ITEMS: { id: DashboardSortOrder; label: string }[] = [
  { id: 'newest', label: COPY.dashboard_sort_newest },
  { id: 'oldest', label: COPY.dashboard_sort_oldest },
  { id: 'source', label: COPY.dashboard_sort_source },
];

const pill = (selected: boolean) =>
  `snap-start shrink-0 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold transition-all min-h-[40px] sm:min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 ${
    selected
      ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/20'
      : 'bg-narvo-mist/60 dark:bg-white/[0.06] text-narvo-ink/65 dark:text-white/55 border border-narvo-ink/8 dark:border-white/10 hover:border-narvo-teal/25'
  }`;

function Sep() {
  return <div className="w-px h-7 shrink-0 bg-narvo-ink/12 dark:bg-white/12 mx-0.5 sm:mx-1" aria-hidden />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-narvo-teal/90 dark:text-narvo-mint/85 pl-0.5 pr-1">
      {children}
    </span>
  );
}

export type DashboardFeedToolbarProps = {
  feedFilter: DashboardFeedFilter;
  onFeedFilterChange: (v: DashboardFeedFilter) => void;
  sortOrder: DashboardSortOrder;
  onSortOrderChange: (v: DashboardSortOrder) => void;
  categoryFilter: string | null;
  onCategoryFilterChange: (v: string | null) => void;
  categoryOptions: string[];
};

/**
 * Single horizontal control strip: feed mode, sort, and category (dashboard).
 */
export function DashboardFeedToolbar({
  feedFilter,
  onFeedFilterChange,
  sortOrder,
  onSortOrderChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
}: DashboardFeedToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={COPY.dashboard_feed_toolbar_a11y}
      className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden pb-1.5 -mx-0.5 px-0.5 [scrollbar-width:thin] snap-x snap-mandatory"
    >
      {FEED_ITEMS.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={feedFilter === f.id}
          onClick={() => onFeedFilterChange(f.id)}
          className={pill(feedFilter === f.id)}
        >
          {f.label}
        </button>
      ))}

      <Sep />

      <GroupLabel>{COPY.dashboard_sort_label}</GroupLabel>
      {SORT_ITEMS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={sortOrder === s.id}
          onClick={() => onSortOrderChange(s.id)}
          className={pill(sortOrder === s.id)}
        >
          {s.label}
        </button>
      ))}

      <Sep />

      <GroupLabel>{COPY.dashboard_category_label}</GroupLabel>
      <button
        type="button"
        aria-pressed={categoryFilter === null}
        onClick={() => onCategoryFilterChange(null)}
        className={pill(categoryFilter === null)}
      >
        {COPY.dashboard_category_all}
      </button>
      {categoryOptions.map((cat) => {
        const selected = categoryFilter === cat;
        return (
          <button
            key={cat}
            type="button"
            aria-pressed={selected}
            onClick={() => onCategoryFilterChange(selected ? null : cat)}
            className={`${pill(selected)} max-w-[9.5rem] sm:max-w-[11rem] truncate`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
