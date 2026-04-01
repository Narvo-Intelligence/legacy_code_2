/**
 * MobileNav — v4, five-tab bottom navigation.
 * ─────────────────────────────────────────────
 * Tabs: Home | Discover | Listen | Library | Profile
 * Routes: /dashboard | /discover | /listen | /library | /profile
 *
 * v4 tokens: var(--color-*) hex vars, 72px height, Sunshine Yellow
 * active indicator dot, Forest Green active text + fill icon.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { SquaresFour }    from '@phosphor-icons/react/SquaresFour';
import { Compass }        from '@phosphor-icons/react/Compass';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { UserCircle }     from '@phosphor-icons/react/UserCircle';

interface TabDef {
  label:   string;
  Icon:    React.ElementType;
  path:    string;
  prefix?: boolean;
}

const TABS: TabDef[] = [
  { label: 'Home',     Icon: SquaresFour,    path: '/dashboard', prefix: false },
  { label: 'Discover', Icon: Compass,        path: '/discover',  prefix: true  },
  { label: 'Listen',   Icon: Waveform,       path: '/listen',    prefix: true  },
  { label: 'Library',  Icon: BookmarkSimple, path: '/library',   prefix: true  },
  { label: 'Profile',  Icon: UserCircle,     path: '/profile',   prefix: true  },
];

const spring = { type: 'spring', stiffness: 380, damping: 28 } as const;

const isActive = (tab: TabDef, pathname: string): boolean => {
  if (!tab.prefix) return pathname === tab.path || pathname === '/';
  if (tab.path === '/profile') {
    return ['/profile', '/settings', '/subscription', '/voices', '/insights']
      .some((p) => pathname === p || pathname.startsWith(p + '/'));
  }
  if (tab.path === '/listen') {
    return pathname.startsWith('/listen') || pathname.startsWith('/briefing');
  }
  return pathname.startsWith(tab.path);
};

export default function MobileNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      aria-label="Main navigation"
      data-testid="mobile-bottom-nav"
      style={{
        height:        'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background:    'var(--color-bg)',
        borderTop:     '1px solid var(--color-border)',
        boxShadow:     'var(--shadow-3)',
      }}
    >
      <div
        className="flex items-stretch"
        style={{ height: 'var(--mobile-nav-h)' }}
        role="tablist"
      >
        {TABS.map((tab) => {
          const active = isActive(tab, pathname);

          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
              className="relative flex-1 flex flex-col items-center justify-center"
              style={{
                gap:        4,
                minHeight:  48,
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      active ? 'var(--color-primary)' : 'var(--color-text-meta)',
                transition: 'color 150ms var(--ease-standard)',
              }}
            >
              {/* Active indicator — Sunshine Yellow dot above icon */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    key="tab-dot"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={spring}
                    style={{
                      position:     'absolute',
                      top:          8,
                      left:         '50%',
                      transform:    'translateX(-50%)',
                      width:        4,
                      height:       4,
                      borderRadius: 9999,
                      background:   'var(--color-accent)',
                    }}
                    aria-hidden
                  />
                )}
              </AnimatePresence>

              <tab.Icon
                weight={active ? 'fill' : 'regular'}
                style={{ width: 22, height: 22 }}
                aria-hidden
              />

              <span style={{
                fontFamily:    'var(--font-body)',
                fontSize:      10,
                fontWeight:    active ? 700 : 500,
                letterSpacing: '0.02em',
                lineHeight:    1,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
