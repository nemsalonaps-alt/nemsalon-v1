import { useEffect, useState, useCallback } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange, signOut } from '../../lib/auth';
import {
  fetchMe,
  getPlatformSalon,
  listPlatformAudit,
  listPlatformPayments,
  listPlatformSalons,
} from '../console/api';
import type {
  AuthMeResponse,
  PlatformAuditEntry,
  PlatformPayment,
  PlatformSalon,
} from '../console/types';
import type { GateState } from '../onboarding/types';
import { Card, Stack, Input, Button } from '@nemsalon/ui';
import { FeatureState } from '../../components/FeatureState';
import { getCopy, getStoredLocale, resolveLocale } from '../../i18n';
import { formatPrice } from '@nemsalon/shared';
import './platform-console.css';
import { MissionControl } from './components/MissionControl';
import { GlobalSearch } from './components/GlobalSearch';
import { IncidentCenter } from './components/IncidentCenter';
import { SystemOperations } from './components/SystemOperations';
import { RevenueControl } from './components/RevenueControl';
import { SupportTools } from './components/SupportTools';
import { SecurityCenter } from './components/SecurityCenter';
import { DataExportCenter } from './components/DataExport';
import type { TabKey } from './types/platform-types';

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
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentLimit, setPaymentLimit] = useState(25);
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const rootCopy = getCopy();
  const copy = rootCopy.platformConsole;
  const resolvedLocale = resolveLocale(getStoredLocale());
  const dateLocale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';

  const [activeTab, setActiveTab] = useState<TabKey>('mission-control');

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'mission-control', label: 'Mission Control', icon: '🎯' },
    { key: 'search', label: 'Global Search', icon: '🔍' },
    { key: 'salons', label: 'Saloner', icon: '🏢' },
    { key: 'incidents', label: 'Hændelser', icon: '🚨' },
    { key: 'system-ops', label: 'System', icon: '⚙️' },
    { key: 'revenue', label: 'Indtægter', icon: '💰' },
    { key: 'support', label: 'Support', icon: '🛠️' },
    { key: 'security', label: 'Sikkerhed', icon: '🔒' },
    { key: 'data', label: 'Data', icon: '📊' },
  ];

  const handleGateRetry = () => {
    setGateState('recovering');
  };

  useEffect(() => {
    if (gateState !== 'recovering') return;
    const timer = setTimeout(() => setGateState('checking'), 100);
    return () => clearTimeout(timer);
  }, [gateState]);

  const formatCurrency = useCallback(
    (amount: number, currency: string) => formatPrice(amount, currency, dateLocale),
    [dateLocale],
  );

  const loadSalons = useCallback(async () => {
    const salonsResult = await listPlatformSalons({
      limit: 50,
      status: salonStatus === 'all' ? undefined : salonStatus,
      query: salonQuery || undefined,
    });
    if (salonsResult.ok) {
      setSalons(salonsResult.data.data);
      setLoadError(null);
    } else {
      setStatusMessage(salonsResult.error);
      setLoadError(salonsResult.error);
    }
  }, [salonStatus, salonQuery]);

  const loadSalonDetail = useCallback(async (salonId: string) => {
    const detail = await getPlatformSalon(salonId);
    if (detail.ok) {
      setSelectedSalon(detail.data);
      setLoadError(null);
    } else {
      setStatusMessage(detail.error);
      setLoadError(detail.error);
    }
  }, []);

  const loadPayments = useCallback(
    async (salonId: string) => {
      setPaymentsLoading(true);
      setPaymentsError(null);
      const result = await listPlatformPayments({
        salonId,
        status: paymentStatus === 'all' ? undefined : paymentStatus,
        limit: paymentLimit,
      });
      setPaymentsLoading(false);
      if (result.ok) {
        setPayments(result.data.data);
        setLoadError(null);
        return;
      }
      setStatusMessage(result.error);
      setPaymentsError(result.error);
      setLoadError(result.error);
    },
    [paymentStatus, paymentLimit],
  );

  const handleLogout = useCallback(async () => {
    await signOut();
    window.location.href = '/login';
  }, []);

  const hydrate = useCallback(
    async (meData: AuthMeResponse) => {
      setIsLoading(true);
      setLoadError(null);
      setAuditLoading(true);
      setAuditError(null);
      setMe(meData);
      setGateState('ready');
      const auditResult = await listPlatformAudit({ limit: 10 });
      if (auditResult.ok) {
        setAudit(auditResult.data.data);
      } else {
        setStatusMessage(auditResult.error);
        setLoadError(auditResult.error);
        setAuditError(auditResult.error);
      }
      setAuditLoading(false);
      await loadSalons();
      setIsLoading(false);
    },
    [loadSalons],
  );

  const handleRecover = useCallback(async () => {
    setIsRecovering(true);
    setLoadError(null);
    setAuditLoading(true);
    setAuditError(null);
    try {
      const auditResult = await listPlatformAudit({ limit: 10 });
      if (auditResult.ok) {
        setAudit(auditResult.data.data);
      } else {
        setLoadError(auditResult.error);
        setAuditError(auditResult.error);
      }
      await loadSalons();
    } finally {
      setAuditLoading(false);
      setIsRecovering(false);
    }
  }, [loadSalons]);

  useEffect(() => {
    if (gateState !== 'checking' || hydrated) return;
    let active = true;
    const load = async () => {
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
    };
    load();
    return () => {
      active = false;
    };
  }, [gateState, hydrated, hydrate]);

  useEffect(() => {
    if (!skipGate || !initialMe || hydrated) return;
    setHydrated(true);
    hydrate(initialMe);
  }, [skipGate, initialMe, hydrated, hydrate]);

  useEffect(() => {
    if (gateState !== 'ready') return;
    loadSalons();
  }, [gateState, loadSalons]);

  useEffect(() => {
    if (!selectedSalonId) {
      setSelectedSalon(null);
      setPayments([]);
      setPaymentsError(null);
      return;
    }
    loadSalonDetail(selectedSalonId);
    loadPayments(selectedSalonId);
  }, [selectedSalonId, loadSalonDetail, loadPayments]);

  useEffect(() => {
    if (!selectedSalonId) return;
    loadPayments(selectedSalonId);
  }, [paymentStatus, paymentLimit, loadPayments]);

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
      <div className="pc-gate">
        <Gate state={gateState} onRetry={handleGateRetry} />
      </div>
    );
  }

  if (isLoading || (loadError && salons.length === 0 && audit.length === 0)) {
    return (
      <div className="pc-gate">
        <FeatureState
          status={isLoading ? 'loading' : isRecovering ? 'recovery' : 'error'}
          title={isLoading ? copy.loadingTitle : copy.errorTitle}
          description={isLoading ? copy.loadingBody : undefined}
          error={loadError}
          onRetry={handleRecover}
          retryLabel={copy.retry}
          testId="platform-console-fallback"
        />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mission-control':
        return (
          <MissionControl
            onSalonClick={(salonId) => {
              setSelectedSalonId(salonId);
              setActiveTab('salons');
            }}
          />
        );
      case 'search':
        return (
          <GlobalSearch
            onSalonClick={(salonId) => {
              setSelectedSalonId(salonId);
              setActiveTab('salons');
            }}
          />
        );
      case 'salons':
        return (
          <Stack gap="lg">
            <Card>
              <h2>{copy.filters.title}</h2>
              <Stack direction="row" gap="md" className="pc-wrap">
                <label className="pc-col">
                  <span className="pc-filter-label">{copy.filters.statusLabel}</span>
                  <select
                    className="pc-select"
                    value={salonStatus}
                    onChange={(event) => setSalonStatus(event.target.value)}
                  >
                    <option value="all">{copy.filters.statusAll}</option>
                    <option value="draft">{copy.filters.statusDraft}</option>
                    <option value="active">{copy.filters.statusActive}</option>
                  </select>
                </label>
                <Input
                  label={copy.filters.searchLabel}
                  value={salonQuery}
                  onChange={(event) => setSalonQuery(event.target.value)}
                  placeholder={copy.filters.searchPlaceholder}
                  className="pc-col"
                />
                <div className="pc-col">
                  <span className="pc-filter-label">{copy.filters.actionsLabel}</span>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => loadSalons()}
                    className="pc-action-button"
                  >
                    {copy.filters.refresh}
                  </Button>
                </div>
              </Stack>
            </Card>

            <Card>
              <h2>{copy.salons.title}</h2>
              <Stack gap="sm">
                {salons.map((salon) => (
                  <button
                    key={salon.id}
                    className={[
                      'pc-salon-row',
                      selectedSalonId === salon.id ? 'pc-salon-row-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedSalonId(salon.id)}
                  >
                    <div>
                      <strong>{salon.name}</strong>
                      <div className="pc-salon-meta">
                        {copy.salons.statusLabel}: {salon.status ?? copy.salons.statusUnknown}
                      </div>
                    </div>
                    <div className="pc-salon-meta">
                      {salon.currency}
                      {rootCopy.inlineSeparator}
                      {salon.timezone}
                      {rootCopy.inlineSeparator}
                      {salon.salonType ?? copy.salons.typeFallback}
                    </div>
                  </button>
                ))}
                {salons.length === 0 && <div className="pc-muted">{copy.salons.empty}</div>}
              </Stack>
            </Card>

            {selectedSalon && (
              <Card variant="outlined">
                <h2>{copy.salonDetails.title}</h2>
                <Stack direction="row" gap="md" className="pc-details-row">
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.idLabel}</div>
                    <strong>{selectedSalon.id}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.statusLabel}</div>
                    <strong>{selectedSalon.status ?? copy.salons.statusUnknown}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.localeLabel}</div>
                    <strong>{selectedSalon.locale}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.typeLabel}</div>
                    <strong>{selectedSalon.salonType ?? copy.salonDetails.typeFallback}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.timezoneLabel}</div>
                    <strong>{selectedSalon.timezone}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.currencyLabel}</div>
                    <strong>{selectedSalon.currency}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">
                      {copy.salonDetails.cancellationWindowLabel}
                    </div>
                    <strong>
                      {selectedSalon.cancellationWindowMinutes} {copy.minutesShort}
                    </strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.createdLabel}</div>
                    <strong>{new Date(selectedSalon.createdAt).toLocaleString(dateLocale)}</strong>
                  </div>
                  <div className="pc-col">
                    <div className="pc-detail-label">{copy.salonDetails.updatedLabel}</div>
                    <strong>{new Date(selectedSalon.updatedAt).toLocaleString(dateLocale)}</strong>
                  </div>
                </Stack>
              </Card>
            )}

            {selectedSalonId && (
              <Card variant="outlined">
                <h2>{copy.payments.title}</h2>
                <Stack direction="row" gap="md" className="pc-payments-row">
                  <label className="pc-col">
                    <span className="pc-filter-label">{copy.payments.statusLabel}</span>
                    <select
                      className="pc-select"
                      value={paymentStatus}
                      onChange={(event) => setPaymentStatus(event.target.value)}
                    >
                      <option value="all">{copy.paymentStatuses.all}</option>
                      <option value="created">{copy.paymentStatuses.created}</option>
                      <option value="requires_action">
                        {copy.paymentStatuses.requires_action}
                      </option>
                      <option value="processing">{copy.paymentStatuses.processing}</option>
                      <option value="pending">{copy.paymentStatuses.pending}</option>
                      <option value="paid">{copy.paymentStatuses.paid}</option>
                      <option value="succeeded">{copy.paymentStatuses.succeeded}</option>
                      <option value="failed">{copy.paymentStatuses.failed}</option>
                      <option value="refunded">{copy.paymentStatuses.refunded}</option>
                      <option value="canceled">{copy.paymentStatuses.canceled}</option>
                    </select>
                  </label>
                  <Input
                    label={copy.payments.limitLabel}
                    type="number"
                    min={1}
                    max={200}
                    value={paymentLimit}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setPaymentLimit(Number.isFinite(next) ? next : 25);
                    }}
                    className="pc-col"
                  />
                  <div className="pc-col">
                    <span className="pc-filter-label">{copy.payments.actionsLabel}</span>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => loadPayments(selectedSalonId)}
                      className="pc-action-button"
                    >
                      {copy.payments.refresh}
                    </Button>
                  </div>
                </Stack>
                {(paymentsLoading || paymentsError) && payments.length === 0 ? (
                  <FeatureState
                    status={paymentsLoading ? 'loading' : 'error'}
                    title={paymentsLoading ? copy.payments.loadingTitle : copy.payments.errorTitle}
                    description={paymentsLoading ? copy.payments.loadingBody : undefined}
                    error={paymentsError ?? undefined}
                    onRetry={paymentsError ? () => loadPayments(selectedSalonId) : undefined}
                    retryLabel={copy.retry}
                    testId="platform-payments-fallback"
                  />
                ) : (
                  <Stack gap="sm" className="pc-payments-list">
                    {payments.map((payment) => (
                      <div key={payment.id} className="pc-payment-row">
                        <div>
                          <strong>{payment.status}</strong>
                          <div className="pc-salon-meta">
                            {payment.provider}
                            {rootCopy.inlineSeparator}
                            {payment.bookingId}
                          </div>
                        </div>
                        <div className="pc-salon-meta">
                          {formatCurrency(payment.amount, payment.currency)}
                        </div>
                      </div>
                    ))}
                    {payments.length === 0 && <div className="pc-muted">{copy.payments.empty}</div>}
                  </Stack>
                )}
              </Card>
            )}
          </Stack>
        );
      case 'incidents':
        return <IncidentCenter />;
      case 'system-ops':
        return <SystemOperations />;
      case 'revenue':
        return <RevenueControl />;
      case 'support':
        return <SupportTools />;
      case 'security':
        return <SecurityCenter />;
      case 'data':
        return <DataExportCenter />;
      default:
        return null;
    }
  };

  return (
    <Stack gap="lg" className="pc-root">
      <Stack direction="row" gap="md" align="center" justify="between">
        <div>
          <p data-testid="platform-admin-title" className="pc-header-badge">
            {copy.header.badge}
          </p>
          <h1>{copy.header.title}</h1>
          <p className="pc-muted">{me?.user?.email ?? copy.header.signedInFallback}</p>
        </div>
        <Stack direction="row" gap="md">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            {copy.header.logout}
          </Button>
        </Stack>
      </Stack>

      {statusMessage && (
        <Card variant="outlined" className="pc-status-card">
          <p className="pc-status-text">{statusMessage}</p>
        </Card>
      )}

      <div className="pc-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`pc-tab ${activeTab === tab.key ? 'pc-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="pc-tab-icon">{tab.icon}</span>
            <span className="pc-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="pc-tab-content">{renderTabContent()}</div>

      <Card variant="outlined">
        <h2>{copy.audit.title}</h2>
        {(auditLoading || auditError) && audit.length === 0 ? (
          <FeatureState
            status={auditLoading ? 'loading' : 'error'}
            title={auditLoading ? copy.loadingTitle : copy.errorTitle}
            description={auditLoading ? copy.loadingBody : undefined}
            error={auditError ?? undefined}
            onRetry={auditError ? handleRecover : undefined}
            retryLabel={copy.retry}
            testId="platform-audit-fallback"
          />
        ) : (
          <Stack gap="sm">
            {audit.map((entry) => (
              <div key={entry.id} className="pc-audit-row">
                <div>
                  <strong>{entry.action}</strong>
                  <div className="pc-salon-meta">
                    {entry.entityType ?? copy.audit.entityFallback} {entry.entityId ?? ''}
                  </div>
                </div>
                <div className="pc-salon-meta">
                  {new Date(entry.createdAt).toLocaleTimeString(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            {audit.length === 0 && <div className="pc-muted">{copy.audit.empty}</div>}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
