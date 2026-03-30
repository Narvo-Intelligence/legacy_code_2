/**
 * Central API client for backend calls.
 * Single source for VITE_BACKEND_URL; use api.get / api.post instead of raw fetch.
 * Attaches Supabase session (Bearer) when available so backend can identify the user.
 * Includes timeout (10s) and exponential-backoff retries for 502/503/504 and network errors.
 */

import type { ApiRequestOptions } from '../types/api';
import logger from './logger';
import { supabase } from './supabase';

const API_BASE: string = import.meta.env.VITE_BACKEND_URL || '';
/** Optional: Supabase Edge Function URL for news (regional caching / Nigerian edge). When set, GET api/news uses this. */
const EDGE_NEWS_URL: string = import.meta.env.VITE_EDGE_NEWS_URL || '';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const DEFAULT_DEDUPE_MS = 2000;

const inflightGets = new Map<string, { promise: Promise<Response>; expires: number }>();

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  if (!API_BASE) {
    logger.warn('[api] VITE_BACKEND_URL is not set — relative /api/* requests will be proxied to localhost:8000 by Vite. Set VITE_BACKEND_URL=http://localhost:8000 in .env.local to be explicit.');
  } else if (API_BASE.includes('api.narvo.news')) {
    logger.warn('[api] VITE_BACKEND_URL points to production (api.narvo.news) — this causes CORS errors from localhost. Set VITE_BACKEND_URL=http://localhost:8000 in .env.local.');
  }
}

interface RetryOpts {
  timeout?: number;
  retries?: number;
}

/** Backend base URL (for SW and cached digest). */
export function getBackendUrl(): string {
  return API_BASE || '';
}

/** Store backend URL in cache for Service Worker (Offline Daily Digest). Call once on app load. */
export async function storeBackendUrlForSW(): Promise<void> {
  const url = getBackendUrl();
  if (typeof window === 'undefined' || !url || !('caches' in window)) return;
  try {
    const cache = await caches.open('narvo-config');
    await cache.put(new Request(window.location.origin + '/.narvo-backend'), new Response(url));
  } catch (err) {
    logger.debug('[api] Failed to store backend URL for SW', err);
  }
}

/** Read Daily Digest from cache (populated by SW sync). Returns stories array or null. */
export async function getCachedDigest(): Promise<unknown> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  const base = getBackendUrl().replace(/\/$/, '');
  if (!base) return null;
  try {
    const cache = await caches.open('narvo-digest');
    const res = await cache.match(base + '/api/news?limit=5');
    if (!res || !res.ok) return null;
    return res.json();
  } catch (err) {
    logger.debug('[api] Failed to read cached digest', err);
    return null;
  }
}

const SESSION_CACHE_TTL_MS = 200;
let sessionCache: { token: string; expires: number } | null = null;

/** Resolve auth headers from current Supabase session (for backend auth when enabled). Short-lived in-memory cache to avoid repeated getSession() when multiple API calls run in quick succession. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    if (!supabase) return headers;
    const now = Date.now();
    if (sessionCache && sessionCache.expires > now) {
      headers.Authorization = `Bearer ${sessionCache.token}`;
      return headers;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      sessionCache = { token: session.access_token, expires: now + SESSION_CACHE_TTL_MS };
      headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      sessionCache = null;
    }
  } catch (err) {
    logger.debug('[api] Failed to resolve auth headers', err);
    sessionCache = null;
    // Silence errors to allow public/guest fetching to continue
  }
  return headers;
}

function isRetryableResponse(res: Response): boolean {
  return res != null && (res.status === 502 || res.status === 503 || res.status === 504);
}

function isRetryableError(err: unknown): boolean {
  return err instanceof TypeError && (err as Error).message?.includes('fetch') === true;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOpts = {}
): Promise<Response> {
  const timeoutMs = opts.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? MAX_RETRIES;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const initWithSignal = { ...init, signal: controller.signal };
    try {
      const res = await fetch(url, initWithSignal);
      clearTimeout(timeoutId);
      const shouldRetry = attempt < maxRetries && (isRetryableResponse(res) || (res.status === 429 && res.headers.get('Retry-After')));
      if (!shouldRetry) return res;
      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await new Promise(r => setTimeout(r, delay));
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const shouldRetry = attempt < maxRetries && ((err as Error)?.name === 'AbortError' || isRetryableError(err));
      if (!shouldRetry) throw err;
      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function logTiming(method: string, url: string, durationMs: number): void {
  logger.debug(`[api] ${method} ${url} ${Math.round(durationMs)}ms`);
}

async function dedupeGet(
  key: string,
  fetcher: () => Promise<Response>,
  dedupeMs: number
): Promise<Response> {
  const now = Date.now();
  const existing = inflightGets.get(key);
  if (existing && existing.expires > now) {
    const res = await existing.promise;
    return res.clone();
  }
  const promise = fetcher().catch((err) => {
    inflightGets.delete(key);
    throw err;
  });
  inflightGets.set(key, { promise, expires: now + dedupeMs });
  setTimeout(() => {
    const current = inflightGets.get(key);
    if (current?.promise === promise) inflightGets.delete(key);
  }, dedupeMs);
  const res = await promise;
  return res.clone();
}

/**
 * GET request to the backend. Returns the fetch Response (caller should check res.ok and res.json()).
 * When VITE_EDGE_NEWS_URL is set and the edge returns a non-OK response, falls back to the main backend.
 */
export async function get(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const normalizedPath = path.replace(/^\//, '');
  let url: string;
  let usedEdge = false;
  if (path.startsWith('http')) {
    url = path;
  } else if (EDGE_NEWS_URL && normalizedPath.startsWith('api/news') && !/^api\/news\/[^/?]+/.test(normalizedPath)) {
    const [, queryPart] = normalizedPath.split('?');
    const q = queryPart ? `?${queryPart}` : '';
    url = `${EDGE_NEWS_URL.replace(/\/$/, '')}${q}`;
    usedEdge = true;
  } else {
    url = `${API_BASE}/${normalizedPath}`;
  }
  const { retries, timeout, dedupeKey, dedupeMs, ...fetchOptions } = options;
  const customHeaders = (fetchOptions.headers as Record<string, string>) || {};
  // Do not send Authorization to the Edge news URL so guest users don't get 401 from Supabase Edge.
  const initEdge = { ...fetchOptions, headers: { ...customHeaders } };
  const initMain = { ...fetchOptions, headers: { ...(await getAuthHeaders()), ...customHeaders } };
  const init = usedEdge ? initEdge : initMain;
  const perform = async (): Promise<Response> => {
    const start = nowMs();
    try {
      let res = await fetchWithRetry(url, init, { retries, timeout });
      if (usedEdge && !res.ok && API_BASE) {
        const mainUrl = `${API_BASE}/${normalizedPath}`;
        res = await fetchWithRetry(mainUrl, initMain, { retries, timeout });
      }
      return res;
    } finally {
      logTiming('GET', url, nowMs() - start);
    }
  };
  const key = dedupeKey ?? `GET:${url}`;
  const windowMs = dedupeMs ?? DEFAULT_DEDUPE_MS;
  if (windowMs > 0) {
    return dedupeGet(key, perform, windowMs);
  }
  return perform();
}

/**
 * POST request with JSON body. Returns the fetch Response.
 */
export async function post(path: string, body: object, options: ApiRequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  const start = nowMs();
  try {
    return await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth, ...(rest.headers as Record<string, string>) },
      body: JSON.stringify(body),
      ...rest,
    }, { retries, timeout });
  } finally {
    logTiming('POST', url, nowMs() - start);
  }
}

/**
 * PUT request with JSON body. Returns the fetch Response.
 */
export async function put(path: string, body: object, options: ApiRequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  const start = nowMs();
  try {
    return await fetchWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth, ...(rest.headers as Record<string, string>) },
      body: JSON.stringify(body),
      ...rest,
    }, { retries, timeout });
  } finally {
    logTiming('PUT', url, nowMs() - start);
  }
}

/**
 * DELETE request. Returns the fetch Response.
 */
export async function del(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  const start = nowMs();
  try {
    return await fetchWithRetry(url, { method: 'DELETE', ...rest, headers: { ...auth, ...(rest.headers as Record<string, string>) } }, { retries, timeout });
  } finally {
    logTiming('DELETE', url, nowMs() - start);
  }
}

export { API_BASE };
