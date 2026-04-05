'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getAuthSession } from '@/lib/narvo-session';
import { COPY } from '@/lib/narvo-app-copy';

export type AppUniversalHeaderProps = {
  /** Serif page title (DS §5.1 — Newsreader for main title) */
  title: string;
  /** Mono kicker above title */
  kicker?: string;
  /** Optional right-side override (e.g. discover keeps inline search in page) */
  endAdornment?: React.ReactNode;
};

/**
 * App top bar — Component DS v1 §5.1: context, search entry, utilities.
 */
export function AppUniversalHeader({ title, kicker, endAdornment }: AppUniversalHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [initial, setInitial] = useState('');

  useEffect(() => {
    const s = getAuthSession();
    const n = s?.name?.trim() || s?.email?.trim()?.charAt(0) || '';
    setInitial(n ? n.charAt(0).toUpperCase() : '');
  }, []);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-narvo-ink/8 dark:border-white/10 bg-[var(--bg-primary)]/88 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--bg-primary)]/75 lg:z-20">
      <div className="flex h-[3.25rem] sm:h-14 items-center gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto w-full">
        <Link
          href="/dashboard"
          className="flex lg:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal text-white shadow-md shadow-narvo-teal/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40"
          aria-label={`${COPY.brand_name} home`}
        >
          <span className="font-serif text-lg font-bold leading-none">N</span>
        </Link>

        <div className="min-w-0 flex-1">
          {kicker ? (
            <p className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint/90 truncate">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-serif text-[1.05rem] sm:text-xl font-semibold tracking-tight text-narvo-ink dark:text-white truncate leading-tight">
            {title}
          </h1>
        </div>

        <Link
          href="/discover"
          className="hidden md:inline-flex flex-1 max-w-sm mx-2 items-center gap-2 rounded-full border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/40 dark:bg-white/[0.05] px-4 py-2 text-sm text-narvo-ink/45 dark:text-white/45 hover:border-narvo-teal/25 hover:text-narvo-ink/70 dark:hover:text-white/70 transition-colors"
        >
          <Search size={16} className="shrink-0 opacity-70" aria-hidden />
          <span className="truncate font-medium">{COPY.search_placeholder}</span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Link
            href="/discover"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors"
            aria-label={COPY.search_placeholder}
          >
            <Search size={20} aria-hidden />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-narvo-ink/65 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors touch-manipulation"
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
          </button>

          <Link
            href="/settings"
            className="hidden sm:flex h-11 w-11 items-center justify-center rounded-full font-serif text-sm font-bold bg-narvo-teal/12 text-narvo-teal dark:bg-white/10 dark:text-narvo-mint hover:bg-narvo-teal/18 dark:hover:bg-white/15 transition-colors"
            aria-label={COPY.settings_title}
          >
            {initial || '·'}
          </Link>

          {endAdornment}
        </div>
      </div>
    </header>
  );
}
