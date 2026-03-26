/**
 * DashboardSidebar — desktop-only collapsible left nav (v3).
 * Hidden on mobile (MobileNav handles mobile).
 *
 * Primary items: Home | Discover | Listen | Library | Profile
 * Bottom items: Theme toggle | Settings → Profile | Status
 *
 * Aligns with MobileNav v3 five-tab structure.
 * Active state: left-border 2px + bg-primary/8 + fill icon weight.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react/lib';
import { SquaresFour }    from '@phosphor-icons/react/SquaresFour';
import { Compass }        from '@phosphor-icons/react/Compass';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { UserCircle }     from '@phosphor-icons/react/UserCircle';
import { MagnifyingGlass} from '@phosphor-icons/react/MagnifyingGlass';
import { List }           from '@phosphor-icons/react/List';
import { Pulse }          from '@phosphor-icons/react/Pulse';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  icon:      Icon;
  labelKey:  string;
  label:     string;
  path:      string;
  /** Additional paths that count as active for this item */
  aliases?:  string[];
}

const PRIMARY_ITEMS: NavItem[] = [
  { icon: SquaresFour,    labelKey: 'nav.home',     label: 'Home',     path: '/dashboard' },
  { icon: Compass,        labelKey: 'nav.discover', label: 'Discover', path: '/discover' },
  { icon: MagnifyingGlass,labelKey: 'nav.search',   label: 'Search',   path: '/search' },
  { icon: Waveform,       labelKey: 'nav.listen',   label: 'Listen',   path: '/listen',  aliases: ['/briefing'] },
  { icon: BookmarkSimple, labelKey: 'nav.library',  label: 'Library',  path: '/library' },
];

const BOTTOM_NAV: NavItem = {
  icon:     UserCircle,
  labelKey: 'nav.profile',
  label:    'Profile',
  path:     '/profile',
  aliases:  ['/settings', '/account', '/voices', '/system', '/accessibility', '/subscription'],
};

export interface DashboardSidebarProps {
  open?:     boolean;
  onClose?:  () => void;
  onToggle?: () => void;
}

const DashboardSidebar = ({ open = true, onClose: _onClose, onToggle }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t }    = useTranslation();

  const isActive = (item: NavItem): boolean => {
    if (location.pathname === item.path) return true;
    if (item.path === '/dashboard' && location.pathname === '/') return true;
    if (item.aliases?.some((a) => location.pathname === a || location.pathname.startsWith(a + '/'))) return true;
    if (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) return true;
    return false;
  };

  const isProfileActive = isActive(BOTTOM_NAV);

  const NAV_W  = 200;
  const ICON_W = 60;

  const navBtn = (item: NavItem) => {
    const active = isActive(item);
    const Icon   = item.icon;
    const label  = t(item.labelKey, item.label);
    return (
      <button
        key={item.path}
        type="button"
        onClick={() => navigate(item.path)}
        className={`
          flex items-center gap-3 h-11 px-4 w-full transition-all focus:outline-none
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]
          focus-visible:outline-[rgb(var(--color-primary))]
          ${active
            ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/8 border-l-2 border-l-[rgb(var(--color-primary))]'
            : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))]'}
        `}
        title={label}
        data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
      >
        <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" aria-hidden />
        {open && (
          <span className="font-body text-[13px] font-semibold truncate">{label}</span>
        )}
      </button>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? NAV_W : ICON_W }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="hidden md:flex flex-col narvo-border-r bg-[rgb(var(--color-bg))] z-10 shrink-0 overflow-hidden"
      data-testid="dashboard-sidebar"
    >
      {/* Toggle row */}
      <div className="h-[var(--header-h-desktop)] flex items-center px-3 narvo-border-b shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="p-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))] transition-colors rounded focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))]"
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          data-testid="sidebar-toggle"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <List weight="bold" className="w-5 h-5" aria-hidden />
        </button>
      </div>

      {/* Primary nav */}
      <nav
        className="flex-1 flex flex-col py-2 gap-px overflow-y-auto custom-scroll min-h-0"
        aria-label="Primary navigation"
      >
        {PRIMARY_ITEMS.map((item) => navBtn(item))}
      </nav>

      {/* Theme toggle */}
      <div className="narvo-border-t py-2 px-3 shrink-0">
        <ThemeToggle showLabel={open} className="justify-start" placement="right" />
      </div>

      {/* Profile / Settings + Status */}
      <div className="narvo-border-t py-2 shrink-0">
        {navBtn(BOTTOM_NAV)}
        <a
          href="https://narvo.statuspage.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 h-11 px-4 w-full text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-raised))] transition-all focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))]"
          title="System status"
          aria-label="System status"
        >
          <Pulse weight="regular" className="w-5 h-5 shrink-0" aria-hidden />
          {open && (
            <span className="font-body text-[13px] font-semibold">{t('nav.status', 'Status')}</span>
          )}
        </a>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
