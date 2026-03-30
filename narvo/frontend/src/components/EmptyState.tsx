import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { House } from '@phosphor-icons/react/House';
import { Wrench } from '@phosphor-icons/react/Wrench';
import logger from '../lib/logger';

type EmptyVariant = 'default' | 'search' | 'saved' | 'offline';

const variantConfig: Record<
  EmptyVariant,
  { errorCode: string; secondaryPath: string }
> = {
  default: { errorCode: '0x4F_NULL', secondaryPath: '/settings' },
  search: { errorCode: '0x00_EMPTY_SET', secondaryPath: '/dashboard' },
  saved: { errorCode: '0x00_NO_SAVES', secondaryPath: '/dashboard' },
  offline: { errorCode: '0x00_CACHE_EMPTY', secondaryPath: '/settings' },
};

export interface EmptyStateProps {
  title?: string;
  message?: string;
  description?: string;
  errorCode?: string;
  onRefresh?: () => void;
  onDiagnostics?: () => void;
  variant?: EmptyVariant;
}

const EmptyState = ({
  title,
  message,
  description,
  errorCode,
  onRefresh,
  onDiagnostics,
  variant = 'default',
}: EmptyStateProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine
  );

  const base = variantConfig[variant] ?? variantConfig.default;
  const displayTitle = title ?? t(`empty_state.${variant}_title`);
  const displayMessage = message ?? description ?? t(`empty_state.${variant}_message`);
  const displayCode = errorCode ?? base.errorCode;
  const primaryLabel =
    variant === 'saved' ? t('empty_state.primary_go_feed') : t('empty_state.primary_refresh');
  const secondaryLabel =
    variant === 'saved' || variant === 'search'
      ? t('empty_state.secondary_browse_feed')
      : t('empty_state.secondary_settings');

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('narvo:page_view', { detail: { page: 'empty_state', variant } })
      );
    } catch (err) {
      logger.debug('[EmptyState] Failed to emit page_view event', err);
    }
  }, [variant]);

  const handlePrimary = () => {
    if (onRefresh) {
      onRefresh();
    } else if (variant === 'saved') {
      navigate('/dashboard');
    } else {
      window.location.reload();
    }
  };

  const handleSecondary = () => {
    if (onDiagnostics) {
      onDiagnostics();
    } else if (base.secondaryPath) {
      navigate(base.secondaryPath);
    } else {
      navigate('/settings');
    }
  };

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center p-6 md:p-8"
      data-testid="empty-state"
    >
      <div className="max-w-md w-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10 p-6 md:p-8 text-center">
        {offline && (
          <p
            className="mono-ui text-[11px] text-[rgb(var(--color-text-secondary))] font-bold mb-3"
            role="status"
          >
            {t('errors.offline_hint')}
          </p>
        )}
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 md:w-16 md:h-16 border border-[rgb(var(--color-border))] flex items-center justify-center bg-[rgb(var(--color-surface))]/20">
            <Broadcast className="w-7 h-7 md:w-8 md:h-8 text-[rgb(var(--color-primary))]" />
          </div>
        </div>
        <h3 className="font-display text-xl md:text-2xl font-bold text-[rgb(var(--color-text-primary))] uppercase tracking-tight mb-3">
          {displayTitle}
        </h3>
        <p className="text-[rgb(var(--color-text-dim-accessible))] text-sm font-mono leading-relaxed mb-6">
          {displayMessage}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handlePrimary}
            className="min-h-[48px] px-5 py-3 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[12px] font-bold hover:bg-[rgb(var(--color-primary))]/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="empty-state-refresh-btn"
          >
            <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={handleSecondary}
            className="min-h-[48px] px-5 py-3 border border-[rgb(var(--color-border))] bg-transparent font-mono text-[12px] font-bold text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="empty-state-diagnostics-btn"
          >
            {variant === 'saved' || variant === 'search' ? (
              <House weight="bold" className="w-4 h-4" />
            ) : (
              <Wrench weight="bold" className="w-4 h-4" />
            )}
            {secondaryLabel}
          </button>
        </div>
        <p className="mt-6 mono-ui text-[10px] text-[rgb(var(--color-text-secondary))] font-bold">
          {displayCode}
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
