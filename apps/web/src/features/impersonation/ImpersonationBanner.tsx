import { useCallback, useState } from 'react';
import { Button, Card, Stack } from '@nemsalon/ui';
import {
  getImpersonationStatus,
  startImpersonation as apiStartImpersonation,
  stopImpersonation as apiStopImpersonation,
} from '../console/api';
import type { ImpersonationUser, ImpersonationStatusResponse } from '../console/types';
import {
  clearImpersonationState,
  getImpersonationState,
  setImpersonationState,
} from '../../lib/impersonation';
import { getCopy } from '../../i18n';
import './impersonation.css';

export type Role = 'owner' | 'staff' | 'customer';

interface ImpersonationBannerProps {
  impersonatedUser: ImpersonationUser;
  onSwitchToRole: (role: Role) => void;
  onReturnToAdmin: () => void;
  isLoading?: boolean;
  isSticky?: boolean;
}

const STORAGE_KEY = 'nemsalon_impersonation_last';

interface RememberedUser {
  id: string;
  fullName: string | null;
  email: string | null;
  salonName?: string | null;
}

type RememberedUsers = Partial<Record<Role, RememberedUser>>;

function getRememberedUsers(): RememberedUsers {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return parsed as RememberedUsers;
  } catch {
    return {};
  }
}

export function getRememberedUser(role: Role): RememberedUser | null {
  const users = getRememberedUsers();
  return users[role] ?? null;
}

export function rememberUser(role: Role, user: RememberedUser): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getRememberedUsers();
    all[role] = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    console.warn('[Impersonation] Failed to save remembered user');
  }
}

export function clearRememberedUser(role: Role): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getRememberedUsers();
    delete all[role];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    console.warn('[Impersonation] Failed to clear remembered user');
  }
}

export function ImpersonationBanner({
  impersonatedUser,
  onSwitchToRole,
  onReturnToAdmin,
  isLoading = false,
  isSticky = false,
}: ImpersonationBannerProps) {
  const availableRoles: Role[] = ['owner', 'staff', 'customer'];
  const copy = getCopy().impersonation;

  const handleSwitch = useCallback(
    (role: Role) => {
      rememberUser(role, {
        id: impersonatedUser.id,
        fullName: impersonatedUser.fullName,
        email: impersonatedUser.email,
        salonName: impersonatedUser.salonName,
      });
      onSwitchToRole(role);
    },
    [impersonatedUser, onSwitchToRole],
  );

  return (
    <Card
      data-testid="impersonation-banner"
      className={['imp-banner', isSticky ? 'imp-banner-sticky' : ''].filter(Boolean).join(' ')}
    >
      <Stack direction="row" gap="md" align="center" justify="between" wrap>
        <Stack gap="xs">
          <span className="imp-banner-label">
            ⚠️ {copy.banner.label}
          </span>
          <div>
            <strong>
              {impersonatedUser.fullName ?? copy.banner.unknownUser} (
              {copy.roles[impersonatedUser.role as Role] ?? impersonatedUser.role})
            </strong>
              {impersonatedUser.salonName && (
                <span className="imp-banner-salon">
                  {copy.inlineSeparator}
                  {impersonatedUser.salonName}
                </span>
              )}
          </div>
        </Stack>

        <Stack direction="row" gap="sm" align="center">
          {availableRoles
            .filter((r) => r !== (impersonatedUser.role as Role))
            .map((role) => (
              <Button
                key={role}
                variant="primary"
                size="sm"
                onClick={() => handleSwitch(role)}
                disabled={isLoading}
                data-testid={`impersonation-switch-${role}`}
              >
                {copy.banner.switchTo.replace('{role}', copy.roles[role])}
              </Button>
            ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReturnToAdmin}
            disabled={isLoading}
            data-testid="impersonation-return-admin"
          >
            {copy.banner.returnToAdmin}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

interface UseImpersonationReturn {
  isImpersonating: boolean;
  impersonatedUser: ImpersonationUser | null;
  impersonatorUser: ImpersonationUser | null;
  isLoading: boolean;
  checkStatus: () => Promise<void>;
  startImpersonation: (userId: string, role?: Role) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

export function useImpersonation(): UseImpersonationReturn {
  const [status, setStatus] = useState<ImpersonationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const copy = getCopy().impersonation;

  const checkStatus = useCallback(async () => {
    try {
      const result = await getImpersonationStatus();
      if (result.ok) {
        setStatus(result.data);
        if (result.data.isImpersonating && result.data.impersonatedUser) {
          setImpersonationState({
            userId: result.data.impersonatedUser.id,
            fullName: result.data.impersonatedUser.fullName ?? null,
            email: result.data.impersonatedUser.email ?? null,
            role: result.data.impersonatedUser.role ?? null,
            salonName: result.data.impersonatedUser.salonName ?? null,
          });
        }
        if (!result.data.isImpersonating) {
          clearImpersonationState();
        }
        return;
      }
    } catch (error) {
      console.error('[Impersonation] Failed to check status:', error);
      setStatus(null);
    }
    const fallback = getImpersonationState();
    if (fallback) {
      setStatus({
        isImpersonating: true,
        impersonator: null,
        impersonatedUser: {
          id: fallback.userId,
          fullName: fallback.fullName ?? null,
          email: fallback.email ?? null,
          role: fallback.role ?? null,
          salonName: fallback.salonName ?? null,
        },
      });
    }
  }, []);

  const startImpersonation = useCallback(async (userId: string, role?: Role) => {
    setIsLoading(true);
    try {
      const result = await apiStartImpersonation(userId);
      if (!result.ok) {
        const error = await result.error;
        throw new Error(error ?? copy.errors.startFailed);
      }
      if (result.data?.user) {
        setImpersonationState({
          userId: result.data.user.id,
          fullName: result.data.user.fullName ?? null,
          email: result.data.user.email ?? null,
          role: result.data.user.role ?? null,
          salonName: result.data.user.salonName ?? null,
        });
      } else {
        setImpersonationState({ userId, fullName: null, email: null, role: role ?? null });
      }
      if (role) {
        rememberUser(role, { id: userId, fullName: null, email: null });
      }
      window.location.reload();
    } catch (error) {
      console.error('[Impersonation] Failed to start impersonation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiStopImpersonation();
      clearImpersonationState();
      window.location.reload();
    } catch (error) {
      console.error('[Impersonation] Failed to stop impersonation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isImpersonating: status?.isImpersonating ?? false,
    impersonatedUser: status?.isImpersonating ? status.impersonatedUser ?? null : null,
    impersonatorUser: status?.impersonator ?? null,
    isLoading,
    checkStatus,
    startImpersonation,
    stopImpersonation,
  };
}
