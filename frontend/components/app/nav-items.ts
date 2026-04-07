import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Compass, Bookmark, Headphones, BarChart3, User } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match prefix for nested routes (e.g. /news) */
  match?: 'exact' | 'prefix';
  /** When false, hidden from MobileNavDock (desktop rail still shows the item). */
  dock?: boolean;
};

/**
 * Primary shell destinations — NavDock / DesktopRail.
 * Briefing stays reachable from Home, Listen, and Library; Search from the universal header.
 * Insights uses dock: false; mobile entry points are header shortcuts on Listen and Library.
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: 'exact' },
  { href: '/listen', label: 'Listen', icon: Headphones, match: 'prefix' },
  { href: '/discover', label: 'Discover', icon: Compass, match: 'prefix' },
  { href: '/library', label: 'Library', icon: Bookmark, match: 'prefix' },
  {
    href: '/insights',
    label: COPY.insights_page_title,
    icon: BarChart3,
    match: 'prefix',
    dock: false,
  },
  {
    href: '/profile',
    label: COPY.profile_page_title,
    icon: User,
    match: 'prefix',
    dock: false,
  },
];

export function isNavActive(pathname: string, item: AppNavItem): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
