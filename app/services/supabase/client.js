import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Auth-enabled client: persistSession + autoRefreshToken on so signed-in users
// survive reloads. Anonymous mode still works without env vars (client = null).
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: true,
        storageKey: 'babel.auth.v1',
      },
    })
  : null;
