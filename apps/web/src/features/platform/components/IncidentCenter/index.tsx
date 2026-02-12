import { useState, useEffect, useCallback } from 'react';
import { Card, Stack, Badge, Button, Input } from '@nemsalon/ui';
import {
  listIncidents,
  createIncident,
  updateIncident,
  getIncidentTimeline,
  addIncidentTimelineEvent,
} from '../../api/platform-api';
import type { Incident, IncidentTimelineEvent } from '../../types/platform-types';

interface IncidentCenterProps {
  onIncidentSelect?: (incident: Incident) => void;
}

const severityColors = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

const statusOptions = ['open', 'investigating', 'monitoring', 'resolved'] as const;
const severityOptions = ['critical', 'high', 'medium', 'low'] as const;

export function IncidentCenter({ onIncidentSelect }: IncidentCenterProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: string; limit?: number } = { limit: 50 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const result = await listIncidents(params);
      setIncidents(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleCreateIncident = async (data: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }) => {
    try {
      const newIncident = await createIncident(data);
      setIncidents([newIncident, ...incidents]);
      setShowCreateModal(false);
    } catch (err) {
      alert('Failed to create incident: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateStatus = async (
    incidentId: string,
    status: 'open' | 'investigating' | 'monitoring' | 'resolved',
  ) => {
    try {
      const updated = await updateIncident(incidentId, { status });
      setIncidents(incidents.map((i) => (i.id === incidentId ? updated : i)));
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(updated);
      }
    } catch (err) {
      alert('Failed to update incident: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (selectedIncident) {
    return (
      <IncidentDetail
        incident={selectedIncident}
        onBack={() => setSelectedIncident(null)}
        onStatusChange={(status) =>
          handleUpdateStatus(
            selectedIncident.id,
            status as 'open' | 'investigating' | 'monitoring' | 'resolved',
          )
        }
      />
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card>
        <Stack direction="row" gap="md" align="center" justify="between">
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>🚨 Incident Center</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
              Track and manage platform incidents
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Ny Incident
          </Button>
        </Stack>
      </Card>

      {/* Filters */}
      <Card>
        <Stack direction="row" gap="md" align="center">
          <span style={{ fontWeight: 500 }}>Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          >
            <option value="all">Alle statusser</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={loadIncidents}>
            🔄 Genindlæs
          </Button>
        </Stack>
      </Card>

      {/* Incidents List */}
      {loading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Indlæser incidents...</div>
        </Card>
      ) : error ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
        </Card>
      ) : incidents.length === 0 ? (
        <Card>
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3>Ingen aktive incidents</h3>
            <p style={{ opacity: 0.6 }}>Alt ser godt ud!</p>
          </div>
        </Card>
      ) : (
        <Stack gap="sm">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onClick={() => {
                setSelectedIncident(incident);
                onIncidentSelect?.(incident);
              }}
            />
          ))}
        </Stack>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateIncident}
        />
      )}
    </Stack>
  );
}

function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderLeft: `4px solid ${severityColors[incident.severity]}`,
      }}
    >
      <Stack direction="row" gap="md" align="center" justify="between">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '14px', opacity: 0.6 }}>
              #{incident.incidentNumber}
            </span>
            <span
              style={{
                background: severityColors[incident.severity],
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {incident.severity}
            </span>
            <Badge
              variant={
                incident.status === 'resolved'
                  ? 'success'
                  : incident.status === 'open'
                    ? 'error'
                    : 'warning'
              }
            >
              {incident.status}
            </Badge>
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{incident.title}</h3>
          {incident.description && (
            <p style={{ margin: 0, opacity: 0.6, fontSize: '13px' }}>{incident.description}</p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', opacity: 0.5 }}>
            {new Date(incident.startedAt).toLocaleString('da-DK')}
          </div>
          {incident.resolvedAt && (
            <div style={{ fontSize: '12px', opacity: 0.5 }}>
              Løst: {new Date(incident.resolvedAt).toLocaleString('da-DK')}
            </div>
          )}
        </div>
      </Stack>
    </Card>
  );
}

function IncidentDetail({
  incident,
  onBack,
  onStatusChange,
}: {
  incident: Incident;
  onBack: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [newEvent, setNewEvent] = useState('');

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const result = await getIncidentTimeline(incident.id);
        setTimeline(result.data);
      } catch (err) {
        console.error('Failed to load timeline:', err);
      }
    };
    loadTimeline();
  }, [incident.id]);

  const handleAddEvent = async () => {
    if (!newEvent.trim()) return;
    try {
      await addIncidentTimelineEvent(incident.id, {
        eventType: 'update',
        message: newEvent,
      });
      const result = await getIncidentTimeline(incident.id);
      setTimeline(result.data);
      setNewEvent('');
    } catch (err) {
      alert('Failed to add event');
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card>
        <Stack direction="row" gap="md" align="center" justify="between">
          <Stack direction="row" gap="md" align="center">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Tilbage
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ margin: 0, fontSize: '20px' }}>#{incident.incidentNumber}</h1>
                <span
                  style={{
                    background: severityColors[incident.severity],
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {incident.severity}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '14px' }}>
                {incident.title}
              </p>
            </div>
          </Stack>
          <select
            value={incident.status}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px' }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Stack>
      </Card>

      {/* Details */}
      <Card>
        <h3 style={{ margin: '0 0 16px 0' }}>Detaljer</h3>
        <Stack gap="sm">
          <DetailRow label="Beskrivelse" value={incident.description || '-'} />
          <DetailRow label="Root Cause" value={incident.rootCause || '-'} />
          <DetailRow label="Resolution" value={incident.resolution || '-'} />
          <DetailRow label="Startet" value={new Date(incident.startedAt).toLocaleString('da-DK')} />
          {incident.resolvedAt && (
            <DetailRow label="Løst" value={new Date(incident.resolvedAt).toLocaleString('da-DK')} />
          )}
        </Stack>
      </Card>

      {/* Timeline */}
      <Card>
        <h3 style={{ margin: '0 0 16px 0' }}>Timeline</h3>
        <Stack gap="md">
          {timeline.map((event) => (
            <div
              key={event.id}
              style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '6px',
                borderLeft: '3px solid #667eea',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}
              >
                <Badge size="sm">{event.eventType}</Badge>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>
                  {new Date(event.createdAt).toLocaleString('da-DK')}
                </span>
              </div>
              <div>{event.message}</div>
            </div>
          ))}

          {/* Add Event */}
          <Stack direction="row" gap="sm">
            <Input
              placeholder="Tilføj opdatering..."
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={handleAddEvent}>
              Tilføj
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

function CreateIncidentModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');

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
        <h2 style={{ margin: '0 0 20px 0' }}>Opret Incident</h2>
        <Stack gap="md">
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Titel</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kort beskrivelse..."
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaljeret beskrivelse..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', minHeight: '100px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
            >
              {severityOptions.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <Stack direction="row" gap="sm" justify="end">
            <Button variant="ghost" onClick={onClose}>
              Annuller
            </Button>
            <Button
              variant="primary"
              onClick={() => onSubmit({ title, description, severity })}
              disabled={!title.trim()}
            >
              Opret
            </Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
