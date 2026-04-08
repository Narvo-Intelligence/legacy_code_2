'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { clearAuthSession, NARVO_AUTH_HYDRATED } from '@/lib/narvo-session';
import { narvoTrack } from '@/lib/narvo-analytics';
import { flushOfflineCloudSyncQueue } from '@/lib/offline-cloud-sync';
import { syncNarvoServiceWorkerForEnvironment } from '@/lib/narvo-notifications';

/** Sync Supabase session into Narvo profile cookie + in-memory JWT cache; optional analytics boot. */
export function NarvoClientBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    void syncNarvoServiceWorkerForEnvironment();
  }, []);

  useEffect(() => {
    const emitHydrated = () => {
      window.dispatchEvent(new Event(NARVO_AUTH_HYDRATED));
    };
    const flushOfflineCloud = () => {
      void flushOfflineCloudSyncQueue();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') flushOfflineCloud();
    };

    const supa = getSupabaseBrowser();
    if (!supa) {
      flushOfflineCloud();
      window.addEventListener('online', flushOfflineCloud);
      window.addEventListener('narvo-auth-changed', flushOfflineCloud);
      document.addEventListener('visibilitychange', onVisible);
      window.setTimeout(emitHydrated, 200);
      return () => {
        window.removeEventListener('online', flushOfflineCloud);
        window.removeEventListener('narvo-auth-changed', flushOfflineCloud);
        document.removeEventListener('visibilitychange', onVisible);
      };
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
        flushOfflineCloud();
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
        flushOfflineCloud();
      }
    });
    window.addEventListener('online', flushOfflineCloud);
    window.addEventListener('narvo-auth-changed', flushOfflineCloud);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', flushOfflineCloud);
      window.removeEventListener('narvo-auth-changed', flushOfflineCloud);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    narvoTrack('route_view', { path: pathname });
  }, [pathname]);

  return null;
}
