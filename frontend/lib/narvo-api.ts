/**
 * Narvo FastAPI client (browser). Set NEXT_PUBLIC_NARVO_API_URL (e.g. http://127.0.0.1:8000).
 */

import { getNarvoAccessToken } from '@/lib/narvo-session';

export class NarvoApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'NarvoApiError';
  }
}

/**
 * API base: prefer NEXT_PUBLIC_NARVO_API_URL, then legacy NEXT_PUBLIC_BACKEND_URL / VITE_BACKEND_URL.
 */
export function getNarvoApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_NARVO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.VITE_BACKEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://127.0.0.1:8000';
}

/** Optional Supabase JWT — personalizes `/api/briefing/*` rows when present. */
export function briefingAuthHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (json) h['Content-Type'] = 'application/json';
  const t = typeof window !== 'undefined' ? getNarvoAccessToken() : null;
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getNarvoApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Request failed ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** Item shape from GET /api/news (RSS + optional aggregators). */
export type ApiNewsListItem = {
  id: string;
  title?: string;
  summary?: string;
  short_summary?: string;
  source?: string;
  category?: string;
  published?: string;
  region?: string;
  source_url?: string;
  image_url?: string;
  trust_score?: number;
  truth_tags?: string[];
  truth_explanation?: string;
  [key: string]: unknown;
};

export type ApiNewsDetail = ApiNewsListItem & {
  narrative?: string;
  key_takeaways?: string[];
  sources_used?: string[];
  truth_explanation?: string;
  audio_by_lang?: Record<string, string>;
  from_saved?: boolean;
};

export type ApiBriefingLatest = {
  id: string;
  date: string;
  title?: string;
  generated_at?: string;
  duration_estimate?: string;
  audio_url?: string | null;
  script?: string | null;
  voice_id?: string;
  stories?: {
    id?: string;
    title?: string;
    summary?: string;
    source?: string;
    category?: string;
  }[];
  story_segments?: { start_char: number; length: number }[];
};

/** Stable HTMLAudio / player `track.id` for a briefing (dashboard, briefing, listen). */
export function briefingPlayerTrackId(
  b: Pick<ApiBriefingLatest, 'id' | 'date'> | null | undefined
): string {
  if (!b) return 'briefing-pending';
  const raw = (b.id || '').trim();
  if (raw) return raw;
  const date = (b.date || '').trim();
  if (date) return `briefing-${date}`;
  return 'briefing-latest';
}

/** Matches FastAPI `GET /api/news` — `limit: Query(..., le=50)`. */
export const NEWS_LIST_MAX_LIMIT = 50;
/** Must stay in sync with FastAPI `skip` upper bound so offset pagination cannot get stuck repeating the same slice. */
export const NEWS_LIST_MAX_SKIP = 5000;

/** GET /api/tts/voices — YarnGPT narrator profiles (id, name, accent, language, …). */
export type ApiVoiceProfile = {
  id: string;
  name?: string;
  accent?: string;
  language?: string;
  gender?: string;
  description?: string;
};

/** POST /api/tts/generate — YarnGPT primary, fallbacks per backend. */
export type ApiTtsGenerateResponse = {
  audio_url: string;
  text: string;
  translated_text?: string | null;
  voice_id: string;
  language?: string;
};

/** Public voice profiles from GET /api/tts/voices (canonical) or legacy /api/voices. */
export async function fetchTtsVoices(): Promise<ApiVoiceProfile[]> {
  const base = getNarvoApiBase();
  for (const path of ['/api/tts/voices', '/api/voices']) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) return [];
      return data.map((row) => {
        const r = row as Record<string, unknown>;
        const id = String(r.id ?? r.voice_id ?? '').trim();
        return {
          id,
          name: typeof r.name === 'string' ? r.name : undefined,
          accent: typeof r.accent === 'string' ? r.accent : undefined,
          language: typeof r.language === 'string' ? r.language : undefined,
          gender: typeof r.gender === 'string' ? r.gender : undefined,
          description: typeof r.description === 'string' ? r.description : undefined,
        };
      }).filter((v) => v.id.length > 0);
    } catch {
      /* try next */
    }
  }
  return [];
}

/**
 * Landing voice sheet — uses backend `landing_preview` (fixed script, translated per voice language).
 * @see `TTSRequest.landing_preview` in backend `routes/tts.py`.
 */
export async function postTtsLandingPreview(voiceId: string): Promise<ApiTtsGenerateResponse> {
  const url = `${getNarvoApiBase()}/api/tts/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      landing_preview: true,
      voice_id: voiceId.trim() || 'emma',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `TTS request failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiTtsGenerateResponse>;
}

export async function fetchNewsList(params?: {
  limit?: number;
  /** Server-side offset into the sorted, deduped feed (for infinite scroll). */
  skip?: number;
  region?: string;
  category?: string;
  includeAggregators?: boolean;
}): Promise<ApiNewsListItem[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) {
    const clamped = Math.min(NEWS_LIST_MAX_LIMIT, Math.max(1, Math.floor(params.limit)));
    q.set('limit', String(clamped));
  }
  if (params?.skip != null) {
    const s = Math.min(NEWS_LIST_MAX_SKIP, Math.max(0, Math.floor(params.skip)));
    q.set('skip', String(s));
  }
  if (params?.region) q.set('region', params.region);
  if (params?.category) q.set('category', params.category);
  if (params?.includeAggregators) q.set('include_aggregators', 'true');
  const qs = q.toString();
  return apiFetch<ApiNewsListItem[]>(`/api/news${qs ? `?${qs}` : ''}`);
}

/** GET /api/trending — tags/topics from recent news (browse state on Search). */
export type ApiTrendingResponse = {
  tags: string[];
  topics: { name: string; count: string }[];
  updated_at?: string;
};

export async function fetchTrendingTopics(): Promise<ApiTrendingResponse> {
  try {
    return await apiFetch<ApiTrendingResponse>('/api/trending');
  } catch {
    return { tags: [], topics: [], updated_at: undefined };
  }
}

/** Normalise `/api/search` row to list card shape (includes `source_type`, `station` for radio). */
export function mapSearchResultToListItem(row: Record<string, unknown>): ApiNewsListItem {
  const id = String(row.id ?? '').trim();
  return {
    id: id || `unknown-${Math.random().toString(36).slice(2, 11)}`,
    title: typeof row.title === 'string' ? row.title : undefined,
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    short_summary: typeof row.short_summary === 'string' ? row.short_summary : undefined,
    source: typeof row.source === 'string' ? row.source : undefined,
    category: typeof row.category === 'string' ? row.category : undefined,
    published: typeof row.published === 'string' ? row.published : undefined,
    source_url: typeof row.source_url === 'string' ? row.source_url : undefined,
    image_url: typeof row.image_url === 'string' ? row.image_url : undefined,
    trust_score: typeof row.trust_score === 'number' ? row.trust_score : undefined,
    truth_tags: Array.isArray(row.truth_tags) ? (row.truth_tags as string[]) : undefined,
    truth_explanation:
      typeof row.truth_explanation === 'string' ? row.truth_explanation : undefined,
    source_type: row.source_type,
    aggregator: row.aggregator,
    station: row.station,
    region: typeof row.region === 'string' ? row.region : undefined,
  };
}

/**
 * GET /api/search — server-side unified search (RSS, aggregators, podcasts, radio).
 */
export async function searchUnified(params: {
  q: string;
  category?: string;
  source?: string;
  source_type?: string;
  limit?: number;
  skip?: number;
  includeAggregators?: boolean;
  includeRadio?: boolean;
}): Promise<{ results: ApiNewsListItem[]; total: number; query: string }> {
  const q = new URLSearchParams();
  q.set('q', params.q);
  if (params.category?.trim()) q.set('category', params.category.trim());
  if (params.source?.trim()) q.set('source', params.source.trim());
  if (params.source_type?.trim()) q.set('source_type', params.source_type.trim());
  const lim = Math.min(50, Math.max(1, params.limit ?? 30));
  q.set('limit', String(lim));
  q.set('skip', String(Math.max(0, params.skip ?? 0)));
  if (params.includeAggregators === false) q.set('include_aggregators', 'false');
  if (params.includeRadio === false) q.set('include_radio', 'false');
  const data = await apiFetch<{
    results?: unknown[];
    total?: number;
    query?: string;
  }>(`/api/search?${q.toString()}`);
  const raw = Array.isArray(data.results) ? data.results : [];
  const results = raw.map((r) =>
    mapSearchResultToListItem(
      typeof r === 'object' && r != null ? (r as Record<string, unknown>) : {}
    )
  );
  return {
    results,
    total: typeof data.total === 'number' ? data.total : results.length,
    query: typeof data.query === 'string' ? data.query : params.q,
  };
}

export async function fetchBreakingNews(): Promise<ApiNewsListItem[]> {
  try {
    const data = await apiFetch<ApiNewsListItem[] | null>('/api/news/breaking');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** GET /api/news/feed-sources — top sources in the merged feed (dashboard sidebar). */
export type ApiFeedSourceRow = {
  name: string;
  story_count: number;
};

export async function fetchNewsFeedSources(limit = 10): Promise<ApiFeedSourceRow[]> {
  try {
    const clamped = Math.min(30, Math.max(1, Math.floor(limit)));
    const rows = await apiFetch<ApiFeedSourceRow[]>(`/api/news/feed-sources?limit=${clamped}`);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function fetchNewsDetail(
  newsId: string,
  opts?: { language?: string; userId?: string }
): Promise<ApiNewsDetail> {
  const q = new URLSearchParams();
  if (opts?.language) q.set('language', opts.language);
  if (opts?.userId) q.set('user_id', opts.userId);
  const qs = q.toString();
  return apiFetch<ApiNewsDetail>(`/api/news/${encodeURIComponent(newsId)}${qs ? `?${qs}` : ''}`);
}

export async function fetchRelatedNews(newsId: string, limit = 5): Promise<ApiNewsListItem[]> {
  return apiFetch<ApiNewsListItem[]>(
    `/api/news/${encodeURIComponent(newsId)}/related?limit=${limit}`
  );
}

export async function fetchBriefingLatest(): Promise<ApiBriefingLatest | null> {
  const url = `${getNarvoApiBase()}/api/briefing/latest`;
  const res = await fetch(url, { headers: briefingAuthHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing request failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingLatest>;
}

export type ApiBriefingHistoryRow = {
  id: string;
  date: string;
  title?: string;
  generated_at?: string;
  duration_estimate?: string;
  voice_id?: string;
  stories?: ApiBriefingLatest['stories'];
  story_segments?: ApiBriefingLatest['story_segments'];
};

export type ApiBriefingHistoryResponse = {
  briefings: ApiBriefingHistoryRow[];
  total: number;
};

export async function fetchBriefingHistory(
  limit = 14,
  skip = 0
): Promise<ApiBriefingHistoryResponse> {
  const url = `${getNarvoApiBase()}/api/briefing/history?limit=${limit}&skip=${skip}`;
  const res = await fetch(url, { headers: briefingAuthHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing history failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingHistoryResponse>;
}

export async function fetchBriefingByDate(briefingDate: string): Promise<ApiBriefingLatest | null> {
  const enc = encodeURIComponent(briefingDate);
  const url = `${getNarvoApiBase()}/api/briefing/${enc}`;
  const res = await fetch(url, { headers: briefingAuthHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing request failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingLatest>;
}

/** GET /api/briefing/generate — can take a while (LLM + TTS). */
export async function triggerBriefingGenerate(params?: {
  voiceId?: string;
  forceRegenerate?: boolean;
}): Promise<ApiBriefingLatest> {
  const q = new URLSearchParams();
  if (params?.voiceId) q.set('voice_id', params.voiceId);
  if (params?.forceRegenerate) q.set('force_regenerate', 'true');
  const qs = q.toString();
  const url = `${getNarvoApiBase()}/api/briefing/generate${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: briefingAuthHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing generate failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingLatest>;
}

/** POST /api/briefing/generate — same semantics as {@link triggerBriefingGenerate}; use when a JSON body fits better than query params. */
export async function triggerBriefingGeneratePost(params?: {
  voiceId?: string;
  forceRegenerate?: boolean;
}): Promise<ApiBriefingLatest> {
  const res = await fetch(`${getNarvoApiBase()}/api/briefing/generate`, {
    method: 'POST',
    headers: briefingAuthHeaders(true),
    body: JSON.stringify({
      voice_id: params?.voiceId ?? 'emma',
      force_regenerate: Boolean(params?.forceRegenerate),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing generate failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingLatest>;
}

/** POST /api/briefing/audio — synthesise audio for an existing script; updates row when briefingId is set. */
export async function postBriefingAudio(body: {
  script: string;
  voiceId?: string;
  briefingId?: string | null;
}): Promise<{ audio_url: string; voice_id: string }> {
  const res = await fetch(`${getNarvoApiBase()}/api/briefing/audio`, {
    method: 'POST',
    headers: briefingAuthHeaders(true),
    body: JSON.stringify({
      script: body.script,
      voice_id: body.voiceId ?? 'emma',
      briefing_id: body.briefingId ?? null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing audio failed ${res.status}`, res.status);
  }
  return res.json() as Promise<{ audio_url: string; voice_id: string }>;
}

/** DELETE /api/briefing/by-date/{date} — remove signed-in user's row (requires JWT). */
export async function deleteBriefingByDate(briefingDate: string): Promise<void> {
  const enc = encodeURIComponent(briefingDate);
  const res = await fetch(`${getNarvoApiBase()}/api/briefing/by-date/${enc}`, {
    method: 'DELETE',
    headers: briefingAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing delete failed ${res.status}`, res.status);
  }
}

/** Rich preview for WhatsApp / crawlers (HTML + OG). */
export function getSharePageUrlForStory(storyId: string): string {
  return `${getNarvoApiBase()}/api/share/${encodeURIComponent(storyId)}`;
}

/** Raw OG HTML endpoint (same meta family as share). */
export function getOgPageUrlForStory(storyId: string): string {
  return `${getNarvoApiBase()}/api/og/${encodeURIComponent(storyId)}`;
}

export function pickAudioUrlFromDetail(
  detail: ApiNewsDetail,
  preferredLang?: string | null
): string | undefined {
  const map = detail.audio_by_lang;
  if (map && typeof map === 'object') {
    const pref = preferredLang?.trim().toLowerCase();
    if (pref && typeof map[pref] === 'string' && (map[pref] as string).trim()) {
      return (map[pref] as string).trim();
    }
    if (typeof map.en === 'string' && map.en) return map.en;
    const first = Object.values(map).find((v) => typeof v === 'string' && v.length > 0);
    if (first) return first as string;
  }
  return undefined;
}

export function formatFeedTimeLabel(published?: string): string {
  if (!published) return '—';
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
