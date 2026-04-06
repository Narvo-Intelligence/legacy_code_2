'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Clock, BookOpen, TrendingUp, Flame, Music, Activity } from 'lucide-react';
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
  type ListeningHistoryRow,
} from '@/lib/me-api';
import { aggregateListeningInsights, narvoTrack, type ListeningTrendBar } from '@/lib/narvo-analytics';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-narvo-teal dark:text-narvo-mint">{icon}</span>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">
          {label}
        </p>
      </div>
      <p className="font-serif text-2xl sm:text-3xl font-semibold text-narvo-ink dark:text-white tracking-tight">
        {value}
      </p>
    </div>
  );
}

function ListeningTrendChart({ bars }: { bars: ListeningTrendBar[] }) {
  const peak = useMemo(() => Math.max(1, ...bars.map((b) => b.count)), [bars]);
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-1.5 h-[104px]">
        {bars.map((b) => {
          const hPx = peak > 0 ? Math.round((b.count / peak) * 88) : 0;
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <div
                className="w-full max-w-[36px] mx-auto rounded-t-md bg-narvo-teal/75 dark:bg-narvo-mint/55 transition-all"
                style={{ height: `${Math.max(4, hPx)}px` }}
                title={`${b.count} plays`}
              />
              <span className="mt-1.5 font-mono text-[9px] text-narvo-ink/40 dark:text-white/35 truncate w-full text-center">
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

  const load = useCallback(async () => {
    if (!hasMeAuth()) {
      setRows([]);
      setErr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await getMyListeningHistory(50);
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

  return (
    <AuthenticatedAppShell header={{ title: COPY.insights_page_title, kicker: COPY.insights_page_kicker }}>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {!loading && !err && rows.length > 0 && aggregate ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="space-y-3 sm:space-y-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatTile icon={<Flame size={16} />} label="Streak" value={`${aggregate.streakDays}d`} />
              <StatTile icon={<Clock size={16} />} label="Time listened" value={`${aggregate.minutesListened}m`} />
              <StatTile icon={<BookOpen size={16} />} label="Stories completed" value={String(aggregate.storiesCompleted)} />
              <StatTile icon={<Music size={16} />} label="Sources explored" value={String(aggregate.uniqueSources)} />
              <StatTile icon={<TrendingUp size={16} />} label="Top category" value={aggregate.topCategory} />
            </div>
            <div className="rounded-[20px] border border-narvo-teal/20 dark:border-narvo-teal/25 bg-narvo-teal/[0.07] dark:bg-narvo-teal/[0.12] p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  Listening trend (7 days)
                </p>
              </div>
              <ListeningTrendChart bars={aggregate.trend7} />
            </div>
          </motion.div>
        ) : null}

        {!loading && !err && rows.length > 0 && aggregate ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.04 }}
            className="rounded-[24px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <BarChart2 size={18} className="text-narvo-teal dark:text-narvo-mint shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  Analytics
                </p>
                <p className="text-sm text-narvo-ink/60 dark:text-white/55 mt-2 leading-relaxed">{COPY.insights_analytics_note}</p>
                <p className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/30 mt-3">
                  Enable <span className="text-narvo-teal/80">NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED=true</span> to log insight
                  views in development.
                </p>
              </div>
            </div>
          </motion.section>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.06 }}
          className="rounded-[24px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-narvo-ink/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                Listening history
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

          <div className="p-5">
            {!hasMeAuth() ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-narvo-ink/55 dark:text-white/50">{COPY.insights_sign_in}</p>
                <Link
                  href="/auth"
                  className="inline-block rounded-full bg-narvo-teal px-5 py-2.5 text-sm font-bold text-white"
                >
                  Sign in
                </Link>
              </div>
            ) : loading ? (
              <ListRowSkeleton count={5} />
            ) : err ? (
              <ErrorState message={err} onRetry={load} />
            ) : rows.length === 0 ? (
              <EmptyState title="No plays yet" description={COPY.insights_empty} />
            ) : (
              <div className="space-y-1">
                {rows.map((row, i) => (
                  <motion.div
                    key={`${row.track_id ?? row.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Link
                      href={`/news/${row.track_id ?? ''}`}
                      className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-3 hover:bg-narvo-ink/[0.04] dark:hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-narvo-ink dark:text-white line-clamp-1 group-hover:text-narvo-teal dark:group-hover:text-narvo-mint transition-colors">
                          {row.title || 'Untitled story'}
                        </p>
                        <p className="font-mono text-[10px] text-narvo-ink/40 dark:text-white/35 mt-0.5 truncate uppercase tracking-wide">
                          {row.source} · {row.category}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-narvo-ink/30 dark:text-white/25">
                        {formatFeedTimeLabel(row.played_at ?? undefined)}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </AuthenticatedAppShell>
  );
}
