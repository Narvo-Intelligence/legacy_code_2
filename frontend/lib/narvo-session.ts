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

function notifyAuthListeners() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('narvo-auth-changed'));
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
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
  if (token?.trim()) localStorage.setItem(ACCESS_TOKEN_KEY, token.trim());
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}
