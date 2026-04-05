/**
 * Authenticated /api/me/* client. Sends `Authorization: Bearer` when
 * `narvo-session` has stored a Supabase access token (set after real auth).
 */

import { getNarvoApiBase, NarvoApiError } from '@/lib/narvo-api';
import { getNarvoAccessToken } from '@/lib/narvo-session';
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
    const text = await res.text().catch(() => '');
    throw new NarvoApiError(text || `Request failed ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function hasMeAuth(): boolean {
  return Boolean(getNarvoAccessToken());
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
