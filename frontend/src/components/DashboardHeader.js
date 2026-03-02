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
    <header className="h-14 md:h-16 flex items-center gap-4 px-4 md:px-6 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] z-20 shrink-0" data-testid="dashboard-header">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <img src="/narvo_logo.svg" alt="Narvo" className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
        <h1 className="font-display text-base md:text-lg tracking-tight font-bold text-[rgb(var(--color-text-primary))] uppercase">
          NARVO
        </h1>
      </div>

      {/* Centered Search - Full Width */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto hidden md:block">
        <div className="relative">
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

      {/* Mobile search */}
      <button onClick={() => navigate('/search')} className="md:hidden text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] ml-auto">
        <MagnifyingGlass weight="bold" className="w-5 h-5" />
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Network status */}
        <div className={`flex items-center gap-1 ${networkColor}`} data-testid="network-status" title={online ? `${effectiveType?.toUpperCase()}` : 'Offline'}>
          <NetworkIcon weight="bold" className="w-4 h-4" />
          <span className="hidden lg:inline font-mono text-[10px] uppercase">{online ? effectiveType : 'OFF'}</span>
        </div>

        {/* Install PWA button */}
        {canInstall && (
          <button
            onClick={install}
            className="flex items-center gap-1 px-2 py-1 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[10px] font-bold hover:opacity-90 transition-opacity"
            data-testid="pwa-install-btn"
          >
            <DownloadSimple weight="bold" className="w-3 h-3" />
            <span className="hidden md:inline">INSTALL</span>
          </button>
        )}

        <div className="hidden lg:flex flex-col items-end font-mono text-[11px] text-[rgb(var(--color-text-secondary))]">
          <span>{t('header.signal')}: <span className="text-[rgb(var(--color-primary))] font-bold">100%</span></span>
          <span>{t('header.latency')}: <span className="text-[rgb(var(--color-primary))] font-bold">12ms</span></span>
        </div>
        
        <ThemeToggle />
        
        <div
          className="h-9 w-9 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] flex items-center justify-center cursor-pointer hover:bg-[rgb(var(--color-border))] transition-colors"
          onClick={() => navigate('/settings')}
          data-testid="header-user-btn"
        >
          {user ? (
            <span className="font-display text-[rgb(var(--color-primary))] text-sm font-bold">{user.email?.[0]?.toUpperCase()}</span>
          ) : (
            <User weight="fill" className="text-[rgb(var(--color-primary))] w-5 h-5" />
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
