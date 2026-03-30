import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise';
import { House } from '@phosphor-icons/react/House';
import ErrorState from '../components/ErrorState';
import logger from '../lib/logger';

const ServerErrorPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

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
      window.dispatchEvent(new CustomEvent('narvo:page_view', { detail: { page: '500', path: window.location.pathname } }));
    } catch (err) {
      logger.debug('[ServerErrorPage] Failed to emit page_view event', err);
    }
  }, []);

  return (
    <ErrorState
      testId="server-error-page"
      offline={offline}
      offlineLabel={t('errors.offline_hint')}
      title={t('errors.server_error_title')}
      code={t('errors.server_error_code')}
      message={t('errors.server_error_message')}
      accentClass="text-red-500"
      footerLabel="NARVO // 500"
      actions={(
        <>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[48px] px-6 py-3 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[12px] font-bold hover:bg-[rgb(var(--color-primary))]/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="server-error-retry-btn"
          >
            <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
            {t('errors.server_error_retry')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="min-h-[48px] px-6 py-3 border border-[rgb(var(--color-border))] bg-transparent font-mono text-[12px] font-bold text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="server-error-dashboard-btn"
          >
            <House weight="bold" className="w-4 h-4" />
            {t('errors.server_error_dashboard')}
          </button>
        </>
      )}
    />
  );
};

export default ServerErrorPage;
