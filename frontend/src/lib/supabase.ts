import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    '[Narvo] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env. Add them (see .env.example), then restart the dev server (npm start).';
  if (import.meta.env.DEV) {
    console.error(msg);
  }
  throw new Error(msg);
}

/** Supabase client. Env vars are validated above. */
export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
