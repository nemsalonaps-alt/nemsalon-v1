import { useState, useEffect, useCallback } from 'react';
import { Card, Stack, Badge, Button, Input, Tabs } from '@nemsalon/ui';
import {
  getQueueStats,
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
} from '../../api/platform-api';
import type { QueueStats, FeatureFlag } from '../../types/platform-types';

interface SystemOperationsProps {
  onQueueClick?: (queueName: string) => void;
}

const systemTabs = [
  { key: 'queues', label: '📬 Job Queues' },
  { key: 'feature-flags', label: '🚩 Feature Flags' },
  { key: 'rate-limits', label: '⏱️ Rate Limits' },
] as const;

export function SystemOperations({ onQueueClick }: SystemOperationsProps) {
  const [activeTab, setActiveTab] = useState<string>('queues');

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>⚙️ System Operations</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
            Monitor queues, manage feature flags, and check rate limits
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={systemTabs.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <Card>
        {activeTab === 'queues' && <QueuesTab onQueueClick={onQueueClick} />}
        {activeTab === 'feature-flags' && <FeatureFlagsTab />}
        {activeTab === 'rate-limits' && <RateLimitsTab />}
      </Card>
    </Stack>
  );
}

// Queues Tab
function QueuesTab({ onQueueClick }: { onQueueClick?: (queueName: string) => void }) {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueues = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQueueStats();
      setQueues(result.queues);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadQueues]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser queue status...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        {error}
        <div style={{ marginTop: '16px' }}>
          <Button variant="primary" onClick={loadQueues}>
            Prøv igen
          </Button>
        </div>
      </div>
    );
  }

  const totalPending = queues.reduce((sum, q) => sum + q.pending, 0);
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
  const totalDeadLetter = queues.reduce((sum, q) => sum + q.deadLetter, 0);

  return (
    <Stack gap="lg">
      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
        }}
      >
        <QueueMetricCard label="Pending" value={totalPending} color="#f59e0b" />
        <QueueMetricCard
          label="Processing"
          value={queues.reduce((sum, q) => sum + q.processing, 0)}
          color="#3b82f6"
        />
        <QueueMetricCard
          label="Completed"
          value={queues.reduce((sum, q) => sum + q.completed, 0)}
          color="#10b981"
        />
        <QueueMetricCard
          label="Failed"
          value={totalFailed}
          color={totalFailed > 0 ? '#ef4444' : '#6b7280'}
        />
        <QueueMetricCard
          label="Dead Letter"
          value={totalDeadLetter}
          color={totalDeadLetter > 0 ? '#dc2626' : '#6b7280'}
        />
      </div>

      {/* Queue Details */}
      <Stack gap="md">
        {queues.map((queue) => (
          <Card
            key={queue.name}
            onClick={() => onQueueClick?.(queue.name)}
            style={{ cursor: onQueueClick ? 'pointer' : 'default' }}
          >
            <Stack direction="row" gap="md" align="center" justify="between">
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{queue.name}</h3>
                <div style={{ fontSize: '12px', opacity: 0.5 }}>
                  Sidst opdateret: {new Date(queue.lastUpdated).toLocaleString('da-DK')}
                </div>
              </div>
              <Stack direction="row" gap="sm">
                {queue.pending > 0 && <Badge variant="warning">{queue.pending} pending</Badge>}
                {queue.processing > 0 && (
                  <Badge variant="default">{queue.processing} processing</Badge>
                )}
                {queue.failed > 0 && <Badge variant="error">{queue.failed} failed</Badge>}
                {queue.deadLetter > 0 && (
                  <Badge variant="error">{queue.deadLetter} dead letter</Badge>
                )}
              </Stack>
            </Stack>

            {/* Stats Bar */}
            <div
              style={{
                marginTop: '12px',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {queue.pending > 0 && (
                <div
                  style={{
                    width: `${(queue.pending / (queue.pending + queue.processing + queue.completed + queue.failed)) * 100}%`,
                    background: '#f59e0b',
                  }}
                />
              )}
              {queue.processing > 0 && (
                <div
                  style={{
                    width: `${(queue.processing / (queue.pending + queue.processing + queue.completed + queue.failed)) * 100}%`,
                    background: '#3b82f6',
                  }}
                />
              )}
              {queue.completed > 0 && (
                <div
                  style={{
                    width: `${(queue.completed / (queue.pending + queue.processing + queue.completed + queue.failed)) * 100}%`,
                    background: '#10b981',
                  }}
                />
              )}
              {queue.failed > 0 && (
                <div
                  style={{
                    width: `${(queue.failed / (queue.pending + queue.processing + queue.completed + queue.failed)) * 100}%`,
                    background: '#ef4444',
                  }}
                />
              )}
            </div>

            {/* Action Buttons */}
            <Stack direction="row" gap="sm" style={{ marginTop: '12px' }}>
              <Button variant="ghost" size="sm" disabled={queue.pending === 0}>
                Pause
              </Button>
              <Button variant="ghost" size="sm" disabled={queue.failed === 0}>
                Retry Failed
              </Button>
              <Button variant="ghost" size="sm" disabled={queue.deadLetter === 0}>
                Clear Dead Letter
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

function QueueMetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'rgba(0,0,0,0.02)',
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value.toLocaleString()}</div>
    </div>
  );
}

// Feature Flags Tab
function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFeatureFlags();
      setFlags(result.data);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      const updated = await updateFeatureFlag(flag.key, { enabled: !flag.enabled });
      setFlags(flags.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      alert('Failed to update feature flag');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser feature flags...</div>;
  }

  return (
    <Stack gap="lg">
      <Stack direction="row" gap="md" justify="between" align="center">
        <div>
          <h3 style={{ margin: 0 }}>Feature Flags</h3>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '13px' }}>
            Manage feature rollouts across the platform
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Ny Feature Flag
        </Button>
      </Stack>

      <Stack gap="md">
        {flags.map((flag) => (
          <Card key={flag.id}>
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
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{flag.name}</h4>
                  <code
                    style={{
                      fontSize: '12px',
                      padding: '2px 6px',
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '4px',
                    }}
                  >
                    {flag.key}
                  </code>
                  <Badge variant={flag.enabled ? 'success' : 'default'}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {flag.description && (
                  <p style={{ margin: '0 0 8px 0', opacity: 0.6, fontSize: '13px' }}>
                    {flag.description}
                  </p>
                )}
                <div style={{ fontSize: '12px', opacity: 0.5 }}>
                  Rollout: {flag.rolloutType}
                  {flag.rolloutPercentage && ` (${flag.rolloutPercentage}%)`}
                  {flag.targetedSalonIds &&
                    flag.targetedSalonIds.length > 0 &&
                    ` • ${flag.targetedSalonIds.length} salons`}
                </div>
              </div>
              <Stack direction="row" gap="sm">
                <Button
                  variant={flag.enabled ? 'ghost' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleFlag(flag)}
                >
                  {flag.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingFlag(flag)}>
                  Rediger
                </Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>

      {flags.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚩</div>
          <div>Ingen feature flags oprettet endnu</div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <FeatureFlagModal onClose={() => setShowCreateModal(false)} onSuccess={loadFlags} />
      )}

      {/* Edit Modal */}
      {editingFlag && (
        <FeatureFlagModal
          flag={editingFlag}
          onClose={() => setEditingFlag(null)}
          onSuccess={loadFlags}
        />
      )}
    </Stack>
  );
}

function FeatureFlagModal({
  flag,
  onClose,
  onSuccess,
}: {
  flag?: FeatureFlag;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [key, setKey] = useState(flag?.key ?? '');
  const [name, setName] = useState(flag?.name ?? '');
  const [description, setDescription] = useState(flag?.description ?? '');
  const [enabled, setEnabled] = useState(flag?.enabled ?? false);
  const [rolloutType, setRolloutType] = useState(flag?.rolloutType ?? 'global');
  const [rolloutPercentage, setRolloutPercentage] = useState(flag?.rolloutPercentage ?? 100);

  const handleSubmit = async () => {
    try {
      if (flag) {
        await updateFeatureFlag(flag.key, {
          name,
          description,
          enabled,
          rolloutType: rolloutType as 'global' | 'percentage' | 'targeted',
          rolloutPercentage,
        });
      } else {
        await createFeatureFlag({
          key,
          name,
          description,
          enabled,
          rolloutType: rolloutType as 'global' | 'percentage' | 'targeted',
          rolloutPercentage,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(
        'Failed to save feature flag: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <Card style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ margin: '0 0 20px 0' }}>{flag ? 'Rediger' : 'Opret'} Feature Flag</h2>
        <Stack gap="md">
          {!flag && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Key</label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="f.eks. new-booking-flow"
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Navn</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feature navn"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivelse..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', minHeight: '80px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Rollout Type
            </label>
            <select
              value={rolloutType}
              onChange={(e) =>
                setRolloutType(e.target.value as 'global' | 'percentage' | 'targeted')
              }
              style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
            >
              <option value="global">Global (alle saloner)</option>
              <option value="percentage">Percentage (gradvis udrulning)</option>
              <option value="targeted">Targeted (specifikke saloner)</option>
            </select>
          </div>
          {rolloutType === 'percentage' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Percentage: {rolloutPercentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="enabled" style={{ fontWeight: 500 }}>
              Enabled
            </label>
          </div>
          <Stack direction="row" gap="sm" justify="end">
            <Button variant="ghost" onClick={onClose}>
              Annuller
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!name.trim() || (!flag && !key.trim())}
            >
              Gem
            </Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
}

// Rate Limits Tab (Placeholder)
function RateLimitsTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div>
      <h3>Rate Limits</h3>
      <p style={{ opacity: 0.6 }}>Rate limit monitoring coming soon</p>
    </div>
  );
}
