import logger from './logger';

const STORAGE_VERSION = 1;

type StoredPayload<T> = {
  __v: number;
  data: T;
};

function isStoredPayload<T>(value: unknown): value is StoredPayload<T> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.__v === 'number' && 'data' in record;
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isStoredPayload<T>(parsed)) return parsed.data ?? fallback;
    return parsed as T;
  } catch (err) {
    logger.debug(`[storage] Failed to parse JSON for ${key}`, err);
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredPayload<T> = { __v: STORAGE_VERSION, data: value };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    logger.debug(`[storage] Failed to write JSON for ${key}`, err);
  }
}

export function mergeJson<T extends Record<string, unknown>>(key: string, patch: Partial<T>, fallback: T): T {
  const existing = readJson<T>(key, fallback);
  const merged = { ...existing, ...patch };
  writeJson(key, merged);
  return merged;
}

export function readString(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (err) {
    logger.debug(`[storage] Failed to read string for ${key}`, err);
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    logger.debug(`[storage] Failed to write string for ${key}`, err);
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    logger.debug(`[storage] Failed to remove key ${key}`, err);
  }
}

