import { Stack, Badge } from '@nemsalon/ui';
import { usePlatformHealth, useBusinessMetrics, useRiskRadar } from '../../hooks/usePlatformHealth';
import { HealthStrip } from './HealthStrip';
import { BusinessMetricsGrid } from './BusinessMetricsGrid';
import { RiskRadar } from './RiskRadar';
import type { HealthCheck } from '../../types/platform-types';

interface MissionControlProps {
  onSalonClick?: (salonId: string) => void;
  onHealthDrillDown?: (check: HealthCheck) => void;
}

export function MissionControl({ onSalonClick, onHealthDrillDown }: MissionControlProps) {
  const { health } = usePlatformHealth(true);
  const { metrics, loading: metricsLoading, period, setPeriod } = useBusinessMetrics();
  const { data: riskData, loading: riskLoading } = useRiskRadar();

  const overallStatus = health?.overall || 'healthy';

  return (
    <Stack gap="lg" className="mission-control">
      {/* Header */}
      <div
        className="mission-control-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>Mission Control</h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: '14px' }}>
            Real-time platform overview and monitoring
          </p>
        </div>
        <Badge
          variant={
            overallStatus === 'healthy'
              ? 'success'
              : overallStatus === 'warning'
                ? 'warning'
                : 'error'
          }
        >
          {overallStatus === 'healthy'
            ? '🟢 All Systems Normal'
            : overallStatus === 'warning'
              ? '🟡 Issues Detected'
              : '🔴 Critical Issues'}
        </Badge>
      </div>

      {/* Health Strip */}
      <HealthStrip checks={health?.checks || []} onDrillDown={onHealthDrillDown} />

      {/* Business Metrics */}
      <BusinessMetricsGrid
        metrics={metrics}
        period={period}
        onPeriodChange={setPeriod}
        loading={metricsLoading}
      />

      {/* Risk Radar */}
      <RiskRadar data={riskData} loading={riskLoading} onSalonClick={onSalonClick} />
    </Stack>
  );
}
