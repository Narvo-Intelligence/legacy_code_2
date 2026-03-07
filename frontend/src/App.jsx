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
import { useBackendPing } from './hooks/useBackendPing';
import * as api from './lib/api';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

function ErrorFallback({ resetError }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgb(27, 33, 26)',
        color: 'rgb(242, 242, 242)',
        fontFamily: 'system-ui, sans-serif',
      }}
      role="alert"
    >
      <p style={{ marginBottom: 16 }}>Something went wrong.</p>
      <button
        type="button"
        onClick={resetError}
        style={{
          padding: '8px 16px',
          border: '1px solid rgb(98, 129, 65)',
          background: 'transparent',
          color: 'rgb(139, 174, 102)',
          cursor: 'pointer',
        }}
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
const AccountPage = lazyWithChunkRetry(() => import('./pages/AccountPage'));
const SystemSettingsPage = lazyWithChunkRetry(() => import('./pages/SystemSettingsPage'));
const AccessibilityPage = lazyWithChunkRetry(() => import('./pages/AccessibilityPage'));
const SubscriptionPage = lazyWithChunkRetry(() => import('./pages/SubscriptionPage'));
const NotFoundPage = lazyWithChunkRetry(() => import('./pages/NotFoundPage'));
const ServerErrorPage = lazyWithChunkRetry(() => import('./pages/ServerErrorPage'));
const ForgotPasswordPage = lazyWithChunkRetry(() => import('./pages/ForgotPasswordPage'));
const ToolsPage = lazyWithChunkRetry(() => import('./pages/ToolsPage'));
const InsightsPage = lazyWithChunkRetry(() => import('./pages/InsightsPage'));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center" aria-label="Loading">
    <span className="mono-ui text-[11px] text-forest animate-pulse">LOADING...</span>
  </div>
);

function App({ sentryDsn }) {
  const [isLoading, setIsLoading] = useState(true);

  useBackendPing({ enabled: !isLoading });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    api.storeBackendUrlForSW?.();
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((reg) => reg.sync.register('daily-digest').catch(() => {}));
    }
  }, []);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} duration={1500} />;
  }

  const mainContent = (
    <HelmetProvider>
    <ThemeProvider>
    <LenisProvider>
    <AuthProvider>
      <AudioProvider>
      <DownloadQueueProvider>
      <ContentSourcesProvider>
      <BreakingNewsProvider>
        <HapticAlertProvider>
          {import.meta.env.VITE_VERCEL_ANALYTICS === 'true' && <Analytics />}
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <DownloadQueueIndicator />
            <TourGuideModal />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/tools" element={<ToolsPage />} />
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
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/system" element={<SystemSettingsPage />} />
                  <Route path="/accessibility" element={<AccessibilityPage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
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
    </ThemeProvider>
    </HelmetProvider>
  );

  return sentryDsn ? (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      {mainContent}
    </Sentry.ErrorBoundary>
  ) : (
    mainContent
  );
}

export default App;
