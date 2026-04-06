'use client';

import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';

/**
 * Refetch listening history when Supabase reports inserts/updates/deletes for this user.
 * No-op if Supabase env is missing, user is logged out, or the table is not in the realtime publication.
 */
export function useListeningHistoryRealtime(onChange: () => void, enabled: boolean): void {
  useUserTableRealtime('listening_history', onChange, enabled);
}
