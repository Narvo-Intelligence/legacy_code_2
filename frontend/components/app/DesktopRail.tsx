'use client';

import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import { APP_NAV_ITEMS, isNavActive } from './nav-items';

/**
 * DesktopRail — Narvo_Component_Design_System_v1 §5.3, Design_Foundation_v5 deep rail.
 * Dark anchored navigation; main canvas stays airy.
 */
export function DesktopRail({ pathname }: { pathname: string }) {
  return (
    <aside
      className="relative hidden lg:flex w-[4.5rem] xl:w-[15.5rem] shrink-0 flex-col border-r border-white/[0.08] bg-[#0f1724] text-white/90 transition-colors"
      aria-label="Primary"
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-narvo-teal/[0.12] via-transparent to-narvo-vermilion/[0.06] pointer-events-none lg:w-[4.5rem] xl:w-[15.5rem]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col h-full min-h-screen py-8 px-3 xl:px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-10 xl:px-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-narvo-teal text-white shadow-lg shadow-black/20 ring-1 ring-white/10">
            <span className="font-serif text-xl font-bold leading-none">N</span>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight hidden xl:block truncate">
            {COPY.brand_name}
          </span>
        </Link>

        <nav className="flex-1 space-y-1 w-full" aria-label="Main navigation">
          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 xl:px-4 ${
                  active
                    ? 'bg-narvo-teal text-white shadow-lg shadow-black/25'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="shrink-0 opacity-90" size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
                <span className="hidden xl:inline truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 mt-auto border-t border-white/[0.08]">
          <Link
            href="/settings"
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 xl:px-4 ${
              pathname.startsWith('/settings')
                ? 'bg-narvo-teal text-white shadow-lg shadow-black/25'
                : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Settings className="shrink-0" size={22} aria-hidden />
            <span className="hidden xl:inline">{COPY.settings_title}</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
