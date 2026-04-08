'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { clearAuthSession, NARVO_AUTH_HYDRATED } from '@/lib/narvo-session';
import { narvoTrack } from '@/lib/narvo-analytics';

/** Sync Supabase session into Narvo profile cookie + in-memory JWT cache; optional analytics boot. */
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

    try {
      localStorage.removeItem('narvo-supabase-access-token');
    } catch {
      /* ignore */
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
