import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Debug logging in development
if (import.meta.env?.DEV) {
  console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Configured' : 'Missing');
}

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.error('Missing Supabase configuration. Check .env.local file.');
}

export { supabase };
export const hasSupabaseConfig = Boolean(supabase);
