import { useState } from 'react';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { OwnerConsole } from './features/console/OwnerConsole';

export function WebApp() {
  const [mode, setMode] = useState<'console' | 'onboarding'>('console');

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
      </div>
      {mode === 'console' ? <OwnerConsole /> : <OnboardingFlow />}
    </div>
  );
}
