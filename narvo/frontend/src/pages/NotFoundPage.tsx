import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { House } from '@phosphor-icons/react/House';
import ErrorState from '../components/ErrorState';
import logger from '../lib/logger';

const NotFoundPage = () => {
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
      window.dispatchEvent(new CustomEvent('narvo:page_view', { detail: { page: '404', path: window.location.pathname } }));
    } catch (err) {
      logger.debug('[NotFoundPage] Failed to emit page_view event', err);
    }
  }, []);

  return (
    <ErrorState
      testId="not-found-page"
      offline={offline}
      offlineLabel={t('errors.offline_hint')}
      title={t('errors.not_found_title')}
      code={t('errors.not_found_code')}
      message={t('errors.not_found_message')}
      accentClass="text-[rgb(var(--color-primary))]"
      footerLabel="NARVO // 404"
      actions={(
        <>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-h-[48px] px-6 py-3 border border-[rgb(var(--color-border))] bg-transparent font-mono text-[12px] font-bold text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="not-found-back-btn"
          >
            <ArrowLeft weight="bold" className="w-4 h-4" />
            {t('errors.not_found_back')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="min-h-[48px] px-6 py-3 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[12px] font-bold hover:bg-[rgb(var(--color-primary))]/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2"
            data-testid="not-found-dashboard-btn"
          >
            <House weight="bold" className="w-4 h-4" />
            {t('errors.not_found_dashboard')}
          </button>
        </>
      )}
    />
  );
};

export default NotFoundPage;
