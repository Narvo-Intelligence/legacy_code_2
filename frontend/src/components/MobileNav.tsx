/**
 * MobileNav — v3 five-tab bottom navigation.
 * ──────────────────────────────────────────
 * Replaces the v2 four-tab + More sheet pattern.
 *
 * Tabs: Home | Discover | Listen | Library | Profile
 * Routes: /dashboard | /discover | /listen | /library | /profile
 *
 * Design System v3:
 *   - CSS var tokens (theme-aware — works across all themes)
 *   - 48px minimum touch targets
 *   - Spring active indicator (top edge 2px line)
 *   - fill icon weight when active
 *   - No More sheet — every destination is a direct tab
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SquaresFour }    from '@phosphor-icons/react/SquaresFour';
import { Compass }        from '@phosphor-icons/react/Compass';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { UserCircle }     from '@phosphor-icons/react/UserCircle';

interface TabDef {
  labelKey: string;
  label:    string;
  Icon:     React.ElementType;
  path:     string;
  /** Match any sub-route as active */
  prefix?:  boolean;
}

const TABS: TabDef[] = [
  { labelKey: 'nav.home',     label: 'Home',     Icon: SquaresFour,    path: '/dashboard', prefix: false },
  { labelKey: 'nav.discover', label: 'Discover', Icon: Compass,        path: '/discover',  prefix: true  },
  { labelKey: 'nav.listen',   label: 'Listen',   Icon: Waveform,       path: '/listen',    prefix: true  },
  { labelKey: 'nav.library',  label: 'Library',  Icon: BookmarkSimple, path: '/library',   prefix: true  },
  { labelKey: 'nav.profile',  label: 'Profile',  Icon: UserCircle,     path: '/profile',   prefix: true  },
];

const spring = { type: 'spring', stiffness: 380, damping: 28 } as const;

export default function MobileNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useTranslation();

  const isActive = (tab: TabDef): boolean => {
    if (!tab.prefix) {
      return location.pathname === tab.path || location.pathname === '/';
    }
    // /profile also covers /settings, /account, /accessibility, /subscription, /voices, /system
    if (tab.path === '/profile') {
      return ['/profile', '/settings', '/account', '/accessibility', '/subscription', '/voices', '/system']
        .some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
    }
    // /listen also covers /briefing
    if (tab.path === '/listen') {
      return location.pathname.startsWith('/listen') || location.pathname.startsWith('/briefing');
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      aria-label="Main navigation"
      data-testid="mobile-bottom-nav"
      style={{
        height:        'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background:    'rgb(var(--color-bg))',
        borderTop:     '1px solid rgb(var(--color-border-subtle))',
      }}
    >
      <div
        className="flex items-stretch"
        style={{ height: 'var(--mobile-nav-h)' }}
        role="tablist"
      >
        {TABS.map((tab) => {
          const active = isActive(tab);
          const label  = t(tab.labelKey, tab.label);

          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
              className="relative flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              style={{
                minHeight: 48,
                color: active
                  ? 'rgb(var(--color-primary))'
                  : 'rgb(var(--color-text-dim-accessible))',
                // focus-visible ring uses primary
                ['--tw-ring-color' as string]: 'rgb(var(--color-primary))',
              }}
              data-testid={`mobile-nav-${tab.path.replace('/', '') || 'home'}`}
            >
              {/* Active top-edge indicator */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="indicator"
                    layoutId="mobile-nav-indicator"
                    className="absolute top-0 left-[12%] right-[12%] rounded-b-full"
                    style={{
                      height: 2,
                      background: 'rgb(var(--color-primary))',
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={spring}
                    aria-hidden
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <tab.Icon
                size={22}
                weight={active ? 'fill' : 'regular'}
                aria-hidden
              />

              {/* Label */}
              <span
                className="font-body leading-none font-semibold"
                style={{ fontSize: 10, letterSpacing: '0.02em' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
