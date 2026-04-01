import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Books,
  Compass,
  Headphones,
  House,
  UserCircle,
} from '@phosphor-icons/react';

type NavItem = {
  id: string;
  to: string;
  labelKey: string;
  icon: React.ElementType;
  match?: string[];
  live?: boolean;
};

const navItems: NavItem[] = [
  { id: 'home', to: '/dashboard', labelKey: 'nav.home', icon: House },
  { id: 'listen', to: '/listen', labelKey: 'nav.listen', icon: Headphones, match: ['/briefing'], live: true },
  { id: 'discover', to: '/discover', labelKey: 'nav.discover', icon: Compass },
  { id: 'library', to: '/library', labelKey: 'nav.library', icon: Books },
  { id: 'profile', to: '/settings', labelKey: 'nav.profile', icon: UserCircle, match: ['/profile', '/subscription', '/voices', '/insights'] },
];

const isActiveRoute = (pathname: string, item: NavItem) => {
  if (pathname === item.to) return true;
  if (item.match?.some((value) => pathname === value || pathname.startsWith(`${value}/`))) return true;
  return pathname.startsWith(`${item.to}/`);
};

/**
 * NavDock — Primary mobile navigation.
 * Floating, pill-based, and visually tied to the v5.1 shell.
 */
export const NavDock: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-24px)] max-w-md md:hidden">
      <nav
        className="mx-auto flex items-center gap-1 rounded-full px-2 py-2 shadow-[var(--shadow-3)]"
        style={{
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(23, 50, 74, 0.08)',
          backdropFilter: 'blur(18px)',
        }}
        aria-label="Primary mobile navigation"
        data-testid="nav-dock"
      >
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.to}
              className="relative flex-1"
              aria-current={active ? 'page' : undefined}
            >
              <motion.div
                layout
                className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-full transition-all duration-200 ${
                  active ? 'text-primary' : 'text-content-dim'
                }`}
                style={{
                  background: active ? 'rgba(15, 95, 115, 0.12)' : 'transparent',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-dock-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(15, 95, 115, 0.12)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  />
                )}
                <div className="relative z-[1] flex items-center justify-center">
                  <Icon size={21} weight={active ? 'fill' : 'regular'} />
                  {item.live && !active && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-alert shadow-[0_0_14px_rgba(240,75,36,0.45)]" />
                  )}
                </div>
                <span className="relative z-[1] text-[10px] font-bold uppercase tracking-[0.12em]">
                  {t(item.labelKey)}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
