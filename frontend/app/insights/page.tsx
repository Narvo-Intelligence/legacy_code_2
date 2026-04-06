'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel } from '@/lib/narvo-api';
import {
  hasMeAuth,
  getMyListeningHistory,
  clearMyListeningHistory,
  type ListeningHistoryRow,
} from '@/lib/me-api';

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

  const storyHref = (h: ListeningHistoryRow): string | null => {
    const tid = (h.track_id || '').trim();
    if (!tid || tid === 'briefing-pending' || tid.startsWith('briefing-')) return null;
    return `/news/${encodeURIComponent(tid)}`;
  };

  const authed = hasMeAuth();

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.insights_page_title,
        kicker: COPY.insights_page_kicker,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full space-y-6">
        {authed && rows.length > 0 ? (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={clearing}
              onClick={() => void handleClear()}
              className="min-h-[44px] rounded-full border border-narvo-ink/15 dark:border-white/15 px-4 text-sm font-bold text-narvo-ink dark:text-white disabled:opacity-45"
            >
              {clearing ? COPY.status_loading : COPY.insights_clear}
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-center text-sm text-narvo-ink/50 dark:text-white/45">{COPY.status_loading}</p>
        ) : err ? (
          <ErrorState message={err} onRetry={() => void load()} />
        ) : !authed ? (
          <EmptyState
            icon={BarChart2}
            title={COPY.insights_page_kicker}
            description={COPY.insights_sign_in}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart2} title="No history yet" description={COPY.insights_empty} />
        ) : (
          <ul className="space-y-3">
            {rows.map((h) => {
              const href = storyHref(h);
              const title = (h.title || 'Untitled listen').trim();
              const played = h.played_at ? formatFeedTimeLabel(h.played_at) : '—';
              const inner = (
                <>
                  <p className="font-medium text-narvo-ink dark:text-white truncate">{title}</p>
                  <p className="text-xs font-mono text-narvo-ink/45 dark:text-white/40 mt-1">
                    {played}
                    {h.category ? ` · ${h.category}` : ''}
                  </p>
                </>
              );
              return (
                <li key={h.id || `${String(h.track_id)}-${String(h.played_at)}`}>
                  {href ? (
                    <Link
                      href={href}
                      className="block rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 hover:border-narvo-teal/30"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/30 dark:bg-white/[0.04] p-4">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AuthenticatedAppShell>
  );
}
