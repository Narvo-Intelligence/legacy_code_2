import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DownloadSimple, MagnifyingGlass, Sparkle, User } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import NarvoLogo from './NarvoLogo';
import { useInstallPrompt, useNetworkInfo } from '../hooks/usePwaApis';

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

  const statusTone = !online ? 'var(--color-alert)' : isSlowConnection ? 'var(--color-highlight)' : 'var(--color-primary)';
  const statusLabel = !online ? 'Offline' : (effectiveType ?? '4g').toUpperCase();

  const identity = useMemo(
    () =>
      user?.user_metadata?.first_name ||
      user?.user_metadata?.display_name ||
      user?.email?.split('@')[0] ||
      'Profile',
    [user],
  );

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/80 bg-[rgba(246,248,251,0.88)] backdrop-blur-xl"
      data-testid="dashboard-header"
    >
      <div className="page-container flex min-h-[var(--header-h)] items-center justify-between gap-4 py-4 md:min-h-[var(--header-h-desktop)] md:gap-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 rounded-full px-2 py-1 transition-transform duration-200 hover:scale-[1.01]"
          aria-label={t('header.title')}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary text-white shadow-[var(--shadow-2)]">
            <NarvoLogo className="h-5 w-5 text-white" />
          </div>
          <div className="hidden text-left sm:block">
            <div className="meta-eyebrow">{t('header.signal')}</div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="section-heading text-[30px] leading-none text-content">{t('header.title')}</h1>
              <span
                className="inline-flex min-h-[28px] items-center rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ background: 'rgba(255,255,255,0.82)', color: statusTone }}
                data-testid="network-status"
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </button>

        <form onSubmit={handleSearch} className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <label
            className="flex w-full max-w-2xl items-center gap-3 rounded-full border border-border bg-white/86 px-4 py-3 shadow-[var(--shadow-1)]"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <MagnifyingGlass size={18} className="text-content-dim" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('header.search_placeholder')}
              className="h-auto border-0 bg-transparent p-0 text-sm text-content placeholder:text-content-dim focus:shadow-none"
              data-testid="header-search-input"
            />
          </label>
        </form>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-content transition-colors hover:border-primary hover:text-primary md:hidden"
            aria-label={t('header.search_placeholder')}
          >
            <MagnifyingGlass size={18} weight="bold" />
          </button>

          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="hidden h-11 items-center gap-2 rounded-full bg-alert px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[var(--shadow-2)] transition-transform hover:scale-[1.02] md:inline-flex"
              data-testid="pwa-install-btn"
            >
              <DownloadSimple size={14} weight="bold" />
              Install
            </button>
          )}

          <div className="hidden md:block">
            <ThemeToggle className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white" />
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-11 min-w-[44px] items-center gap-3 rounded-full border border-border bg-white px-2.5 text-content shadow-[var(--shadow-1)] transition-colors hover:border-primary hover:text-primary"
            data-testid="header-user-btn"
            aria-label={t('nav.settings')}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : user?.email?.[0] ? (
                <span className="text-sm font-bold uppercase">{user.email[0]}</span>
              ) : (
                <User size={16} weight="fill" />
              )}
            </div>
            <div className="hidden text-left lg:block">
              <div className="meta-eyebrow">{t('header.signal')}</div>
              <div className="mt-1 text-sm font-semibold tracking-tight">{identity}</div>
            </div>
          </button>

          <div className="md:hidden">
            <ThemeToggle className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white" />
          </div>

          <span
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:inline-flex md:hidden"
            style={{ background: 'rgba(255,255,255,0.82)', color: statusTone }}
          >
            <Sparkle size={12} weight="fill" />
            {statusLabel}
          </span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
