import { useEffect, useState } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange } from '../../lib/auth';
import {
  fetchMe,
  getPlatformSalon,
  listPlatformAudit,
  listPlatformPayments,
  listPlatformSalons
} from '../console/api';
import type {
  AuthMeResponse,
  PlatformAuditEntry,
  PlatformPayment,
  PlatformSalon
} from '../console/types';
import type { GateState } from '../onboarding/types';

type PlatformGateState = GateState | 'ready';

type PlatformConsoleProps = {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
};

export function PlatformConsole({ initialMe = null, skipGate = false }: PlatformConsoleProps = {}) {
  const [gateState, setGateState] = useState<PlatformGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe);
  const [salons, setSalons] = useState<PlatformSalon[]>([]);
  const [salonStatus, setSalonStatus] = useState('all');
  const [salonQuery, setSalonQuery] = useState('');
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');
  const [selectedSalon, setSelectedSalon] = useState<PlatformSalon | null>(null);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentLimit, setPaymentLimit] = useState(25);
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);

  function formatCurrency(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat('da-DK', { style: 'currency', currency }).format(amount / 100);
    } catch {
      return `${(amount / 100).toFixed(2)} ${currency}`;
    }
  }

  async function loadSalons() {
    const salonsResult = await listPlatformSalons({
      limit: 50,
      status: salonStatus === 'all' ? undefined : salonStatus,
      query: salonQuery || undefined
    });
    if (salonsResult.ok) {
      setSalons(salonsResult.data.data);
    } else {
      setStatusMessage(salonsResult.error);
    }
  }

  async function loadSalonDetail(salonId: string) {
    const detail = await getPlatformSalon(salonId);
    if (detail.ok) {
      setSelectedSalon(detail.data);
    } else {
      setStatusMessage(detail.error);
    }
  }

  async function loadPayments(salonId: string) {
    const result = await listPlatformPayments({
      salonId,
      status: paymentStatus === 'all' ? undefined : paymentStatus,
      limit: paymentLimit
    });
    if (result.ok) {
      setPayments(result.data.data);
    } else {
      setStatusMessage(result.error);
    }
  }

  async function hydrate(meData: AuthMeResponse) {
    setMe(meData);
    setGateState('ready');
    const auditResult = await listPlatformAudit({ limit: 10 });
    if (auditResult.ok) {
      setAudit(auditResult.data.data);
    } else {
      setStatusMessage(auditResult.error);
    }
    await loadSalons();
  }

  useEffect(() => {
    if (gateState !== 'checking' || hydrated) return;
    let active = true;
    async function load() {
      const meResult = await fetchMe();
      if (!active) return;
      if (!meResult.ok) {
        if (meResult.status === 401 || meResult.status === 403) {
          setGateState('needs-login');
        } else {
          setGateState('error');
        }
        return;
      }
      setHydrated(true);
      await hydrate(meResult.data);
    }
    load();
    return () => {
      active = false;
    };
  }, [gateState, hydrated]);

  useEffect(() => {
    if (!skipGate || !initialMe || hydrated) return;
    setHydrated(true);
    hydrate(initialMe);
  }, [skipGate, initialMe, hydrated]);

  useEffect(() => {
    if (gateState !== 'ready') return;
    loadSalons();
  }, [salonStatus, salonQuery, gateState]);

  useEffect(() => {
    if (!selectedSalonId) {
      setSelectedSalon(null);
      setPayments([]);
      return;
    }
    loadSalonDetail(selectedSalonId);
    loadPayments(selectedSalonId);
  }, [selectedSalonId]);

  useEffect(() => {
    if (!selectedSalonId) return;
    loadPayments(selectedSalonId);
  }, [paymentStatus, paymentLimit]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setGateState('checking');
      setHydrated(false);
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  if (gateState !== 'ready') {
    return (
      <div className="app">
        <Gate state={gateState} onRetry={() => setGateState('checking')} />
      </div>
    );
  }

  return (
    <div className="app console">
      <header className="console-header">
        <div>
          <p className="eyebrow">Platform Admin</p>
          <h1>Overview</h1>
          <p className="muted">{me?.user?.email ?? 'Signed in'}</p>
        </div>
        <div className="status-pill">
          <span>Salons</span>
          <strong>{salons.length}</strong>
        </div>
      </header>

      {statusMessage && <div className="console-banner">{statusMessage}</div>}

      <section className="panel">
        <h2>Filters</h2>
        <div className="grid three">
          <label className="field">
            <span className="label">Status</span>
            <select
              className="select"
              value={salonStatus}
              onChange={(event) => setSalonStatus(event.target.value)}
            >
              <option value="all">Alle</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Søg salon</span>
            <input
              className="input"
              value={salonQuery}
              onChange={(event) => setSalonQuery(event.target.value)}
              placeholder="Navn"
            />
          </label>
          <div className="field">
            <span className="label">Handlinger</span>
            <button className="btn ghost" type="button" onClick={() => loadSalons()}>
              Opdater liste
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Salons</h2>
        <div className="list">
          {salons.map((salon) => (
            <button
              key={salon.id}
              className={`list-card ${selectedSalonId === salon.id ? 'active' : ''}`}
              onClick={() => setSelectedSalonId(salon.id)}
            >
              <div>
                <strong>{salon.name}</strong>
                <div className="muted">Status: {salon.status ?? 'unknown'}</div>
              </div>
              <div className="muted">
                {salon.currency} · {salon.timezone} · {salon.salonType ?? 'type: n/a'}
              </div>
            </button>
          ))}
          {salons.length === 0 && <div className="muted">Ingen saloner.</div>}
        </div>
      </section>

      <section className="panel">
        <h2>Salon detaljer</h2>
        {selectedSalon ? (
          <div className="grid two">
            <div>
              <div className="muted">ID</div>
              <strong>{selectedSalon.id}</strong>
            </div>
            <div>
              <div className="muted">Status</div>
              <strong>{selectedSalon.status ?? 'unknown'}</strong>
            </div>
            <div>
              <div className="muted">Locale</div>
              <strong>{selectedSalon.locale}</strong>
            </div>
            <div>
              <div className="muted">Type</div>
              <strong>{selectedSalon.salonType ?? 'n/a'}</strong>
            </div>
            <div>
              <div className="muted">Timezone</div>
              <strong>{selectedSalon.timezone}</strong>
            </div>
            <div>
              <div className="muted">Currency</div>
              <strong>{selectedSalon.currency}</strong>
            </div>
            <div>
              <div className="muted">Cancellation window</div>
              <strong>{selectedSalon.cancellationWindowMinutes} min</strong>
            </div>
            <div>
              <div className="muted">Created</div>
              <strong>{new Date(selectedSalon.createdAt).toLocaleString('da-DK')}</strong>
            </div>
            <div>
              <div className="muted">Updated</div>
              <strong>{new Date(selectedSalon.updatedAt).toLocaleString('da-DK')}</strong>
            </div>
          </div>
        ) : (
          <div className="muted">Vælg en salon for detaljer.</div>
        )}
      </section>

      <section className="panel">
        <h2>Payments</h2>
        {!selectedSalonId && <div className="muted">Vælg en salon for at se payments.</div>}
        {selectedSalonId && (
          <>
            <div className="grid three">
              <label className="field">
                <span className="label">Status</span>
                <select
                  className="select"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                >
                  <option value="all">Alle</option>
                  <option value="created">Created</option>
                  <option value="requires_action">Requires action</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="canceled">Canceled</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Antal</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={200}
                  value={paymentLimit}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setPaymentLimit(Number.isFinite(next) ? next : 25);
                  }}
                />
              </label>
              <div className="field">
                <span className="label">Handlinger</span>
                <button className="btn ghost" type="button" onClick={() => loadPayments(selectedSalonId)}>
                  Opdater payments
                </button>
              </div>
            </div>
            <div className="list">
              {payments.map((payment) => (
                <div key={payment.id} className="list-card">
                  <div>
                    <strong>{payment.status}</strong>
                    <div className="muted">
                      {payment.provider} · {payment.booking_id}
                    </div>
                  </div>
                  <div className="muted">
                    {formatCurrency(payment.amount, payment.currency)}
                  </div>
                </div>
              ))}
              {payments.length === 0 && <div className="muted">Ingen payments.</div>}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Seneste audit</h2>
        <div className="list">
          {audit.map((entry) => (
            <div key={entry.id} className="list-card">
              <div>
                <strong>{entry.action}</strong>
                <div className="muted">
                  {entry.entity_type ?? 'entity'} {entry.entity_id ?? ''}
                </div>
              </div>
              <div className="muted">
                {new Date(entry.created_at).toLocaleTimeString('da-DK', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
          {audit.length === 0 && <div className="muted">Ingen audit events.</div>}
        </div>
      </section>
    </div>
  );
}
