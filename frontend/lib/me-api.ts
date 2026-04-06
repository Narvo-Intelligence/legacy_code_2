/**
 * Authenticated /api/me/* client. Sends `Authorization: Bearer` when
 * `narvo-session` has stored a Supabase access token (set after real auth).
 */

import { getNarvoApiBase, NarvoApiError, type ApiNewsListItem } from '@/lib/narvo-api';
import { getNarvoAccessToken, setNarvoAccessToken } from '@/lib/narvo-session';
import type { NarvoPreferences } from '@/lib/narvo-session';
import {
  onboardingRowForLangId,
  type OnboardingLangRow,
} from '@/lib/onboarding-narrators';
import { getNarvoNotificationsEnabled, registerNarvoServiceWorker } from '@/lib/narvo-notifications';

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

function rowForPrefs(p: NarvoPreferences): OnboardingLangRow | undefined {
  return onboardingRowForLangId(p.language) ?? onboardingRowForLangId('en');
}

/** Map onboarding prefs to backend `user_preferences` row. */
export function preferencesPayloadFromOnboarding(
  p: NarvoPreferences,
  notificationsEnabled: boolean
): Record<string, unknown> {
  const row = rowForPrefs(p);
  const voiceId = row?.yarnVoiceId || p.voice || 'emma';
  return {
    voice_id: voiceId,
    interests: p.interests ?? [],
    categories: p.interests ?? [],
    region: 'lagos',
    notifications_enabled: notificationsEnabled,
  };
}

/** Map onboarding prefs to `user_preferences.settings` JSON (via `/api/me/settings`). */
export function settingsPayloadFromOnboarding(p: NarvoPreferences): Record<string, unknown> {
  const row = rowForPrefs(p);
  return {
    broadcast_language: row?.broadcastCode ?? 'en',
    voice_model: row?.yarnVoiceId ?? p.voice ?? 'emma',
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

export async function putMySettings(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return meFetch<Record<string, unknown>>('/api/me/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function postMyPushSubscription(payload: Record<string, unknown>): Promise<unknown> {
  return meFetch('/api/me/push', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Subscribe this browser to Web Push and persist on the server (needs NEXT_PUBLIC_VAPID_PUBLIC_KEY + JWT).
 */
export async function subscribeNarvoWebPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !hasMeAuth()) return false;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid || !('PushManager' in window)) return false;
  try {
    const reg = await registerNarvoServiceWorker();
    if (!reg) return false;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      }));
    const json = sub.toJSON() as Record<string, unknown>;
    await postMyPushSubscription(json);
    return true;
  } catch {
    return false;
  }
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

export async function getMySettings(): Promise<Record<string, unknown>> {
  return meFetch<Record<string, unknown>>('/api/me/settings');
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

export type MeBookmarkRow = {
  story_id: string;
  title?: string;
  summary?: string;
  source?: string;
  category?: string;
  source_url?: string;
  saved_at?: string;
};

export async function getMyBookmarks(): Promise<MeBookmarkRow[]> {
  if (!hasMeAuth()) return [];
  try {
    const data = await meFetch<MeBookmarkRow[] | unknown>('/api/me/bookmarks');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function addMyBookmark(payload: {
  story_id: string;
  title: string;
  summary?: string;
  source?: string;
  category?: string;
  source_url?: string;
}): Promise<void> {
  await meFetch('/api/me/bookmarks', {
    method: 'POST',
    body: JSON.stringify({
      story_id: payload.story_id,
      title: payload.title,
      summary: payload.summary ?? '',
      source: payload.source ?? '',
      category: payload.category ?? 'General',
      source_url: payload.source_url ?? '',
    }),
  });
}

export async function removeMyBookmark(storyId: string): Promise<void> {
  await meFetch(`/api/me/bookmarks/${encodeURIComponent(storyId)}`, { method: 'DELETE' });
}

/** GET /api/me/recommendations — personalized feed rows (JWT). */
export async function fetchMyRecommendations(limit = 16): Promise<ApiNewsListItem[]> {
  if (!hasMeAuth()) return [];
  const clamped = Math.min(40, Math.max(1, Math.floor(limit)));
  try {
    const data = await meFetch<unknown>(`/api/me/recommendations?limit=${clamped}`);
    return Array.isArray(data) ? (data as ApiNewsListItem[]) : [];
  } catch {
    return [];
  }
}

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
 * Best-effort: sync onboarding choices to Postgres (`user_preferences` + settings JSON) when JWT is present.
 */
export async function syncOnboardingRemote(
  p: NarvoPreferences,
  notificationsEnabled: boolean
): Promise<void> {
  if (!hasMeAuth()) return;
  try {
    await putMyPreferences(preferencesPayloadFromOnboarding(p, notificationsEnabled));
    await putMySettings(settingsPayloadFromOnboarding(p));
  } catch {
    /* offline / 401 / misconfigured API */
  }
}

/** Preferences + settings only (e.g. after changing topics in app). Keeps current notification flag. */
export async function syncPreferencesIfAuthed(p: NarvoPreferences): Promise<void> {
  const n = typeof window !== 'undefined' && getNarvoNotificationsEnabled();
  await syncOnboardingRemote(p, n);
}
