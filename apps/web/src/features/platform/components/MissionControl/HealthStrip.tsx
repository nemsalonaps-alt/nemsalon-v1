import { Card, Stack } from '@nemsalon/ui';
import type { HealthCheck } from '../../types/platform-types';

interface HealthStripProps {
  checks: HealthCheck[];
  onDrillDown?: (check: HealthCheck) => void;
}

function getStatusEmoji(status: HealthCheck['status']): string {
  switch (status) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'critical':
      return '🔴';
    default:
      return '🟢';
  }
}

export function HealthStrip({ checks, onDrillDown }: HealthStripProps) {
  return (
    <Card className="health-strip">
      <Stack direction="row" gap="md" align="center" justify="between" wrap>
        {checks.map((check) => (
          <button
            key={check.name}
            className="health-check-item"
            onClick={() => onDrillDown?.(check)}
            style={{
              background: 'none',
              border: 'none',
              cursor: onDrillDown ? 'pointer' : 'default',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="health-emoji">{getStatusEmoji(check.status)}</span>
            <div className="health-info" style={{ textAlign: 'left' }}>
              <div
                className="health-name"
                style={{ fontWeight: 600, fontSize: '12px', textTransform: 'capitalize' }}
              >
                {check.name.replace(/_/g, ' ')}
              </div>
              <div className="health-message" style={{ fontSize: '11px', opacity: 0.7 }}>
                {check.message}
              </div>
            </div>
          </button>
        ))}
      </Stack>
    </Card>
  );
}
