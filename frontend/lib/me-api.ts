/**
 * Authenticated /api/me/* client. Sends `Authorization: Bearer` when
 * `narvo-session` has stored a Supabase access token (set after real auth).
 */

import { getNarvoApiBase, NarvoApiError } from '@/lib/narvo-api';
import { getNarvoAccessToken, setNarvoAccessToken } from '@/lib/narvo-session';
import type { NarvoPreferences } from '@/lib/narvo-session';

function meHeaders(json = false): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (json) h['Content-Type'] = 'application/json';
  const t = getNarvoAccessToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function meFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getNarvoApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...meHeaders(init?.body != null),
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Stale/expired JWT, wrong project secret, or backend without SUPABASE_JWT_SECRET — drop token so we
      // stop calling /api/me/* until the user signs in again (avoids repeated 401s, e.g. library double-load).
      setNarvoAccessToken(null);
    }
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Request failed ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function hasMeAuth(): boolean {
  return Boolean(getNarvoAccessToken());
}

/** Best-effort: touch `/api/me/preferences` so the backend can upsert/read `user_preferences` after sign-in. */
export async function warmMePreferencesAfterAuth(): Promise<void> {
  if (!getNarvoAccessToken()) return;
  try {
    await meFetch<Record<string, unknown>>('/api/me/preferences');
  } catch {
    /* Missing SUPABASE_JWT_SECRET, network, etc. — auth still valid in the browser */
  }
}

/** Map onboarding prefs to backend UserPreferences shape. */
export function preferencesPayloadFromOnboarding(p: NarvoPreferences): Record<string, unknown> {
  return {
    voice_id: p.voice || 'nova',
    interests: p.interests ?? [],
    categories: p.interests ?? [],
    region: p.language || 'lagos',
  };
}

export async function putMyPreferences(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return meFetch<Record<string, unknown>>('/api/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function postOfflineArticleRemote(payload: {
  story_id: string;
  title: string;
  summary?: string;
  narrative?: string;
  source?: string;
  category?: string;
  image_url?: string | null;
}): Promise<unknown> {
  return meFetch('/api/me/offline', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type RemoteOfflineArticle = {
  story_id: string;
  title: string;
  summary?: string;
  narrative?: string;
  source?: string;
  category?: string;
  image_url?: string | null;
  saved_at?: string;
};

export async function getMyPreferences(): Promise<Record<string, unknown>> {
  return meFetch<Record<string, unknown>>('/api/me/preferences');
}

export async function getMyOfflineArticles(): Promise<RemoteOfflineArticle[]> {
  const data = await meFetch<RemoteOfflineArticle[] | unknown>('/api/me/offline');
  return Array.isArray(data) ? data : [];
}

export async function deleteMyOfflineArticle(storyId: string): Promise<unknown> {
  return meFetch(`/api/me/offline/${encodeURIComponent(storyId)}`, { method: 'DELETE' });
}

export async function clearMyOfflineRemote(): Promise<{ deleted_count?: number }> {
  return meFetch<{ deleted_count?: number }>('/api/me/offline', { method: 'DELETE' });
}

export type ListeningHistoryRow = {
  id?: string;
  track_id?: string | null;
  title?: string | null;
  source?: string | null;
  category?: string | null;
  duration?: number | null;
  played_at?: string | null;
};

export async function getMyListeningHistory(limit = 40): Promise<ListeningHistoryRow[]> {
  const data = await meFetch<ListeningHistoryRow[] | unknown>(`/api/me/history?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function clearMyListeningHistory(): Promise<{ status?: string }> {
  return meFetch<{ status?: string }>('/api/me/history', { method: 'DELETE' });
}

export type MeSubscriptionResponse = {
  tier: string;
  status: string;
  subscription: Record<string, unknown> | null;
};

export async function getMySubscription(): Promise<MeSubscriptionResponse> {
  return meFetch<MeSubscriptionResponse>('/api/me/subscription');
}

export async function postSubscriptionCheckout(priceId?: string): Promise<{ url: string }> {
  return meFetch<{ url: string }>('/api/me/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({ price_id: priceId ?? null }),
  });
}

export async function postBillingPortal(): Promise<{ url: string }> {
  return meFetch<{ url: string }>('/api/me/subscription/portal', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Best-effort: push prefs after onboarding when JWT is present. Ignores failures.
 */
export async function syncPreferencesIfAuthed(p: NarvoPreferences): Promise<void> {
  if (!hasMeAuth()) return;
  try {
    await putMyPreferences(preferencesPayloadFromOnboarding(p));
  } catch {
    /* non-fatal until Supabase sign-in is primary */
  }
}
