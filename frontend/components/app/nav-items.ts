import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Newspaper,
  Search,
  Bookmark,
  Headphones,
} from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match prefix for nested routes (e.g. /news) */
  match?: 'exact' | 'prefix';
};

/** Canonical app destinations — Component DS v1 §5 NavDock / DesktopRail */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: 'exact' },
  { href: '/briefing', label: 'Briefing', icon: Newspaper, match: 'prefix' },
  { href: '/listen', label: 'Listen', icon: Headphones, match: 'prefix' },
  { href: '/search', label: 'Search', icon: Search, match: 'prefix' },
  { href: '/library', label: 'Library', icon: Bookmark, match: 'prefix' },
];

export function isNavActive(pathname: string, item: AppNavItem): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
