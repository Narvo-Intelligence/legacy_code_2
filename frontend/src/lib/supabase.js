import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = '[Narvo] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env. Add them (see .env.example), then restart the dev server (npm start).';
  if (import.meta.env.DEV) {
    console.error(msg);
  }
  throw new Error(msg);
}

/** Supabase client, or null if REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY are not set. */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
