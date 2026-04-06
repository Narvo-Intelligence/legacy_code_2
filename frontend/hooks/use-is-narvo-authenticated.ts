'use client';

import { useEffect, useState } from 'react';
import { getAuthSession } from '@/lib/narvo-session';

/**
 * True when a Narvo auth session exists (localStorage + demo cookie set at sign-in).
 * Updates on same-tab sign-in/out via `narvo-auth-changed` and across tabs via `storage`.
 */
export function useIsNarvoAuthenticated(): boolean {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const sync = () => setAuthenticated(getAuthSession() !== null);
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('narvo-auth-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('narvo-auth-changed', sync);
    };
  }, []);

  return authenticated;
}
