// Payment Types - Comprehensive type definitions for all 86+ payment functions

export interface Payment {
  id: string;
  bookingId: string;
  salonId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
  sessionId?: string;
  paymentIntentId?: string;
  platformFeeAmount?: number;
  platformFeePercentage?: number;
  taxAmount?: number;
  taxRate?: number;
  transferId?: string;
  transferStatus?: 'pending' | 'paid' | 'failed';
  transferDate?: string;
  metadata?: Record<string, unknown>;
  reconciliationStatus?: 'unreconciled' | 'reconciled' | 'discrepancy';
  reconciliationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  salonId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  reason?: string;
  providerRefundId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDispute {
  id: string;
  paymentId: string;
  salonId: string;
  disputeId: string;
  chargeId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'needs_response' | 'under_review' | 'won' | 'lost' | 'warning_closed';
  evidenceDueDate?: string;
  evidenceSubmittedAt?: string;
  evidence?: {
    receipt?: string;
    communication?: string;
  };
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  customerId?: string;
  salonId?: string;
  provider: string;
  providerMethodId: string;
  type: 'card' | 'mobilepay' | 'invoice' | 'bank_transfer';
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  country?: string;
  fingerprint?: string;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAnalytics {
  id: string;
  salonId: string;
  date: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  totalVolume: number;
  refundedVolume: number;
  processingFees: number;
  platformFees: number;
  averageTransactionValue: number;
  successRate: number;
  paymentMethodsBreakdown: Record<string, number>;
  declineReasons: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface CheckoutInput {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  applyTax?: boolean;
  taxRate?: number;
  stripeAccountId?: string;
  platformFeePercent?: number;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  paymentIntentId?: string;
}

export interface MRRData {
  mrr: number;
  plans?: Record<string, number>;
  growthRate?: number;
}

export interface RevenueForecast {
  forecast: number;
  confidence: number;
}

export interface PaymentGatewayHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  uptime: number;
}

export interface BulkRefundResult {
  processed: string[];
  failed: string[];
  totalAmount: number;
}

export interface SplitPaymentResult {
  platformAmount: number;
  salonAmount: number;
  platformAmountWithTax?: number;
  salonNetAmount?: number;
}

export interface ReconciliationResult {
  matched: number;
  unmatched: number;
  missingPayments: string[];
  duplicates: string[];
}

export interface DunningData {
  failedPayments: Array<{
    id: string;
    amount: number;
    daysOverdue: number;
  }>;
  recoveryRate: number;
  retryEffectiveness: number;
}

export interface SLAMetrics {
  uptime: number;
  credits: number;
  breach: boolean;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  planId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  attemptCount: number;
  nextPaymentAttempt?: string;
  createdAt: string;
}

// UI State Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaymentFormData {
  amount: string;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface RefundFormData {
  paymentId: string;
  amount?: string;
  reason: string;
  prorated?: boolean;
  serviceUsed?: number;
}

export interface DisputeEvidenceFormData {
  receipt?: File;
  communication?: File;
  additionalNotes?: string;
}

export interface DateRangeFilter {
  from: string;
  to: string;
}

export type PaymentStatusFilter = 'all' | 'succeeded' | 'failed' | 'refunded' | 'pending';
export type RefundStatusFilter = 'all' | 'pending' | 'succeeded' | 'failed';
export type DisputeStatusFilter = 'all' | 'needs_response' | 'under_review' | 'won' | 'lost';

export interface PaymentFilters {
  status?: PaymentStatusFilter;
  dateRange?: DateRangeFilter;
  amountMin?: number;
  amountMax?: number;
  searchQuery?: string;
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Event Types
export interface PaymentEvent {
  id: string;
  paymentId?: string;
  eventType: string;
  providerEventId?: string;
  provider: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}
