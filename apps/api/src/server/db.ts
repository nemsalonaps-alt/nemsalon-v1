import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, requireEnv } from '../config/env.js';

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!client) {
    requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], 'Supabase is not configured');
    client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return client;
}
