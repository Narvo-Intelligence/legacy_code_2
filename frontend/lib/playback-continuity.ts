const STORAGE_KEY = 'narvo-playback-continuity';

/** Plain JSON snapshot — mirrors `Track` from AudioPlayerContext (no circular import). */
export type PersistedTrack = {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
};

export type PersistedPlayback = {
  track: PersistedTrack;
  progressRatio: number;
  updatedAt: number;
};

function safeParse(raw: string | null): PersistedPlayback | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PersistedPlayback;
    if (!v || typeof v !== 'object') return null;
    const t = v.track;
    if (!t?.id || typeof t.id !== 'string') return null;
    if (typeof v.progressRatio !== 'number' || !Number.isFinite(v.progressRatio)) return null;
    const r = Math.min(1, Math.max(0, v.progressRatio));
    if (r < 0.02 || r > 0.96) return null;
    return { ...v, track: t, progressRatio: r };
  } catch {
    return null;
  }
}

export function readPersistedPlayback(): PersistedPlayback | null {
  if (typeof window === 'undefined') return null;
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function writePersistedPlayback(data: PersistedPlayback): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedPlayback(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
