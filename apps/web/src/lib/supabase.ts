import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL
    : '';

const supabaseAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : '';

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
export const hasSupabaseConfig = Boolean(supabase);
