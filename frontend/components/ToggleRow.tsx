'use client';

import React from 'react';

export type ToggleRowProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Optional trailing slot (e.g. a pill badge) — overrides the toggle. */
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * Settings row with optional icon, label, description, and toggle switch.
 * Component DS Family 6 §10.4 — highest-reuse utility row.
 */
export function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
  trailing,
  className = '',
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-center gap-4 py-4 border-b border-narvo-ink/[0.06] dark:border-white/[0.06] last:border-b-0 ${className}`}
    >
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-narvo-mist dark:bg-white/[0.07] text-narvo-ink/70 dark:text-white/65">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-narvo-ink dark:text-white leading-snug">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-narvo-ink/50 dark:text-white/45 leading-snug">
            {description}
          </p>
        )}
      </div>
      {trailing ? (
        <div className="shrink-0">{trailing}</div>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative shrink-0 h-[28px] w-[50px] rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 disabled:opacity-40 ${
            checked
              ? 'bg-narvo-teal dark:bg-narvo-mint/80'
              : 'bg-narvo-ink/18 dark:bg-white/15'
          }`}
          aria-label={title}
        >
          <span
            className={`pointer-events-none absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      )}
    </div>
  );
}
