import { supabase, hasSupabaseConfig } from '../supabase';
import { clearImpersonationState } from '../impersonation';

export { hasSupabaseConfig };

type AuthResult = { ok: true } | { ok: false; errorKey: string };
type SignUpResult =
  | { ok: true; needsConfirm: boolean }
  | { ok: false; errorKey: string; needsConfirm: false };

export async function getAccessToken(): Promise<string | null> {
  // Development mode: check for dev user
  if (import.meta.env.DEV && localStorage.getItem('dev_user_id')) {
    return 'dev-bypass-token';
  }

  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Supabase getSession error:', error.message);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn('Supabase getSession exception:', err);
    return null;
  }
}

const mapAuthError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'error.unauthorized';
  if (lower.includes('not confirmed')) return 'error.unauthorized';
  return 'error.request_error';
};

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  // Development mode: use dev bypass instead of Supabase auth
  if (import.meta.env.DEV) {
    // Map email to dev user
    const devUsers: Record<string, { id: string; email: string; role: string }> = {
      'dev-owner@nemsalon.test': {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev-owner@nemsalon.test',
        role: 'owner',
      },
      'dev-staff@nemsalon.test': {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'dev-staff@nemsalon.test',
        role: 'staff',
      },
      'dev-customer@nemsalon.test': {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'dev-customer@nemsalon.test',
        role: 'customer',
      },
      'dev-platform-admin@nemsalon.test': {
        id: '00000000-0000-0000-0000-000000000010',
        email: 'dev-platform-admin@nemsalon.test',
        role: 'owner',
      },
      // Legacy emails for backward compatibility
      'salonowner@gmail.com': {
        id: '31ebc1aa-2668-4cfd-9983-ab8ad44b3a7f',
        email: 'salonowner@gmail.com',
        role: 'owner',
      },
      'ansat@gmail.com': {
        id: 'ebf170d8-c6c1-4056-9854-345c06572ab2',
        email: 'ansat@gmail.com',
        role: 'staff',
      },
      'kunde@gmail.com': {
        id: 'f50b1cb0-3206-4209-8621-a1edcbd70ba3',
        email: 'kunde@gmail.com',
        role: 'customer',
      },
      'platformadmin@gmail.com': {
        id: '84b565e6-e67a-45be-9d97-23a5c0d91982',
        email: 'platformadmin@gmail.com',
        role: 'owner',
      },
    };

    const devUser = devUsers[email.toLowerCase()];
    if (devUser) {
      // Store dev user in localStorage for persistence
      localStorage.setItem('dev_user_id', devUser.id);
      localStorage.setItem('dev_user_email', devUser.email);
      localStorage.setItem('dev_user_role', devUser.role);
      console.log('[Auth] Dev user stored:', devUser);
      return { ok: true };
    }
    return { ok: false, errorKey: 'error.unauthorized' };
  }

  if (!supabase) {
    return { ok: false, errorKey: 'error.request_error' };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('SignInWithPassword error:', error);
    return { ok: false, errorKey: mapAuthError(error.message) };
  }
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
  // Development mode: clear dev user
  if (import.meta.env.DEV) {
    localStorage.removeItem('dev_user_id');
    localStorage.removeItem('dev_user_email');
    localStorage.removeItem('dev_user_role');
  }

  if (!supabase) return { ok: false, errorKey: 'error.request_error' };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, errorKey: mapAuthError(error.message) };
  clearImpersonationState();
  return { ok: true };
}

export function onAuthStateChange(callback: () => void) {
  if (!supabase) return null;
  return supabase.auth.onAuthStateChange(() => callback());
}
