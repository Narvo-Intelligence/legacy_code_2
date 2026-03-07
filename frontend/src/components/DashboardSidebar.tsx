import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react/lib';
import { SquaresFour } from '@phosphor-icons/react/SquaresFour';
import { Waveform } from '@phosphor-icons/react/Waveform';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { Compass } from '@phosphor-icons/react/Compass';
import { GearSix } from '@phosphor-icons/react/GearSix';
import { List } from '@phosphor-icons/react/List';
import { ChartLineUp } from '@phosphor-icons/react/ChartLineUp';
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import { Pulse } from '@phosphor-icons/react/Pulse';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  icon: Icon;
  label: string;
  path: string;
}

const translate = (t: ReturnType<typeof useTranslation>['t']) => (key: string, fallback?: string) =>
  fallback !== undefined ? t(key, { defaultValue: fallback }) : t(key);

const getNavItems = (tStr: (key: string, fallback?: string) => string): NavItem[] => [
  { icon: SquaresFour, label: tStr('nav.feed'), path: '/dashboard' },
  { icon: Compass, label: tStr('nav.discover'), path: '/discover' },
  { icon: Waveform, label: tStr('nav.briefing'), path: '/briefing' },
  { icon: BookmarkSimple, label: tStr('nav.library', 'Library'), path: '/library' },
  { icon: ChartLineUp, label: tStr('nav.insights', 'Insights'), path: '/insights' },
  { icon: ShieldCheck, label: tStr('nav.reputation', 'Reputation'), path: '/reputation' },
];

const getDesktopNavItems = (tStr: (key: string, fallback?: string) => string): NavItem[] => [
  { icon: SquaresFour, label: tStr('nav.feed'), path: '/dashboard' },
  { icon: Compass, label: tStr('nav.discover'), path: '/discover' },
  { icon: MagnifyingGlass, label: tStr('nav.search'), path: '/search' },
  { icon: Waveform, label: tStr('nav.briefing'), path: '/briefing' },
  { icon: BookmarkSimple, label: tStr('nav.library', 'Library'), path: '/library' },
  { icon: ChartLineUp, label: tStr('nav.insights', 'Insights'), path: '/insights' },
  { icon: ShieldCheck, label: tStr('nav.reputation', 'Reputation'), path: '/reputation' },
];

export interface DashboardSidebarProps {
  open?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  mobile?: boolean;
}

const DashboardSidebar = ({ open = true, onClose, onToggle, mobile = false }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const tStr = translate(t);
  const mobileNavItems = getNavItems(tStr);
  const desktopNavItems = getDesktopNavItems(tStr);

  const isSettingsActive =
    location.pathname === '/settings' ||
    ['/account', '/voices', '/system', '/accessibility'].includes(location.pathname);
  const isInsightsActive = location.pathname === '/insights';

  if (mobile) {
    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[rgb(var(--color-bg))] border-t border-[rgb(var(--color-border))] flex items-center justify-around z-30"
        data-testid="mobile-bottom-nav"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/insights' ? isInsightsActive : location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center transition-colors min-h-[48px] ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon weight={isActive ? 'fill' : 'regular'} className="w-6 h-6" />
            </button>
          );
        })}
        <button
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${isSettingsActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}
          title="More"
          aria-label="More"
        >
          <GearSix weight={isSettingsActive ? 'fill' : 'regular'} className="w-6 h-6" />
        </button>
      </nav>
    );
  }

  return (
    <>
      {false && open && (
        <div
          className="md:hidden fixed inset-0 bg-background-dark/50 z-20"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose?.();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      <motion.aside
        initial={false}
        animate={{ width: open ? 208 : 64 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden md:flex flex-col border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] z-10 shrink-0"
        data-testid="dashboard-sidebar"
      >
        <div className="h-12 flex items-center px-4 border-b border-[rgb(var(--color-border))]">
          <button
            onClick={onToggle}
            className="p-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] transition-colors"
            title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            data-testid="sidebar-toggle"
          >
            <List weight="bold" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col py-2 gap-0.5 overflow-y-auto custom-scroll">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/insights' ? isInsightsActive : location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center gap-3 transition-all h-11
                  ${open ? 'px-4' : 'px-4 justify-start'}
                  ${isActive
                    ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 border-l-2 border-l-[rgb(var(--color-primary))]'
                    : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface))]/20'}
                `}
                title={item.label}
                data-testid={`sidebar-${item.label.toLowerCase()}`}
              >
                <Icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
                {open && <span className="font-mono text-[13px] font-bold uppercase tracking-wider truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[rgb(var(--color-border))] py-2 px-4">
          <ThemeToggle showLabel={open} className="justify-start" placement="right" />
        </div>

        <div className="border-t border-[rgb(var(--color-border))] py-2">
          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-3 transition-all h-11 w-full
              ${open ? 'px-4' : 'px-4 justify-start'}
              ${isSettingsActive
                ? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 border-l-2 border-l-[rgb(var(--color-primary))]'
                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface))]/20'}`}
            title="Settings Hub"
          >
            <GearSix weight={isSettingsActive ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
            {open && <span className="font-mono text-[13px] font-bold uppercase tracking-wider">{t('nav.settings')}</span>}
          </button>
          <a
            href="https://narvo.statuspage.io/"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 transition-all h-11 w-full ${open ? 'px-4' : 'px-4 justify-start'} text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface))]/20`}
            title="System status"
          >
            <Pulse weight="regular" className="w-5 h-5 shrink-0" />
            {open && <span className="font-mono text-[13px] font-bold uppercase tracking-wider">{t('nav.status')}</span>}
          </a>
        </div>
      </motion.aside>
    </>
  );
};

export default DashboardSidebar;
