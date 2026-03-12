/**
 * MobileNav — Full-width bottom tab bar (mobile only).
 * Height driven by --mobile-nav-h CSS var (56px).
 * Audio bar sits at bottom-[--mobile-nav-h] above this.
 *
 * Primary tabs: Feed | Discover | Briefing | Library | More
 * "More" sheet: Insights | Reputation | Narrative Duel | Settings
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SquaresFour }   from '@phosphor-icons/react/SquaresFour';
import { Compass }       from '@phosphor-icons/react/Compass';
import { Waveform }      from '@phosphor-icons/react/Waveform';
import { BookmarkSimple }from '@phosphor-icons/react/BookmarkSimple';
import { DotsThree }     from '@phosphor-icons/react/DotsThree';
import { GearSix }       from '@phosphor-icons/react/GearSix';
import { ChartLineUp }   from '@phosphor-icons/react/ChartLineUp';
import { ShieldCheck }   from '@phosphor-icons/react/ShieldCheck';
import { Scales }        from '@phosphor-icons/react/Scales';

interface TabItem {
  labelKey: string;
  label: string;
  icon: React.ElementType;
  path: string;
  exact?: boolean;
}

const PRIMARY_TABS: TabItem[] = [
  { labelKey: 'nav.feed',     label: 'Feed',     icon: SquaresFour,    path: '/dashboard', exact: true },
  { labelKey: 'nav.discover', label: 'Discover', icon: Compass,        path: '/discover' },
  { labelKey: 'nav.briefing', label: 'Briefing', icon: Waveform,       path: '/briefing' },
  { labelKey: 'nav.library',  label: 'Library',  icon: BookmarkSimple, path: '/library' },
];

const MORE_ITEMS: TabItem[] = [
  { labelKey: 'nav.insights',       label: 'Insights',       icon: ChartLineUp, path: '/insights' },
  { labelKey: 'nav.reputation',     label: 'Reputation',     icon: ShieldCheck, path: '/reputation' },
  { labelKey: 'nav.narrative_duel', label: 'Narrative Duel', icon: Scales,      path: '/narrative-duel' },
  { labelKey: 'nav.settings',       label: 'Settings',       icon: GearSix,     path: '/settings' },
];

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useTranslation();
  const sheetRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handle = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [moreOpen]);

  const isActive = (tab: TabItem) =>
    tab.exact
      ? location.pathname === tab.path || location.pathname === '/'
      : location.pathname.startsWith(tab.path);

  const isMoreActive = MORE_ITEMS.some((item) => location.pathname.startsWith(item.path));

  const go = (path: string) => { navigate(path); setMoreOpen(false); };

  return (
    <div ref={sheetRef} className="md:hidden">
      {/* ── More sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed left-0 right-0 z-40 bg-[rgb(var(--color-bg))] narvo-border narvo-border-b-0"
            style={{ bottom: 'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))' }}
            aria-label="More navigation"
            data-testid="mobile-nav-more-sheet"
          >
            <div className="grid grid-cols-4 divide-x divide-[rgb(var(--color-border))]">
              {MORE_ITEMS.map((item) => {
                const Icon   = item.icon;
                const active = location.pathname.startsWith(item.path);
                const label  = t(item.labelKey, item.label);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => go(item.path)}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 px-1 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[rgb(var(--color-primary))]
                      ${active
                        ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/6'
                        : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-surface-raised))]'}`}
                    data-testid={`mobile-nav-more-${item.path.replace('/', '')}`}
                  >
                    <Icon size={22} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                    <span className="font-mono text-[9px] leading-tight tracking-wider text-center line-clamp-1 px-0.5">
                      {label.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Primary tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[rgb(var(--color-bg))] narvo-border-t"
        aria-label="Mobile navigation"
        data-testid="mobile-bottom-nav"
        style={{
          height: 'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch h-[var(--mobile-nav-h)] divide-x divide-[rgb(var(--color-border))]">
          {PRIMARY_TABS.map((tab) => {
            const Icon   = tab.icon;
            const active = isActive(tab);
            const label  = t(tab.labelKey, tab.label);
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => go(tab.path)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 relative transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[rgb(var(--color-primary))]
                  ${active
                    ? 'text-[rgb(var(--color-primary))]'
                    : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                data-testid={`mobile-nav-${tab.path.replace('/', '') || 'home'}`}
              >
                {active && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-[rgb(var(--color-primary))]" aria-hidden />
                )}
                <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                <span className="font-mono text-[9px] tracking-wider leading-tight">
                  {label.toUpperCase()}
                </span>
              </button>
            );
          })}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setMoreOpen((p) => !p)}
            aria-label="More"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 relative transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[rgb(var(--color-primary))]
              ${moreOpen || isMoreActive
                ? 'text-[rgb(var(--color-primary))]'
                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
            data-testid="mobile-nav-more"
          >
            {(moreOpen || isMoreActive) && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-[rgb(var(--color-primary))]" aria-hidden />
            )}
            <DotsThree size={20} weight={moreOpen || isMoreActive ? 'fill' : 'regular'} className="shrink-0" />
            <span className="font-mono text-[9px] tracking-wider leading-tight">MORE</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
