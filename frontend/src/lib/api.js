/**
 * Central API client for backend calls.
 * Single source for REACT_APP_BACKEND_URL; use api.get / api.post instead of raw fetch.
 * Attaches Supabase session (Bearer) when available so backend can identify the user.
 */

import logger from './logger';
import { supabase } from './supabase';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

if (typeof window !== 'undefined' && !API_BASE && process.env.NODE_ENV === 'development') {
  logger.warn('[api] REACT_APP_BACKEND_URL is not set; backend requests will fail or target relative URLs.');
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

/**
 * GET request to the backend. Returns the fetch Response (caller should check res.ok and res.json()).
 * @param {string} path - Path without leading slash, e.g. 'api/health' or 'api/settings/123'
 * @param {RequestInit} [options] - Optional fetch options (headers, etc.)
 * @returns {Promise<Response>}
 */
export async function get(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  return fetch(url, { ...options, headers: { ...auth, ...options.headers } });
}

/**
 * POST request with JSON body. Returns the fetch Response.
 * @param {string} path - Path without leading slash
 * @param {object} body - Object to send as JSON
 * @param {RequestInit} [options] - Optional fetch options (merged with Content-Type and body)
 * @returns {Promise<Response>}
 */
export async function post(path, body, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth, ...options.headers },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * PUT request with JSON body. Returns the fetch Response. Use for full updates.
 * @param {string} path - Path without leading slash
 * @param {object} body - Object to send as JSON
 * @param {RequestInit} [options] - Optional fetch options
 * @returns {Promise<Response>}
 */
export async function put(path, body, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  return fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth, ...options.headers },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * DELETE request. Returns the fetch Response.
 * @param {string} path - Path without leading slash (query string allowed)
 * @param {RequestInit} [options] - Optional fetch options
 * @returns {Promise<Response>}
 */
export async function del(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
  const auth = await getAuthHeaders();
  return fetch(url, { method: 'DELETE', ...options, headers: { ...auth, ...options.headers } });
}

/** Base URL for the backend (no trailing slash). Use for building share/og URLs. */
export { API_BASE };
