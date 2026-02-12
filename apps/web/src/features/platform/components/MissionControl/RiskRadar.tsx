import { Card, Stack, Badge } from '@nemsalon/ui';
import type { RiskSalon, RiskRadarData } from '../../types/platform-types';

interface RiskRadarProps {
  data: RiskRadarData | null;
  loading?: boolean;
  onSalonClick?: (salonId: string) => void;
}

function getRiskColor(level: RiskSalon['riskLevel']): string {
  switch (level) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#ea580c';
    case 'medium':
      return '#ca8a04';
    case 'low':
      return '#16a34a';
    default:
      return '#6b7280';
  }
}

function RiskCategory({
  title,
  count,
  salons,
  onSalonClick,
}: {
  title: string;
  count: number;
  salons: RiskSalon[];
  onSalonClick?: (salonId: string) => void;
}) {
  if (count === 0) return null;

  return (
    <div className="risk-category" style={{ marginBottom: '20px' }}>
      <div
        className="risk-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{title}</h4>
        <Badge variant={count > 5 ? 'error' : count > 0 ? 'warning' : 'success'}>
          {count} salon{count !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Stack gap="xs">
        {salons.slice(0, 5).map((salon) => (
          <button
            key={salon.id}
            className="risk-salon-item"
            onClick={() => onSalonClick?.(salon.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              cursor: onSalonClick ? 'pointer' : 'default',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: '13px' }}>{salon.name}</div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>ID: {salon.id.slice(0, 8)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `conic-gradient(${getRiskColor(salon.riskLevel)} ${
                    salon.riskScore * 3.6
                  }deg, #e5e7eb 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {salon.riskScore}
              </div>
            </div>
          </button>
        ))}
        {salons.length > 5 && (
          <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6, padding: '8px' }}>
            +{salons.length - 5} more
          </div>
        )}
      </Stack>
    </div>
  );
}

export function RiskRadar({ data, loading, onSalonClick }: RiskRadarProps) {
  if (loading || !data) {
    return (
      <Card>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading risk data...</div>
      </Card>
    );
  }

  const totalAtRisk =
    data.atRisk.length +
    data.paymentIssues.length +
    data.highCancelRate.length +
    data.errorSpikes.length +
    data.decliningUsage.length;

  return (
    <Card>
      <div
        className="risk-radar-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ margin: 0 }}>Risk Radar</h2>
        <Badge variant={totalAtRisk > 10 ? 'error' : totalAtRisk > 0 ? 'warning' : 'success'}>
          {totalAtRisk} salons at risk
        </Badge>
      </div>

      <RiskCategory
        title="🚨 No bookings in 30 days"
        count={data.atRisk.length}
        salons={data.atRisk}
        onSalonClick={onSalonClick}
      />

      <RiskCategory
        title="💳 Payment issues (>10% failed)"
        count={data.paymentIssues.length}
        salons={data.paymentIssues}
        onSalonClick={onSalonClick}
      />

      <RiskCategory
        title="❌ High cancellation rate (>20%)"
        count={data.highCancelRate.length}
        salons={data.highCancelRate}
        onSalonClick={onSalonClick}
      />

      <RiskCategory
        title="⚠️ Error spikes (>50 in 24h)"
        count={data.errorSpikes.length}
        salons={data.errorSpikes}
        onSalonClick={onSalonClick}
      />

      <RiskCategory
        title="📉 Declining usage (-30% WoW)"
        count={data.decliningUsage.length}
        salons={data.decliningUsage}
        onSalonClick={onSalonClick}
      />

      {totalAtRisk === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
          🎉 All salons are healthy!
        </div>
      )}
    </Card>
  );
}
