import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, House } from '@phosphor-icons/react';

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
    } catch (_) { /* no-op */ }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[rgb(var(--color-bg))]" data-testid="not-found-page">
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
        <div className="max-w-xl w-full space-y-8 text-center">
          {offline && (
            <p className="mono-ui text-[11px] text-[rgb(var(--color-text-secondary))] font-bold" role="status">
              {t('errors.offline_hint')}
            </p>
          )}
          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">
              <span className="text-[rgb(var(--color-primary))]">[</span>{t('errors.not_found_title')}<span className="text-[rgb(var(--color-primary))]">]</span>
            </h1>
            <p className="mono-ui text-[12px] md:text-[13px] text-[rgb(var(--color-text-secondary))] font-bold">
              {t('errors.not_found_code')}
            </p>
            <p className="text-[rgb(var(--color-text-dim-accessible))] text-sm md:text-base font-mono leading-relaxed max-w-md mx-auto">
              {t('errors.not_found_message')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
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
          </div>
        </div>
      </main>
      <footer className="shrink-0 border-t border-[rgb(var(--color-border))] py-3 px-6 flex items-center justify-center">
        <span className="mono-ui text-[10px] text-[rgb(var(--color-text-secondary))] font-bold">NARVO // 404</span>
      </footer>
    </div>
  );
};

export default NotFoundPage;
