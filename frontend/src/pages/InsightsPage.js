import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock, Play, Waveform, Trash, ChartBar, Lightning, Fire, Broadcast, TrendUp, TrendDown,
  ArrowRight, SunHorizon, Sun, Moon,
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import Skeleton from '../components/Skeleton';
import * as api from '../lib/api';

const CATEGORY_COLORS = {
  general: '#6B8A7A', politics: '#D4A574', technology: '#7B9BAA', business: '#A8B87A',
  sports: '#D49B7A', health: '#8AB89B', entertainment: '#B88A9B', science: '#9B8AB8',
  tech: '#7B9BAA', economy: '#A8B87A',
};

const StatCard = ({ icon: Icon, label, value, small }) => (
  <div className="narvo-border bg-surface/10 p-3" data-testid={`stat-${label.toLowerCase()}`}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon weight="bold" className="w-3.5 h-3.5 text-primary" />
      <span className="mono-ui text-[8px] md:text-[9px] text-forest/60 tracking-[0.1em]">{label}</span>
    </div>
    <span className={`font-display ${small ? 'text-sm' : 'text-lg md:text-2xl'} font-bold text-content`}>
      {value}
    </span>
  </div>
);

const TAB_HISTORY = 'history';
const TAB_ANALYTICS = 'analytics';

const InsightsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === TAB_ANALYTICS ? TAB_ANALYTICS : TAB_HISTORY;

  const { user } = useAuth();
  const { playTrack } = useAudio();
  const userId = user?.id || 'guest';

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    api.get(`api/listening-history/${userId}?limit=50`)
      .then(r => r.json())
      .then(data => { setHistory(data); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, [userId]);

  useEffect(() => { if (tab === TAB_HISTORY) fetchHistory(); }, [tab, fetchHistory]);

  // Refetch history when tab gains focus (e.g. after playing something)
  useEffect(() => {
    if (tab !== TAB_HISTORY) return;
    const onFocus = () => fetchHistory();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [tab, fetchHistory]);

  const deleteEntry = async (e, entryId) => {
    e.stopPropagation();
    if (!entryId || deletingId) return;
    setDeletingId(entryId);
    try {
      await api.del(`api/listening-history/${userId}/${entryId}`);
      setHistory(prev => prev.filter(item => item.id !== entryId));
    } catch (_) {}
    setDeletingId(null);
  };

  const clearAllHistory = async () => {
    if (history.length === 0 || clearing) return;
    if (!window.confirm(t('insights_page.clear_confirm'))) return;
    setClearing(true);
    try {
      await api.del(`api/listening-history/${userId}`);
      setHistory([]);
    } catch (_) {}
    setClearing(false);
  };

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (tab !== TAB_ANALYTICS) return;
    setAnalyticsLoading(true);
    api.get(`api/analytics/${userId}`)
      .then(r => r.json())
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [userId, tab]);

  const setTab = (t) => setSearchParams(t === TAB_ANALYTICS ? { tab: TAB_ANALYTICS } : {});

  const formatTime = (isoStr) => {
    if (!isoStr) return { type: 'locale', value: '' };
    const d = new Date(isoStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return { type: 'i18n', key: 'time_just_now' };
    if (diff < 3600) return { type: 'i18n', key: 'time_m_ago', count: Math.floor(diff / 60) };
    if (diff < 86400) return { type: 'i18n', key: 'time_h_ago', count: Math.floor(diff / 3600) };
    if (diff < 604800) return { type: 'i18n', key: 'time_d_ago', count: Math.floor(diff / 86400) };
    return { type: 'locale', value: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) };
  };
  const formatTimeDisplay = (ft) => {
    if (!ft || ft.type === 'locale') return ft?.value ?? '';
    return t(`insights_page.${ft.key}`, { count: ft.count });
  };

  const groupByDate = (items) => {
    const groups = {};
    (items || []).forEach(item => {
      const d = new Date(item.played_at);
      const key = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(history);

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background-dark min-h-0" data-testid="insights-page">
      {/* Page header + tabs */}
      <div className="shrink-0 narvo-border-b bg-background-dark">
        <div className="flex items-end justify-between px-4 md:px-8 pt-4 pb-2">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight">
              {t('insights_page.title')}
            </h1>
            <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold mt-1">
              {t('insights_page.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex px-4 md:px-8 gap-0">
          <button
            onClick={() => setTab(TAB_HISTORY)}
            className={`min-h-[var(--touch-target-min)] px-4 md:px-5 py-3 mono-ui text-[11px] md:text-[12px] font-bold tracking-widest border-b-2 transition-colors ${
              tab === TAB_HISTORY
                ? 'text-primary border-primary'
                : 'text-forest border-transparent hover:text-content'
            }`}
            data-testid="insights-tab-history"
          >
            {t('insights_page.tab_history')}
          </button>
          <button
            onClick={() => setTab(TAB_ANALYTICS)}
            className={`min-h-[var(--touch-target-min)] px-4 md:px-5 py-3 mono-ui text-[11px] md:text-[12px] font-bold tracking-widest border-b-2 transition-colors ${
              tab === TAB_ANALYTICS
                ? 'text-primary border-primary'
                : 'text-forest border-transparent hover:text-content'
            }`}
            data-testid="insights-tab-analytics"
          >
            {t('insights_page.tab_analytics')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll">
        {tab === TAB_HISTORY && (
          <div className="p-4 md:p-8 pb-32 md:pb-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <span className="mono-ui text-[10px] md:text-[11px] text-forest">
                {t('insights_page.entries_count', { count: history.length })}
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  disabled={clearing}
                  className="mono-ui text-[10px] md:text-[11px] text-forest hover:text-primary transition-colors flex items-center gap-1.5 min-h-[48px] px-3"
                  data-testid="clear-all-history"
                >
                  <Trash className="w-3.5 h-3.5" />
                  {t('insights_page.clear_all')}
                </button>
              )}
            </div>

            {historyLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="narvo-border p-4 flex items-center gap-4">
                    <Skeleton variant="text" className="w-10 h-10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton variant="text" className="w-48 h-4 mb-2" />
                      <Skeleton variant="text" className="w-32 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="narvo-border bg-surface/10 p-8 md:p-12 text-center">
                <Waveform className="w-12 h-12 text-forest/30 mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-content uppercase mb-2">{t('insights_page.no_history_yet')}</h3>
                <p className="mono-ui text-[11px] text-forest">{t('insights_page.no_history_hint')}</p>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                {Object.entries(grouped).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <div className="w-2 h-2 bg-primary shrink-0" />
                      <span className="mono-ui text-[11px] md:text-[12px] text-forest font-bold tracking-widest">
                        {dateLabel.toUpperCase()}
                      </span>
                      <div className="flex-1 h-px bg-forest/20" />
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div
                          key={item.id || `${item.track_id}-${idx}`}
                          className="narvo-border p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:bg-surface/20 hover:border-forest transition-colors group cursor-pointer"
                          onClick={() => {
                            if (item.track_id) {
                              playTrack({ id: item.track_id, title: item.title, source: item.source });
                            }
                          }}
                          data-testid={`history-item-${idx}`}
                        >
                          <div className="w-10 h-10 md:w-12 md:h-12 narvo-border flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-colors min-h-[48px]">
                            <Play className="w-4 h-4 text-forest group-hover:text-background-dark" fill="currentColor" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-content text-xs md:text-sm font-display font-bold truncate group-hover:text-primary transition-colors break-words">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {item.source && (
                                <span className="mono-ui text-[9px] md:text-[10px] text-forest font-bold truncate">{item.source}</span>
                              )}
                              {item.category && (
                                <>
                                  <span className="text-forest/30">/</span>
                                  <span className="mono-ui text-[9px] md:text-[10px] text-primary">{item.category.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="mono-ui text-[9px] md:text-[10px] text-forest/50 shrink-0">
                            {formatTimeDisplay(formatTime(item.played_at))}
                          </span>
                          {item.id && (
                            <button
                              onClick={(e) => deleteEntry(e, item.id)}
                              disabled={deletingId === item.id}
                              className="p-2 text-forest hover:text-red-400 transition-colors shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center"
                              aria-label="Remove from history"
                              data-testid={`delete-history-${item.id}`}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === TAB_ANALYTICS && (
          <div className="p-4 md:p-8 pb-32 md:pb-8 max-w-4xl mx-auto">
            {analyticsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 narvo-border bg-surface/20 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
                  <StatCard icon={Broadcast} label={t('insights_page.stat_listens')} value={analytics?.total_listens || 0} />
                  <StatCard icon={Clock} label={t('insights_page.stat_minutes')} value={analytics?.total_duration_minutes || 0} />
                  <StatCard icon={Fire} label={t('insights_page.stat_streak')} value={`${analytics?.streak || 0}d`} />
                  <StatCard icon={TrendUp} label={t('insights_page.stat_top')} value={analytics?.top_categories?.[0]?.toUpperCase() || '--'} small />
                </div>

                {analytics?.period_comparison && (
                  <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="period-comparison">
                    <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.weekly_comparison')}</h2>
                    <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                      <div className="flex-1 min-w-0 flex items-end gap-3">
                        <div className="text-center flex-1">
                          <span className="font-display text-2xl md:text-3xl font-bold text-content">{analytics.period_comparison.this_week}</span>
                          <p className="mono-ui text-[9px] text-forest/50 mt-0.5">{t('insights_page.this_week')}</p>
                        </div>
                        <div className="text-center pb-2">
                          <ArrowRight weight="bold" className="w-4 h-4 text-forest/30" />
                        </div>
                        <div className="text-center flex-1">
                          <span className="font-display text-2xl md:text-3xl font-bold text-forest/60">{analytics.period_comparison.last_week}</span>
                          <p className="mono-ui text-[9px] text-forest/50 mt-0.5">{t('insights_page.last_week')}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1.5 ${
                        analytics.period_comparison.trend === 'up' ? 'bg-green-500/10 text-green-400' :
                        analytics.period_comparison.trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-forest/10 text-forest'
                      }`}>
                        {analytics.period_comparison.trend === 'up' ? <TrendUp weight="bold" className="w-3.5 h-3.5" /> :
                         analytics.period_comparison.trend === 'down' ? <TrendDown weight="bold" className="w-3.5 h-3.5" /> : null}
                        <span className="mono-ui text-[11px] font-bold">
                          {analytics.period_comparison.change_pct > 0 ? '+' : ''}{analytics.period_comparison.change_pct}%
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {analytics?.weekly_trend?.length > 0 && (() => {
                  const maxWeekly = Math.max(...analytics.weekly_trend.map(w => w.count), 1);
                  return (
                    <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="weekly-trend">
                      <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.weekly_trend')}</h2>
                      <div className="flex items-end gap-2 h-20">
                        {analytics.weekly_trend.map((w, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="mono-ui text-[9px] text-forest/60 font-bold">{w.count}</span>
                            <div
                              className={`w-full transition-all duration-500 ${i === analytics.weekly_trend.length - 1 ? 'bg-primary' : 'bg-primary/40'}`}
                              style={{ height: `${Math.max(4, (w.count / maxWeekly) * 56)}px` }}
                            />
                            <span className="mono-ui text-[8px] text-forest/40">{w.week}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {analytics?.daily_activity?.length > 0 && (() => {
                  const maxDaily = Math.max(...analytics.daily_activity.map(d => d.count), 1);
                  return (
                    <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="daily-activity">
                      <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.daily_activity')}</h2>
                      <div className="flex items-end gap-1 h-20">
                        {analytics.daily_activity.map(d => (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} listens`}>
                            <div
                              className="w-full bg-primary/70 hover:bg-primary transition-colors"
                              style={{ height: `${Math.max(4, (d.count / maxDaily) * 60)}px` }}
                            />
                            <span className="mono-ui text-[7px] text-forest/40 -rotate-45 origin-top-left whitespace-nowrap">{d.date.slice(5)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {Object.keys(analytics?.hourly_distribution || {}).length > 0 && (() => {
                  const maxHourly = Math.max(...Object.values(analytics.hourly_distribution), 1);
                  return (
                    <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="hourly-distribution">
                      <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.peak_hours')}</h2>
                      <div className="flex items-end gap-px h-16">
                        {Object.entries(analytics.hourly_distribution).map(([hour, count]) => {
                          const h = parseInt(hour);
                          const isMorning = h >= 6 && h < 12;
                          const isAfternoon = h >= 12 && h < 18;
                          const isEvening = h >= 18 && h < 22;
                          const color = isMorning ? 'bg-yellow-500/60' : isAfternoon ? 'bg-primary/60' : isEvening ? 'bg-orange-500/60' : 'bg-forest/30';
                          return (
                            <div key={hour} className="flex-1 flex flex-col items-center" title={`${hour}:00 - ${count} listens`}>
                              <div
                                className={`w-full ${color} hover:opacity-100 transition-opacity ${count > 0 ? 'opacity-80' : 'opacity-20'}`}
                                style={{ height: `${Math.max(2, (count / maxHourly) * 48)}px` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <div className="flex items-center gap-1">
                          <Moon weight="bold" className="w-2.5 h-2.5 text-forest/40" />
                          <span className="mono-ui text-[8px] text-forest/40">00</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <SunHorizon weight="bold" className="w-2.5 h-2.5 text-yellow-500/60" />
                          <span className="mono-ui text-[8px] text-forest/40">06</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun weight="bold" className="w-2.5 h-2.5 text-primary/60" />
                          <span className="mono-ui text-[8px] text-forest/40">12</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon weight="bold" className="w-2.5 h-2.5 text-orange-500/60" />
                          <span className="mono-ui text-[8px] text-forest/40">18</span>
                        </div>
                        <span className="mono-ui text-[8px] text-forest/40">24</span>
                      </div>
                    </section>
                  );
                })()}

                {Object.keys(analytics?.categories || {}).length > 0 && (
                  <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="category-breakdown">
                    <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.categories')}</h2>
                    <div className="space-y-2">
                      {Object.entries(analytics.categories).map(([cat, count]) => {
                        const total = analytics.total_listens || 1;
                        const pct = Math.round((count / total) * 100);
                        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="mono-ui text-[10px] text-forest w-20 uppercase truncate">{cat}</span>
                            <div className="flex-1 h-4 bg-surface/30 overflow-hidden min-w-0">
                              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="mono-ui text-[10px] text-content font-bold w-12 text-right shrink-0">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {Object.keys(analytics?.sources || {}).length > 0 && (
                  <section className="narvo-border bg-surface/10 p-4 md:p-5 mb-5" data-testid="source-breakdown">
                    <h2 className="mono-ui text-[11px] text-primary font-bold tracking-[0.15em] mb-3">{'//'} {t('insights_page.top_sources')}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(analytics.sources).slice(0, 6).map(([src, count]) => (
                        <div key={src} className="narvo-border bg-surface/20 p-2.5 flex items-center justify-between min-w-0">
                          <span className="mono-ui text-[9px] text-forest truncate flex-1 min-w-0">{src}</span>
                          <span className="mono-ui text-[10px] text-primary font-bold ml-2 shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(!analytics || analytics.total_listens === 0) && (
                  <div className="narvo-border bg-surface/10 p-8 text-center">
                    <Lightning weight="fill" className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-display text-lg font-bold text-content uppercase mb-2">{t('insights_page.no_data_yet')}</h3>
                    <p className="mono-ui text-[11px] text-forest">{t('insights_page.no_data_hint')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default InsightsPage;
