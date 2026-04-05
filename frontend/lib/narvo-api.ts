/**
 * Narvo FastAPI client (browser). Set NEXT_PUBLIC_NARVO_API_URL (e.g. http://127.0.0.1:8000).
 */

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

export async function fetchNewsList(params?: {
  limit?: number;
  region?: string;
  category?: string;
  includeAggregators?: boolean;
}): Promise<ApiNewsListItem[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.region) q.set('region', params.region);
  if (params?.category) q.set('category', params.category);
  if (params?.includeAggregators) q.set('include_aggregators', 'true');
  const qs = q.toString();
  return apiFetch<ApiNewsListItem[]>(`/api/news${qs ? `?${qs}` : ''}`);
}

export async function fetchBreakingNews(): Promise<ApiNewsListItem[]> {
  try {
    const data = await apiFetch<ApiNewsListItem[] | null>('/api/news/breaking');
    return Array.isArray(data) ? data : [];
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
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Briefing request failed ${res.status}`, res.status);
  }
  return res.json() as Promise<ApiBriefingLatest>;
}

export function pickAudioUrlFromDetail(detail: ApiNewsDetail): string | undefined {
  const map = detail.audio_by_lang;
  if (map && typeof map === 'object') {
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
