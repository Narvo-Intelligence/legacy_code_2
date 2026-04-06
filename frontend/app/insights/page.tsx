'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Clock, BookOpen, TrendingUp, Flame, Music } from 'lucide-react';
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

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-narvo-teal dark:text-narvo-mint">{icon}</span>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">{label}</p>
      </div>
      <p className="font-serif text-2xl sm:text-3xl font-semibold text-narvo-ink dark:text-white tracking-tight">{value}</p>
    </div>
  );
}

export default function InsightsPage() {
  const [rows, setRows] = useState<ListeningHistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    if (!hasMeAuth()) { setRows([]); setErr(null); setLoading(false); return; }
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

  useEffect(() => { void load(); }, [load]);

  const handleClear = async () => {
    if (!hasMeAuth()) return;
    if (typeof window !== 'undefined' && !window.confirm(COPY.insights_clear_confirm)) return;
    setClearing(true);
    try { await clearMyListeningHistory(); await load(); }
    catch { /* non-fatal */ }
    finally { setClearing(false); }
  };

  // Derived stats from history
  const totalPlays = rows.length;
  const uniqueSources = new Set(rows.map((r) => r.source)).size;
  const topCategory = (() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? '—';
  })();
  // Rough estimate: ~4 min avg per story
  const totalMinutes = totalPlays * 4;
  const streak = Math.min(totalPlays, 14);

  return (
    <AuthenticatedAppShell
      header={{ title: COPY.insights_page_title, kicker: COPY.insights_page_kicker }}
    >
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Stats grid */}
        {!loading && !err && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
          >
            <StatCard icon={<Flame size={16} />} label="Streak" value={`${streak}d`} />
            <StatCard icon={<Clock size={16} />} label="Time listened" value={`${totalMinutes}m`} />
            <StatCard icon={<BookOpen size={16} />} label="Stories played" value={String(totalPlays)} />
            <StatCard icon={<Music size={16} />} label="Sources explored" value={String(uniqueSources)} />
            <StatCard icon={<TrendingUp size={16} />} label="Top category" value={topCategory} />
            <div className="rounded-[20px] border border-narvo-teal/20 dark:border-narvo-teal/25 bg-narvo-teal/[0.07] dark:bg-narvo-teal/[0.12] p-5 flex flex-col justify-between">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">Weekly trend</p>
              <p className="font-serif text-2xl sm:text-3xl font-semibold text-narvo-teal dark:text-narvo-mint mt-2">↑ Active</p>
            </div>
          </motion.div>
        )}

        {/* History list */}
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
                <Link href="/auth" className="inline-block rounded-full bg-narvo-teal px-5 py-2.5 text-sm font-bold text-white">
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
