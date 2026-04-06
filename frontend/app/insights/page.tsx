'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Clock, BookOpen, TrendingUp, Flame, Music, Activity, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel } from '@/lib/narvo-api';
import {
  hasMeAuth,
  getMyListeningHistory,
  clearMyListeningHistory,
  deleteMyListeningHistoryEntry,
  type ListeningHistoryRow,
} from '@/lib/me-api';
import { aggregateListeningInsights, narvoTrack, type ListeningTrendBar } from '@/lib/narvo-analytics';
import { useListeningHistoryRealtime } from '@/hooks/useListeningHistoryRealtime';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function StatTile({
  icon,
  label,
  value,
  dense,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dense?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] lg:rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 ${
        dense ? 'p-4 lg:p-5' : 'p-5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-narvo-teal dark:text-narvo-mint">{icon}</span>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">
          {label}
        </p>
      </div>
      <p className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-narvo-ink dark:text-white tracking-tight">
        {value}
      </p>
    </div>
  );
}

function ListeningTrendChart({ bars }: { bars: ListeningTrendBar[] }) {
  const peak = useMemo(() => Math.max(1, ...bars.map((b) => b.count)), [bars]);
  return (
    <div className="mt-3 lg:mt-4">
      <div className="flex items-end justify-between gap-1 lg:gap-1.5 h-[88px] lg:h-[112px]">
        {bars.map((b) => {
          const ratio = peak > 0 ? b.count / peak : 0;
          const hMobile = Math.max(4, Math.round(ratio * 72));
          const hDesktop = Math.max(6, Math.round(ratio * 92));
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <div
                className="w-full max-w-[28px] lg:max-w-[40px] mx-auto rounded-t-md bg-narvo-teal/75 dark:bg-narvo-mint/55 lg:bg-[#ACB6FF]/88 lg:dark:bg-[#8B98F0]/50 transition-all lg:hidden"
                style={{ height: `${hMobile}px` }}
                title={`${b.count} plays`}
              />
              <div
                className="hidden lg:block w-full max-w-[40px] mx-auto rounded-t-md bg-[#ACB6FF]/88 dark:bg-[#8B98F0]/50 transition-all"
                style={{ height: `${hDesktop}px` }}
                title={`${b.count} plays`}
              />
              <span className="mt-1 lg:mt-1.5 font-mono text-[8px] lg:text-[9px] text-narvo-ink/40 dark:text-white/35 truncate w-full text-center">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InsightsPage() {
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
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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

  const statsBlock =
    !loading && !err && rows.length > 0 && aggregate ? (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="space-y-3 sm:space-y-4"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
          <StatTile dense icon={<Flame size={16} />} label="Streak" value={`${aggregate.streakDays}d`} />
          <StatTile dense icon={<Clock size={16} />} label="Time listened" value={`${aggregate.minutesListened}m`} />
          <StatTile
            dense
            icon={<BookOpen size={16} />}
            label="Stories completed"
            value={String(aggregate.storiesCompleted)}
          />
          <StatTile dense icon={<Music size={16} />} label="Sources explored" value={String(aggregate.uniqueSources)} />
          <StatTile dense icon={<TrendingUp size={16} />} label="Top category" value={aggregate.topCategory} />
        </div>
        <div className="rounded-[18px] lg:rounded-[22px] border border-narvo-teal/20 dark:border-narvo-teal/25 bg-narvo-teal/[0.07] dark:bg-narvo-teal/[0.12] p-4 sm:p-5 lg:p-6 lg:border-[#ACB6FF]/25 lg:bg-gradient-to-br lg:from-[#ACB6FF]/[0.08] lg:to-narvo-teal/[0.06] dark:lg:from-[#ACB6FF]/[0.12] dark:lg:to-narvo-teal/[0.1]">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-narvo-teal dark:text-narvo-mint lg:text-[#8B98F0] shrink-0" aria-hidden />
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint lg:text-[#ACB6FF]">
              {COPY.insights_trend_heading}
            </p>
          </div>
          <ListeningTrendChart bars={aggregate.trend7} />
        </div>
      </motion.div>
    ) : null;

  const analyticsBlock =
    !loading && !err && rows.length > 0 && aggregate ? (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.04 }}
        className="rounded-[20px] lg:rounded-[22px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-4 sm:p-5 lg:p-6 lg:border-narvo-teal/15"
      >
        <div className="flex items-start gap-3">
          <BarChart2 size={18} className="text-narvo-teal dark:text-narvo-mint shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
              {COPY.insights_analytics_heading}
            </p>
            <p className="text-sm text-narvo-ink/60 dark:text-white/55 mt-2 leading-relaxed">{COPY.insights_analytics_note}</p>
          </div>
        </div>
      </motion.section>
    ) : null;

  const historyHeader = (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-4 border-b border-narvo-ink/[0.06] dark:border-white/[0.06]">
      <div className="flex items-center gap-2">
        <BarChart2 size={16} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
          {COPY.insights_history_heading}
        </p>
      </div>
      {rows.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={clearing}
          className="text-[11px] font-bold text-narvo-ink/40 dark:text-white/35 hover:text-narvo-vermilion transition-colors disabled:opacity-40"
        >
          {clearing ? 'Clearing…' : COPY.insights_clear}
        </button>
      )}
    </div>
  );

  const historyBody = (
    <div className="p-4 lg:p-5">
      {!hasMeAuth() ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-narvo-ink/55 dark:text-white/50">{COPY.insights_sign_in}</p>
          <Link
            href="/auth"
            className="inline-block rounded-full bg-narvo-teal px-5 py-2.5 text-sm font-bold text-white"
          >
            {COPY.auth_sign_in}
          </Link>
        </div>
      ) : loading ? (
        <ListRowSkeleton count={5} />
      ) : err ? (
        <ErrorState message={err} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="No plays yet" description={COPY.insights_empty} />
      ) : (
        <div className="space-y-1 lg:space-y-0.5">
          {rows.map((row, i) => (
            <motion.div
              key={`${row.track_id ?? row.id}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="group flex items-stretch gap-0 rounded-[16px] lg:rounded-[14px] border border-transparent lg:border-0 hover:border-narvo-ink/[0.06] dark:hover:border-white/[0.08] lg:hover:bg-narvo-ink/[0.03] dark:lg:hover:bg-white/[0.04] transition-colors"
            >
              <Link
                href={`/news/${row.track_id ?? ''}`}
                className="min-w-0 flex-1 flex items-center justify-between gap-3 px-3 py-3.5 lg:py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-narvo-ink dark:text-white line-clamp-2 lg:line-clamp-1 group-hover:text-narvo-teal dark:group-hover:text-narvo-mint transition-colors">
                    {row.title || 'Untitled story'}
                  </p>
                  <p className="font-mono text-[10px] text-narvo-ink/40 dark:text-white/35 mt-0.5 truncate uppercase tracking-wide">
                    {row.source} · {row.category}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-narvo-ink/30 dark:text-white/25 self-start mt-0.5">
                  {formatFeedTimeLabel(row.played_at ?? undefined)}
                </span>
              </Link>
              {row.id ? (
                <div className="flex items-center pr-2 lg:pr-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void handleRemoveRow(row.id);
                    }}
                    disabled={removingId === row.id}
                    aria-label={COPY.insights_remove_entry_a11y}
                    className="shrink-0 rounded-full p-2.5 lg:p-2 text-narvo-ink/35 hover:text-narvo-vermilion hover:bg-narvo-vermilion/10 dark:text-white/30 dark:hover:text-narvo-vermilion transition-colors disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                  >
                    <Trash2 size={18} className="lg:w-[17px] lg:h-[17px]" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AuthenticatedAppShell header={{ title: COPY.insights_page_title, kicker: COPY.insights_page_kicker }}>
      <div className="max-w-3xl lg:max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start space-y-5 lg:space-y-0">
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            {statsBlock}
            {analyticsBlock}
          </div>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.06 }}
            className="lg:col-span-5 rounded-[22px] lg:rounded-[24px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 overflow-hidden lg:sticky lg:top-24 lg:shadow-[0_12px_40px_rgba(23,50,74,0.06)] dark:lg:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          >
            {historyHeader}
            {historyBody}
          </motion.section>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
