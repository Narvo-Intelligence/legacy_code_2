'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { hasMeAuth } from '@/lib/me-api';

/**
 * Refetch when Supabase reports changes on a user-scoped table (`user_id` = auth uid).
 * Table must be in the `supabase_realtime` publication and RLS must allow the user's rows.
 */
export function useUserTableRealtime(table: string, onChange: () => void, enabled: boolean): void {
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
        .channel(`${table}_rt_${uid.slice(0, 8)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
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
  }, [enabled, table]);
}
