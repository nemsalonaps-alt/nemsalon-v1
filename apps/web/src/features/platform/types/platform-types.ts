export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  responseTimeMs: number;
  details?: Record<string, unknown>;
}

export interface PlatformHealth {
  checks: HealthCheck[];
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

export interface BusinessMetrics {
  salons: {
    active: number;
    total: number;
  };
  gmv: {
    amount: number;
    currency: string;
    period: string;
  };
  mrr: number;
  churnRate: number;
  failedPayments: number;
  refundRate: number;
}

export interface RiskSalon {
  id: string;
  name: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Record<string, unknown>;
}

export interface RiskRadarData {
  atRisk: RiskSalon[];
  paymentIssues: RiskSalon[];
  highCancelRate: RiskSalon[];
  errorSpikes: RiskSalon[];
  decliningUsage: RiskSalon[];
}

export type SearchResultType = 'salon' | 'booking' | 'payment' | 'customer' | 'staff' | 'user';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  salonId: string;
  status: string;
}

export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string | null;
  status: 'open' | 'investigating' | 'monitoring' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  rootCause: string | null;
  resolution: string | null;
  startedAt: string;
  resolvedAt: string | null;
  createdBy: string | null;
  resolvedBy: string | null;
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  eventType: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutType: 'global' | 'percentage' | 'targeted';
  rolloutPercentage: number | null;
  targetedSalonIds: string[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  lastUpdated: string;
}

export interface DataExport {
  id: string;
  exportType: 'full_salon' | 'customer_data' | 'audit_logs';
  format: 'json' | 'csv';
  salonId: string | null;
  requestedBy: string;
  status: 'pending' | 'processing' | 'ready' | 'expired' | 'failed';
  fileUrl: string | null;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: 'month' | 'year';
  features: string[];
  maxStaff: number | null;
  maxBookingsMonthly: number | null;
  isActive: boolean;
}

export interface DunningAttempt {
  id: string;
  salonSubscriptionId: string;
  attemptNumber: number;
  status: 'pending' | 'retrying' | 'success' | 'failed';
  errorMessage: string | null;
  retryAt: string | null;
  succeededAt: string | null;
  createdAt: string;
}

export type TabKey =
  | 'mission-control'
  | 'search'
  | 'salons'
  | 'incidents'
  | 'system-ops'
  | 'revenue'
  | 'support'
  | 'security'
  | 'data';

// Re-export console types for platform use
export type {
  BookingSummary,
  PlatformPayment,
  PlatformAuditEntry,
  PlatformSalon,
} from '../../console/types';
