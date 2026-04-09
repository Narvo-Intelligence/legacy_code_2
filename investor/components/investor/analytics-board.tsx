'use client';

import { useState, useTransition } from 'react';
import {
  Activity,
  Globe2,
  Radio,
  RefreshCw,
  Signal,
  Users,
  Waves,
} from 'lucide-react';
import { telemetryCatalog } from '@/lib/investor-content';
import { trackEvent } from '@/lib/analytics-client';
import type { MetricsSnapshot, PlatformMetrics } from '@/lib/investor-metrics';
import { MetricChart } from '@/components/investor/metric-chart';

interface AnalyticsBoardProps {
  initialSnapshot: MetricsSnapshot;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: typeof Users;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="frame-panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">
          {label}
        </span>
        <Icon className="h-4 w-4 text-teal" />
      </div>
      <div className="mt-5 font-display text-3xl text-ink md:text-4xl">{value}</div>
    </div>
  );
}

function displayValue(value: number | string | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || value === '') return 'Awaiting signal';
  return `${value}${suffix}`;
}

function metricsToChart(metrics: PlatformMetrics) {
  const numeric = [
    { label: 'Listeners', value: Number(String(metrics.listeners_today ?? 0).replace(/[^0-9.]/g, '')) || 0 },
    { label: 'Reach', value: Number(String(metrics.total_listeners ?? 0).replace(/[^0-9.]/g, '')) || 0 },
    { label: 'Stories', value: metrics.stories_processed ?? 0 },
    { label: 'Hours', value: metrics.broadcast_hours ?? 0 },
    { label: 'Sources', value: metrics.sources_online ?? 0 },
  ];

  return numeric;
}

export function AnalyticsBoard({ initialSnapshot }: AnalyticsBoardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isPending, startTransition] = useTransition();

  const refreshMetrics = () => {
    trackEvent('metrics_refresh', { label: 'analytics board refresh' });

    startTransition(() => {
      void (async () => {
        const response = await fetch('/api/metrics', {
          cache: 'no-store',
        });

        if (!response.ok) return;
        const payload = (await response.json()) as MetricsSnapshot;
        setSnapshot(payload);
      })();
    });
  };

  const aggregators = Object.entries(snapshot.metrics.aggregators ?? {});
  const chartValues = metricsToChart(snapshot.metrics);

  return (
    <div className="shell space-y-8 pb-24 pt-8">
      <section
        className="frame-panel space-y-6 p-6 md:p-8"
        data-track-event="section_view"
        data-track-section="analytics-live-board"
      >
        <div className="content-grid items-start">
          <div className="space-y-3">
            <p className="section-kicker">Live operating signal</p>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              The investor board blends live backend telemetry with first-party route tracking.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-quiet md:text-base">
              {snapshot.message} Captured at {new Date(snapshot.fetchedAt).toLocaleString()}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span className="metric-chip">
              <span className={`signal-dot ${snapshot.live ? '' : 'bg-butter'}`} />
              {snapshot.live ? 'Live backend feed' : 'Fallback mode'}
            </span>
            <button
              className="cta-secondary"
              disabled={isPending}
              onClick={refreshMetrics}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              Refresh metrics
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={Users} label="Daily listeners" value={displayValue(snapshot.metrics.listeners_today)} />
          <StatCard icon={Radio} label="Total reach" value={displayValue(snapshot.metrics.total_listeners)} />
          <StatCard
            icon={Globe2}
            label="Sources online"
            value={`${displayValue(snapshot.metrics.sources_online)} / ${displayValue(snapshot.metrics.total_sources)}`}
          />
          <StatCard icon={Activity} label="Stories processed" value={displayValue(snapshot.metrics.stories_processed)} />
          <StatCard icon={Waves} label="Broadcast uptime" value={displayValue(snapshot.metrics.broadcast_hours, 'h')} />
          <StatCard icon={Signal} label="Signal strength" value={displayValue(snapshot.metrics.signal_strength)} />
        </div>
      </section>

      <section className="frame-panel p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">Shape of the load</p>
            <h2 className="font-display text-3xl text-ink">How the current signal distributes</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-quiet">
            This chart is derived directly from the currently exposed metrics payload, so it keeps working even while
            the underlying board evolves.
          </p>
        </div>

        <MetricChart values={chartValues} />
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="frame-panel p-6 md:p-8">
          <div className="mb-6">
            <p className="section-kicker">Footprint</p>
            <h2 className="font-display text-3xl text-ink">Coverage and reliability posture</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-mist/65 p-5">
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">Local</div>
              <div className="mt-3 font-display text-3xl text-ink">
                {displayValue(snapshot.metrics.local_sources)}
              </div>
            </div>
            <div className="rounded-3xl bg-mist/65 p-5">
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">Continental</div>
              <div className="mt-3 font-display text-3xl text-ink">
                {displayValue(snapshot.metrics.continental_sources)}
              </div>
            </div>
            <div className="rounded-3xl bg-mist/65 p-5">
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">International</div>
              <div className="mt-3 font-display text-3xl text-ink">
                {displayValue(snapshot.metrics.international_sources)}
              </div>
            </div>
          </div>

          <div className="soft-rule mt-6 space-y-4 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">Broadcast status</div>
                <div className="mt-2 text-sm text-ink">
                  {snapshot.metrics.broadcast_ready ? 'Ready for listener playback.' : 'Awaiting live readiness signal.'}
                </div>
              </div>
              <span
                className={`rounded-full px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.24em] ${
                  snapshot.metrics.broadcast_ready
                    ? 'bg-mint/30 text-teal'
                    : 'bg-butter/35 text-ink'
                }`}
              >
                {snapshot.metrics.broadcast_ready ? 'Ready' : 'Standby'}
              </span>
            </div>

            <div className="rounded-3xl bg-ink-deep px-5 py-4 text-white">
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-white/70">Last sync</div>
              <div className="mt-2 text-sm leading-7 text-white/85">
                {snapshot.metrics.last_sync ?? 'No recent timestamp surfaced by the backend.'}
              </div>
            </div>
          </div>
        </section>

        <section className="frame-panel p-6 md:p-8">
          <div className="mb-6">
            <p className="section-kicker">Investor telemetry</p>
            <h2 className="font-display text-3xl text-ink">What this platform tracks</h2>
          </div>

          <div className="space-y-4">
            {telemetryCatalog.map((item) => (
              <div key={item.name} className="stat-stack">
                <div className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-teal">
                  {item.name}
                </div>
                <p className="mt-2 text-sm leading-7 text-quiet">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="frame-panel p-6 md:p-8">
        <div className="mb-6">
          <p className="section-kicker">Infrastructure map</p>
          <h2 className="font-display text-3xl text-ink">Aggregator and cache posture</h2>
        </div>

        {aggregators.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aggregators.map(([name, data]) => (
              <div key={name} className="rounded-3xl bg-mist/65 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-quiet">{name}</div>
                    <div className="mt-3 text-sm text-ink">
                      {data.configured ? 'Configured and ready to serve cache.' : 'Configured signal unavailable.'}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.24em] ${
                      data.configured ? 'bg-mint/30 text-teal' : 'bg-butter/35 text-ink'
                    }`}
                  >
                    {data.configured ? 'Active' : 'Standby'}
                  </span>
                </div>
                <div className="mt-5 font-display text-3xl text-ink">
                  {displayValue(data.cached_count)}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-quiet">cached stories</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-4xl border border-dashed border-line/20 bg-white/55 px-6 py-10 text-sm leading-7 text-quiet">
            No aggregator details are exposed by the current backend payload, so the board stays honest and simply
            reports that the live map is incomplete.
          </div>
        )}
      </section>
    </div>
  );
}
