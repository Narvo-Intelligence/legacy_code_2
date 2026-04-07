'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { clearAuthSession, NARVO_AUTH_HYDRATED, setNarvoAccessToken } from '@/lib/narvo-session';
import { narvoTrack } from '@/lib/narvo-analytics';

/** Sync Supabase JWT into local storage for `/api/me/*`, and optional analytics boot. */
export function NarvoClientBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    const emitHydrated = () => {
      window.dispatchEvent(new Event(NARVO_AUTH_HYDRATED));
    };

    const supa = getSupabaseBrowser();
    if (!supa) {
      window.setTimeout(emitHydrated, 200);
      return;
    }

    void supa.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.access_token && session.user) {
          applySupabaseSession(session);
        }
      })
      .finally(() => {
        emitHydrated();
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
