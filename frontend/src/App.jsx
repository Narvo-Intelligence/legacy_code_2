import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LenisProvider } from './contexts/LenisProvider';
import { DownloadQueueProvider } from './contexts/DownloadQueueContext';
import { ContentSourcesProvider } from './contexts/ContentSourcesContext';
import { HapticAlertProvider } from './components/HapticAlerts';
import { BreakingNewsProvider } from './components/BreakingNews';
import { Analytics } from '@vercel/analytics/react';
import DownloadQueueIndicator from './components/DownloadQueueIndicator';
import { TourGuideModal } from './components/TourGuideModal';
import LoadingScreen from './components/LoadingScreen';
import * as api from './lib/api';
import logger from './lib/logger';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

function ErrorFallback({ resetError }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-dark text-content font-body"
      role="alert"
    >
      <p className="mb-4">Something went wrong.</p>
      <button
        type="button"
        onClick={resetError}
        className="px-4 py-2 border border-forest bg-transparent text-content-secondary cursor-pointer font-mono text-xs uppercase tracking-wide hover:border-primary hover:text-primary transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

/** Retry dynamic import on ChunkLoadError (e.g. network blip or dev server slow). */
function lazyWithChunkRetry(importFn, retries = 2, delayMs = 1500) {
  return lazy(async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importFn();
      } catch (e) {
        lastError = e;
        const isChunkError = e?.name === 'ChunkLoadError' || (e?.message && e.message.includes('Loading chunk'));
        if (attempt < retries && isChunkError) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  });
}

const LandingPage = lazyWithChunkRetry(() => import('./pages/LandingPage'));
const AuthPage = lazyWithChunkRetry(() => import('./pages/AuthPage'));
const OnboardingPage = lazyWithChunkRetry(() => import('./pages/OnboardingPage'));
const DashboardPage = lazyWithChunkRetry(() => import('./pages/DashboardPage'));
const NewsDetailPage = lazyWithChunkRetry(() => import('./pages/NewsDetailPage'));
const LibraryPage = lazyWithChunkRetry(() => import('./pages/LibraryPage'));
const VoiceStudioPage = lazyWithChunkRetry(() => import('./pages/VoiceStudioPage'));
const MorningBriefingPage = lazyWithChunkRetry(() => import('./pages/MorningBriefingPage'));
const SearchPage = lazyWithChunkRetry(() => import('./pages/SearchPage'));
const SettingsPage = lazyWithChunkRetry(() => import('./pages/SettingsPage'));
const DiscoverPage = lazyWithChunkRetry(() => import('./pages/DiscoverPage'));
const SubscriptionPage = lazyWithChunkRetry(() => import('./pages/SubscriptionPage'));
const NotFoundPage = lazyWithChunkRetry(() => import('./pages/NotFoundPage'));
const ServerErrorPage = lazyWithChunkRetry(() => import('./pages/ServerErrorPage'));
const ForgotPasswordPage = lazyWithChunkRetry(() => import('./pages/ForgotPasswordPage'));
const InsightsPage = lazyWithChunkRetry(() => import('./pages/InsightsPage'));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center" aria-label="Loading">
    <span className="mono-ui text-[11px] text-forest animate-pulse">LOADING...</span>
  </div>
);

const INVESTOR_BOARD_URL = 'https://investor.narvo.news/board';

function ExternalRedirect({ to }) {
  React.useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return <PageLoader />;
}

const PING_INTERVAL_MS = 2 * 60 * 1000;
const PING_TIMEOUT_MS = 8000;

/** Backend keep-alive ping. Inlined here so it runs with the same React instance as App (avoids duplicate-React hook errors). */
function BackendPing() {
  const intervalRef = React.useRef(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    const ping = () => {
      if (!mountedRef.current || document.visibilityState === 'hidden') return;
      api.get('api/ping', { timeout: PING_TIMEOUT_MS, retries: 0 }).then(() => {}).catch((err) => {
        logger.debug('[App] Backend ping failed', err);
      });
    };
    const schedule = () => {
      if (document.visibilityState !== 'visible') return;
      ping();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(ping, PING_INTERVAL_MS);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') schedule();
      else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return null;
}

function App({ sentryDsn }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    api.storeBackendUrlForSW?.();
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((reg) => reg.sync.register('daily-digest').catch((err) => {
        logger.debug('[App] Failed to register daily digest sync', err);
      }));
    }
  }, []);

  const mainContent = isLoading ? (
    <LoadingScreen onComplete={() => setIsLoading(false)} duration={1500} />
  ) : (
    <HelmetProvider>
      <LenisProvider>
        <AuthProvider>
          <AudioProvider>
            <DownloadQueueProvider>
              <ContentSourcesProvider>
                <BreakingNewsProvider>
                  <HapticAlertProvider>
                    {import.meta.env.VITE_VERCEL_ANALYTICS === 'true' && <Analytics />}
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <BackendPing />
                      <a href="#main-content" className="skip-link">Skip to main content</a>
                      <DownloadQueueIndicator />
                      <TourGuideModal />
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<LandingPage />} />
                          <Route path="/auth" element={<AuthPage />} />
                          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/news/:id" element={<NewsDetailPage />} />
                            <Route path="/library" element={<LibraryPage />} />
                            <Route path="/bookmarks" element={<Navigate to="/library" replace />} />
                            <Route path="/saved" element={<Navigate to="/library" replace />} />
                            <Route path="/offline" element={<Navigate to="/library" replace />} />
                            <Route path="/voices" element={<VoiceStudioPage />} />
                            <Route path="/briefing" element={<MorningBriefingPage />} />
                            {/* v3 nav routes — /listen → /briefing until ListenPage is built; /profile → /settings until ProfilePage is built */}
                            <Route path="/listen" element={<Navigate to="/briefing" replace />} />
                            <Route path="/profile" element={<Navigate to="/settings" replace />} />
                            <Route path="/search" element={<SearchPage />} />
                            <Route path="/discover" element={<DiscoverPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/subscription" element={<SubscriptionPage />} />
                            <Route path="/insights" element={<InsightsPage />} />
                            <Route path="/metrics" element={<ExternalRedirect to={INVESTOR_BOARD_URL} />} />
                            <Route path="/history" element={<Navigate to="/insights" replace />} />
                            <Route path="/analytics" element={<Navigate to="/insights?tab=analytics" replace />} />
                          </Route>
                          <Route path="/404" element={<NotFoundPage />} />
                          <Route path="/500" element={<ServerErrorPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </Router>
                  </HapticAlertProvider>
                </BreakingNewsProvider>
              </ContentSourcesProvider>
            </DownloadQueueProvider>
          </AudioProvider>
        </AuthProvider>
      </LenisProvider>
    </HelmetProvider>
  );

  return (
    <ThemeProvider>
      {sentryDsn ? (
        <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
          {mainContent}
        </Sentry.ErrorBoundary>
      ) : (
        mainContent
      )}
    </ThemeProvider>
  );
}

export default App;
