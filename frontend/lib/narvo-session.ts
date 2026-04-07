/**
 * Client-side MVP session until real auth (Supabase, etc.) is wired.
 * Middleware gates /dashboard and /onboarding using the demo cookie.
 */

const AUTH_KEY = 'narvo-auth';
const ONBOARDING_KEY = 'narvo-onboarding-complete';
const PREFS_KEY = 'narvo-preferences';
/** Supabase `session.access_token` — enables `/api/me/*` when backend verifies JWT. */
const ACCESS_TOKEN_KEY = 'narvo-supabase-access-token';
const DEMO_COOKIE = 'narvo_demo_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Fired when `narvo-supabase-access-token` changes — re-sync components that gate on JWT vs session. */
export const NARVO_ACCESS_TOKEN_CHANGED = 'narvo-access-token-changed';

/** First client auth bootstrap finished (`getSession` or no-Supabase timeout). */
export const NARVO_AUTH_HYDRATED = 'narvo-auth-hydrated';

function notifyAuthListeners() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('narvo-auth-changed'));
}

function notifyAccessTokenListeners() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NARVO_ACCESS_TOKEN_CHANGED));
}

export type NarvoAuthSession = {
  email: string;
  name?: string;
  createdAt: string;
};

export type NarvoPreferences = {
  language: string;
  voice: string;
  /** YarnGPT / API voice id when chosen from Settings (optional). */
  voice_id?: string;
  interests: string[];
};

function setDemoCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearDemoCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
}

export function getAuthSession(): NarvoAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NarvoAuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: NarvoAuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  setDemoCookie();
  notifyAuthListeners();
}

export function clearAuthSession() {
  setNarvoAccessToken(null);
  localStorage.removeItem(AUTH_KEY);
  clearDemoCookie();
  notifyAuthListeners();
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function setOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function savePreferences(p: NarvoPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('narvo-preferences-changed'));
  }
}

export function loadPreferences(): NarvoPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NarvoPreferences;
  } catch {
    return null;
  }
}

export function getNarvoAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
  return t || null;
}

export function setNarvoAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  const prev = localStorage.getItem(ACCESS_TOKEN_KEY);
  const next = token?.trim() ? token.trim() : null;
  if (next) localStorage.setItem(ACCESS_TOKEN_KEY, next);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
  const after = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (prev !== after) notifyAccessTokenListeners();
}
