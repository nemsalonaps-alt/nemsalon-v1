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

type LogFn = (payload: Record<string, unknown>, msg?: string) => void;
type Logger = { info?: LogFn; warn?: LogFn; error?: LogFn };

export async function checkSupabaseConnection(logger?: Logger) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('salons').select('id').limit(1);
    if (error) {
      logger?.error?.({ error: error.message }, 'Supabase connection check failed');
      return { ok: false, error: error.message };
    }
    logger?.info?.({ url: env.SUPABASE_URL }, 'Supabase connection ok');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger?.error?.({ error: message }, 'Supabase connection check crashed');
    return { ok: false, error: message };
  }
}
