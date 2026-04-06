'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { hasMeAuth } from '@/lib/me-api';

/**
 * Refetch listening history when Supabase reports inserts/updates/deletes for this user.
 * No-op if Supabase env is missing, user is logged out, or the table is not in the realtime publication.
 */
export function useListeningHistoryRealtime(onChange: () => void, enabled: boolean): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !hasMeAuth()) return;
    const supa = getSupabaseBrowser();
    if (!supa) return;

    let cancelled = false;
    let channel: ReturnType<typeof supa.channel> | null = null;

    void supa.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user?.id) return;
      const uid = user.id;
      channel = supa
        .channel(`listening_history_user_${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'listening_history',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            onChangeRef.current();
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel && supa) {
        void supa.removeChannel(channel);
      }
    };
  }, [enabled]);
}
