import type {
  PlatformHealth,
  BusinessMetrics,
  RiskRadarData,
  SearchResult,
  Incident,
  IncidentTimelineEvent,
  FeatureFlag,
  QueueStats,
  DataExport,
  PlatformSalon,
  BookingSummary,
  PlatformPayment,
  PlatformAuditEntry,
} from '../types/platform-types';

const API_BASE = '/v1/platform';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Health & Metrics
export async function getPlatformHealth(): Promise<PlatformHealth> {
  return fetchWithAuth(`${API_BASE}/health`);
}

export async function getBusinessMetrics(period: '24h' | '7d' | '30d'): Promise<BusinessMetrics> {
  return fetchWithAuth(`${API_BASE}/metrics?period=${period}`);
}

export async function getRiskRadar(): Promise<RiskRadarData> {
  return fetchWithAuth(`${API_BASE}/risk-radar`);
}

// Search
export async function universalSearch(
  query: string,
  limit: number = 20,
  types?: string[],
): Promise<{ results: SearchResult[]; total: number }> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (types?.length) {
    params.set('types', types.join(','));
  }
  return fetchWithAuth(`${API_BASE}/search?${params}`);
}

// Incidents
export async function listIncidents(params?: {
  status?: string;
  severity?: string;
  limit?: number;
}): Promise<{ data: Incident[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.limit) query.set('limit', String(params.limit));
  return fetchWithAuth(`${API_BASE}/incidents?${query}`);
}

export async function createIncident(data: {
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedSalonIds?: string[];
}): Promise<Incident> {
  return fetchWithAuth(`${API_BASE}/incidents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateIncident(
  incidentId: string,
  data: Partial<Incident>,
): Promise<Incident> {
  return fetchWithAuth(`${API_BASE}/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getIncidentTimeline(
  incidentId: string,
): Promise<{ data: IncidentTimelineEvent[] }> {
  return fetchWithAuth(`${API_BASE}/incidents/${incidentId}/timeline`);
}

export async function addIncidentTimelineEvent(
  incidentId: string,
  data: { eventType: string; message: string; metadata?: Record<string, unknown> },
): Promise<IncidentTimelineEvent> {
  return fetchWithAuth(`${API_BASE}/incidents/${incidentId}/timeline`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// System Operations
export async function getQueueStats(): Promise<{ queues: QueueStats[] }> {
  return fetchWithAuth(`${API_BASE}/queues`);
}

// Feature Flags
export async function listFeatureFlags(): Promise<{ data: FeatureFlag[] }> {
  return fetchWithAuth(`${API_BASE}/feature-flags`);
}

export async function getFeatureFlag(key: string): Promise<FeatureFlag> {
  return fetchWithAuth(`${API_BASE}/feature-flags/${key}`);
}

export async function createFeatureFlag(data: {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutType: 'global' | 'percentage' | 'targeted';
  rolloutPercentage?: number;
  targetedSalonIds?: string[];
}): Promise<FeatureFlag> {
  return fetchWithAuth(`${API_BASE}/feature-flags`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFeatureFlag(
  key: string,
  data: Partial<FeatureFlag>,
): Promise<FeatureFlag> {
  return fetchWithAuth(`${API_BASE}/feature-flags/${key}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Support Actions
export async function resetPassword(userId: string, reason: string): Promise<{ success: boolean }> {
  return fetchWithAuth(`${API_BASE}/support/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
}

export async function unlockAccount(userId: string, reason: string): Promise<{ success: boolean }> {
  return fetchWithAuth(`${API_BASE}/support/unlock-account`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
}

// Data Exports
export async function listDataExports(): Promise<{ data: DataExport[] }> {
  return fetchWithAuth(`${API_BASE}/exports`);
}

export async function createDataExport(data: {
  exportType: 'full_salon' | 'customer_data' | 'audit_logs';
  salonId: string;
  format: 'json' | 'csv';
}): Promise<DataExport> {
  return fetchWithAuth(`${API_BASE}/exports`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Salon Operations
export async function getPlatformSalon(salonId: string): Promise<PlatformSalon> {
  return fetchWithAuth(`${API_BASE}/salons/${salonId}`);
}

export async function listBookingsForSalon(params: {
  salonId: string;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
}): Promise<{ data: BookingSummary[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  return fetchWithAuth(`${API_BASE}/salons/${params.salonId}/bookings?${query}`);
}

export async function listPaymentsForSalon(params: {
  salonId: string;
  status?: string;
  limit?: number;
}): Promise<{ data: PlatformPayment[] }> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  return fetchWithAuth(`${API_BASE}/salons/${params.salonId}/payments?${query}`);
}

export async function listAuditLogs(params: {
  salonId?: string;
  actorUserId?: string;
  entityType?: string;
  limit?: number;
}): Promise<{ data: PlatformAuditEntry[] }> {
  const query = new URLSearchParams();
  if (params.salonId) query.set('salonId', params.salonId);
  if (params.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.limit) query.set('limit', String(params.limit));
  return fetchWithAuth(`${API_BASE}/audit?${query}`);
}

// Revenue Analytics
export async function getRevenueAnalytics(period: '30d' | '90d' | '1y'): Promise<{
  period: string;
  mrr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  dailyStats: Array<{
    date: string;
    mrr: number;
    newSubscriptions: number;
    churned: number;
  }>;
}> {
  return fetchWithAuth(`${API_BASE}/revenue/analytics?period=${period}`);
}

export async function getCohortAnalysis(): Promise<{
  data: Array<{
    cohort: string;
    totalSalons: number;
    retentionRates: number[];
  }>;
}> {
  return fetchWithAuth(`${API_BASE}/revenue/cohorts`);
}

// Subscription Plans
export async function listSubscriptionPlans(): Promise<{
  data: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    priceAmount: number;
    priceCurrency: string;
    billingInterval: string;
    features: string[];
    maxStaff: number | null;
    maxBookingsMonthly: number | null;
    isActive: boolean;
  }>;
}> {
  return fetchWithAuth(`${API_BASE}/subscription-plans`);
}

// Dunning
export async function getDunningStatus(): Promise<{
  cycle1: number;
  cycle2: number;
  cycle3: number;
  failedPermanently: number;
  total: number;
}> {
  return fetchWithAuth(`${API_BASE}/dunning`);
}

// Security Anomalies
export async function listSecurityAnomalies(params?: {
  status?: string;
  severity?: string;
  limit?: number;
}): Promise<{
  data: Array<{
    id: string;
    anomalyType: string;
    userId: string | null;
    salonId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    description: string;
    severity: string;
    status: string;
    investigatedBy: string | null;
    investigatedAt: string | null;
    createdAt: string;
  }>;
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.limit) query.set('limit', String(params.limit));
  return fetchWithAuth(`${API_BASE}/security/anomalies?${query}`);
}
