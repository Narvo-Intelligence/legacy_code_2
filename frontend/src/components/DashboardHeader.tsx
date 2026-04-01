/**
 * DashboardHeader — top app bar.
 * Mobile: h-[--header-h] (48px) — logo + network + search icon + theme + avatar
 * Desktop: h-[--header-h-desktop] (64px) — logo + inline search + network + theme + avatar
 * PWA safe-area: padding-top handled by body in standalone mode (index.css).
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { User } from '@phosphor-icons/react/User';
import { DownloadSimple } from '@phosphor-icons/react/DownloadSimple';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import NarvoLogo from './NarvoLogo';
import { useNetworkInfo, useInstallPrompt } from '../hooks/usePwaApis';

export interface DashboardHeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const DashboardHeader = (_props: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { online, effectiveType, isSlowConnection } = useNetworkInfo();
  const { canInstall, install } = useInstallPrompt();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const networkColor = !online
    ? 'text-[rgb(var(--color-alert))]' // Signal Vermilion for offline
    : isSlowConnection
    ? 'text-[rgb(var(--color-highlight))]' // Soft Butter for slow
    : 'text-[rgb(var(--color-primary))]'; // Petrol Teal for optimal signal

  const signalLabel = online ? (effectiveType ?? '4G').toUpperCase() : 'LOST';

  return (
    <header
      className="h-[var(--header-h)] md:h-[var(--header-h-desktop)] flex items-center gap-3 md:gap-6 px-4 md:px-6 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] z-20 shrink-0"
      data-testid="dashboard-header"
    >
      {/* ── Logo & Signal ── */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 -ml-1 pl-1 min-h-[var(--touch-target-min)] md:min-h-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))] group"
          aria-label={t('header.title')}
        >
          <NarvoLogo className="w-5 h-5 md:w-6 md:h-6 text-[rgb(var(--color-primary))] transition-transform group-hover:scale-105" />
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[15px] md:text-lg tracking-tight font-black text-[rgb(var(--color-text-primary))] uppercase leading-none selection:bg-[rgb(var(--color-primary))]/30">
              {t('header.title')}
            </h1>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="hidden md:inline font-mono text-[9px] text-[rgb(var(--color-text-mid))] uppercase tracking-[0.15em]">
                {t('header.signal')}
              </span>
              <span
                className={`font-mono text-[9px] md:text-[10px] font-bold uppercase tabular-nums tracking-wider ${networkColor}`}
                data-testid="network-status"
                title={online ? `${effectiveType?.toUpperCase() ?? ''} Connection` : t('errors.offline_hint')}
              >
                {signalLabel}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ── Desktop search ── */}
      <div className="flex-1 min-w-0 hidden md:flex items-center justify-center">
        <form onSubmit={handleSearch} className="w-full max-w-2xl lg:max-w-3xl">
          <div className="relative group">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-dim))] group-focus-within:text-[rgb(var(--color-primary))] w-4 h-4 transition-colors pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[rgb(var(--color-surface-alt))] border border-[rgb(var(--color-border))] pl-11 pr-4 py-2 text-sm font-body text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-dim))] focus:bg-[rgb(var(--color-surface))] focus:border-[rgb(var(--color-primary))] focus:ring-4 focus:ring-[rgb(var(--color-primary))]/10 transition-all rounded-xl outline-none"
              placeholder={t('header.search_placeholder')}
              data-testid="header-search-input"
            />
          </div>
        </form>
      </div>

      {/* ── Spacer on mobile ── */}
      <div className="flex-1 md:hidden" />

      {/* ── Mobile action strip ── */}
      <div className="md:hidden flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="min-w-[var(--touch-target-icon)] min-h-[var(--touch-target-icon)] flex items-center justify-center text-[rgb(var(--color-text-mid))] hover:text-[rgb(var(--color-primary))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
          aria-label={t('header.search_placeholder')}
        >
          <MagnifyingGlass weight="bold" className="w-[18px] h-[18px]" />
        </button>

        <ThemeToggle className="min-w-[var(--touch-target-icon)] min-h-[var(--touch-target-icon)] flex items-center justify-center" />

        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="min-w-[var(--touch-target-icon)] min-h-[var(--touch-target-icon)] flex items-center justify-center bg-[rgb(var(--color-primary))] text-white rounded-lg mx-1"
            data-testid="pwa-install-btn"
            aria-label="Install Narvo"
          >
            <DownloadSimple weight="bold" className="w-[18px] h-[18px]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="min-w-[var(--touch-target-icon)] min-h-[var(--touch-target-icon)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] rounded-full flex items-center justify-center text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-alt))] transition-colors overflow-hidden ml-1"
          data-testid="header-user-btn"
          aria-label={t('nav.settings')}
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : user?.email?.[0] ? (
            <span className="font-display text-xs font-bold uppercase">{user.email[0]}</span>
          ) : (
            <User weight="fill" className="w-[18px] h-[18px]" />
          )}
        </button>
      </div>

      {/* ── Desktop right actions ── */}
      <div className="hidden md:flex items-center gap-2 lg:gap-4 shrink-0">
        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgb(var(--color-primary))] text-white font-mono text-[10px] font-bold tracking-wider hover:opacity-90 transition-opacity rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
            data-testid="pwa-install-btn"
          >
            <DownloadSimple weight="bold" className="w-3 h-3" />
            <span>INSTALL</span>
          </button>
        )}

        <ThemeToggle className="flex" />

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="h-10 w-10 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] rounded-full flex items-center justify-center text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-surface-alt))] hover:border-[rgb(var(--color-primary))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] transition-all overflow-hidden"
          data-testid="header-user-btn"
          aria-label={t('nav.settings')}
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : user?.email?.[0] ? (
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
