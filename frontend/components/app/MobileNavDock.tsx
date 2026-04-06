'use client';

import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { APP_NAV_ITEMS, isNavActive } from './nav-items';
import { COPY } from '@/lib/narvo-app-copy';
import { useAudioPlayer } from '@/components/AudioPlayerContext';

/**
 * NavDock — Component DS v1 §5.2: floating pill, large targets, teal active state.
 * Live audio dot appears on the Listen tab when audio is playing.
 */
export function MobileNavDock({ pathname }: { pathname: string }) {
  const { isPlaying } = useAudioPlayer();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      aria-label="Mobile primary"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-stretch justify-between gap-1 rounded-[26px] border border-narvo-ink/10 bg-white/92 dark:bg-[#121c28]/95 dark:border-white/10 px-1.5 py-1.5 shadow-[0_12px_40px_-8px_rgba(23,50,74,0.25)] dark:shadow-black/40 backdrop-blur-xl">
        {APP_NAV_ITEMS.filter((item) => item.dock !== false).map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item);
          const isListen = item.href === '/listen';
          const showLiveDot = isListen && isPlaying && !active;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={isListen && isPlaying ? COPY.nav_listen_live_a11y : item.label}
              className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-1.5 text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 ${
                active
                  ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/25'
                  : 'text-narvo-ink/45 dark:text-white/45 hover:bg-narvo-mist/80 dark:hover:bg-white/[0.06]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
              <span className="truncate max-w-[4.5rem] text-center leading-tight">{item.label}</span>
              {showLiveDot && (
                <span
                  className="absolute top-2 right-[calc(50%-10px)] h-2 w-2 rounded-full bg-narvo-vermilion shadow-sm shadow-narvo-vermilion/40 animate-pulse"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
        <Link
          href="/settings"
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-1.5 text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 ${
            pathname.startsWith('/settings')
              ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/25'
              : 'text-narvo-ink/45 dark:text-white/45 hover:bg-narvo-mist/80 dark:hover:bg-white/[0.06]'
          }`}
        >
          <Settings size={20} aria-hidden />
          <span className="truncate max-w-[4.5rem] text-center leading-tight">{COPY.settings_title}</span>
        </Link>
      </div>
    </nav>
  );
}
