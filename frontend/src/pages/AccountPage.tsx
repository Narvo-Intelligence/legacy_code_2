import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Icon } from '@phosphor-icons/react/lib';
import { Bell } from '@phosphor-icons/react/Bell';
import { Timer } from '@phosphor-icons/react/Timer';
import { Waveform } from '@phosphor-icons/react/Waveform';
import { MapPin } from '@phosphor-icons/react/MapPin';
import { FileText } from '@phosphor-icons/react/FileText';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { User } from '@phosphor-icons/react/User';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import BackToSettings from '../components/BackToSettings';
import * as api from '../lib/api';

interface MetricCardProps {
  title: string;
  icon: Icon;
  loading: boolean;
  children: React.ReactNode;
}

const MetricCard = ({ title, icon: Icon, loading, children }: MetricCardProps) => (
  <div className="narvo-border bg-surface/5 p-5 md:p-8 flex flex-col justify-between min-h-[180px] md:min-h-[220px]">
    <div className="flex justify-between items-start">
      <h3 className="mono-ui text-[11px] md:text-[12px] text-forest font-bold tracking-widest">{title}</h3>
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-forest" />
    </div>
    {loading ? (
      <Skeleton variant="text" className="w-24 h-12 mt-4" />
    ) : (
      <div className="mt-auto">{children}</div>
    )}
  </div>
);

interface MetricsData {
  network_load?: string | number;
  broadcast_hours?: number;
  stories_processed?: number;
  sources_online?: number;
  signal_strength?: string;
  listeners_today?: string | number;
}

interface SystemAlert {
  id: string;
  title: string;
  desc: string;
  priority?: boolean;
  time?: string;
}

const AccountPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('api/metrics').then(r => r.json()).catch(() => null),
      api.get('api/system-alerts').then(r => r.json()).catch(() => []),
    ]).then(([metricsData, alertsData]: [MetricsData | null, SystemAlert[]]) => {
      setMetrics(metricsData ?? null);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setLoading(false);
    });
  }, []);

  const networkLoad = metrics ? parseInt(String(metrics.network_load), 10) || 0 : 0;

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll bg-background-dark min-h-0" data-testid="account-page">
      <div className="p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8 pb-safe">
        <div className="flex items-center justify-between narvo-border-b border-forest/30 pb-4">
          <BackToSettings />
        </div>

        {user && (
          <div className="narvo-border bg-surface/10 p-4 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] block mb-4">
                AUTHENTICATED_OPERATOR
              </span>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 narvo-border bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="font-display text-primary text-xl md:text-2xl font-bold">{user.email?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-content block font-display font-bold text-sm md:text-lg truncate">{user.email}</span>
                  <span className="mono-ui text-[10px] md:text-[11px] text-forest block mt-0.5">
                    OPERATOR_ID: {user.id?.slice(0, 16)}...
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary mono-ui text-[9px] md:text-[10px] font-bold">PREMIUM</span>
                    <span className="px-1.5 py-0.5 bg-forest/20 text-forest mono-ui text-[9px] md:text-[10px] font-bold">VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="narvo-border relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
            <Broadcast className="w-48 h-48 md:w-64 md:h-64 text-primary" />
          </div>
          <div className="relative z-10 p-4 md:p-8 space-y-4 md:space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-primary animate-pulse" />
              <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold uppercase">{t('account.stream_active')}</span>
            </div>
            <div>
              <h3 className="mono-ui text-[10px] md:text-[11px] text-forest font-bold uppercase tracking-widest mb-1">
                {t('account.current_plan')}
              </h3>
              <p className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-content uppercase leading-none">
                {t('account.premium_broadcast').split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => navigate('/subscription')}
                className="px-4 md:px-6 py-2 bg-transparent border border-white text-content mono-ui text-[11px] md:text-[12px] font-bold hover:bg-primary hover:border-primary hover:text-background-dark transition-all"
                data-testid="manage-plan-btn"
              >
                {t('account.manage_plan')}
              </button>
              <button className="px-3 py-2 text-slate-400 mono-ui text-[11px] md:text-[12px] font-bold hover:text-primary transition-colors flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>{t('account.view_invoices')}</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mono-ui text-[11px] md:text-[12px] text-forest font-bold tracking-[0.2em] mb-4">
            TRANSMISSION_METRICS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <MetricCard title={t('account.broadcast_hours')} icon={Timer} loading={loading}>
              <span className="font-display text-4xl md:text-5xl font-bold text-content block">
                {metrics?.broadcast_hours ?? 0}
              </span>
              <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold mt-1 block">HOURS_GENERATED</span>
              <div className="w-full h-1 bg-forest/20 mt-4 relative">
                <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${Math.min(100, (metrics?.broadcast_hours || 0) * 10)}%` }} />
              </div>
            </MetricCard>

            <MetricCard title={t('account.signals_processed')} icon={Waveform} loading={loading}>
              <span className="font-display text-4xl md:text-5xl font-bold text-content block">
                {metrics?.stories_processed ?? 0}
              </span>
              <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold mt-1 block">
                {metrics?.sources_online ?? 0}_SOURCES_ONLINE
              </span>
              <div className="flex items-end gap-1 h-8 mt-4 opacity-40">
                {[40, 60, 30, 80, 100, 50, 70].map((h, i) => (
                  <div key={i} className={`flex-1 ${i === 4 ? 'bg-primary' : 'bg-forest'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </MetricCard>

            <MetricCard title="NETWORK_LOAD" icon={MapPin} loading={loading}>
              <span className="font-display text-4xl md:text-5xl font-bold text-content block">
                {metrics?.network_load ?? '0%'}
              </span>
              <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold mt-1 block">SIGNAL: {metrics?.signal_strength ?? 'N/A'}</span>
              <div className="w-full h-1 bg-forest/20 mt-4 relative">
                <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${networkLoad}%` }} />
              </div>
            </MetricCard>
          </div>
        </div>

        <div>
          <h2 className="mono-ui text-[11px] md:text-[12px] text-forest font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            {t('account.system_alerts')}
          </h2>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-4 narvo-border">
                  <Skeleton variant="text" className="w-48 h-4 mb-2" />
                  <Skeleton variant="text" className="w-64 h-3" />
                </div>
              ))
            ) : alerts.length === 0 ? (
              <div className="p-4 narvo-border text-center">
                <span className="mono-ui text-[11px] text-forest">NO_ACTIVE_ALERTS</span>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 md:p-5 narvo-border relative ${
                    alert.priority ? 'bg-primary/5' : 'border-forest/30 bg-surface/5'
                  }`}
                  data-testid={`alert-${alert.id}`}
                >
                  {alert.priority && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
                  <p className={`mono-ui text-[12px] md:text-[13px] font-bold mb-1.5 ${alert.priority ? 'text-primary' : 'text-content'}`}>
                    {alert.title}
                  </p>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest leading-relaxed">{alert.desc}</p>
                  {alert.time && (
                    <p className="mono-ui text-[9px] text-slate-500 mt-2 text-right">
                      {alert.time.includes('T') ? new Date(alert.time).toLocaleString() : alert.time}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {user && (
          <div className="narvo-border-t pt-4 md:pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-forest" />
              <span className="mono-ui text-[10px] md:text-[11px] text-forest">{t('account.session_active')}</span>
            </div>
            <span className="mono-ui text-[10px] text-forest/50">LISTENERS: {metrics?.listeners_today ?? '0'}</span>
          </div>
        )}
      </div>
    </main>
  );
};

export default AccountPage;
