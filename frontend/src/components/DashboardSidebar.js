import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  SquaresFour, Waveform, BookmarkSimple, MagnifyingGlass, Compass,
  GearSix, List, ChartLineUp, Pulse
} from '@phosphor-icons/react';
import ThemeToggle from './ThemeToggle';

const getNavItems = (t) => [
  { icon: SquaresFour, label: t('nav.feed'), path: '/dashboard' },
  { icon: Compass, label: t('nav.discover'), path: '/discover' },
  { icon: Waveform, label: t('nav.briefing'), path: '/briefing' },
  { icon: BookmarkSimple, label: t('nav.library', 'Library'), path: '/library' },
  { icon: ChartLineUp, label: t('nav.insights', 'Insights'), path: '/insights' },
];

// Desktop-only nav includes search + insights
const getDesktopNavItems = (t) => [
  { icon: SquaresFour, label: t('nav.feed'), path: '/dashboard' },
  { icon: Compass, label: t('nav.discover'), path: '/discover' },
  { icon: MagnifyingGlass, label: t('nav.search'), path: '/search' },
  { icon: Waveform, label: t('nav.briefing'), path: '/briefing' },
  { icon: BookmarkSimple, label: t('nav.library', 'Library'), path: '/library' },
  { icon: ChartLineUp, label: t('nav.insights', 'Insights'), path: '/insights' },
];

const DashboardSidebar = ({ open, onClose, onToggle, mobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const mobileNavItems = getNavItems(t);
  const desktopNavItems = getDesktopNavItems(t);

  const isSettingsActive = location.pathname === '/settings' ||
    ['/account', '/voices', '/system', '/accessibility'].includes(location.pathname);
  const isInsightsActive = location.pathname === '/insights';

  // Mobile bottom tab bar (without search icon)
  if (mobile) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[rgb(var(--color-bg))] border-t border-[rgb(var(--color-border))] flex items-center justify-around z-30" data-testid="mobile-bottom-nav">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/insights' ? isInsightsActive : location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
            >
              <Icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5" />
              <span className="font-mono text-[10px] uppercase">{item.label}</span>
            </button>
          );
        })}
        <button 
          onClick={() => navigate('/settings')} 
          className={`flex flex-col items-center gap-0.5 ${isSettingsActive ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}
        >
          <GearSix weight={isSettingsActive ? 'fill' : 'regular'} className="w-5 h-5" />
          <span className="font-mono text-[10px] uppercase">More</span>
        </button>
      </nav>
    );
  }

  // Desktop sidebar (collapsible - stays open by default)
  return (
    <>
      {/* Backdrop on mobile only when sidebar slide-out is visible */}
      {false && open && (
        <div className="md:hidden fixed inset-0 bg-background-dark/50 z-20" onClick={onClose} />
      )}

      <motion.aside
        initial={false}
        animate={{ width: open ? 208 : 64 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden md:flex flex-col border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] z-10 shrink-0"
        data-testid="dashboard-sidebar"
      >
        {/* Toggle Button */}
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

        {/* Theme Toggle */}
        <div className="border-t border-[rgb(var(--color-border))] py-2 px-4">
          <ThemeToggle showLabel={open} className="justify-start" />
        </div>

        {/* Settings Section */}
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
