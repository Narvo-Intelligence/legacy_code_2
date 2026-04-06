'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { clearAuthSession, setNarvoAccessToken } from '@/lib/narvo-session';
import { narvoTrack } from '@/lib/narvo-analytics';

/** Sync Supabase JWT into local storage for `/api/me/*`, and optional analytics boot. */
export function NarvoClientBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    const supa = getSupabaseBrowser();
    if (!supa) return;
    void supa.auth.getSession().then(({ data: { session } }) => {
      // Only persist when both are present — some auth callbacks omit `access_token` briefly; writing
      // `null` used to clear a valid JWT and produce `/api/me/*` 401s.
      if (session?.access_token && session.user) {
        applySupabaseSession(session);
      }
    });
    const {
      data: { subscription },
    } = supa.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setNarvoAccessToken(null);
        clearAuthSession();
        return;
      }
      if (session?.access_token && session.user) {
        applySupabaseSession(session);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    narvoTrack('route_view', { path: pathname });
  }, [pathname]);

  return null;
}
