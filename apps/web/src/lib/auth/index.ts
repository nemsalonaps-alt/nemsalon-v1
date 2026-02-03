import { supabase, hasSupabaseConfig } from '../supabase';

export { hasSupabaseConfig };

type AuthResult = { ok: true } | { ok: false; errorKey: string };
type SignUpResult = { ok: true; needsConfirm: boolean } | { ok: false; errorKey: string; needsConfirm: false };

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

const mapAuthError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'error.unauthorized';
  if (lower.includes('not confirmed')) return 'error.unauthorized';
  return 'error.request_error';
};

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { ok: false, errorKey: 'error.request_error' };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, errorKey: mapAuthError(error.message) };
  return { ok: true };
}

export async function signUpWithPassword(email: string, password: string): Promise<SignUpResult> {
  if (!supabase) {
    return { ok: false, errorKey: 'error.request_error', needsConfirm: false };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, errorKey: mapAuthError(error.message), needsConfirm: false };
  return { ok: true, needsConfirm: !data.session?.access_token };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, errorKey: 'error.request_error' };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, errorKey: mapAuthError(error.message) };
  return { ok: true };
}

export function onAuthStateChange(callback: () => void) {
  if (!supabase) return null;
  return supabase.auth.onAuthStateChange(() => callback());
}
