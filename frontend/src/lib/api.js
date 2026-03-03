/**
 * Central API client for backend calls.
 * Single source for VITE_BACKEND_URL; use api.get / api.post instead of raw fetch.
 * Attaches Supabase session (Bearer) when available so backend can identify the user.
 * Includes timeout (10s) and exponential-backoff retries for 502/503/504 and network errors.
 */

import logger from './logger';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

if (typeof window !== 'undefined' && !API_BASE && import.meta.env.DEV) {
  logger.warn('[api] VITE_BACKEND_URL is not set; backend requests will fail or target relative URLs.');
}

/** Resolve auth headers from current Supabase session (for backend auth when enabled). */
async function getAuthHeaders() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (_) {}
  return headers;
}

function isRetryableResponse(res) {
  return res && (res.status === 502 || res.status === 503 || res.status === 504);
}

function isRetryableError(err) {
  return err instanceof TypeError && err.message?.includes('fetch');
}

/**
 * Fetch with timeout and optional exponential-backoff retries for 502/503/504 and network errors.
 * @param {string} url - Full URL
 * @param {RequestInit} init - Fetch init (method, headers, body, etc.)
 * @param {{ timeout?: number, retries?: number }} [opts] - timeout ms (default 10s), retries (default 3)
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, init, opts = {}) {
  const timeoutMs = opts.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? MAX_RETRIES;
  let lastError;
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
      const shouldRetry = attempt < maxRetries && (err.name === 'AbortError' || isRetryableError(err));
      if (!shouldRetry) throw err;
      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * GET request to the backend. Returns the fetch Response (caller should check res.ok and res.json()).
 * Uses 10s timeout and retries on 502/503/504 and network errors.
 * @param {string} path - Path without leading slash, e.g. 'api/health' or 'api/settings/123'
 * @param {RequestInit} [options] - Optional fetch options (headers, signal, etc.). Pass { retries: 0 } to disable retries.
 * @returns {Promise<Response>}
 */
export async function get(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...fetchOptions } = options;
  return fetchWithRetry(url, { ...fetchOptions, headers: { ...auth, ...fetchOptions.headers } }, { retries, timeout });
}

/**
 * POST request with JSON body. Returns the fetch Response.
 * Uses 10s timeout and retries on 502/503/504 and network errors.
 * @param {string} path - Path without leading slash
 * @param {object} body - Object to send as JSON
 * @param {RequestInit} [options] - Optional fetch options (merged with Content-Type and body). Pass { retries: 0 } to disable retries.
 * @returns {Promise<Response>}
 */
export async function post(path, body, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  return fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth, ...rest.headers },
    body: JSON.stringify(body),
    ...rest,
  }, { retries, timeout });
}

/**
 * PUT request with JSON body. Returns the fetch Response. Use for full updates.
 * @param {string} path - Path without leading slash
 * @param {object} body - Object to send as JSON
 * @param {RequestInit} [options] - Optional fetch options (retries/timeout supported)
 * @returns {Promise<Response>}
 */
export async function put(path, body, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  return fetchWithRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth, ...rest.headers },
    body: JSON.stringify(body),
    ...rest,
  }, { retries, timeout });
}

/**
 * DELETE request. Returns the fetch Response.
 * @param {string} path - Path without leading slash (query string allowed)
 * @param {RequestInit} [options] - Optional fetch options (retries/timeout supported)
 * @returns {Promise<Response>}
 */
export async function del(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  const { retries, timeout, ...rest } = options;
  return fetchWithRetry(url, { method: 'DELETE', ...rest, headers: { ...auth, ...rest.headers } }, { retries, timeout });
}

/** Base URL for the backend (no trailing slash). Use for building share/og URLs. */
export { API_BASE };
