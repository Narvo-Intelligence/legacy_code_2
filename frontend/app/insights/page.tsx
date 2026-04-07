'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  Clock,
  BookOpen,
  TrendingUp,
  Flame,
  Music,
  Activity,
  Trash2,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel } from '@/lib/narvo-api';
import {
  NARVO_PANEL_MIST_CLASS,
  NARVO_TOOLBAR_RAIL_CLASS,
} from '@/lib/narvo-ui-classes';
import {
  hasMeAuth,
  getMyListeningHistory,
  clearMyListeningHistory,
  deleteMyListeningHistoryEntry,
  type ListeningHistoryRow,
} from '@/lib/me-api';
import { aggregateListeningInsights, narvoTrack, type ListeningTrendBar } from '@/lib/narvo-analytics';
import { useListeningHistoryRealtime } from '@/hooks/useListeningHistoryRealtime';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';
import { NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function StatTile({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
      className="relative overflow-hidden rounded-[20px] border border-narvo-ink/10 bg-[var(--bg-card)]/90 p-4 shadow-[0_8px_28px_-12px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/40 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.4)] sm:p-5"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-narvo-teal/[0.08] dark:bg-narvo-mint/[0.06]"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-narvo-ink/45 dark:text-white/40">
            {label}
          </p>
          <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-narvo-ink dark:text-white sm:text-[1.65rem]">
            {value}
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-narvo-teal/15 bg-narvo-teal/10 p-2.5 text-narvo-teal dark:border-narvo-mint/25 dark:bg-narvo-mint/10 dark:text-narvo-mint">
          {icon}
        </span>
      </div>
    </motion.div>
  );
}

function ListeningTrendChart({ bars }: { bars: ListeningTrendBar[] }) {
  const peak = useMemo(() => Math.max(1, ...bars.map((b) => b.count)), [bars]);
  const maxIdx = useMemo(() => {
    let m = 0;
    bars.forEach((b, i) => {
      if (b.count > bars[m]!.count) m = i;
    });
    return m;
  }, [bars]);

  return (
    <div className="mt-4">
      <div className="flex h-[100px] items-end justify-between gap-1 sm:h-[112px] sm:gap-1.5">
        {bars.map((b, i) => {
          const ratio = peak > 0 ? b.count / peak : 0;
          const h = Math.max(6, Math.round(ratio * 88));
          const isPeak = i === maxIdx && b.count > 0;
          return (
            <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <div
                className={`mx-auto w-full max-w-[36px] rounded-t-[10px] transition-all sm:max-w-[44px] ${
                  isPeak
                    ? 'bg-gradient-to-t from-narvo-vermilion to-narvo-vermilion/80 shadow-md shadow-narvo-vermilion/20'
                    : 'bg-narvo-teal/70 dark:bg-narvo-mint/50'
                }`}
                style={{ height: `${h}px` }}
                title={`${b.label}: ${b.count} ${b.count === 1 ? 'play' : 'plays'}`}
              />
              <span className="mt-2 w-full truncate text-center font-mono text-[8px] font-bold uppercase tracking-wider text-narvo-ink/38 dark:text-white/32 sm:text-[9px]">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryRow({
  row,
  index,
  onRemove,
  removing,
}: {
  row: ListeningHistoryRow;
  index: number;
  onRemove: (id: string | undefined) => void;
  removing: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.03, 0.36) }}
      className="group border-b border-narvo-ink/[0.06] last:border-b-0 dark:border-white/[0.06]"
    >
      <div className="flex min-h-[56px] items-stretch gap-1 sm:min-h-[60px]">
        <Link
          href={`/news/${row.track_id ?? ''}`}
          className="flex min-w-0 flex-1 items-center gap-3 px-1 py-3 pr-2 sm:px-2 sm:py-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-narvo-ink/8 bg-narvo-mist/50 text-narvo-teal dark:border-white/10 dark:bg-white/[0.06] dark:text-narvo-mint">
            <Headphones size={18} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug text-narvo-ink line-clamp-2 dark:text-white sm:text-sm sm:line-clamp-1">
              {row.title || 'Untitled story'}
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wide text-narvo-ink/42 dark:text-white/35">
              {row.source} · {row.category}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="font-mono text-[10px] text-narvo-ink/45 dark:text-white/38">
              {formatFeedTimeLabel(row.played_at ?? undefined)}
            </span>
            <ChevronRight
              size={16}
              className="text-narvo-ink/25 opacity-0 transition-opacity group-hover:opacity-100 dark:text-white/25"
              aria-hidden
            />
          </div>
        </Link>
        {row.id ? (
          <div className="flex items-center pr-1 sm:pr-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void onRemove(row.id);
              }}
              disabled={removing}
              aria-label={COPY.insights_remove_entry_a11y}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-narvo-ink/40 transition-colors hover:bg-narvo-vermilion/10 hover:text-narvo-vermilion disabled:opacity-40 dark:text-white/35 dark:hover:text-narvo-vermilion"
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>
    </motion.li>
  );
}

export default function InsightsPage() {
  const authBridge = useNarvoAuthBridge();
  const [rows, setRows] = useState<ListeningHistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hasMeAuth()) {
      setRows([]);
      setErr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await getMyListeningHistory(100);
      setRows(r);
      setErr(null);
    } catch (e) {
      setRows([]);
      setErr(e instanceof Error ? e.message : COPY.insights_load_failed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useListeningHistoryRealtime(load, hasMeAuth());

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && hasMeAuth()) void load();
    };
    const onToken = () => void load();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onToken);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onToken);
    };
  }, [load]);

  const aggregate = useMemo(() => (rows.length > 0 ? aggregateListeningInsights(rows) : null), [rows]);

  useEffect(() => {
    if (!hasMeAuth() || loading || err || !aggregate || rows.length === 0) return;
    narvoTrack('insights_view', {
      streak_days: aggregate.streakDays,
      minutes_listened: aggregate.minutesListened,
      stories_completed: aggregate.storiesCompleted,
      plays: rows.length,
    });
  }, [aggregate, err, loading, rows.length]);

  const handleClear = async () => {
    if (!hasMeAuth()) return;
    if (typeof window !== 'undefined' && !window.confirm(COPY.insights_clear_confirm)) return;
    setClearing(true);
    try {
      await clearMyListeningHistory();
      await load();
    } catch {
      /* non-fatal */
    } finally {
      setClearing(false);
    }
  };

  const handleRemoveRow = async (id: string | undefined) => {
    if (!id || !hasMeAuth()) return;
    if (typeof window !== 'undefined' && !window.confirm(COPY.insights_remove_confirm_single)) return;
    setRemovingId(id);
    try {
      await deleteMyListeningHistoryEntry(id);
      await load();
    } catch {
      /* meFetch surfaces 401 */
    } finally {
      setRemovingId(null);
    }
  };

  const showOverview =
    authBridge.hydrated && authBridge.hasApiToken && !loading && !err && rows.length > 0 && aggregate;

  const historyShellClass =
    'rounded-[24px] border border-narvo-ink/10 bg-[var(--bg-card)]/95 shadow-[0_16px_48px_-20px_rgba(23,50,74,0.18)] dark:border-white/10 dark:bg-narvo-ink/45 dark:shadow-[0_20px_56px_-18px_rgba(0,0,0,0.5)] overflow-hidden lg:sticky lg:top-24';

  const historyBody = !authBridge.hydrated ? (
    <ListRowSkeleton count={5} />
  ) : !authBridge.hasApiToken ? (
    <div className="px-4 py-10 text-center sm:px-6 sm:py-12">
      <div className="mx-auto max-w-sm space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-narvo-teal/20 bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint/30 dark:bg-narvo-mint/10 dark:text-narvo-mint">
          <Headphones size={28} strokeWidth={2} aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-narvo-ink/60 dark:text-white/55">
          {authBridge.hasSession ? COPY.cloud_sync_paused_body : COPY.insights_sign_in}
        </p>
        <Link
          href="/auth"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-narvo-teal px-6 text-sm font-bold text-white active:scale-[0.98] dark:bg-narvo-mint dark:text-narvo-ink"
        >
          {authBridge.hasSession ? COPY.auth_renew_session_cta : COPY.auth_sign_in}
        </Link>
      </div>
    </div>
  ) : loading ? (
    <ListRowSkeleton count={5} />
  ) : err ? (
    <div className="p-4 sm:p-6">
      <ErrorState message={err} onRetry={load} />
    </div>
  ) : rows.length === 0 ? (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <EmptyState title={COPY.insights_empty_title} description={COPY.insights_empty}>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/listen"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-narvo-ink/12 px-6 text-sm font-bold text-narvo-ink dark:border-white/15 dark:text-white"
          >
            {COPY.insights_back_listen}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-narvo-vermilion px-6 text-sm font-bold text-white shadow-md shadow-narvo-vermilion/25"
          >
            {COPY.landing_cta_start_listening}
          </Link>
        </div>
      </EmptyState>
    </div>
  ) : (
    <ul className="px-2 pb-2 pt-1 sm:px-3 sm:pb-3 sm:pt-2" role="list">
      {rows.map((row, i) => (
        <HistoryRow
          key={`${row.track_id ?? row.id}-${i}`}
          row={row}
          index={i}
          onRemove={handleRemoveRow}
          removing={removingId === row.id}
        />
      ))}
    </ul>
  );

  return (
    <AuthenticatedAppShell header={{ title: COPY.insights_page_title, kicker: COPY.insights_page_kicker }}>
      <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:max-w-[1200px] lg:px-10 lg:py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className={`mb-6 sm:mb-8 ${NARVO_TOOLBAR_RAIL_CLASS} lg:rounded-[28px] lg:p-6 xl:p-8`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="max-w-2xl text-sm leading-relaxed text-narvo-ink/60 dark:text-white/55 sm:text-base">
                {COPY.insights_hero_blurb}
              </p>
            </div>
            {showOverview ? (
              <div className="shrink-0 rounded-full border border-narvo-teal/25 bg-narvo-teal/10 px-4 py-2 dark:border-narvo-mint/30 dark:bg-narvo-mint/10">
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.insights_plays_count.replace('{n}', String(rows.length))}
                </p>
              </div>
            ) : null}
          </div>
        </motion.div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          {/* Overview + analytics */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {showOverview ? (
              <>
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.04 }}
                  className={NARVO_PANEL_MIST_CLASS}
                  aria-labelledby="insights-overview-heading"
                >
                  <div className="mb-5 flex items-center gap-2 sm:mb-6">
                    <Activity className="text-narvo-teal dark:text-narvo-mint" size={20} aria-hidden />
                    <h2
                      id="insights-overview-heading"
                      className="font-serif text-lg font-semibold text-narvo-ink dark:text-white"
                    >
                      {COPY.insights_section_overview}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <StatTile
                      icon={<Flame size={18} />}
                      label={COPY.insights_stat_streak}
                      value={`${aggregate!.streakDays}d`}
                      delay={0}
                    />
                    <StatTile
                      icon={<Clock size={18} />}
                      label={COPY.insights_stat_time}
                      value={`${aggregate!.minutesListened}m`}
                      delay={0.03}
                    />
                    <StatTile
                      icon={<BookOpen size={18} />}
                      label={COPY.insights_stat_stories}
                      value={String(aggregate!.storiesCompleted)}
                      delay={0.06}
                    />
                    <StatTile
                      icon={<Music size={18} />}
                      label={COPY.insights_stat_sources}
                      value={String(aggregate!.uniqueSources)}
                      delay={0.09}
                    />
                    <div className="sm:col-span-2">
                      <StatTile
                        icon={<TrendingUp size={18} />}
                        label={COPY.insights_stat_top_category}
                        value={aggregate!.topCategory}
                        delay={0.12}
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-[22px] border border-narvo-teal/15 bg-gradient-to-br from-narvo-teal/[0.07] to-narvo-mist/30 p-4 dark:border-narvo-mint/20 dark:from-narvo-teal/[0.12] dark:to-narvo-ink/30 sm:p-5">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={16} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint">
                        {COPY.insights_trend_heading}
                      </p>
                    </div>
                    <ListeningTrendChart bars={aggregate!.trend7} />
                  </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.08 }}
                  className="rounded-[28px] border border-narvo-ink/10 bg-white/85 p-6 dark:border-white/10 dark:bg-narvo-ink/40 sm:p-8"
                  aria-labelledby="insights-analytics-heading"
                >
                  <div className="flex gap-3">
                    <BarChart2 size={22} className="mt-0.5 shrink-0 text-narvo-vermilion" aria-hidden />
                    <div>
                      <h2
                        id="insights-analytics-heading"
                        className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/50 dark:text-white/45"
                      >
                        {COPY.insights_analytics_heading}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-narvo-ink/65 dark:text-white/55">
                        {COPY.insights_analytics_note}
                      </p>
                    </div>
                  </div>
                </motion.section>
              </>
            ) : null}
          </div>

          {/* History */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.06 }}
            className={`lg:col-span-5 ${historyShellClass}`}
            aria-labelledby="insights-history-heading"
          >
            <div className="flex items-center justify-between gap-3 border-b border-narvo-ink/[0.08] px-4 py-4 dark:border-white/[0.08] sm:px-5 sm:py-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal/15 text-narvo-teal dark:bg-narvo-mint/15 dark:text-narvo-mint">
                  <BarChart2 size={20} strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2
                    id="insights-history-heading"
                    className="font-serif text-base font-semibold text-narvo-ink dark:text-white sm:text-lg"
                  >
                    {COPY.insights_history_heading}
                  </h2>
                  {rows.length > 0 && authBridge.hasApiToken ? (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-narvo-ink/40 dark:text-white/35">
                      {COPY.insights_plays_count.replace('{n}', String(rows.length))}
                    </p>
                  ) : null}
                </div>
              </div>
              {rows.length > 0 && authBridge.hasApiToken && !loading && !err ? (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={clearing}
                  className="shrink-0 rounded-full border border-narvo-vermilion/35 px-3 py-2 text-[11px] font-bold text-narvo-vermilion transition-colors hover:bg-narvo-vermilion/10 disabled:opacity-40 dark:text-narvo-butter"
                >
                  {clearing ? COPY.status_loading : COPY.insights_clear}
                </button>
              ) : null}
            </div>
            {historyBody}
          </motion.section>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
