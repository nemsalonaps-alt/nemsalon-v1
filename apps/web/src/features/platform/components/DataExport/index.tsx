import { useState, useEffect } from 'react';
import { Card, Stack, Badge, Button, Input } from '@nemsalon/ui';
import { listDataExports, createDataExport } from '../../api/platform-api';
import type { DataExport } from '../../types/platform-types';

interface DataExportCenterProps {
  // Props for DataExportCenter can be added here
}

const exportTypeOptions = [
  {
    value: 'full_salon',
    label: 'Komplet salon data',
    description: 'Bookings, kunder, betalinger, medarbejdere',
  },
  { value: 'customer_data', label: 'Kunde data', description: 'Kun kunde information' },
  { value: 'audit_logs', label: 'Audit logs', description: 'Aktivitetslog for salon' },
] as const;

const exportFormatOptions = [
  { value: 'json', label: 'JSON', icon: '{ }' },
  { value: 'csv', label: 'CSV', icon: '📊' },
] as const;

export function DataExportCenter(_props: DataExportCenterProps) {
  const [exports, setExports] = useState<DataExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadExports = async () => {
    setLoading(true);
    try {
      const result = await listDataExports();
      setExports(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  const handleCreateExport = async (data: {
    exportType: 'full_salon' | 'customer_data' | 'audit_logs';
    salonId: string;
    format: 'json' | 'csv';
  }) => {
    try {
      await createDataExport(data);
      await loadExports();
      setShowCreateModal(false);
    } catch (err) {
      alert('Failed to create export: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <Stack gap="lg">
      <Card>
        <Stack direction="row" gap="md" align="center" justify="between">
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>📊 Data & Export</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
              GDPR eksport og data håndtering
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Ny Eksport
          </Button>
        </Stack>
      </Card>

      {loading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser eksport historik...</div>
        </Card>
      ) : error ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
            <div>Fejl: {error}</div>
            <Button variant="primary" onClick={loadExports} style={{ marginTop: '16px' }}>
              Prøv igen
            </Button>
          </div>
        </Card>
      ) : (
        <Stack gap="md">
          {exports.map((export_) => (
            <Card key={export_.id}>
              <Stack direction="row" gap="md" align="center" justify="between">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <Badge
                      variant={
                        export_.status === 'ready'
                          ? 'success'
                          : export_.status === 'processing'
                            ? 'warning'
                            : export_.status === 'failed'
                              ? 'error'
                              : 'default'
                      }
                    >
                      {export_.status}
                    </Badge>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {export_.exportType}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.6 }}>
                      {export_.format}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.6 }}>
                    Salon: {export_.salonId} • Anmodet:{' '}
                    {new Date(export_.createdAt).toLocaleString('da-DK')}
                  </div>
                  {export_.fileSizeBytes && (
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>
                      Størrelse: {(export_.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
                <Stack direction="row" gap="sm">
                  {export_.status === 'ready' && export_.fileUrl && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.open(export_.fileUrl!, '_blank')}
                    >
                      Download
                    </Button>
                  )}
                  {export_.expiresAt && (
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                      Udløber: {new Date(export_.expiresAt).toLocaleDateString('da-DK')}
                    </div>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}

          {exports.length === 0 && (
            <Card>
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <h3>Ingen eksport endnu</h3>
                <p style={{ opacity: 0.6 }}>Klik på &quot;Ny Eksport&quot; for at komme i gang</p>
              </div>
            </Card>
          )}
        </Stack>
      )}

      {showCreateModal && (
        <CreateExportModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateExport}
        />
      )}
    </Stack>
  );
}

function CreateExportModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    exportType: 'full_salon' | 'customer_data' | 'audit_logs';
    salonId: string;
    format: 'json' | 'csv';
  }) => void;
}) {
  const [salonId, setSalonId] = useState('');
  const [exportType, setExportType] = useState<'full_salon' | 'customer_data' | 'audit_logs'>(
    'full_salon',
  );
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!salonId.trim()) return;
    setIsSubmitting(true);
    await onSubmit({ salonId, exportType, format });
    setIsSubmitting(false);
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
        <h2 style={{ margin: '0 0 20px 0' }}>Opret Data Eksport</h2>
        <Stack gap="md">
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Salon ID
            </label>
            <Input
              value={salonId}
              onChange={(e) => setSalonId(e.target.value)}
              placeholder="Indtast salon ID..."
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Eksport Type
            </label>
            <Stack gap="sm">
              {exportTypeOptions.map((type) => (
                <label
                  key={type.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    border: `2px solid ${exportType === type.value ? '#667eea' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: exportType === type.value ? 'rgba(102, 126, 234, 0.05)' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.value}
                    checked={exportType === type.value}
                    onChange={(e) => setExportType(e.target.value as typeof exportType)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{type.label}</div>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>{type.description}</div>
                  </div>
                </label>
              ))}
            </Stack>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Format</label>
            <Stack direction="row" gap="sm">
              {exportFormatOptions.map((fmt) => (
                <Button
                  key={fmt.value}
                  variant={format === fmt.value ? 'primary' : 'ghost'}
                  onClick={() => setFormat(fmt.value as typeof format)}
                  style={{ flex: 1 }}
                >
                  {fmt.icon} {fmt.label}
                </Button>
              ))}
            </Stack>
          </div>

          <Stack direction="row" gap="sm" justify="end" style={{ marginTop: '16px' }}>
            <Button variant="ghost" onClick={onClose}>
              Annuller
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!salonId.trim() || isSubmitting}
            >
              {isSubmitting ? 'Opretter...' : 'Opret Eksport'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
}
