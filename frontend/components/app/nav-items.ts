import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Compass, Bookmark, Headphones } from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match prefix for nested routes (e.g. /news) */
  match?: 'exact' | 'prefix';
};

/**
 * Primary shell destinations — NavDock / DesktopRail.
 * Briefing stays reachable from Home, Listen, and Library; Search from the universal header.
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: 'exact' },
  { href: '/listen', label: 'Listen', icon: Headphones, match: 'prefix' },
  { href: '/discover', label: 'Discover', icon: Compass, match: 'prefix' },
  { href: '/library', label: 'Library', icon: Bookmark, match: 'prefix' },
];

export function isNavActive(pathname: string, item: AppNavItem): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
