import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { clearAuthSession } from '@/lib/narvo-session';

/** End Supabase session (if any) and clear Narvo demo + token state. */
export async function narvoSignOut(): Promise<void> {
  const s = getSupabaseBrowser();
  if (s) await s.auth.signOut();
  clearAuthSession();
}
