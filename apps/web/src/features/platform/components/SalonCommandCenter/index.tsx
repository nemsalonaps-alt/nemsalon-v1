import { useState, useEffect } from 'react';
import { Card, Stack, Badge, Button, Tabs } from '@nemsalon/ui';
import {
  getPlatformSalon,
  listBookingsForSalon,
  listPaymentsForSalon,
  listAuditLogs,
} from '../../api/platform-api';
import type {
  PlatformSalon,
  BookingSummary,
  PlatformPayment,
  PlatformAuditEntry,
} from '../../types/platform-types';

interface SalonCommandCenterProps {
  salonId: string;
  onBack?: () => void;
}

const salonTabs = [
  { key: 'overview', label: 'Oversigt' },
  { key: 'bookings', label: 'Bookinger' },
  { key: 'payments', label: 'Betalinger' },
  { key: 'notifications', label: 'Notifikationer' },
  { key: 'errors', label: 'Fejl' },
  { key: 'audit', label: 'Audit' },
] as const;

export function SalonCommandCenter({ salonId, onBack }: SalonCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [salon, setSalon] = useState<PlatformSalon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states for each tab
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditEntry[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Load salon details
  useEffect(() => {
    const loadSalon = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPlatformSalon(salonId);
        setSalon(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load salon');
      } finally {
        setLoading(false);
      }
    };

    loadSalon();
  }, [salonId]);

  // Load tab data
  useEffect(() => {
    const loadTabData = async () => {
      setTabLoading(true);
      try {
        switch (activeTab) {
          case 'bookings': {
            const bookingsResult = await listBookingsForSalon({ salonId, limit: 50 });
            setBookings(bookingsResult.data ?? []);
            break;
          }
          case 'payments': {
            const paymentsResult = await listPaymentsForSalon({ salonId, limit: 50 });
            setPayments(paymentsResult.data ?? []);
            break;
          }
          case 'audit': {
            const auditResult = await listAuditLogs({ salonId, limit: 50 });
            setAuditLogs(auditResult.data ?? []);
            break;
          }
        }
      } catch (err) {
        console.error('Failed to load tab data:', err);
      } finally {
        setTabLoading(false);
      }
    };

    if (['bookings', 'payments', 'audit'].includes(activeTab)) {
      loadTabData();
    }
  }, [activeTab, salonId]);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div>Indlæser salon...</div>
        </div>
      </Card>
    );
  }

  if (error || !salon) {
    return (
      <Card>
        <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
          <div>Fejl: {error || 'Salon ikke fundet'}</div>
          {onBack && (
            <Button variant="primary" onClick={onBack} style={{ marginTop: '16px' }}>
              Tilbage
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card>
        <Stack direction="row" gap="md" align="center" justify="between">
          <Stack direction="row" gap="md" align="center">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Tilbage
              </Button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>{salon.name}</h1>
                <Badge variant={salon.status === 'active' ? 'success' : 'warning'}>
                  {salon.status}
                </Badge>
              </div>
              <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
                {salon.id} • {salon.locale} • {salon.timezone}
              </p>
            </div>
          </Stack>
          <Stack direction="row" gap="sm">
            <Button variant="primary" size="sm">
              Impersoner
            </Button>
            <Button variant="ghost" size="sm">
              Rediger
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={salonTabs.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <Card>
        {tabLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser...</div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab salon={salon} />}
            {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
            {activeTab === 'payments' && <PaymentsTab payments={payments} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'errors' && <ErrorsTab />}
            {activeTab === 'audit' && <AuditTab logs={auditLogs} />}
          </>
        )}
      </Card>
    </Stack>
  );
}

// Overview Tab
function OverviewTab({ salon }: { salon: PlatformSalon }) {
  return (
    <Stack gap="lg">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <MetricCard label="Status" value={salon.status ?? 'Ukendt'} />
        <MetricCard label="Valuta" value={salon.currency} />
        <MetricCard label="Timezone" value={salon.timezone} />
        <MetricCard label="Locale" value={salon.locale} />
        <MetricCard
          label="Oprettet"
          value={new Date(salon.createdAt).toLocaleDateString('da-DK')}
        />
        <MetricCard
          label="Senest opdateret"
          value={new Date(salon.updatedAt).toLocaleDateString('da-DK')}
        />
      </div>

      <div style={{ padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Detaljer</h3>
        <Stack gap="sm">
          <DetailRow label="ID" value={salon.id} />
          <DetailRow label="Slug" value={salon.slug ?? '-'} />
          <DetailRow label="Type" value={salon.salonType ?? '-'} />
          <DetailRow label="Afbudsperiode" value={`${salon.cancellationWindowMinutes} minutter`} />
        </Stack>
      </div>
    </Stack>
  );
}

// Bookings Tab
function BookingsTab({ bookings }: { bookings: BookingSummary[] }) {
  if (bookings.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
        Ingen bookinger fundet
      </div>
    );
  }

  return (
    <Stack gap="sm">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{booking.id.slice(0, 8)}</div>
            <div style={{ fontSize: '13px', opacity: 0.6 }}>
              {new Date(booking.startTime).toLocaleString('da-DK')}
            </div>
          </div>
          <Stack direction="row" gap="sm" align="center">
            <Badge
              variant={
                booking.status === 'confirmed'
                  ? 'success'
                  : booking.status === 'pending'
                    ? 'warning'
                    : 'default'
              }
            >
              {booking.status}
            </Badge>
            <span style={{ fontWeight: 600 }}>
              {booking.totalAmount} {booking.currency}
            </span>
          </Stack>
        </div>
      ))}
    </Stack>
  );
}

// Payments Tab
function PaymentsTab({ payments }: { payments: PlatformPayment[] }) {
  if (payments.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
        Ingen betalinger fundet
      </div>
    );
  }

  return (
    <Stack gap="sm">
      {payments.map((payment) => (
        <div
          key={payment.id}
          style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{payment.id.slice(0, 8)}</div>
            <div style={{ fontSize: '13px', opacity: 0.6 }}>
              {payment.provider} • {payment.bookingId.slice(0, 8)}
            </div>
          </div>
          <Stack direction="row" gap="sm" align="center">
            <Badge
              variant={
                payment.status === 'succeeded' || payment.status === 'paid'
                  ? 'success'
                  : payment.status === 'failed'
                    ? 'error'
                    : 'warning'
              }
            >
              {payment.status}
            </Badge>
            <span style={{ fontWeight: 600 }}>
              {payment.amount} {payment.currency}
            </span>
          </Stack>
        </div>
      ))}
    </Stack>
  );
}

// Notifications Tab (placeholder)
function NotificationsTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
      <div>Notifikationer vises her</div>
      <div style={{ fontSize: '13px', marginTop: '8px' }}>Kommer snart</div>
    </div>
  );
}

// Errors Tab (placeholder)
function ErrorsTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <div>Fejl vises her</div>
      <div style={{ fontSize: '13px', marginTop: '8px' }}>Kommer snart</div>
    </div>
  );
}

// Audit Tab
function AuditTab({ logs }: { logs: PlatformAuditEntry[] }) {
  if (logs.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>Ingen audit logs</div>
    );
  }

  return (
    <Stack gap="sm">
      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 500 }}>{log.action}</span>
            <span style={{ fontSize: '12px', opacity: 0.5 }}>
              {new Date(log.createdAt).toLocaleString('da-DK')}
            </span>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.6 }}>
            {log.entityType} {log.entityId ? `• ${log.entityId.slice(0, 8)}` : ''}
          </div>
        </div>
      ))}
    </Stack>
  );
}

// Helper Components
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'rgba(0,0,0,0.02)',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '16px' }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
