import { useState, useEffect } from 'react';
import { Card, Stack, Button, Tabs } from '@nemsalon/ui';
import {
  getBusinessMetrics,
  getRevenueAnalytics,
  getCohortAnalysis,
  listSubscriptionPlans,
  getDunningStatus,
} from '../../api/platform-api';
import type { BusinessMetrics, SubscriptionPlan } from '../../types/platform-types';

const revenueTabs = [
  { key: 'overview', label: '📊 Oversigt' },
  { key: 'subscriptions', label: '📦 Abonnementer' },
  { key: 'dunning', label: '💳 Dunning' },
  { key: 'analytics', label: '📈 Analyse' },
] as const;

export function RevenueControl() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <Stack gap="lg">
      <Card>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>💰 Revenue Control</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
            Track revenue, manage subscriptions, and monitor payments
          </p>
        </div>
      </Card>

      <Tabs
        tabs={revenueTabs.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        {activeTab === 'overview' && <RevenueOverviewTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'dunning' && <DunningTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </Card>
    </Stack>
  );
}

// Revenue Overview Tab
function RevenueOverviewTab() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const data = await getBusinessMetrics('30d');
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser revenue data...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        <div>Fejl: {error}</div>
        <Button variant="primary" style={{ marginTop: '16px' }}>
          Prøv igen
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Ingen data tilgængelig</div>;
  }

  return (
    <Stack gap="lg">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <RevenueMetricCard
          label="MRR (Monthly Recurring Revenue)"
          value={`DKK ${(metrics.mrr / 100).toLocaleString('da-DK')}`}
        />
        <RevenueMetricCard
          label="GMV (Sidste 30 dage)"
          value={`DKK ${(metrics.gmv.amount / 100).toLocaleString('da-DK')}`}
        />
        <RevenueMetricCard
          label="Aktive Abonnementer"
          value={metrics.salons.active.toLocaleString('da-DK')}
        />
        <RevenueMetricCard label="Churn Rate" value={`${(metrics.churnRate * 100).toFixed(1)}%`} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          padding: '20px',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
        }}
      >
        <SecondaryMetric
          label="Failed Payments"
          value={`${(metrics.failedPayments * 100).toFixed(1)}%`}
        />
        <SecondaryMetric label="Refund Rate" value={`${(metrics.refundRate * 100).toFixed(1)}%`} />
      </div>
    </Stack>
  );
}

function RevenueMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{value}</div>
    </Card>
  );
}

function SecondaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px' }}
      >
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// Subscriptions Tab
function SubscriptionsTab() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const result = await listSubscriptionPlans();
        setPlans(result.data as SubscriptionPlan[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser abonnementer...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        <div>Fejl: {error}</div>
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <Stack direction="row" gap="md" justify="between" align="center">
        <div>
          <h3 style={{ margin: 0 }}>Abonnementsplaner</h3>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '13px' }}>
            Administrer priser og funktioner
          </p>
        </div>
        <Button variant="primary">+ Ny Plan</Button>
      </Stack>

      {plans.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
          Ingen abonnementsplaner fundet. Opret din første plan.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {plans.map((plan) => (
            <Card key={plan.id}>
              <Stack gap="md">
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{plan.name}</h4>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>
                    {plan.priceAmount === 0 ? 'Gratis' : `DKK ${plan.priceAmount / 100}`}
                    {plan.priceAmount > 0 && (
                      <span style={{ fontSize: '14px', opacity: 0.6 }}>/md</span>
                    )}
                  </div>
                </div>
                <Stack gap="xs">
                  {plan.features.map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </Stack>
              </Stack>
            </Card>
          ))}
        </div>
      )}
    </Stack>
  );
}

// Dunning Tab
function DunningTab() {
  const [dunning, setDunning] = useState<{
    cycle1: number;
    cycle2: number;
    cycle3: number;
    failedPermanently: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDunning = async () => {
      setLoading(true);
      try {
        const data = await getDunningStatus();
        setDunning(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dunning status');
      } finally {
        setLoading(false);
      }
    };

    loadDunning();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser dunning status...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        <div>Fejl: {error}</div>
      </div>
    );
  }

  if (!dunning || dunning.total === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h3>Ingen fejlede betalinger</h3>
        <p style={{ opacity: 0.6 }}>Alle betalinger går igennem som de skal!</p>
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <h3 style={{ margin: 0 }}>Dunning Management</h3>
        <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '13px' }}>
          Administrer fejlede abonnementsbetalinger
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
        }}
      >
        <DunningCard label="Cyklus 1/3" count={dunning.cycle1} color="#f59e0b" />
        <DunningCard label="Cyklus 2/3" count={dunning.cycle2} color="#f97316" />
        <DunningCard label="Cyklus 3/3" count={dunning.cycle3} color="#ea580c" />
        <DunningCard label="Permanent Fejlet" count={dunning.failedPermanently} color="#dc2626" />
      </div>

      <Card style={{ background: 'rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Handlinger</h4>
        <Stack direction="row" gap="sm">
          <Button variant="primary">Send Påmindelsesemails</Button>
          <Button variant="ghost">Eksportér Liste</Button>
        </Stack>
      </Card>
    </Stack>
  );
}

function DunningCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Card style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color, marginBottom: '4px' }}>{count}</div>
    </Card>
  );
}

// Analytics Tab
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<{
    dailyStats: Array<{ date: string; mrr: number; newSubscriptions: number; churned: number }>;
  } | null>(null);
  const [cohorts, setCohorts] = useState<
    Array<{ cohort: string; totalSalons: number; retentionRates: number[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [analyticsData, cohortsData] = await Promise.all([
          getRevenueAnalytics('30d'),
          getCohortAnalysis(),
        ]);
        setAnalytics(analyticsData);
        setCohorts(cohortsData.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser analytics...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        <div>Fejl: {error}</div>
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <h3 style={{ margin: 0 }}>Revenue Analytics</h3>
        <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '13px' }}>
          Dybdegående indsigt i din forretning
        </p>
      </div>

      {analytics && analytics.dailyStats.length > 0 && (
        <Card>
          <h4 style={{ margin: '0 0 16px 0' }}>Daglig Revenue (Seneste 30 dage)</h4>
          <div style={{ display: 'flex', gap: '4px', height: '150px', alignItems: 'flex-end' }}>
            {analytics.dailyStats.map((day, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.min(100, (day.mrr / 10000) * 100)}%`,
                  background: '#667eea',
                  borderRadius: '2px',
                  minHeight: '5px',
                }}
                title={`${day.date}: DKK ${day.mrr}`}
              />
            ))}
          </div>
        </Card>
      )}

      {cohorts.length > 0 && (
        <Card>
          <h4 style={{ margin: '0 0 16px 0' }}>Cohort Analysis</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Cohort</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Antal</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Måned 1</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Måned 3</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Måned 6</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Måned 12</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.slice(0, 6).map((cohort) => (
                  <tr key={cohort.cohort} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{cohort.cohort}</td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>{cohort.totalSalons}</td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {cohort.retentionRates[1]}%
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {cohort.retentionRates[3]}%
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {cohort.retentionRates[6]}%
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {cohort.retentionRates[12]}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Stack>
  );
}
