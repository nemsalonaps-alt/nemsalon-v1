import type { ReactNode } from 'react';
import { Button, Card, Stack } from '@nemsalon/ui';

export type FeatureStatus = 'ready' | 'loading' | 'error' | 'recovery';

type FeatureStateProps = {
  status: FeatureStatus;
  title: string;
  description?: string;
  error?: string | null;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
  testId?: string;
};

export function FeatureState({
  status,
  title,
  description,
  error,
  retryLabel = 'Prøv igen',
  onRetry,
  children,
  testId,
}: FeatureStateProps) {
  if (status === 'ready') {
    return <>{children}</>;
  }

  const body =
    status === 'loading'
      ? description ?? 'Indlæser...'
      : status === 'recovery'
        ? description ?? 'Forsøger at gendanne...'
        : error ?? description ?? 'Der opstod en fejl.';

  return (
    <Card
      variant="outlined"
      style={{
        background: status === 'error' ? 'var(--error-soft)' : 'var(--surface)',
        borderColor: status === 'error' ? 'var(--error)' : 'var(--surface-border)',
        padding: 24,
        textAlign: 'center',
      }}
      data-testid={testId}
    >
      <Stack gap="md" align="center">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: 0, color: status === 'error' ? 'var(--error)' : 'var(--ink-muted)' }}>
          {body}
        </p>
        {onRetry && status !== 'loading' && status !== 'recovery' && (
          <Button variant="primary" size="sm" onClick={onRetry} disabled={status === 'recovery'}>
            {retryLabel}
          </Button>
        )}
      </Stack>
    </Card>
  );
}
