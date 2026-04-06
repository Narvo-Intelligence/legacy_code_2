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
      setNarvoAccessToken(session?.access_token ?? null);
      if (session?.user) applySupabaseSession(session);
    });
    const {
      data: { subscription },
    } = supa.auth.onAuthStateChange((event, session) => {
      setNarvoAccessToken(session?.access_token ?? null);
      if (event === 'SIGNED_OUT') {
        clearAuthSession();
        return;
      }
      if (session?.user) applySupabaseSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    narvoTrack('route_view', { path: pathname });
  }, [pathname]);

  return null;
}
