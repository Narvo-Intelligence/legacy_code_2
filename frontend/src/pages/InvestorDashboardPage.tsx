import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <p className="mono-ui text-[11px] text-forest animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <p className="text-content" role="alert">{error ?? 'No data'}</p>
      </div>
    );
  }

  const cards = [
    { icon: Users, label: t('investor.listeners', 'Listeners'), value: metrics.total_listeners ?? '—' },
    { icon: Broadcast, label: t('investor.sources_online', 'Sources online'), value: String(metrics.sources_online ?? metrics.total_sources ?? '—') },
    { icon: Globe, label: t('investor.stories_processed', 'Stories processed'), value: String(metrics.stories_processed ?? '—') },
    { icon: Clock, label: t('investor.broadcast_hours', 'Broadcast hours'), value: String(metrics.broadcast_hours ?? '—') },
    { icon: CellSignalFull, label: t('investor.signal_strength', 'Signal strength'), value: metrics.signal_strength ?? '—' },
    { label: t('investor.network_load', 'Network load'), value: metrics.network_load ?? '—' },
    { label: t('investor.local_sources', 'Local sources'), value: String(metrics.local_sources ?? '—') },
    { label: t('investor.international_sources', 'International sources'), value: String(metrics.international_sources ?? '—') },
    { label: t('investor.broadcast_ready', 'Broadcast ready'), value: metrics.broadcast_ready ? t('common.yes', 'Yes') : t('common.no', 'No') },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6" data-testid="investor-dashboard">
      <div className="flex items-center gap-3">
        <ChartLineUp weight="bold" className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight">
            {t('investor.title', 'System metrics')}
          </h1>
          <p className="mono-ui text-[10px] md:text-[11px] text-forest mt-0.5">
            {t('investor.subtitle', 'Platform health and usage for investors and ops.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="narvo-border bg-surface/10 p-4 flex flex-col"
              data-testid={`metric-${(card.label as string).toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon weight="bold" className="w-4 h-4 text-primary shrink-0" />}
                <span className="mono-ui text-[10px] text-forest uppercase tracking-widest">{card.label}</span>
              </div>
              <span className="font-display text-lg md:text-xl font-bold text-content">{card.value}</span>
            </div>
          );
        })}
      </div>

      {metrics.last_sync && (
        <p className="mono-ui text-[9px] text-forest/60">
          {t('investor.last_sync', 'Last sync')}: {new Date(metrics.last_sync).toLocaleString()}
        </p>
      )}
    </div>
  );
}
