/**
 * Lightweight analytics (doc 08 §7.8). Enable with
 * `NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED=true` — logs in dev; extend with Mixpanel etc. when product wires scripts.
 *
 * Landing (`app/page.tsx`) events when enabled: `landing_cta_nav_play`, `landing_cta_hero_start_listening`,
 * `landing_cta_hero_try_first`, `landing_cta_prefooter_start_listening`, `landing_cta_prefooter_voice_sample`.
 */
import type { ListeningHistoryRow } from '@/lib/me-api';

export function narvoTrack(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED !== 'true') return;
  if (process.env.NODE_ENV === 'development') {
    console.info('[narvo analytics]', event, props ?? {});
  }
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar days (local) that have at least one logged play. */
export function buildListeningDaySet(rows: ListeningHistoryRow[]): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r.played_at) continue;
    const t = new Date(r.played_at);
    if (Number.isNaN(t.getTime())) continue;
    set.add(localDayKey(t));
  }
  return set;
}

/**
 * Consecutive local days with listening, counting backward from today (streak breaks if today has no play).
 */
export function computeListeningStreakDays(rows: ListeningHistoryRow[]): number {
  const daySet = buildListeningDaySet(rows);
  if (daySet.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const key = localDayKey(cursor);
    if (daySet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export type ListeningTrendBar = { key: string; label: string; count: number };

/** Play counts per day for the last `n` local days (oldest → newest). */
export function listeningTrendLastNDays(rows: ListeningHistoryRow[], n: number): ListeningTrendBar[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.played_at) continue;
    const t = new Date(r.played_at);
    if (Number.isNaN(t.getTime())) continue;
    const k = localDayKey(t);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const out: ListeningTrendBar[] = [];
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    out.push({ key, label, count: counts.get(key) || 0 });
  }
  return out;
}

export type ListeningInsightsAggregate = {
  streakDays: number;
  minutesListened: number;
  storiesCompleted: number;
  uniqueSources: number;
  topCategory: string;
  trend7: ListeningTrendBar[];
};

/**
 * Derive Insights surfaces from `/api/me/history` rows. Duration is treated as seconds when present.
 */
export function aggregateListeningInsights(
  rows: ListeningHistoryRow[],
  opts?: { avgStoryMinutesWhenMissing?: number }
): ListeningInsightsAggregate {
  const avgMin = opts?.avgStoryMinutesWhenMissing ?? 4;
  let seconds = 0;
  for (const r of rows) {
    const d = r.duration;
    if (d != null && d > 0) seconds += d;
    else seconds += avgMin * 60;
  }
  const minutesListened = Math.max(0, Math.round(seconds / 60));

  const byCat: Record<string, number> = {};
  rows.forEach((r) => {
    const c = (r.category || '').trim() || '—';
    byCat[c] = (byCat[c] || 0) + 1;
  });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0]?.[0] ?? '—';

  const distinctTracks = new Set(rows.map((r) => r.track_id).filter(Boolean));
  const storiesCompleted = distinctTracks.size > 0 ? distinctTracks.size : rows.length;

  return {
    streakDays: computeListeningStreakDays(rows),
    minutesListened,
    storiesCompleted,
    uniqueSources: new Set(rows.map((r) => r.source).filter(Boolean)).size,
    topCategory,
    trend7: listeningTrendLastNDays(rows, 7),
  };
}
