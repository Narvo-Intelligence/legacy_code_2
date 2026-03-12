import React, { useEffect, useState } from 'react';
import type { Icon } from 'lucide-react';
import {
  LineChart,
  Radio,
  Users,
  Globe,
  Clock,
  Signal,
} from 'lucide-react';

interface PlatformMetrics {
  listeners_today?: string;
  total_listeners?: string;
  sources_online?: number;
  total_sources?: number;
  local_sources?: number;
  international_sources?: number;
  continental_sources?: number;
  stories_processed?: number;
  broadcast_hours?: number;
  signal_strength?: string;
  network_load?: string;
  broadcast_ready?: boolean;
  last_sync?: string;
  aggregators?: Record<string, { configured?: boolean; cached_count?: number }>;
}

interface MetricCardProps {
  icon?: Icon;
  label: string;
  value: string;
  testId: string;
}

const MetricCard = ({ icon: IconComp, label, value, testId }: MetricCardProps) => (
  <div className="narvo-border bg-narvo-surface/10 p-4 md:p-6 flex flex-col min-h-[80px]" data-testid={testId}>
    <div className="flex items-center gap-2 mb-2">
      {IconComp && (
        <span className="flex items-center justify-center w-6 h-6 text-narvo-primary" aria-hidden>
          <IconComp className="w-5 h-5 md:w-6 md:h-6" />
        </span>
      )}
      <span className="font-mono text-[10px] text-narvo-secondary tracking-widest">{label}</span>
    </div>
    <span className="font-header text-lg md:text-2xl font-bold text-narvo-text tabular-nums" style={{ lineHeight: 'var(--line-height-heading)' }}>
      {value}
    </span>
  </div>
);

const resolveBackendUrl = () => {
  const raw = import.meta.env.VITE_BACKEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://api.narvo.news';
};

export default function InvestorBoardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const base = resolveBackendUrl();
        const url = `${base}/api/metrics`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Failed to load metrics');
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(text.slice(0, 200));
        }
        const data = await res.json();
        if (!cancelled) setMetrics(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-6 md:py-8 pb-safe max-w-5xl mx-auto" role="status" aria-live="polite">
        <p className="font-mono text-[11px] text-narvo-secondary tracking-widest animate-pulse">LOADING…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-6 md:py-8 pb-safe max-w-5xl mx-auto">
        <p className="text-narvo-text font-body text-sm leading-[var(--line-height-body)]" role="alert">{error}</p>
      </div>
    );
  }

  const aggregators = metrics?.aggregators || {};
  const ms = aggregators.mediastack;
  const nd = aggregators.newsdata;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-6 md:py-8 pb-safe custom-scroll bg-narvo-bg">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="narvo-border bg-narvo-surface/10 p-4 md:p-6 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <p className="font-mono text-[10px] text-narvo-secondary tracking-widest uppercase">Investor Board</p>
            <h1 className="font-header text-2xl md:text-3xl text-narvo-text uppercase tracking-tight">Platform Metrics</h1>
            <p className="font-body text-narvo-dimAccessible text-sm mt-2">
              Live signals across distribution, listeners, and system readiness.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-narvo-dimAccessible">
            <span className="narvo-border px-3 py-1">LAST_SYNC: {metrics?.last_sync ?? '—'}</span>
            <span className={`narvo-border px-3 py-1 ${metrics?.broadcast_ready ? 'text-narvo-primary' : ''}`}>
              READY: {metrics?.broadcast_ready ? 'YES' : 'NO'}
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={Users} label="LISTENERS TODAY" value={String(metrics?.listeners_today ?? '—')} testId="metric-listeners-today" />
          <MetricCard icon={Radio} label="TOTAL LISTENERS" value={String(metrics?.total_listeners ?? '—')} testId="metric-total-listeners" />
          <MetricCard icon={Globe} label="SOURCES ONLINE" value={`${metrics?.sources_online ?? '—'} / ${metrics?.total_sources ?? '—'}`} testId="metric-sources-online" />
          <MetricCard icon={LineChart} label="STORIES PROCESSED" value={String(metrics?.stories_processed ?? '—')} testId="metric-stories" />
          <MetricCard icon={Clock} label="BROADCAST HOURS" value={String(metrics?.broadcast_hours ?? '—')} testId="metric-broadcast-hours" />
          <MetricCard icon={Signal} label="SIGNAL STRENGTH" value={String(metrics?.signal_strength ?? '—')} testId="metric-signal" />
        </section>

        <section className="narvo-border bg-narvo-surface/10 p-4 md:p-6 space-y-4">
          <h2 className="font-header text-lg text-narvo-text uppercase tracking-widest">Source Coverage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="narvo-border bg-narvo-bg/60 p-4">
              <p className="font-mono text-[10px] text-narvo-secondary tracking-widest">LOCAL</p>
              <p className="font-header text-xl text-narvo-text">{metrics?.local_sources ?? '—'}</p>
            </div>
            <div className="narvo-border bg-narvo-bg/60 p-4">
              <p className="font-mono text-[10px] text-narvo-secondary tracking-widest">CONTINENTAL</p>
              <p className="font-header text-xl text-narvo-text">{metrics?.continental_sources ?? '—'}</p>
            </div>
            <div className="narvo-border bg-narvo-bg/60 p-4">
              <p className="font-mono text-[10px] text-narvo-secondary tracking-widest">INTERNATIONAL</p>
              <p className="font-header text-xl text-narvo-text">{metrics?.international_sources ?? '—'}</p>
            </div>
          </div>
        </section>

        <section className="narvo-border bg-narvo-surface/10 p-4 md:p-6 space-y-3">
          <h2 className="font-header text-lg text-narvo-text uppercase tracking-widest">Aggregator Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="narvo-border bg-narvo-bg/60 p-4">
              <p className="font-mono text-[10px] text-narvo-secondary tracking-widest">MEDIASTACK</p>
              <p className="font-body text-narvo-text mt-1">Configured: {ms?.configured ? 'YES' : 'NO'}</p>
              <p className="font-body text-narvo-dimAccessible">Cached: {ms?.cached_count ?? '—'}</p>
            </div>
            <div className="narvo-border bg-narvo-bg/60 p-4">
              <p className="font-mono text-[10px] text-narvo-secondary tracking-widest">NEWSDATA.IO</p>
              <p className="font-body text-narvo-text mt-1">Configured: {nd?.configured ? 'YES' : 'NO'}</p>
              <p className="font-body text-narvo-dimAccessible">Cached: {nd?.cached_count ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
