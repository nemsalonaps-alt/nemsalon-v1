import { useState } from 'react';
import { Card, Stack, Button, Input } from '@nemsalon/ui';
import { resetPassword, unlockAccount } from '../../api/platform-api';

interface SupportToolsProps {
  salonId?: string;
}

const quickActions = [
  {
    id: 'reset-password',
    label: 'Reset Password',
    icon: '🔐',
    description: 'Send password reset email to user',
    requiresUserId: true,
  },
  {
    id: 'unlock-account',
    label: 'Unlock Account',
    icon: '🔓',
    description: 'Unlock a locked user account',
    requiresUserId: true,
  },
];

export function SupportTools(_props: SupportToolsProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExecuteAction = async () => {
    if (!selectedAction || !targetId || !reason) return;

    setLoading(true);
    setResult(null);

    try {
      switch (selectedAction) {
        case 'reset-password':
          await resetPassword(targetId, reason);
          setResult({ success: true, message: 'Password reset email sent successfully' });
          break;
        case 'unlock-account':
          await unlockAccount(targetId, reason);
          setResult({ success: true, message: 'Account unlocked successfully' });
          break;
        default:
          setResult({ success: false, message: 'Action not implemented yet' });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedActionData = quickActions.find((a) => a.id === selectedAction);

  return (
    <Stack gap="lg">
      <Card>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🛠️ Support Superpowers</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
            One-click tools for customer support
          </p>
        </div>
      </Card>

      <div>
        <h3 style={{ margin: '0 0 16px 0' }}>Hurtige Handlinger</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {quickActions.map((action) => (
            <Card
              key={action.id}
              onClick={() => {
                setSelectedAction(action.id);
                setResult(null);
              }}
              style={{
                cursor: 'pointer',
                border:
                  selectedAction === action.id ? '2px solid #667eea' : '1px solid rgba(0,0,0,0.1)',
                background: selectedAction === action.id ? 'rgba(102, 126, 234, 0.05)' : 'white',
              }}
            >
              <Stack gap="sm">
                <div style={{ fontSize: '32px' }}>{action.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{action.label}</div>
                <div style={{ fontSize: '13px', opacity: 0.6 }}>{action.description}</div>
              </Stack>
            </Card>
          ))}
        </div>
      </div>

      {selectedActionData && (
        <Card style={{ background: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>
            {selectedActionData.icon} {selectedActionData.label}
          </h3>
          <Stack gap="md">
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                User ID
              </label>
              <Input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Indtast user ID..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Begrundelse (påkrævet)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Hvorfor udfører du denne handling?..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.2)',
                  minHeight: '80px',
                }}
              />
            </div>
            <Stack direction="row" gap="sm">
              <Button
                variant="primary"
                onClick={handleExecuteAction}
                disabled={!targetId || !reason || loading}
              >
                {loading ? 'Udfører...' : 'Udfør Handling'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedAction(null);
                  setTargetId('');
                  setReason('');
                  setResult(null);
                }}
              >
                Annuller
              </Button>
            </Stack>
          </Stack>

          {result && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '6px',
                background: result.success ? '#dcfce7' : '#fee2e2',
                color: result.success ? '#166534' : '#991b1b',
              }}
            >
              {result.success ? '✓' : '✗'} {result.message}
            </div>
          )}
        </Card>
      )}

      <RecentActivityLog />
    </Stack>
  );
}

function RecentActivityLog() {
  return (
    <Card>
      <h3 style={{ margin: '0 0 16px 0' }}>📝 Seneste Aktivitet</h3>
      <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
        Ingen aktivitet at vise
      </div>
    </Card>
  );
}
