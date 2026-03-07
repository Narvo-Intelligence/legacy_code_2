import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Icon } from '@phosphor-icons/react/lib';
import { ChartLineUp } from '@phosphor-icons/react/ChartLineUp';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { Users } from '@phosphor-icons/react/Users';
import { Globe } from '@phosphor-icons/react/Globe';
import { Clock } from '@phosphor-icons/react/Clock';
import { CellSignalFull } from '@phosphor-icons/react/CellSignalFull';
import * as api from '../lib/api';

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

const MetricCard = ({ icon: Icon, label, value, testId }: MetricCardProps) => (
  <div
    className="narvo-border bg-surface/10 p-4 md:p-6 flex flex-col min-h-[80px]"
    data-testid={testId}
  >
    <div className="flex items-center gap-2 mb-2">
      {Icon && (
        <span className="flex items-center justify-center w-6 h-6 text-primary" aria-hidden>
          <Icon weight="regular" className="w-5 h-5 md:w-6 md:h-6" />
        </span>
      )}
      <span className="mono-ui text-[10px] text-forest tracking-widest">{label}</span>
    </div>
    <span className="font-display text-lg md:text-2xl font-bold text-content tabular-nums" style={{ lineHeight: 'var(--line-height-heading)' }}>
      {value}
    </span>
  </div>
);

export default function InvestorDashboardPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('api/metrics');
        if (!res.ok) throw new Error('Failed to load metrics');
        const data = await res.json();
        if (!cancelled) setMetrics(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto" role="status" aria-live="polite">
        <p className="mono-ui text-[11px] text-forest tracking-widest animate-pulse">LOADING…</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">
        <p className="text-content font-body text-sm" role="alert" style={{ lineHeight: 'var(--line-height-body)' }}>{error ?? 'No data'}</p>
      </div>
    );
  }

  const cards: MetricCardProps[] = [
    { icon: Users, label: t('investor.listeners', 'Listeners'), value: metrics.total_listeners ?? '—', testId: 'metric-listeners' },
    { icon: Broadcast, label: t('investor.sources_online', 'Sources online'), value: String(metrics.sources_online ?? metrics.total_sources ?? '—'), testId: 'metric-sources-online' },
    { icon: Globe, label: t('investor.stories_processed', 'Stories processed'), value: String(metrics.stories_processed ?? '—'), testId: 'metric-stories-processed' },
    { icon: Clock, label: t('investor.broadcast_hours', 'Broadcast hours'), value: String(metrics.broadcast_hours ?? '—'), testId: 'metric-broadcast-hours' },
    { icon: CellSignalFull, label: t('investor.signal_strength', 'Signal strength'), value: metrics.signal_strength ?? '—', testId: 'metric-signal-strength' },
    { label: t('investor.network_load', 'Network load'), value: metrics.network_load ?? '—', testId: 'metric-network-load' },
    { label: t('investor.local_sources', 'Local sources'), value: String(metrics.local_sources ?? '—'), testId: 'metric-local-sources' },
    { label: t('investor.international_sources', 'International sources'), value: String(metrics.international_sources ?? '—'), testId: 'metric-international-sources' },
    { label: t('investor.broadcast_ready', 'Broadcast ready'), value: metrics.broadcast_ready ? t('common.yes', 'Yes') : t('common.no', 'No'), testId: 'metric-broadcast-ready' },
  ];

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto min-h-0" data-testid="investor-dashboard">
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-12 h-12 narvo-border bg-surface/20" aria-hidden>
            <ChartLineUp weight="regular" className="w-6 h-6 text-primary" />
          </span>
          <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight" style={{ lineHeight: 'var(--line-height-heading)' }}>
            {t('investor.title', 'System metrics')}
          </h1>
        </div>
        <p className="mono-ui text-[10px] md:text-[11px] text-forest tracking-widest" style={{ lineHeight: 1.5 }}>
          {t('investor.subtitle', 'Platform health and usage for investors and ops.')}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card) => (
          <MetricCard key={card.testId} {...card} />
        ))}
      </div>

      {metrics.last_sync && (
        <p className="mt-6 mono-ui text-[9px] text-content-dim-accessible" style={{ lineHeight: 1.5 }}>
          {t('investor.last_sync', 'Last sync')}: {new Date(metrics.last_sync).toLocaleString()}
        </p>
      )}
    </div>
  );
}
