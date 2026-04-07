'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Moon, Sun, Bell, BarChart3 } from 'lucide-react';
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
  const { resolvedTheme, toggleTheme } = useTheme();
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

        {/* Title — capped width so centred search keeps room */}
        <div className="min-w-0 max-w-[42%] shrink md:max-w-[min(200px,28vw)] lg:max-w-[220px] xl:max-w-[260px]">
          {kicker ? (
            <p className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint/90 truncate">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-serif text-[1.05rem] sm:text-lg font-semibold tracking-tight text-narvo-ink dark:text-white truncate leading-tight">
            {title}
          </h1>
        </div>

        {/* Centred command bar — card surface, matches in-app search field rhythm */}
        <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
          <Link
            href="/search"
            className="flex h-11 w-full max-w-xl min-w-0 items-center gap-2.5 rounded-[18px] border border-narvo-ink/10 bg-white/95 px-3.5 shadow-[0_2px_14px_-6px_rgba(23,50,74,0.14)] transition-[border-color,box-shadow,background-color] hover:border-narvo-teal/30 hover:bg-narvo-cloud/95 hover:shadow-[0_4px_20px_-8px_rgba(15,95,115,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 dark:border-white/12 dark:bg-narvo-ink/55 dark:shadow-[0_2px_20px_-8px_rgba(0,0,0,0.35)] dark:hover:border-narvo-mint/25 dark:hover:bg-narvo-ink/70 lg:h-12 lg:max-w-2xl lg:gap-3 lg:px-4 xl:max-w-[34rem]"
          >
            <Search
              size={18}
              className="shrink-0 text-narvo-teal/80 dark:text-narvo-mint/80"
              aria-hidden
            />
            <span className="min-w-0 truncate text-left text-[13px] font-medium text-narvo-ink/50 lg:text-sm dark:text-white/48">
              {COPY.header_search_wide_placeholder}
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1 md:flex-none md:shrink-0">
          <div className="hidden sm:block">
            <DownloadQueueIndicator />
          </div>
          <Link
            href="/search"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-narvo-ink/60 transition-colors hover:bg-narvo-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 dark:text-white/55 dark:hover:bg-white/[0.08] md:hidden"
            aria-label={COPY.search_placeholder}
          >
            <Search size={20} aria-hidden />
          </Link>

          <Link
            href="/insights"
            className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-narvo-ink/60 transition-colors hover:bg-narvo-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 dark:text-white/55 dark:hover:bg-white/[0.08]"
            aria-label={COPY.nav_insights_shortcut_a11y}
          >
            <BarChart3 size={20} aria-hidden />
          </Link>
          <Link
            href="/settings?tab=preferences"
            className="hidden lg:flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35"
            aria-label={COPY.nav_notifications_a11y}
          >
            <Bell size={20} aria-hidden />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-narvo-ink/65 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors touch-manipulation"
            aria-label={resolvedTheme === 'light' ? COPY.theme_switch_dark_a11y : COPY.theme_switch_light_a11y}
          >
            {resolvedTheme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
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
