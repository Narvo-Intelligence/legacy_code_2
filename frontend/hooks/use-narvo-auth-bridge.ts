'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAuthSession,
  getNarvoAccessToken,
  NARVO_ACCESS_TOKEN_CHANGED,
  NARVO_AUTH_HYDRATED,
} from '@/lib/narvo-session';

export type NarvoAuthBridge = {
  /** First paint after bootstrap: avoid false "sign in" banners. */
  hydrated: boolean;
  /** Narvo profile cookie/localStorage (middleware gate). */
  hasSession: boolean;
  /** JWT for `/api/me/*`. */
  hasApiToken: boolean;
};

function readBridge(): Pick<NarvoAuthBridge, 'hasSession' | 'hasApiToken'> {
  return {
    hasSession: getAuthSession() !== null,
    hasApiToken: Boolean(getNarvoAccessToken()),
  };
}

/**
 * Distinguishes **app session** (demo cookie + `narvo-auth`) from **API JWT** (in-memory cache from Supabase).
 * Use for UX copy; keep `hasMeAuth()` from `me-api` for actual fetch guards.
 */
export function useNarvoAuthBridge(): NarvoAuthBridge {
  const [hydrated, setHydrated] = useState(false);
  const [{ hasSession, hasApiToken }, setFlags] = useState(readBridge);

  const sync = useCallback(() => {
    setFlags(readBridge());
  }, []);

  useEffect(() => {
    sync();
    const onSession = () => sync();
    const onToken = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'narvo-auth') sync();
    };
    const onHydrated = () => setHydrated(true);

    window.addEventListener('narvo-auth-changed', onSession);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onToken);
    window.addEventListener('storage', onStorage);
    window.addEventListener(NARVO_AUTH_HYDRATED, onHydrated);

    return () => {
      window.removeEventListener('narvo-auth-changed', onSession);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onToken);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(NARVO_AUTH_HYDRATED, onHydrated);
    };
  }, [sync]);

  return { hydrated, hasSession, hasApiToken };
}
