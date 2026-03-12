import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  LineChart,
  Radio,
  Users,
  Globe,
  Clock,
  Signal,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { SignalChart } from '../components/SignalChart';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  testId: string;
}

const MetricCard = ({ icon: IconComp, label, value, testId }: MetricCardProps) => (
  <motion.div
    className="narvo-border bg-narvo-surface/20 p-5 md:p-6 flex flex-col justify-between group hover:border-narvo-primary transition-colors"
    data-testid={testId}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-center justify-between mb-4">
      <span className="font-mono text-[9px] md:text-[10px] text-narvo-secondary tracking-[0.2em] uppercase">{label}</span>
      {IconComp && (
        <IconComp className="w-4 h-4 text-narvo-primary/60 group-hover:text-narvo-primary transition-colors" />
      )}
    </div>
    <span className="font-header text-2xl md:text-3xl font-bold text-narvo-text tabular-nums tracking-tight">
      {value}
    </span>
  </motion.div>
);

const resolveBackendUrl = () => {
  const raw = import.meta.env.VITE_BACKEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://api.narvo.news';
};

export default function InvestorBoardPage() {
  const navigate = useNavigate();
  const cancelledRef = useRef(false);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const base = resolveBackendUrl();
      const url = `${base}/api/metrics`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (cancelledRef.current) return;
      if (!res.ok) throw new Error('Failed to load metrics');
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text.slice(0, 200) || 'Invalid response');
      }
      const data = await res.json();
      if (cancelledRef.current) return;
      setMetrics(data);
      setError(null);
    } catch (e) {
      if (cancelledRef.current) return;
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const timeline = useMemo(() => {
    const parseMetric = (val: string | number | undefined): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const num = Number(String(val).replace(/[^0-9.]/g, ''));
      return Number.isFinite(num) ? num : 0;
    };
    const m = metrics;
    return [
      parseMetric(m?.listeners_today),
      parseMetric(m?.total_listeners),
      parseMetric(m?.stories_processed),
      parseMetric(m?.broadcast_hours),
      parseMetric(m?.sources_online),
    ].map(v => v || 1);
  }, [metrics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-narvo-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-narvo-primary border-t-transparent animate-spin" />
          <p className="font-mono text-[10px] text-narvo-secondary tracking-[0.4em] uppercase">Initializing_Link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-narvo-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full narvo-border bg-narvo-surface/20 p-6 space-y-4">
          <p className="font-body text-narvo-text leading-relaxed" role="alert">
            {error}
          </p>
          <p className="font-mono text-[10px] text-narvo-dimAccessible uppercase tracking-widest">
            Check network or try again from the dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="narvo-border bg-narvo-primary text-narvo-bg font-mono text-[11px] uppercase tracking-widest px-4 py-3 hover:brightness-110 transition-all"
          >
            Back to hub
          </button>
        </div>
      </div>
    );
  }

  const aggregators = metrics?.aggregators || {};

  return (
    <div className="min-h-screen bg-narvo-bg text-narvo-text font-body selection:bg-narvo-primary selection:text-narvo-bg overflow-x-hidden">
      {/* Top Header Bar */}
      <nav className="sticky top-0 z-50 narvo-glass border-b border-narvo-structural/30 px-4 md:px-8 py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-narvo-dim hover:text-narvo-text transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-[10px] uppercase tracking-widest hidden sm:inline">Back</span>
        </button>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${metrics?.broadcast_ready ? 'bg-narvo-primary' : 'bg-red-500'} animate-pulse`} />
          <span className="font-header text-sm font-bold uppercase tracking-widest">Narvo_Signal_v2.0</span>
        </div>

        <button 
          onClick={() => load(true)}
          disabled={isRefreshing}
          className={`p-2 text-narvo-dim hover:text-narvo-text transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12">
        {/* Hero Section */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="font-header text-4xl md:text-6xl text-narvo-text uppercase tracking-tighter leading-none">
                Platform <span className="text-narvo-primary">Metrics</span>
              </h1>
              <p className="font-body text-narvo-dimAccessible text-base md:text-lg max-w-xl">
                Real-time operational signals across distribution, processing, and audience engagement (§4.1).
              </p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-narvo-secondary">
              <span className="narvo-border px-3 py-1.5 bg-narvo-surface/30">SYNC: {metrics?.last_sync ?? '—'}</span>
              <span className={`narvo-border px-3 py-1.5 bg-narvo-surface/30 ${metrics?.broadcast_ready ? 'text-narvo-primary border-narvo-primary/40' : ''}`}>
                STATUS: {metrics?.broadcast_ready ? 'BROADCAST_READY' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        {/* Primary Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={Users} label="Daily Listeners" value={String(metrics?.listeners_today ?? '—')} testId="metric-listeners-today" />
          <MetricCard icon={Radio} label="Total Reach" value={String(metrics?.total_listeners ?? '—')} testId="metric-total-listeners" />
          <MetricCard icon={Globe} label="Network Sources" value={`${metrics?.sources_online ?? '—'} / ${metrics?.total_sources ?? '—'}`} testId="metric-sources-online" />
          <MetricCard icon={LineChart} label="AI Stories Synthesized" value={String(metrics?.stories_processed ?? '—')} testId="metric-stories" />
          <MetricCard icon={Clock} label="Broadcast Uptime" value={`${metrics?.broadcast_hours ?? '—'}h`} testId="metric-broadcast-hours" />
          <MetricCard icon={Signal} label="Node Strength" value={String(metrics?.signal_strength ?? '—')} testId="metric-signal" />
        </section>

        {/* Chart Section */}
        <section className="narvo-border bg-narvo-surface/10 p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-header text-xl uppercase tracking-widest">Signal Consistency</h2>
            <div className="flex items-center gap-4 text-[10px] font-mono text-narvo-secondary">
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-narvo-primary" /> LOAD</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-narvo-primary/30" /> THRESHOLD</div>
            </div>
          </div>
          <div className="w-full h-[300px] md:h-[400px]">
            <SignalChart data={timeline} label="Operational load over 24h" />
          </div>
        </section>

        {/* Technical Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Coverage */}
          <section className="narvo-border bg-narvo-surface/10 p-6 space-y-6">
            <h2 className="font-header text-lg uppercase tracking-widest flex items-center gap-3">
              <Globe className="w-4 h-4 text-narvo-primary" />
              Source Coverage
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-narvo-secondary tracking-widest uppercase">Local</p>
                <p className="font-header text-2xl text-narvo-text">{metrics?.local_sources ?? '—'}</p>
                <div className="h-1 bg-narvo-primary w-full" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-narvo-secondary tracking-widest uppercase">Cont.</p>
                <p className="font-header text-2xl text-narvo-text">{metrics?.continental_sources ?? '—'}</p>
                <div className="h-1 bg-narvo-primary/40 w-full" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-narvo-secondary tracking-widest uppercase">Intl.</p>
                <p className="font-header text-2xl text-narvo-text">{metrics?.international_sources ?? '—'}</p>
                <div className="h-1 bg-narvo-primary/20 w-full" />
              </div>
            </div>
            <p className="font-body text-[12px] text-narvo-dimAccessible leading-relaxed">
              *Sources weighted by regional relevance and TTS accent compatibility §11.
            </p>
          </section>

          {/* Aggregator Infrastructure */}
          <section className="narvo-border bg-narvo-surface/10 p-6 space-y-6">
            <h2 className="font-header text-lg uppercase tracking-widest flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-narvo-primary" />
              Infrastructure Status
            </h2>
            <div className="space-y-4">
              {Object.entries(aggregators).map(([key, data]) => (
                <div key={key} className="flex items-center justify-between p-3 narvo-border bg-narvo-bg/40">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest">{key}</p>
                    <p className="text-[11px] text-narvo-dimAccessible">Refreshed via QStash §4.6</p>
                  </div>
                  <div className="text-right">
                    <p className="font-header text-sm">{data.cached_count} STORIES</p>
                    <p className={`text-[10px] font-mono ${data.configured ? 'text-narvo-primary' : 'text-red-500'}`}>
                      {data.configured ? 'ACTIVE' : 'OFFLINE'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 px-8 border-t border-narvo-structural/20 flex flex-col items-center gap-4 text-center">
        <div className="w-8 h-8 bg-narvo-primary p-1.5">
          <img src="/narvo_logo.svg" alt="Narvo Logo" className="w-full h-full object-contain brightness-0 invert" />
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-narvo-secondary">
          Narvo Intelligence Systems © 2026
        </p>
      </footer>
    </div>
  );
}
