import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
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
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

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

// Lazy load pages for fast initial load (with retry on chunk load failure)
const LandingPage = lazyWithChunkRetry(() => import('./pages/LandingPage'));
const AuthPage = lazyWithChunkRetry(() => import('./pages/AuthPage'));
const OnboardingPage = lazyWithChunkRetry(() => import('./pages/OnboardingPage'));
const DashboardPage = lazyWithChunkRetry(() => import('./pages/DashboardPage'));
const NewsDetailPage = lazyWithChunkRetry(() => import('./pages/NewsDetailPage'));
const BookmarksPage = lazyWithChunkRetry(() => import('./pages/BookmarksPage'));
const VoiceStudioPage = lazyWithChunkRetry(() => import('./pages/VoiceStudioPage'));
const MorningBriefingPage = lazyWithChunkRetry(() => import('./pages/MorningBriefingPage'));
const SearchPage = lazyWithChunkRetry(() => import('./pages/SearchPage'));
const SettingsPage = lazyWithChunkRetry(() => import('./pages/SettingsPage'));
const DiscoverPage = lazyWithChunkRetry(() => import('./pages/DiscoverPage'));
const OfflinePage = lazyWithChunkRetry(() => import('./pages/OfflinePage'));
const SavedPage = lazyWithChunkRetry(() => import('./pages/SavedPage'));
const AccountPage = lazyWithChunkRetry(() => import('./pages/AccountPage'));
const SystemSettingsPage = lazyWithChunkRetry(() => import('./pages/SystemSettingsPage'));
const AccessibilityPage = lazyWithChunkRetry(() => import('./pages/AccessibilityPage'));
const NotFoundPage = lazyWithChunkRetry(() => import('./pages/NotFoundPage'));
const ServerErrorPage = lazyWithChunkRetry(() => import('./pages/ServerErrorPage'));
const ForgotPasswordPage = lazyWithChunkRetry(() => import('./pages/ForgotPasswordPage'));
const ToolsPage = lazyWithChunkRetry(() => import('./pages/ToolsPage'));
const ListeningHistoryPage = lazyWithChunkRetry(() => import('./pages/ListeningHistoryPage'));
const AnalyticsPage = lazyWithChunkRetry(() => import('./pages/AnalyticsPage'));

// Minimal loading fallback - instant feel
const PageLoader = () => null;

function App() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} duration={1500} />;
  }

  return (
    <HelmetProvider>
    <ThemeProvider>
    <LenisProvider>
    <AuthProvider>
      <AudioProvider>
      <DownloadQueueProvider>
      <ContentSourcesProvider>
      <BreakingNewsProvider>
        <HapticAlertProvider>
          {process.env.REACT_APP_VERCEL_ANALYTICS === 'true' && <Analytics />}
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
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/saved" element={<SavedPage />} />
                  <Route path="/voices" element={<VoiceStudioPage />} />
                  <Route path="/briefing" element={<MorningBriefingPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/offline" element={<OfflinePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/system" element={<SystemSettingsPage />} />
                  <Route path="/accessibility" element={<AccessibilityPage />} />
                  <Route path="/history" element={<ListeningHistoryPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
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
}

export default App;
