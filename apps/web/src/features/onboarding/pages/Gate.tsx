import { useEffect } from 'react';
import type { GateState } from '../types';
import { getCopy } from '../copy';
import { Card, Badge, Stack, Button } from '@nemsalon/ui';

type GateProps = {
  state: GateState;
  onRetry: () => void;
  onReviewSettings?: () => void;
};

export function Gate({ state, onRetry, onReviewSettings }: GateProps) {
  const copy = getCopy();

  // Redirect to unified login when not authenticated
  useEffect(() => {
    if (state === 'needs-login') {
      window.location.href = '/login';
    }
  }, [state]);

  if (state === 'checking') {
    return (
      <Card>
        <Badge>{copy.gate.checking.badge}</Badge>
        <h1>{copy.gate.checking.title}</h1>
        <p>{copy.gate.checking.body}</p>
        <p className="onb-gate-note">{copy.gate.checking.note}</p>
      </Card>
    );
  }

  if (state === 'recovering') {
    return (
      <Card>
        <Badge>{copy.gate.recovering.badge}</Badge>
        <h1>{copy.gate.recovering.title}</h1>
        <p>{copy.gate.recovering.body}</p>
        <p className="onb-gate-note">{copy.gate.checking.note}</p>
      </Card>
    );
  }

  if (state === 'has-salon') {
    return (
      <Card>
        <Badge>{copy.gate.hasSalon.badge}</Badge>
        <h1>{copy.gate.hasSalon.title}</h1>
        <p>{copy.gate.hasSalon.body}</p>
        <Stack direction="row" gap="md">
          <Button
            variant="primary"
            onClick={onReviewSettings}
            disabled={!onReviewSettings}
          >
            {copy.gate.hasSalon.primaryAction}
          </Button>
        </Stack>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card>
        <Badge>{copy.gate.error.badge}</Badge>
        <h1>{copy.gate.error.title}</h1>
        <p>{copy.gate.error.body}</p>
        <Stack direction="row" gap="md">
          <Button variant="primary" onClick={onRetry}>
            {copy.gate.error.primaryAction}
          </Button>
        </Stack>
      </Card>
    );
  }

  if (state === 'needs-login') {
    return (
      <Card>
        <Badge>{copy.gate.needsLogin.badge}</Badge>
        <h1>{copy.gate.needsLogin.title}</h1>
        <p>{copy.gate.needsLogin.redirecting}</p>
      </Card>
    );
  }

  return null;
}
