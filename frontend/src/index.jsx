import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import './i18n';
import App from './App';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE || 'development',
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App sentryDsn={sentryDsn} />
  </React.StrictMode>
);

// Web Vitals reporting (#21) — send CWV metrics to Sentry/console
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

function reportWebVital(metric) {
  // Log to console in dev; send to Sentry in production
  if (import.meta.env.DEV) {
    console.debug('[WebVitals]', metric.name, Math.round(metric.value), metric.rating);
  }
  if (sentryDsn && Sentry.metrics) {
    Sentry.metrics.distribution(`web_vital.${metric.name}`, metric.value, { unit: 'millisecond', tags: { rating: metric.rating } });
  }
}

onCLS(reportWebVital);
onFID(reportWebVital);
onLCP(reportWebVital);
onFCP(reportWebVital);
onTTFB(reportWebVital);
