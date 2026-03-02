import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, User, WifiHigh, WifiMedium, WifiLow, WifiSlash, DownloadSimple } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useNetworkInfo, useInstallPrompt } from '../hooks/usePwaApis';

const DashboardHeader = ({ onToggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { online, effectiveType, isSlowConnection } = useNetworkInfo();
  const { canInstall, install } = useInstallPrompt();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const NetworkIcon = !online ? WifiSlash : isSlowConnection ? WifiLow : effectiveType === '3g' ? WifiMedium : WifiHigh;
  const networkColor = !online ? 'text-red-500' : isSlowConnection ? 'text-yellow-500' : 'text-[rgb(var(--color-primary))]';

  return (
    <header
      className="h-12 md:h-16 flex items-center gap-3 md:gap-6 px-4 md:px-8 narvo-border-b bg-[rgb(var(--color-surface))]/20 md:bg-[rgb(var(--color-bg))] z-20 shrink-0"
      data-testid="dashboard-header"
    >
      {/* Logo — 48px min touch target on mobile; desktop: shrink so search has room */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 shrink-0 min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] -ml-2 pl-2 md:min-w-0 md:min-h-0 md:ml-0 md:pl-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]"
        aria-label="Narvo home"
      >
        <img src="/narvo_logo.svg" alt="" className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
        <h1 className="font-display text-sm md:text-lg tracking-tight font-bold text-[rgb(var(--color-text-primary))] uppercase">
          NARVO
        </h1>
      </button>

      {/* Desktop: search spans from sidebar edge to telemetry edge, centered with space around */}
      <form onSubmit={handleSearch} className="flex-1 min-w-0 hidden md:block max-w-full">
        <div className="relative mx-2 md:mx-4">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-primary))] w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[rgb(var(--color-surface))]/30 border border-[rgb(var(--color-border))] pl-12 pr-4 py-2.5 text-xs font-mono uppercase text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-secondary))] focus:outline-none focus:border-[rgb(var(--color-primary))] transition-all"
            placeholder={t('header.search_placeholder')}
            data-testid="header-search-input"
          />
        </div>
      </form>

      {/* Mobile: search + theme + network (icon + text) + install + profile — 8pt grid, 48px touch targets */}
      <div className="md:hidden flex items-center gap-1 flex-1 justify-end min-h-[var(--touch-target-min)]">
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] flex items-center justify-center text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))] rounded-none"
          aria-label={t('header.search_placeholder')}
        >
          <MagnifyingGlass weight="bold" className="w-5 h-5" />
        </button>
        <ThemeToggle className="min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] flex items-center justify-center rounded-none" />
        <div
          className={`flex items-center gap-1.5 min-h-[var(--touch-target-min)] pr-2 ${networkColor}`}
          data-testid="network-status"
          title={online ? `${effectiveType?.toUpperCase()}` : 'Offline'}
          aria-hidden
        >
          <NetworkIcon weight="bold" className="w-4 h-4 shrink-0" />
          <span className="font-mono text-[10px] uppercase">{online ? (effectiveType || 'ON') : 'OFF'}</span>
        </div>
        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] flex items-center justify-center bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]"
            data-testid="pwa-install-btn"
            aria-label="Install app"
          >
            <DownloadSimple weight="bold" className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] narvo-border bg-[rgb(var(--color-surface))] flex items-center justify-center text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-border))]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]"
          data-testid="header-user-btn"
          aria-label="Settings"
        >
          {user?.email?.[0] ? (
            <span className="font-display text-sm font-bold uppercase">{user.email[0]}</span>
          ) : (
            <User weight="fill" className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Desktop: right side */}
      <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
        <div className={`flex items-center gap-1 ${networkColor}`} data-testid="network-status" title={online ? `${effectiveType?.toUpperCase()}` : 'Offline'}>
          <NetworkIcon weight="bold" className="w-4 h-4" />
          <span className="hidden lg:inline font-mono text-[10px] uppercase">{online ? effectiveType : 'OFF'}</span>
        </div>
        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1 px-2 py-1 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[10px] font-bold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
            data-testid="pwa-install-btn"
          >
            <DownloadSimple weight="bold" className="w-3 h-3" />
            <span className="hidden md:inline">INSTALL</span>
          </button>
        )}
        <ThemeToggle className="hidden md:flex" />
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="h-9 w-9 min-w-[2.25rem] min-h-[2.25rem] narvo-border bg-[rgb(var(--color-surface))] flex items-center justify-center text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-border))]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
          data-testid="header-user-btn"
          aria-label="Settings"
        >
          {user?.email?.[0] ? (
            <span className="font-display text-sm font-bold uppercase">{user.email[0]}</span>
          ) : (
            <User weight="fill" className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
