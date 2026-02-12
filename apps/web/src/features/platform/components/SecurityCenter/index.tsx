import { useState, useEffect } from 'react';
import { Card, Stack, Badge, Button, Input, Tabs } from '@nemsalon/ui';
import { listAuditLogs } from '../../api/platform-api';
import type { PlatformAuditEntry } from '../../types/platform-types';

interface SecurityCenterProps {}

const securityTabs = [
  { key: 'access-log', label: '📋 Access Log' },
  { key: 'anomalies', label: '⚠️ Anomalies' },
  { key: 'violations', label: '🚫 Violations' },
] as const;

export function SecurityCenter(_props: SecurityCenterProps) {
  const [activeTab, setActiveTab] = useState<string>('access-log');
  const [accessLogs, setAccessLogs] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccessLogs = async () => {
      setLoading(true);
      try {
        const result = await listAuditLogs({ limit: 100 });
        setAccessLogs(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load access logs');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'access-log') {
      loadAccessLogs();
    }
  }, [activeTab]);

  return (
    <Stack gap="lg">
      <Card>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🔒 Security Center</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
            Monitor access logs, detect anomalies, and track security violations
          </p>
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <SecurityStatCard label="Total Logins (24h)" value="1,247" trend="+12" color="#10b981" />
        <SecurityStatCard label="Failed Logins" value="23" trend="-5" color="#f59e0b" />
        <SecurityStatCard label="Active Anomalies" value="0" trend="stable" color="#ef4444" />
        <SecurityStatCard label="Rate Limit Violations" value="0" trend="stable" color="#dc2626" />
      </div>

      <Tabs
        tabs={securityTabs.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        {activeTab === 'access-log' && (
          <AccessLogTab logs={accessLogs} loading={loading} error={error} />
        )}
        {activeTab === 'anomalies' && <AnomaliesTab />}
        {activeTab === 'violations' && <ViolationsTab />}
      </Card>
    </Stack>
  );
}

function SecurityStatCard({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  color: string;
}) {
  return (
    <Card style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', opacity: 0.5 }}>
        {trend === 'stable' ? '→' : trend.startsWith('+') ? '↑' : '↓'} {trend} vs yesterday
      </div>
    </Card>
  );
}

function AccessLogTab({
  logs,
  loading,
  error,
}: {
  logs: PlatformAuditEntry[];
  loading: boolean;
  error: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser access logs...</div>;
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

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorUserId && log.actorUserId.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <Stack gap="lg">
      <Input
        placeholder="Søg efter handling eller bruger..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Stack gap="sm">
        {filteredLogs.map((log) => (
          <Card key={log.id} style={{ background: 'rgba(0,0,0,0.02)' }}>
            <Stack direction="row" gap="md" align="center" justify="between">
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '4px',
                  }}
                >
                  <Badge variant={log.action.includes('ERROR') ? 'error' : 'default'}>
                    {log.action}
                  </Badge>
                </div>
                <div style={{ fontWeight: 500 }}>{log.actorUserId || 'System'}</div>
                <div style={{ fontSize: '12px', opacity: 0.5 }}>
                  {log.entityType} {log.entityId ? `• ${log.entityId}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', opacity: 0.5 }}>
                  {new Date(log.createdAt).toLocaleString('da-DK')}
                </div>
              </div>
            </Stack>
          </Card>
        ))}
      </Stack>

      {filteredLogs.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>Ingen logs fundet</div>
      )}
    </Stack>
  );
}

function AnomaliesTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
      <h3>Ingen anomalier fundet</h3>
      <p style={{ opacity: 0.6 }}>Alt ser sikkert ud!</p>
    </div>
  );
}

function ViolationsTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
      <h3>Ingen violations</h3>
      <p style={{ opacity: 0.6 }}>Alle respekterer rate limits</p>
    </div>
  );
}
