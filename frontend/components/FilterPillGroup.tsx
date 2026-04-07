'use client';

import React, { useCallback, useRef } from 'react';

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
 * Keyboard: ArrowLeft/Right/Home/End move selection and focus (roving tabindex).
 */
export function FilterPillGroup<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: FilterPillGroupProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = (i: number) => {
    const el = tabRefs.current[i];
    if (el) el.focus();
  };

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const idx = items.findIndex((f) => f.id === value);
      if (idx < 0) return;
      let next = idx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (idx + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (idx - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        next = items.length - 1;
      } else {
        return;
      }
      onChange(items[next].id);
      queueMicrotask(() => focusIndex(next));
    },
    [items, onChange, value]
  );

  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-0.5 px-0.5 snap-x snap-mandatory ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map((f, i) => {
        const selected = value === f.id;
        return (
          <button
            key={f.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            tabIndex={selected ? 0 : -1}
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
