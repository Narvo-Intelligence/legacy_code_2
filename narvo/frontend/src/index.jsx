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

// Web Vitals reporting (#21) — send CWV metrics to Sentry/console (v5: INP replaces FID)
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function reportWebVital(metric) {
  if (import.meta.env.DEV) {
    console.debug('[WebVitals]', metric.name, Math.round(metric.value), metric.rating);
  }
  if (sentryDsn && Sentry.metrics) {
    const opts = metric.name === 'CLS'
      ? { tags: { rating: metric.rating } }
      : { unit: 'millisecond', tags: { rating: metric.rating } };
    Sentry.metrics.distribution(`web_vital.${metric.name}`, metric.value, opts);
  }
}

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);
onFCP(reportWebVital);
onTTFB(reportWebVital);
