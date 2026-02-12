export type ImpersonationState = {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  salonName?: string | null;
};

const STORAGE_KEY = 'nemsalon_impersonation_active';

export function getImpersonationState(): ImpersonationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

export function setImpersonationState(state: ImpersonationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearImpersonationState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
