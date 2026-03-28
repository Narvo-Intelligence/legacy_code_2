/**
 * DashboardSidebar — v4 token pass.
 * Desktop-only collapsible left nav.
 *
 * v4 changes: var(--color-*) hex vars throughout,
 * Sunshine Yellow active dot, Forest Green active state.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react/lib';
import { SquaresFour }     from '@phosphor-icons/react/SquaresFour';
import { Compass }         from '@phosphor-icons/react/Compass';
import { Waveform }        from '@phosphor-icons/react/Waveform';
import { BookmarkSimple }  from '@phosphor-icons/react/BookmarkSimple';
import { UserCircle }      from '@phosphor-icons/react/UserCircle';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { List }            from '@phosphor-icons/react/List';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  icon:     Icon;
  labelKey: string;
  label:    string;
  path:     string;
  aliases?: string[];
}

const PRIMARY_ITEMS: NavItem[] = [
  { icon: SquaresFour,     labelKey: 'nav.home',     label: 'Home',     path: '/dashboard' },
  { icon: Compass,         labelKey: 'nav.discover', label: 'Discover', path: '/discover' },
  { icon: MagnifyingGlass, labelKey: 'nav.search',   label: 'Search',   path: '/search' },
  { icon: Waveform,        labelKey: 'nav.listen',   label: 'Listen',   path: '/listen', aliases: ['/briefing'] },
  { icon: BookmarkSimple,  labelKey: 'nav.library',  label: 'Library',  path: '/library' },
];

const PROFILE_ITEM: NavItem = {
  icon:     UserCircle,
  labelKey: 'nav.profile',
  label:    'Profile',
  path:     '/profile',
  aliases:  ['/settings', '/subscription', '/voices', '/insights'],
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
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          height:       44,
          paddingLeft:  16,
          paddingRight: 16,
          width:        '100%',
          background:   active ? 'rgba(24,84,42,0.08)' : 'transparent',
          border:       'none',
          borderLeft:   active ? '2px solid var(--color-primary)' : '2px solid transparent',
          cursor:       'pointer',
          color:        active ? 'var(--color-primary)' : 'var(--color-text-mid)',
          transition:   'all 150ms var(--ease-standard)',
          textAlign:    'left',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(24,84,42,0.05)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Icon weight={active ? 'fill' : 'regular'} style={{ width: 20, height: 20, flexShrink: 0 }} aria-hidden />
        {open && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 700 : 500, truncate: true }}>
            {label}
          </span>
        )}
        {/* Sunshine Yellow active dot */}
        {active && open && (
          <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
        )}
      </button>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? NAV_W : ICON_W }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="hidden md:flex flex-col z-10 shrink-0 overflow-hidden"
      style={{
        borderRight:  '1px solid var(--color-border)',
        background:   'var(--color-bg)',
      }}
      data-testid="dashboard-sidebar"
    >
      {/* Toggle row */}
      <div style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          data-testid="sidebar-toggle"
          style={{
            padding:      8,
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            color:        'var(--color-text-mid)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            borderRadius: 8,
            minWidth:     40,
            minHeight:    40,
          }}
        >
          <List style={{ width: 20, height: 20 }} aria-hidden />
        </button>
      </div>

      {/* Primary nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 8 }}>
        {PRIMARY_ITEMS.map(navBtn)}
      </div>

      {/* Bottom: theme toggle + profile */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, paddingBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, height: 44 }}>
          <ThemeToggle />
        </div>
        {navBtn(PROFILE_ITEM)}
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
