import type { Session } from '@supabase/supabase-js';
import { setAuthSession, setNarvoAccessToken } from '@/lib/narvo-session';

/** Mirror Supabase session into Narvo profile (cookie + `narvo-auth`) and in-memory JWT cache for API calls. */
export function applySupabaseSession(session: Session | null): void {
  if (!session?.access_token) return;
  setNarvoAccessToken(session.access_token);
  const u = session.user;
  const email = (u.email || '').trim() || 'signed-in';
  const name =
    (u.user_metadata?.full_name as string | undefined)?.trim() ||
    (u.user_metadata?.name as string | undefined)?.trim();
  setAuthSession({
    email,
    name: name || undefined,
    createdAt: new Date().toISOString(),
  });
}
