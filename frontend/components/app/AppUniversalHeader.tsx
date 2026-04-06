'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getAuthSession } from '@/lib/narvo-session';
import { COPY } from '@/lib/narvo-app-copy';
import { DownloadQueueIndicator } from '@/components/DownloadQueueIndicator';
import { NarvoLogoMark } from '@/components/NarvoLogo';

export type AppUniversalHeaderProps = {
  /** Serif page title (DS §5.1 — Newsreader for main title) */
  title: string;
  /** Mono kicker above title */
  kicker?: string;
  /** Left control before the title block (e.g. story back). Replaces the mobile logo slot when set. */
  startAdornment?: React.ReactNode;
  /** Slim row under the main bar (e.g. offline save status on story detail). */
  subHeader?: React.ReactNode;
  /** Optional right-side override (e.g. discover keeps inline search in page) */
  endAdornment?: React.ReactNode;
};

/**
 * App top bar — centred search on desktop; theme toggle on small screens only (rail holds theme on lg+).
 */
export function AppUniversalHeader({
  title,
  kicker,
  startAdornment,
  subHeader,
  endAdornment,
}: AppUniversalHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [initial, setInitial] = useState('');

  useEffect(() => {
    const s = getAuthSession();
    const n = s?.name?.trim() || s?.email?.trim()?.charAt(0) || '';
    setInitial(n ? n.charAt(0).toUpperCase() : '');
  }, []);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-narvo-ink/8 dark:border-white/10 bg-[var(--bg-primary)]/88 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--bg-primary)]/75 lg:z-20">
      <div className="relative flex h-14 sm:h-16 items-center gap-2 sm:gap-3 px-3 sm:px-5 lg:px-6 max-w-[1800px] mx-auto w-full">
        {startAdornment ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">{startAdornment}</div>
        ) : (
          <Link
            href="/dashboard"
            className="flex lg:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal shadow-md shadow-narvo-teal/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40"
            aria-label={`${COPY.brand_name} home`}
          >
            <NarvoLogoMark size="header" inset="tight" />
          </Link>
        )}

        {/* Title — compact on md+ when search is centred */}
        <div className="min-w-0 shrink lg:max-w-[200px] xl:max-w-[240px]">
          {kicker ? (
            <p className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint/90 truncate">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-serif text-[1.05rem] sm:text-lg font-semibold tracking-tight text-narvo-ink dark:text-white truncate leading-tight">
            {title}
          </h1>
        </div>

        {/* Centred search — desktop width; inspired by editorial “command bar” patterns */}
        <div className="hidden md:flex flex-1 justify-center px-2 min-w-0">
          <Link
            href="/search"
            className="flex w-full max-w-xl lg:max-w-2xl xl:max-w-3xl items-center gap-3 rounded-full border-2 border-narvo-ink/12 dark:border-white/12 bg-narvo-butter/25 dark:bg-narvo-butter/10 px-4 sm:px-5 py-2.5 text-sm text-narvo-ink/55 dark:text-white/50 hover:border-narvo-teal/35 hover:text-narvo-ink/75 dark:hover:text-white/70 transition-colors shadow-sm"
          >
            <Search size={18} className="shrink-0 opacity-70 text-narvo-ink/50 dark:text-white/45" aria-hidden />
            <span className="truncate font-medium text-left">{COPY.header_search_wide_placeholder}</span>
          </Link>
        </div>

        <div className="flex flex-1 md:flex-none justify-end items-center gap-0.5 sm:gap-1 shrink-0">
          <div className="hidden sm:block">
            <DownloadQueueIndicator />
          </div>
          <Link
            href="/search"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors"
            aria-label={COPY.search_placeholder}
          >
            <Search size={20} aria-hidden />
          </Link>

          <Link
            href="/settings?tab=notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors"
            aria-label={COPY.nav_notifications_a11y}
          >
            <Bell size={20} aria-hidden />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-narvo-ink/65 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors touch-manipulation"
            aria-label={theme === 'light' ? COPY.theme_switch_dark_a11y : COPY.theme_switch_light_a11y}
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
      {subHeader ? (
        <div className="border-t border-narvo-ink/8 dark:border-white/10 px-3 sm:px-5 lg:px-6 max-w-[1800px] mx-auto w-full py-2">
          {subHeader}
        </div>
      ) : null}
    </header>
  );
}
