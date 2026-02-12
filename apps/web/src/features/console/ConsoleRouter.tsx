import { useEffect, useMemo, useState, useRef } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange } from '../../lib/auth';
import { fetchMe } from './api';
import { OwnerConsole } from './OwnerConsole';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { StaffConsole } from '../staff/StaffConsole';
import { PlatformAdminElite } from '../platform/PlatformAdminElite';
import type { AuthMeResponse } from './types';
import type { GateState } from '../onboarding/types';

type RouterGateState = GateState | 'ready';

function resolvePrimaryRole(me: AuthMeResponse | null) {
  if (!me) return 'owner';
  const primarySalonId = me.primarySalonId ?? me.user?.primarySalonId ?? null;
  const membership = me.memberships?.find((entry) => entry.salonId === primarySalonId);
  return membership?.role ?? 'owner';
}

function isCustomerUser(me: AuthMeResponse | null): boolean {
  return me !== null && (me.memberships?.length === 0 || !me.memberships);
}

function isPlatformAdmin(me: AuthMeResponse | null): boolean {
  return (
    me !== null && (me as AuthMeResponse & { isPlatformAdmin?: boolean }).isPlatformAdmin === true
  );
}

export function ConsoleRouter() {
  const [gateState, setGateState] = useState<RouterGateState>('checking');
  const [me, setMe] = useState<AuthMeResponse | null>(null);

  const handleRetry = () => {
    setGateState('recovering');
  };

  useEffect(() => {
    if (gateState !== 'recovering') return;
    const timer = setTimeout(() => setGateState('checking'), 100);
    return () => clearTimeout(timer);
  }, [gateState]);

  useEffect(() => {
    if (gateState !== 'checking') return;
    let active = true;

    const load = async () => {
      const result = await fetchMe();
      if (!active) return;

      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          setGateState('needs-login');
        } else {
          setGateState('error');
        }
        return;
      }

      setMe(result.data);
      setGateState('ready');
    };

    load();
    return () => {
      active = false;
    };
  }, [gateState]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setMe(null);
      setGateState('checking');
    });
    return () => {
      if (subscription?.data?.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  const role = useMemo(() => resolvePrimaryRole(me), [me]);
  const salonStatus = me?.salon?.status ?? null;
  const platformAdmin = isPlatformAdmin(me);

  const onboardingJustCompletedRef = useRef(
    typeof window !== 'undefined' && localStorage.getItem('onboardingJustCompleted') === 'true',
  );

  useEffect(() => {
    if (onboardingJustCompletedRef.current && salonStatus === 'active') {
      const timer = setTimeout(() => {
        localStorage.removeItem('onboardingJustCompleted');
        onboardingJustCompletedRef.current = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [salonStatus]);

  if (gateState !== 'ready') {
    return (
      <div>
        <Gate state={gateState} onRetry={handleRetry} />
      </div>
    );
  }

  if (platformAdmin) {
    return <PlatformAdminElite initialMe={me} skipGate />;
  }

  if (isCustomerUser(me)) {
    window.location.href = '/portal';
    return null;
  }

  if (role === 'staff') {
    return <StaffConsole initialMe={me} skipGate />;
  }

  if (salonStatus !== 'active' && !onboardingJustCompletedRef.current) {
    return (
      <div>
        <OnboardingFlow />
      </div>
    );
  }

  return <OwnerConsole initialMe={me} skipGate />;
}
