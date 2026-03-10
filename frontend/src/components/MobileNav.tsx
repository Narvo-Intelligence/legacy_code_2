/**
 * Mobile nav: centered bar (Hamburger | Feed | Settings). Design system: 8pt grid, 1px borders, no radius.
 * On hamburger click, the bar slides to full width and shows only nav options not in the bar (excludes Feed, Settings, Search, Account).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  List,
  GearSix,
  X,
  Broadcast,
  ChartLineUp,
  ShieldCheck,
  Scales,
  BookmarkSimple,
  Compass,
  SquaresFour,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react/lib';

interface MenuItem {
  labelKey: string;
  labelFallback: string;
  icon: Icon;
  path: string;
}

/** Items shown in the expanded menu only (excludes Feed, Settings, Search, Account — already in bar or header). */
const EXPANDED_MENU_ITEMS: MenuItem[] = [
  { labelKey: 'nav.discover', labelFallback: 'Discover', icon: Compass, path: '/discover' },
  { labelKey: 'nav.briefing', labelFallback: 'Briefing', icon: Broadcast, path: '/briefing' },
  { labelKey: 'nav.library', labelFallback: 'Library', icon: BookmarkSimple, path: '/library' },
  { labelKey: 'nav.insights', labelFallback: 'Insights', icon: ChartLineUp, path: '/insights' },
  { labelKey: 'nav.reputation', labelFallback: 'Reputation', icon: ShieldCheck, path: '/reputation' },
  { labelKey: 'nav.narrative_duel', labelFallback: 'Narrative Duel', icon: Scales, path: '/narrative-duel' },
];

export default function MobileNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isSettingsActive =
    location.pathname === '/settings' ||
    ['/account', '/voices', '/system', '/accessibility'].includes(location.pathname);
  const isHomeActive = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]"
      aria-label="Mobile navigation"
      data-testid="mobile-bottom-nav"
    >
      <div className="w-full flex justify-center px-2 py-1.5" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0))' }}>
        <motion.div
          layout
          initial={false}
          animate={{
            width: isMenuOpen ? '100%' : 144,
          }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="narvo-border bg-[rgb(var(--color-surface))] overflow-hidden flex flex-col"
        >
        {/* Top row: closed = three icons no gap, centered; open = Close | MENU | Settings spread */}
        <div className={`flex items-center min-h-11 shrink-0 ${isMenuOpen ? 'justify-between px-2' : 'justify-center gap-0'}`}>
          {isMenuOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] flex items-center justify-center text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))]"
                aria-label={t('common.close', 'Close')}
                data-testid="mobile-nav-close"
              >
                <X size={24} weight="bold" />
              </button>
              <span className="mono-ui text-[10px] text-[rgb(var(--color-text-dim-accessible))] tracking-widest">
                MENU
              </span>
              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  setIsMenuOpen(false);
                }}
                className={`min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] flex items-center justify-center transition-colors focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))] ${isSettingsActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))]'}`}
                aria-label={t('nav.settings', 'Settings')}
              >
                <GearSix size={24} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] flex items-center justify-center text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))]"
                aria-label={t('nav.menu', 'Open menu')}
                data-testid="mobile-nav-menu"
              >
                <List size={24} weight="regular" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] flex items-center justify-center transition-colors focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))] ${isHomeActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))]'}`}
                aria-label={t('nav.feed', 'Feed')}
                data-testid="mobile-nav-home"
              >
                <SquaresFour size={24} weight={isHomeActive ? 'fill' : 'regular'} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className={`min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] flex items-center justify-center transition-colors focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))] ${isSettingsActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))]'}`}
                aria-label={t('nav.settings', 'Settings')}
                data-testid="mobile-nav-settings"
              >
                <GearSix size={24} weight={isSettingsActive ? 'fill' : 'regular'} />
              </button>
            </>
          )}
        </div>

        {/* Expanded: evenly spaced with justify-between, icons + labels */}
        {isMenuOpen && (
          <div className="narvo-border-t flex items-stretch justify-between py-1 px-0" data-testid="mobile-nav-modal">
            {EXPANDED_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const label = t(item.labelKey, item.labelFallback);
              const isActive =
                (item.path === '/insights' && location.pathname === '/insights') ||
                (item.path !== '/insights' && location.pathname === item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false);
                  }}
                  aria-label={label}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-9 py-1 px-0.5 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))] ${isActive ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface))]/30'}`}
                  data-testid={`mobile-nav-modal-${item.path.replace('/', '') || 'dashboard'}`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  <span className="mono-ui text-[7px] leading-tight tracking-wider truncate w-full text-center">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        </motion.div>
      </div>
    </nav>
  );
}
