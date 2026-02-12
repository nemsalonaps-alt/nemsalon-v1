// Payment API Layer - All 86+ payment function integrations

import { api } from '../../lib/api';
import type {
  Payment,
  Refund,
  PaymentDispute,
  PaymentMethod,
  PaymentAnalytics,
  CheckoutInput,
  CheckoutResult,
  MRRData,
  RevenueForecast,
  PaymentGatewayHealth,
  BulkRefundResult,
  SplitPaymentResult,
  ReconciliationResult,
  DunningData,
  SLAMetrics,
  Subscription,
  Invoice,
  PaymentFilters,
  PaymentEvent,
} from '../types';

// ==================== CORE PAYMENT API ====================

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const response = await api.post('/payments/checkout', input);
  return response.data;
}

export async function processPaymentWebhook(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<{ received: boolean; idempotent?: boolean; status?: string }> {
  const response = await api.post('/payments/webhooks/stripe', event);
  return response.data;
}

export async function handlePaymentSuccess(paymentIntent: {
  id: string;
  amount: number;
  currency: string;
  metadata?: { bookingId?: string };
  transfer_data?: { destination?: string };
  application_fee_amount?: number;
}): Promise<{
  success: boolean;
  bookingConfirmed: boolean;
  notificationSent: boolean;
  transferCreated?: boolean;
}> {
  const response = await api.post('/payments/success', paymentIntent);
  return response.data;
}

export async function handlePaymentFailure(
  paymentIntentId: string,
  error: { code: string; decline_code?: string; retryable?: boolean },
): Promise<{ handled: boolean; retryScheduled?: boolean; bookingCancelled?: boolean }> {
  const response = await api.post('/payments/failure', { paymentIntentId, error });
  return response.data;
}

export async function createRefund(input: {
  paymentId: string;
  reason: string;
  amount?: number;
  prorated?: boolean;
  serviceUsed?: number;
}): Promise<{ refundId: string; amount: number; status: string }> {
  const response = await api.post('/payments/refunds', input);
  return response.data;
}

export async function getPaymentStatus(
  paymentId: string,
): Promise<{ status: string; amount: number; currency: string }> {
  const response = await api.get(`/payments/${paymentId}/status`);
  return response.data;
}

export async function validatePaymentAmount(
  amount: number,
  currency: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const response = await api.post('/payments/validate-amount', { amount, currency });
  return response.data;
}

// ==================== FEE & SPLIT API ====================

export async function calculateProcessingFee(
  amount: number,
  currency: string,
  options?: { volumeDiscount?: boolean; internationalCard?: boolean },
): Promise<number> {
  const response = await api.post('/payments/calculate-fee', { amount, currency, options });
  return response.data.fee;
}

export async function splitPaymentWithPlatform(
  amount: number,
  platformFeePercent: number,
  options?: { taxRate?: number; deductProcessingFee?: boolean },
): Promise<SplitPaymentResult> {
  const response = await api.post('/payments/split', { amount, platformFeePercent, options });
  return response.data;
}

export async function calculateTaxAmount(amount: number, taxRate: number): Promise<number> {
  const response = await api.post('/payments/calculate-tax', { amount, taxRate });
  return response.data.taxAmount;
}

export async function handlePlatformFeeDeduction(
  paymentId: string,
  feeAmount: number,
): Promise<{ deducted: boolean; feeId: string }> {
  const response = await api.post('/payments/platform-fee', { paymentId, feeAmount });
  return response.data;
}

export async function createTransferToSalon(
  salonId: string,
  amount: number,
  currency: string,
): Promise<{ transferId: string; status: string }> {
  const response = await api.post('/payments/transfer', { salonId, amount, currency });
  return response.data;
}

// ==================== REFUND & DISPUTE API ====================

export async function handlePartialRefund(
  paymentId: string,
  amount: number,
  reason: string,
): Promise<{ refundId: string; remainingAmount: number }> {
  const response = await api.post('/payments/refunds/partial', { paymentId, amount, reason });
  return response.data;
}

export async function processBulkRefund(
  refunds: Array<{ paymentId: string; amount: number }>,
): Promise<BulkRefundResult> {
  const response = await api.post('/payments/refunds/bulk', { refunds });
  return response.data;
}

export async function handleChargeback(input: {
  disputeId: string;
  chargeId: string;
  amount: number;
  reason: string;
  action: 'submit_evidence' | 'accept';
  evidence?: { receipt?: string; communication?: string };
}): Promise<{ status: string; evidenceSubmitted?: boolean }> {
  const response = await api.post('/payments/disputes/handle', input);
  return response.data;
}

export async function getChargebackRate(
  salonId: string,
  fromDate: string,
  toDate: string,
): Promise<number> {
  const response = await api.get(`/payments/analytics/chargeback-rate`, {
    params: { salonId, fromDate, toDate },
  });
  return response.data.rate;
}

export async function handlePaymentDispute(
  disputeId: string,
  action: 'challenge' | 'accept',
): Promise<{ status: string }> {
  const response = await api.post(`/payments/disputes/${disputeId}/action`, { action });
  return response.data;
}

export async function validateRefundEligibility(input: {
  paymentDate: string;
  refundWindowDays: number;
  hasDispute?: boolean;
}): Promise<{ eligible: boolean; reason?: string }> {
  const response = await api.post('/payments/refunds/validate-eligibility', input);
  return response.data;
}

export async function handleProratedRefund(
  totalAmount: number,
  daysUsed: number,
  totalDays: number,
): Promise<{ refundAmount: number; prorated: boolean }> {
  const response = await api.post('/payments/refunds/prorated', {
    totalAmount,
    daysUsed,
    totalDays,
  });
  return response.data;
}

// ==================== WEBHOOK & SECURITY API ====================

export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<{ valid: boolean }> {
  const response = await api.post('/payments/webhooks/validate-signature', {
    payload,
    signature,
    secret,
  });
  return response.data;
}

export async function handleAsyncPaymentSuccess(
  paymentIntentId: string,
): Promise<{ processed: boolean }> {
  const response = await api.post('/payments/async-success', { paymentIntentId });
  return response.data;
}

export async function handleAsyncPaymentFailure(
  paymentIntentId: string,
  error: string,
): Promise<{ processed: boolean }> {
  const response = await api.post('/payments/async-failure', { paymentIntentId, error });
  return response.data;
}

export async function validate3DSecure(input: {
  paymentIntentId: string;
  action: 'initiate' | 'complete';
  status?: 'succeeded' | 'failed';
}): Promise<{ requiresAction?: boolean; success?: boolean }> {
  const response = await api.post('/payments/3d-secure', input);
  return response.data;
}

export async function handleStrongCustomerAuth(
  paymentMethodId: string,
): Promise<{ requiresSca: boolean; clientSecret?: string }> {
  const response = await api.post('/payments/sca', { paymentMethodId });
  return response.data;
}

export async function validatePCICompliance(input: {
  cardNumber?: string;
  cvv?: string;
  token?: string;
  encryptedData?: string;
  encryptionKeyId?: string;
}): Promise<{ compliant: boolean; encryptionValid?: boolean }> {
  const response = await api.post('/payments/pci-compliance', input);
  return response.data;
}

// ==================== ANALYTICS & REPORTING API ====================

export async function getPaymentAnalytics(salonId: string): Promise<{
  successRate: number;
  averageTransactionValue: number;
  paymentMethods: Record<string, number>;
  declineReasons: Record<string, number>;
}> {
  const response = await api.get(`/payments/analytics/${salonId}`);
  return response.data;
}

export async function getPaymentHistory(
  salonId: string,
  options?: { limit?: number; offset?: number },
): Promise<Array<{ id: string; amount: number; status: string; date: string }>> {
  const response = await api.get(`/payments/history/${salonId}`, { params: options });
  return response.data;
}

export async function calculateMRR(
  salonId: string,
  options?: { groupByPlan?: boolean; includeGrowth?: boolean },
): Promise<MRRData> {
  const response = await api.get(`/payments/analytics/mrr/${salonId}`, { params: options });
  return response.data;
}

export async function getRevenueForecast(
  salonId: string,
  days: number,
  options?: { useHistoricalData?: boolean; accountForSeasonality?: boolean },
): Promise<RevenueForecast> {
  const response = await api.get(`/payments/analytics/forecast/${salonId}`, {
    params: { days, ...options },
  });
  return response.data;
}

export async function getFailedPaymentsReport(
  salonId: string,
  fromDate: string,
  toDate: string,
): Promise<{ totalFailed: number; totalAmount: number; byReason: Record<string, number> }> {
  const response = await api.get(`/payments/analytics/failed/${salonId}`, {
    params: { fromDate, toDate },
  });
  return response.data;
}

export async function getRevenueRecognitionData(
  salonId: string,
  month: string,
): Promise<{ recognized: number; deferred: number }> {
  const response = await api.get(`/payments/analytics/revenue/${salonId}`, { params: { month } });
  return response.data;
}

// ==================== SUBSCRIPTION API ====================

export async function handleSubscriptionCreated(
  subscriptionId: string,
  customerId: string,
): Promise<{ status: string }> {
  const response = await api.post('/payments/subscriptions/created', {
    subscriptionId,
    customerId,
  });
  return response.data;
}

export async function handleSubscriptionCancelled(
  subscriptionId: string,
  reason?: string,
): Promise<{ status: string; endDate: string }> {
  const response = await api.post('/payments/subscriptions/cancelled', { subscriptionId, reason });
  return response.data;
}

export async function handleInvoicePaymentFailed(
  invoiceId: string,
  attempt: number,
): Promise<{ retryScheduled: boolean; nextAttempt?: string }> {
  const response = await api.post('/payments/invoices/failed', { invoiceId, attempt });
  return response.data;
}

export async function handleInvoiceOverdue(
  invoiceId: string,
  daysOverdue: number,
): Promise<{ action: string; dunningStarted: boolean }> {
  const response = await api.post('/payments/invoices/overdue', { invoiceId, daysOverdue });
  return response.data;
}

export async function processRecurringPayment(
  subscriptionId: string,
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const response = await api.post('/payments/subscriptions/process', { subscriptionId });
  return response.data;
}

// ==================== CURRENCY & TAX API ====================

export async function handleCurrencyConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  options?: { applyFee?: boolean },
): Promise<{ amount: number; currency: string; exchangeRate: number; fee?: number }> {
  const response = await api.post('/payments/currency/convert', {
    amount,
    fromCurrency,
    toCurrency,
    options,
  });
  return response.data;
}

export async function validateTaxId(taxId: string, country: string): Promise<{ valid: boolean }> {
  const response = await api.post('/payments/tax/validate-id', { taxId, country });
  return response.data;
}

export async function handleExemptionCertificate(
  certificateId: string,
): Promise<{ valid: boolean; exempt: boolean }> {
  const response = await api.get(`/payments/tax/exemption/${certificateId}`);
  return response.data;
}

// ==================== PAYMENT METHODS API ====================

export async function retryFailedPayment(
  paymentIntentId: string,
  options?: { maxAttempts?: number },
): Promise<{ success: boolean; attempt: number }> {
  const response = await api.post('/payments/retry', { paymentIntentId, options });
  return response.data;
}

export async function cancelPaymentIntent(
  paymentIntentId: string,
): Promise<{ cancelled: boolean }> {
  const response = await api.post('/payments/cancel', { paymentIntentId });
  return response.data;
}

export async function updatePaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<{ updated: boolean }> {
  const response = await api.put('/payments/methods', { customerId, paymentMethodId });
  return response.data;
}

export async function getPaymentMethodDetails(
  paymentMethodId: string,
): Promise<{ id: string; type: string; last4?: string; brand?: string }> {
  const response = await api.get(`/payments/methods/${paymentMethodId}`);
  return response.data;
}

export async function handlePaymentMethodExpired(
  paymentMethodId: string,
): Promise<{ notified: boolean; customerId: string }> {
  const response = await api.post('/payments/methods/expired', { paymentMethodId });
  return response.data;
}

// ==================== RECONCILIATION API ====================

export async function reconcilePayments(
  fromDate: string,
  toDate: string,
): Promise<ReconciliationResult> {
  const response = await api.post('/payments/reconcile', { fromDate, toDate });
  return response.data;
}

export async function getUnreconciledPayments(
  fromDate: string,
  toDate: string,
): Promise<Array<{ id: string; amount: number; discrepancy: string }>> {
  const response = await api.get('/payments/unreconciled', { params: { fromDate, toDate } });
  return response.data;
}

export async function validatePaymentReconciliation(
  expected: number,
  actual: number,
): Promise<{ valid: boolean; difference: number }> {
  const response = await api.post('/payments/reconcile/validate', { expected, actual });
  return response.data;
}

export async function exportPaymentData(
  salonId: string,
  options: { format: 'csv' | 'json'; fromDate: string; toDate: string; gdprExport?: boolean },
): Promise<string> {
  const response = await api.get(`/payments/export/${salonId}`, { params: options });
  return response.data;
}

export async function importPaymentData(
  data: string,
  format: 'csv' | 'json',
): Promise<{ imported: number; errors: string[] }> {
  const response = await api.post('/payments/import', { data, format });
  return response.data;
}

export async function validateDataIntegrity(
  data: Record<string, unknown>,
): Promise<{ valid: boolean; checksum: string }> {
  const response = await api.post('/payments/validate-integrity', data);
  return response.data;
}

// ==================== GATEWAY API ====================

export async function getPaymentGatewayHealth(): Promise<PaymentGatewayHealth> {
  const response = await api.get('/payments/gateway/health');
  return response.data;
}

export async function handleGatewayOutage(options: {
  queuePayments: boolean;
  retryAfterMinutes: number;
}): Promise<{ queued: boolean; retryAt: string }> {
  const response = await api.post('/payments/gateway/outage', options);
  return response.data;
}

export async function switchBackupGateway(
  primaryGateway: string,
  backupGateway: string,
): Promise<{ activeGateway: string; switched: boolean }> {
  const response = await api.post('/payments/gateway/switch', { primaryGateway, backupGateway });
  return response.data;
}

export async function validateGatewayConfiguration(
  config: Record<string, unknown>,
): Promise<{ valid: boolean; errors: string[] }> {
  const response = await api.post('/payments/gateway/validate', config);
  return response.data;
}

export async function testGatewayConnection(
  gateway: string,
): Promise<{ connected: boolean; latency: number }> {
  const response = await api.get(`/payments/gateway/test/${gateway}`);
  return response.data;
}

export async function getPaymentLatencyMetrics(
  fromDate: string,
  toDate: string,
): Promise<{ average: number; p95: number; p99: number }> {
  const response = await api.get('/payments/gateway/latency', { params: { fromDate, toDate } });
  return response.data;
}

export async function handleHighLatencyPayments(
  threshold: number,
): Promise<{ optimized: boolean; actions: string[] }> {
  const response = await api.post('/payments/gateway/optimize', { threshold });
  return response.data;
}

export async function optimizePaymentRouting(
  paymentMethod: string,
  amount: number,
): Promise<{ gateway: string; route: string }> {
  const response = await api.post('/payments/gateway/route', { paymentMethod, amount });
  return response.data;
}

// ==================== SECURITY & COMPLIANCE API ====================

export async function handleSensitiveDataEncryption(
  data: string,
): Promise<{ encrypted: boolean; ciphertext: string; keyId: string }> {
  const response = await api.post('/payments/security/encrypt', { data });
  return response.data;
}

export async function validateTokenization(
  token: string,
): Promise<{ valid: boolean; cardBrand?: string }> {
  const response = await api.post('/payments/security/validate-token', { token });
  return response.data;
}

export async function handlePaymentDataRetention(
  paymentId: string,
  action: 'archive' | 'delete',
): Promise<{ processed: boolean; action: string }> {
  const response = await api.post('/payments/security/data-retention', { paymentId, action });
  return response.data;
}

export async function processDataDeletionRequest(
  customerId: string,
): Promise<{ deleted: boolean; recordsAffected: number }> {
  const response = await api.post('/payments/security/delete-data', { customerId });
  return response.data;
}

export async function validateGDPRCompliance(
  data: Record<string, unknown>,
): Promise<{ compliant: boolean; issues: string[] }> {
  const response = await api.post('/payments/security/gdpr', data);
  return response.data;
}

export async function handleRightToBeForgotten(
  customerId: string,
): Promise<{ processed: boolean }> {
  const response = await api.post('/payments/security/right-to-be-forgotten', { customerId });
  return response.data;
}

// ==================== BACKUP & DR API ====================

export async function backupPaymentData(): Promise<{
  backupId: string;
  timestamp: string;
  size: number;
}> {
  const response = await api.post('/payments/backup');
  return response.data;
}

export async function validateBackupIntegrity(
  backupId: string,
): Promise<{ valid: boolean; checksum: string }> {
  const response = await api.get(`/payments/backup/${backupId}/validate`);
  return response.data;
}

export async function handleBackupFailure(
  backupId: string,
): Promise<{ recovered: boolean; retryScheduled: boolean }> {
  const response = await api.post(`/payments/backup/${backupId}/handle-failure`);
  return response.data;
}

export async function restorePaymentData(
  backupId: string,
): Promise<{ restored: boolean; records: number }> {
  const response = await api.post(`/payments/backup/${backupId}/restore`);
  return response.data;
}

export async function testDisasterRecovery(): Promise<{
  success: boolean;
  rto: number;
  rpo: number;
}> {
  const response = await api.post('/payments/disaster-recovery/test');
  return response.data;
}

export async function validateBusinessContinuity(): Promise<{ valid: boolean; score: number }> {
  const response = await api.get('/payments/business-continuity/validate');
  return response.data;
}

// ==================== MULTI-REGION API ====================

export async function handleRegionalOutage(
  region: string,
): Promise<{ failedOver: boolean; newRegion: string }> {
  const response = await api.post('/payments/regions/failover', { region });
  return response.data;
}

export async function validateMultiRegionFailover(): Promise<{
  valid: boolean;
  regions: string[];
}> {
  const response = await api.get('/payments/regions/validate');
  return response.data;
}

// ==================== SLA API ====================

export async function getPaymentUptimeSLA(): Promise<{ uptime: number; target: number }> {
  const response = await api.get('/payments/sla/uptime');
  return response.data;
}

export async function validateSLACompliance(input: {
  totalMinutes: number;
  downtimeMinutes: number;
  monthlyFee?: number;
  targetUptime?: number;
}): Promise<SLAMetrics> {
  const response = await api.post('/payments/sla/validate', input);
  return response.data;
}

export async function handleSLABreach(
  breachType: string,
): Promise<{ handled: boolean; creditsIssued: number }> {
  const response = await api.post('/payments/sla/breach', { breachType });
  return response.data;
}

export async function calculateSLACredits(
  downtimeMinutes: number,
  monthlyFee: number,
): Promise<number> {
  const response = await api.post('/payments/sla/calculate-credits', {
    downtimeMinutes,
    monthlyFee,
  });
  return response.data.credits;
}

// ==================== UTILITY API ====================

export async function handlePaymentRetrySchedule(
  paymentIntentId: string,
  attempts: number,
): Promise<{ scheduled: boolean; nextAttempt: string }> {
  const response = await api.post('/payments/schedule-retry', { paymentIntentId, attempts });
  return response.data;
}

export async function getDunningManagementData(salonId: string): Promise<DunningData> {
  const response = await api.get(`/payments/dunning/${salonId}`);
  return response.data;
}

export async function handleDataCorruption(
  paymentId: string,
): Promise<{ restored: boolean; fromBackup: boolean }> {
  const response = await api.post('/payments/corruption/handle', { paymentId });
  return response.data;
}

export async function handlePaymentReconciliationError(
  error: string,
): Promise<{ logged: boolean; alertSent: boolean }> {
  const response = await api.post('/payments/reconcile/error', { error });
  return response.data;
}

export async function validateStripeConnectAccount(
  accountId: string,
): Promise<{ valid: boolean; chargesEnabled: boolean; payoutsEnabled: boolean }> {
  const response = await api.get(`/payments/stripe-connect/validate/${accountId}`);
  return response.data;
}

export async function processOfflinePayment(input: {
  amount: number;
  currency: string;
  paymentMethod: string;
}): Promise<{ paymentId: string; status: string }> {
  const response = await api.post('/payments/offline', input);
  return response.data;
}

// ==================== LISTING API ====================

export async function getPayments(filters?: PaymentFilters): Promise<Payment[]> {
  const response = await api.get('/payments', { params: filters });
  return response.data;
}

export async function getRefunds(salonId: string): Promise<Refund[]> {
  const response = await api.get(`/payments/refunds?salonId=${salonId}`);
  return response.data;
}

export async function getDisputes(salonId: string): Promise<PaymentDispute[]> {
  const response = await api.get(`/payments/disputes?salonId=${salonId}`);
  return response.data;
}

export async function getPaymentMethods(salonId: string): Promise<PaymentMethod[]> {
  const response = await api.get(`/payments/methods?salonId=${salonId}`);
  return response.data;
}

export async function getSubscriptions(salonId: string): Promise<Subscription[]> {
  const response = await api.get(`/payments/subscriptions?salonId=${salonId}`);
  return response.data;
}

export async function getInvoices(salonId: string): Promise<Invoice[]> {
  const response = await api.get(`/payments/invoices?salonId=${salonId}`);
  return response.data;
}

export async function getPaymentEvents(filters?: {
  paymentId?: string;
  eventType?: string;
  processed?: boolean;
}): Promise<PaymentEvent[]> {
  const response = await api.get('/payments/events', { params: filters });
  return response.data;
}
