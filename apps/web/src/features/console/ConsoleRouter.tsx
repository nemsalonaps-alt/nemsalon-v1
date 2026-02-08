import { useEffect, useMemo, useState } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange } from '../../lib/auth';
import { fetchMe } from './api';
import { OwnerConsole } from './OwnerConsole';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { StaffConsole } from '../staff/StaffConsole';
import { PlatformConsole } from '../platform/PlatformConsole';
import type { AuthMeResponse } from './types';
import type { GateState } from '../onboarding/types';

type RouterGateState = GateState | 'ready';

function resolvePrimaryRole(me: AuthMeResponse | null) {
  if (!me) return 'owner';
  const primarySalonId = me.primarySalonId ?? me.user?.primarySalonId ?? null;
  const membership = me.memberships?.find((entry) => entry.salonId === primarySalonId);
  return membership?.role ?? 'owner';
}

export function ConsoleRouter() {
  const [gateState, setGateState] = useState<RouterGateState>('checking');
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [mode, setMode] = useState<'console' | 'onboarding' | 'staff' | 'platform'>('console');

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
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const role = useMemo(() => resolvePrimaryRole(me), [me]);
  const salonStatus = me?.salon?.status ?? null;

  if (gateState !== 'ready') {
    return (
      <div className="app">
        <Gate state={gateState} onRetry={() => setGateState('checking')} />
      </div>
    );
  }

  if (role === 'staff') {
    return <StaffConsole initialMe={me} skipGate />;
  }

  if (salonStatus !== 'active') {
    return (
      <div>
        <OnboardingFlow />
      </div>
    );
  }

  return (
    <div>
      <div className="mode-switch">
        <button
          className={mode === 'console' ? 'active' : ''}
          onClick={() => setMode('console')}
        >
          Owner Console
        </button>
        <button
          className={mode === 'onboarding' ? 'active' : ''}
          onClick={() => setMode('onboarding')}
        >
          Onboarding
        </button>
        <button
          className={mode === 'staff' ? 'active' : ''}
          onClick={() => setMode('staff')}
        >
          Staff Console
        </button>
        <button
          className={mode === 'platform' ? 'active' : ''}
          onClick={() => setMode('platform')}
        >
          Platform Admin
        </button>
      </div>
      {mode === 'console' && <OwnerConsole initialMe={me} skipGate />}
      {mode === 'onboarding' && <OnboardingFlow />}
      {mode === 'staff' && <StaffConsole initialMe={me} skipGate />}
      {mode === 'platform' && <PlatformConsole initialMe={me} skipGate />}
    </div>
  );
}
