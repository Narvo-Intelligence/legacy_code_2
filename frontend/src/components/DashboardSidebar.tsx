/**
 * DashboardSidebar — desktop-only collapsible left nav.
 * Hidden on mobile (MobileNav handles mobile navigation).
 * The `mobile` prop and its duplicate nav render have been removed.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react/lib';
import { SquaresFour }  from '@phosphor-icons/react/SquaresFour';
import { Waveform }     from '@phosphor-icons/react/Waveform';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { Compass }      from '@phosphor-icons/react/Compass';
import { GearSix }      from '@phosphor-icons/react/GearSix';
import { List }         from '@phosphor-icons/react/List';
import { ChartLineUp }  from '@phosphor-icons/react/ChartLineUp';
import { ShieldCheck }  from '@phosphor-icons/react/ShieldCheck';
import { Scales }       from '@phosphor-icons/react/Scales';
import { Pulse }        from '@phosphor-icons/react/Pulse';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  icon: Icon;
  label: string;
  path: string;
}

const translate = (t: ReturnType<typeof useTranslation>['t']) =>
  (key: string, fallback?: string) =>
    fallback !== undefined ? t(key, { defaultValue: fallback }) : t(key);

const getDesktopNavItems = (tStr: (key: string, fallback?: string) => string): NavItem[] => [
  { icon: SquaresFour,    label: tStr('nav.feed'),           path: '/dashboard' },
  { icon: Compass,        label: tStr('nav.discover'),       path: '/discover' },
  { icon: MagnifyingGlass,label: tStr('nav.search'),         path: '/search' },
  { icon: Waveform,       label: tStr('nav.briefing'),       path: '/briefing' },
  { icon: BookmarkSimple, label: tStr('nav.library', 'Library'),         path: '/library' },
  { icon: ChartLineUp,    label: tStr('nav.insights', 'Insights'),       path: '/insights' },
  { icon: ShieldCheck,    label: tStr('nav.reputation', 'Reputation'),   path: '/reputation' },
  { icon: Scales,         label: tStr('nav.narrative_duel', 'Narrative Duel'), path: '/narrative-duel' },
];

export interface DashboardSidebarProps {
  open?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

const DashboardSidebar = ({ open = true, onClose: _onClose, onToggle }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const tStr = translate(t);
  const navItems = getDesktopNavItems(tStr);

  const isSettingsActive =
    location.pathname === '/settings' ||
    ['/account', '/voices', '/system', '/accessibility', '/subscription'].includes(location.pathname);

  const isActive = (item: NavItem) => location.pathname === item.path;

  const NAV_W  = 200;
  const ICON_W = 60;

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? NAV_W : ICON_W }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="hidden md:flex flex-col narvo-border-r bg-[rgb(var(--color-bg))] z-10 shrink-0 overflow-hidden"
      data-testid="dashboard-sidebar"
    >
      {/* ── Toggle button row ── */}
      <div className="h-[var(--header-h-desktop)] flex items-center px-3 narvo-border-b shrink-0">
        <button
          onClick={onToggle}
          className="p-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))] transition-colors"
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          data-testid="sidebar-toggle"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <List weight="bold" className="w-5 h-5" />
        </button>
      </div>

      {/* ── Nav items ── */}
      <div className="flex-1 flex flex-col py-2 gap-px overflow-y-auto custom-scroll min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-3 h-11 px-4 w-full transition-all
                ${active
                  ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/8 border-l-2 border-l-[rgb(var(--color-primary))]'
                  : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))]'}
              `}
              title={item.label}
              data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
              {open && (
                <span className="font-mono text-[12px] font-bold uppercase tracking-wider truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Theme toggle ── */}
      <div className="narvo-border-t py-2 px-3 shrink-0">
        <ThemeToggle showLabel={open} className="justify-start" placement="right" />
      </div>

      {/* ── Settings + Status ── */}
      <div className="narvo-border-t py-2 shrink-0">
        <button
          onClick={() => navigate('/settings')}
          className={`flex items-center gap-3 h-11 px-4 w-full transition-all
            ${isSettingsActive
              ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/8 border-l-2 border-l-[rgb(var(--color-primary))]'
              : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))]'}`}
          title="Settings"
          aria-current={isSettingsActive ? 'page' : undefined}
        >
          <GearSix weight={isSettingsActive ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
          {open && <span className="font-mono text-[12px] font-bold uppercase tracking-wider">{t('nav.settings')}</span>}
        </button>

        <a
          href="https://narvo.statuspage.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 h-11 px-4 w-full text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))] transition-all"
          title="System status"
        >
          <Pulse weight="regular" className="w-5 h-5 shrink-0" />
          {open && <span className="font-mono text-[12px] font-bold uppercase tracking-wider">{t('nav.status')}</span>}
        </a>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
