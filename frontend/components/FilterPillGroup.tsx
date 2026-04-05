'use client';

import React from 'react';

export type FilterPillItem<T extends string> = { id: T; label: string };

type FilterPillGroupProps<T extends string> = {
  items: readonly FilterPillItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Segmented feed filters — Component DS §15.1 FilterPill / rail pattern.
 */
export function FilterPillGroup<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: FilterPillGroupProps<T>) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-0.5 px-0.5 snap-x snap-mandatory ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((f) => {
        const selected = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(f.id)}
            className={`snap-start shrink-0 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 ${
              selected
                ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/20'
                : 'bg-narvo-mist/60 dark:bg-white/[0.06] text-narvo-ink/65 dark:text-white/55 border border-narvo-ink/8 dark:border-white/10 hover:border-narvo-teal/25'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
