'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, Moon, Sun, PanelLeftClose, PanelLeft } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import { APP_NAV_ITEMS, isNavActive } from './nav-items';
import { NarvoLogoMark } from '@/components/NarvoLogo';
import { useTheme } from '@/components/ThemeProvider';
import { useRailLayout } from './RailLayoutContext';
import { narvoSignOut } from '@/lib/narvo-auth-actions';

/**
 * DesktopRail — collapsible dark rail; theme + sign-out in footer (Design System v5.1).
 */
export function DesktopRail({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { expanded, toggleExpanded, railWidthClass } = useRailLayout();
  const { theme, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const onLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await narvoSignOut();
      router.push('/auth');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside
      className={`relative hidden lg:flex ${railWidthClass} shrink-0 flex-col border-r border-white/[0.08] bg-[#0f1724] text-white/90 transition-[width] duration-300 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-40`}
      aria-label="Primary"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-b from-narvo-teal/[0.12] via-transparent to-narvo-vermilion/[0.06] pointer-events-none ${railWidthClass}`}
        aria-hidden
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden py-8 px-3">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 mb-8 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/50 ${expanded ? 'xl:px-2' : 'justify-center'}`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-narvo-teal shadow-lg shadow-black/20 ring-1 ring-white/10">
            <NarvoLogoMark size="xl" inset="tight" />
          </div>
          {expanded ? (
            <span className="font-serif text-xl font-bold tracking-tight truncate">{COPY.brand_name}</span>
          ) : null}
        </Link>

        <nav className="flex-1 space-y-1 w-full min-w-0" aria-label="Main navigation">
          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={!expanded ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 ${
                  expanded ? 'xl:px-4' : 'justify-center px-0'
                } ${
                  active
                    ? 'bg-narvo-teal text-white shadow-lg shadow-black/25'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="shrink-0 opacity-90" size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
                {expanded ? <span className="truncate min-w-0">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 mt-auto border-t border-white/[0.08] space-y-1">
          <button
            type="button"
            onClick={toggleExpanded}
            title={expanded ? COPY.rail_collapse_a11y : COPY.rail_expand_a11y}
            aria-expanded={expanded}
            aria-label={expanded ? COPY.rail_collapse_a11y : COPY.rail_expand_a11y}
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 ${
              expanded ? 'xl:px-4' : 'justify-center'
            }`}
          >
            {expanded ? (
              <PanelLeftClose className="shrink-0" size={22} aria-hidden />
            ) : (
              <PanelLeft className="shrink-0" size={22} aria-hidden />
            )}
            {expanded ? <span className="truncate">{COPY.rail_toggle_label}</span> : null}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? COPY.theme_switch_dark_a11y : COPY.theme_switch_light_a11y}
            aria-label={theme === 'light' ? COPY.theme_switch_dark_a11y : COPY.theme_switch_light_a11y}
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 ${
              expanded ? 'xl:px-4' : 'justify-center'
            }`}
          >
            {theme === 'light' ? <Moon className="shrink-0" size={22} aria-hidden /> : <Sun className="shrink-0" size={22} aria-hidden />}
            {expanded ? <span className="truncate">{COPY.rail_theme_label}</span> : null}
          </button>

          <Link
            href="/settings"
            aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
            title={!expanded ? COPY.settings_title : undefined}
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 ${
              expanded ? 'xl:px-4' : 'justify-center'
            } ${
              pathname.startsWith('/settings')
                ? 'bg-narvo-teal text-white shadow-lg shadow-black/25'
                : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Settings className="shrink-0" size={22} aria-hidden />
            {expanded ? <span className="truncate">{COPY.settings_title}</span> : null}
          </Link>

          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={signingOut}
            title={!expanded ? COPY.nav_logout_a11y : undefined}
            aria-label={COPY.nav_logout_a11y}
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-mint/45 disabled:opacity-50 ${
              expanded ? 'xl:px-4' : 'justify-center'
            }`}
          >
            <LogOut className="shrink-0" size={22} aria-hidden />
            {expanded ? <span className="truncate">{COPY.settings_sign_out}</span> : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
