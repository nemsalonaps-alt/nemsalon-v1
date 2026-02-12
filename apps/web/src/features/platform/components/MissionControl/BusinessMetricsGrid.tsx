import { Card, Stack, Button } from '@nemsalon/ui';
import type { BusinessMetrics } from '../../types/platform-types';

interface BusinessMetricsGridProps {
  metrics: BusinessMetrics | null;
  period: '24h' | '7d' | '30d';
  onPeriodChange: (period: '24h' | '7d' | '30d') => void;
  loading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount / 100); // Assuming amount is in øre
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="metric-card" style={{ minWidth: '200px', flex: 1 }}>
      <div className="metric-title" style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
        {title}
      </div>
      <div
        className="metric-value"
        style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="metric-subtitle" style={{ fontSize: '12px', opacity: 0.6 }}>
          {subtitle}
        </div>
      )}
    </Card>
  );
}

export function BusinessMetricsGrid({
  metrics,
  period,
  onPeriodChange,
  loading,
}: BusinessMetricsGridProps) {
  if (loading || !metrics) {
    return (
      <Card>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading metrics...</div>
      </Card>
    );
  }

  return (
    <Card>
      <Stack
        direction="row"
        gap="md"
        align="center"
        justify="between"
        style={{ marginBottom: '20px' }}
      >
        <h2 style={{ margin: 0 }}>Business Health</h2>
        <Stack direction="row" gap="xs">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange(p)}
            >
              {p === '24h' ? '24 timer' : p === '7d' ? '7 dage' : '30 dage'}
            </Button>
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" gap="md" wrap>
        <MetricCard
          title="Aktive Saloner"
          value={String(metrics.salons.active)}
          subtitle={`${metrics.salons.total} total`}
        />
        <MetricCard
          title={`GMV (${period})`}
          value={formatCurrency(metrics.gmv.amount, metrics.gmv.currency)}
        />
        <MetricCard title="MRR" value={formatCurrency(metrics.mrr, metrics.gmv.currency)} />
        <MetricCard title="Churn Rate" value={`${(metrics.churnRate * 100).toFixed(1)}%`} />
      </Stack>

      <div
        className="secondary-metrics"
        style={{
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '40px',
        }}
      >
        <div>
          <span style={{ opacity: 0.6 }}>Failed Payments: </span>
          <strong>{(metrics.failedPayments * 100).toFixed(1)}%</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>Refund Rate: </span>
          <strong>{(metrics.refundRate * 100).toFixed(1)}%</strong>
        </div>
      </div>
    </Card>
  );
}
