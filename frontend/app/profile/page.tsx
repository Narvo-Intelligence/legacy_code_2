'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Headphones, Library, Settings2, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { CloudFeatureGateBanner } from '@/components/CloudFeatureGateBanner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel } from '@/lib/narvo-api';
import {
  getMyProfile,
  hasMeAuth,
  type MeProfileResponse,
  type ListeningHistoryRow,
} from '@/lib/me-api';
import { getAuthSession, NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';
import { NARVO_PANEL_MIST_CLASS } from '@/lib/narvo-ui-classes';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function historyItemHref(row: ListeningHistoryRow): string | null {
  const tid = row.track_id?.trim();
  if (!tid) return null;
  if (tid === 'briefing-pending' || tid.startsWith('briefing-')) return '/briefing';
  if ((row.category || '').toUpperCase() === 'BRIEFING') return '/briefing';
  return `/news/${encodeURIComponent(tid)}`;
}

function formatHistoryDuration(sec: number | null | undefined): string | undefined {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return undefined;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-narvo-ink/10 bg-[var(--bg-card)]/80 px-4 py-3 dark:border-white/10 dark:bg-narvo-ink/40">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">
        {label}
      </p>
      <p className="mt-1 font-serif text-xl font-semibold text-narvo-ink dark:text-white">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const session = getAuthSession();
  const [profile, setProfile] = useState<MeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hasMeAuth()) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await getMyProfile(24);
      setProfile(p);
    } catch {
      setError(COPY.profile_load_error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onTok = () => void load();
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    return () => window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && hasMeAuth()) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  useUserTableRealtime('user_preferences', () => void load(), hasMeAuth());
  useUserTableRealtime('listening_history', () => void load(), hasMeAuth());
  useUserTableRealtime('bookmarks', () => void load(), hasMeAuth());
  useUserTableRealtime('offline_articles', () => void load(), hasMeAuth());

  const initial =
    (session?.name?.trim()?.[0] || session?.email?.trim()?.[0] || '?').toUpperCase();

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.profile_page_title,
        kicker: COPY.profile_page_kicker,
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-none lg:px-8 lg:py-10 xl:px-10">
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-narvo-ink/55 dark:text-white/50">
          {COPY.profile_intro}
        </p>

        <CloudFeatureGateBanner className="mb-6" />

        <div className={`${NARVO_PANEL_MIST_CLASS} mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-narvo-teal/15 text-xl font-bold text-narvo-teal dark:bg-narvo-mint/15 dark:text-narvo-mint"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            {session?.name ? (
              <p className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">{session.name}</p>
            ) : null}
            {session?.email ? (
              <p className="text-sm text-narvo-ink/65 dark:text-white/60">{session.email}</p>
            ) : (
              <p className="text-sm text-narvo-ink/65 dark:text-white/60">—</p>
            )}
            {profile?.user_id ? (
              <p className="mt-2 break-all font-mono text-[11px] text-narvo-ink/45 dark:text-white/40">
                <span className="font-bold uppercase tracking-wider text-narvo-teal/80 dark:text-narvo-mint/70">
                  {COPY.profile_user_id_label}:{' '}
                </span>
                {profile.user_id}
              </p>
            ) : null}
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load()} className="mb-6" /> : null}

        {loading ? (
          <div className="space-y-3">
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        ) : profile && hasMeAuth() ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CountPill label={COPY.profile_counts_bookmarks} value={profile.counts.bookmarks} />
              <CountPill label={COPY.profile_counts_listening} value={profile.counts.listening_plays} />
              <CountPill label={COPY.profile_counts_offline} value={profile.counts.offline_articles} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Link
                href="/settings"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-narvo-teal/30 px-4 text-sm font-bold text-narvo-teal dark:border-narvo-mint/40 dark:text-narvo-mint"
              >
                <Settings2 className="h-4 w-4" aria-hidden />
                {COPY.profile_edit_settings}
              </Link>
              <Link
                href="/insights"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-narvo-ink/15 px-4 text-sm font-bold text-narvo-ink/80 dark:border-white/20 dark:text-white/80"
              >
                <BarChart3 className="h-4 w-4" aria-hidden />
                {COPY.profile_view_insights}
              </Link>
              <Link
                href="/library"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-narvo-ink/15 px-4 text-sm font-bold text-narvo-ink/80 dark:border-white/20 dark:text-white/80"
              >
                <Library className="h-4 w-4" aria-hidden />
                {COPY.profile_view_library}
              </Link>
            </div>

            <section className="mb-10 rounded-[22px] border border-narvo-ink/10 bg-[var(--bg-card)]/90 p-5 dark:border-white/10 dark:bg-narvo-ink/40">
              <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">
                {COPY.profile_preferences_heading}
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_region_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.preferences.region ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_voice_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.settings.voice_model ?? profile.preferences.voice_id ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_playback_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.preferences.playback_speed != null
                      ? `${profile.preferences.playback_speed}×`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_language_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.settings.broadcast_language ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_theme_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.settings.theme ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.profile_reading_scope_label}
                  </dt>
                  <dd className="mt-1 text-sm text-narvo-ink dark:text-white">
                    {profile.settings.reading_scope ?? '—'}
                  </dd>
                </div>
              </dl>
              <div className="mt-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.profile_topics_label}
                </p>
                {profile.preferences.topics.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {profile.preferences.topics.map((t) => (
                      <li
                        key={t}
                        className="rounded-full border border-narvo-ink/10 bg-narvo-mist/40 px-3 py-1 text-xs font-semibold text-narvo-ink dark:border-white/15 dark:bg-white/5 dark:text-white/90"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-narvo-ink/55 dark:text-white/50">
                    {COPY.profile_topics_empty}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-narvo-ink dark:text-white">
                <Headphones className="h-5 w-5 text-narvo-teal dark:text-narvo-mint" aria-hidden />
                {COPY.profile_history_heading}
              </h2>
              {!profile.listening_history.length ? (
                <EmptyState
                  icon={Headphones}
                  title={COPY.profile_history_empty_title}
                  description={COPY.profile_empty_history}
                />
              ) : (
                <ul className="space-y-2">
                  {profile.listening_history.map((row, i) => {
                    const href = historyItemHref(row);
                    const timeLabel = row.played_at ? formatFeedTimeLabel(row.played_at) : '—';
                    const dur = formatHistoryDuration(row.duration);
                    const inner = (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-narvo-ink dark:text-white">
                            {row.title?.trim() || 'Untitled'}
                          </p>
                          <p className="truncate text-xs text-narvo-ink/50 dark:text-white/45">
                            {[row.source, row.category, timeLabel, dur].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-narvo-ink/35 dark:text-white/35" aria-hidden />
                      </div>
                    );
                    const className =
                      'flex w-full items-center gap-3 rounded-2xl border border-narvo-ink/10 bg-[var(--bg-card)]/80 px-4 py-3 text-left transition-colors hover:border-narvo-teal/25 dark:border-white/10 dark:bg-narvo-ink/35 dark:hover:border-narvo-mint/25';
                    return (
                      <motion.li
                        key={row.id || `${row.track_id}-${i}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SPRING, delay: i * 0.02 }}
                      >
                        {href ? (
                          <Link href={href} className={className}>
                            {inner}
                          </Link>
                        ) : (
                          <div className={className}>{inner}</div>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AuthenticatedAppShell>
  );
}
