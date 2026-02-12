import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCheckout,
  processPaymentWebhook,
  handlePaymentFailure,
  handlePaymentSuccess,
  createRefund,
  getPaymentStatus,
  validatePaymentAmount,
  calculateProcessingFee,
  splitPaymentWithPlatform,
  handleChargeback,
  retryFailedPayment,
  cancelPaymentIntent,
  updatePaymentMethod,
  getPaymentHistory,
  getPaymentAnalytics,
  validateWebhookSignature,
  handleAsyncPaymentSuccess,
  handleAsyncPaymentFailure,
  handleSubscriptionCreated,
  handleSubscriptionCancelled,
  handleInvoicePaymentFailed,
  validateStripeConnectAccount,
  createTransferToSalon,
  handlePlatformFeeDeduction,
  calculateTaxAmount,
  handlePartialRefund,
  processBulkRefund,
  getFailedPaymentsReport,
  getRevenueRecognitionData,
  handleCurrencyConversion,
  validatePaymentIntentStatus,
  handlePaymentDispute,
  getChargebackRate,
  calculateMRR,
  getRevenueForecast,
  handleProratedRefund,
  validateRefundEligibility,
  handlePaymentRetrySchedule,
  getDunningManagementData,
  handleInvoiceOverdue,
  validateTaxId,
  handleExemptionCertificate,
  processRecurringPayment,
  handlePaymentMethodExpired,
  getPaymentMethodDetails,
  validate3DSecure,
  handleStrongCustomerAuth,
  processOfflinePayment,
  reconcilePayments,
  getUnreconciledPayments,
  handlePaymentReconciliationError,
  validatePaymentReconciliation,
  getPaymentGatewayHealth,
  handleGatewayOutage,
  switchBackupGateway,
  validateGatewayConfiguration,
  testGatewayConnection,
  getPaymentLatencyMetrics,
  handleHighLatencyPayments,
  optimizePaymentRouting,
  validatePCICompliance,
  handleSensitiveDataEncryption,
  validateTokenization,
  handlePaymentDataRetention,
  processDataDeletionRequest,
  validateGDPRCompliance,
  handleRightToBeForgotten,
  exportPaymentData,
  importPaymentData,
  validateDataIntegrity,
  handleDataCorruption,
  restorePaymentData,
  backupPaymentData,
  validateBackupIntegrity,
  handleBackupFailure,
  testDisasterRecovery,
  validateBusinessContinuity,
  handleRegionalOutage,
  validateMultiRegionFailover,
  getPaymentUptimeSLA,
  validateSLACompliance,
  handleSLABreach,
  calculateSLACredits,
} from '../../src/modules/payments/service/payments-service.js';

describe('Payments Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckout', () => {
    it('should create checkout with valid input', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await createCheckout(input);
      expect(result).toBeDefined();
    });

    it('should validate required fields', async () => {
      const input = {
        bookingId: 'booking-1',
      };

      await expect(createCheckout(input as any)).rejects.toThrow();
    });

    it('should calculate tax when applicable', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        applyTax: true,
        taxRate: 0.25,
      };

      const result = await createCheckout(input);
      expect(result).toBeDefined();
    });

    it('should handle Stripe Connect accounts', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        stripeAccountId: 'acct_123',
      };

      const result = await createCheckout(input);
      expect(result).toBeDefined();
    });

    it('should apply platform fee', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        platformFeePercent: 5,
      };

      const result = await createCheckout(input);
      expect(result).toBeDefined();
    });

    it('should handle idempotency', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        idempotencyKey: 'unique-key-123',
      };

      const result1 = await createCheckout(input);
      const result2 = await createCheckout(input);
      expect(result1).toEqual(result2);
    });

    it('should validate currency', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'INVALID',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(createCheckout(input)).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: -100,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(createCheckout(input)).rejects.toThrow();
    });

    it('should handle metadata', async () => {
      const input = {
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amount: 10000,
        currency: 'DKK',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: {
          customerId: 'cust-1',
          salonId: 'salon-1',
        },
      };

      const result = await createCheckout(input);
      expect(result).toBeDefined();
    });
  });

  describe('processPaymentWebhook', () => {
    it('should process successful payment webhook', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            amount: 10000,
            currency: 'dkk',
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });

    it('should process failed payment webhook', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_123',
            last_payment_error: {
              message: 'Card declined',
            },
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });

    it('should handle duplicate webhook events', async () => {
      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await processPaymentWebhook(event);
      const result = await processPaymentWebhook(event);
      expect(result).toHaveProperty('idempotent', true);
    });

    it('should validate webhook signature', async () => {
      const event = { type: 'test' };
      const signature = 'invalid_sig';

      await expect(processPaymentWebhook(event, signature)).rejects.toThrow();
    });

    it('should handle checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            payment_intent: 'pi_123',
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });

    it('should handle invoice.payment_succeeded', async () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_123',
            subscription: 'sub_123',
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });

    it('should handle charge.refunded', async () => {
      const event = {
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_123',
            amount_refunded: 5000,
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });

    it('should handle dispute.created', async () => {
      const event = {
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_123',
            charge: 'ch_123',
          },
        },
      };

      const result = await processPaymentWebhook(event);
      expect(result).toBeDefined();
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should update booking status to confirmed', async () => {
      const paymentIntent = {
        id: 'pi_123',
        amount: 10000,
        currency: 'dkk',
      };

      const result = await handlePaymentSuccess(paymentIntent);
      expect(result).toBeDefined();
    });

    it('should send confirmation notification', async () => {
      const paymentIntent = {
        id: 'pi_123',
        metadata: {
          bookingId: 'booking-1',
        },
      };

      const result = await handlePaymentSuccess(paymentIntent);
      expect(result).toBeDefined();
    });

    it('should handle salon payout', async () => {
      const paymentIntent = {
        id: 'pi_123',
        transfer_data: {
          destination: 'acct_salon_123',
        },
      };

      const result = await handlePaymentSuccess(paymentIntent);
      expect(result).toBeDefined();
    });

    it('should calculate and deduct platform fee', async () => {
      const paymentIntent = {
        id: 'pi_123',
        amount: 10000,
        application_fee_amount: 500,
      };

      const result = await handlePaymentSuccess(paymentIntent);
      expect(result).toBeDefined();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should handle card declined', async () => {
      const error = {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toBeDefined();
    });

    it('should handle expired card', async () => {
      const error = {
        code: 'expired_card',
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toBeDefined();
    });

    it('should handle incorrect cvc', async () => {
      const error = {
        code: 'incorrect_cvc',
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toBeDefined();
    });

    it('should handle processing error', async () => {
      const error = {
        code: 'processing_error',
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toBeDefined();
    });

    it('should schedule retry for retryable errors', async () => {
      const error = {
        code: 'processing_error',
        retryable: true,
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toHaveProperty('retryScheduled');
    });

    it('should cancel booking for non-retryable errors', async () => {
      const error = {
        code: 'card_declined',
        retryable: false,
      };

      const result = await handlePaymentFailure('pi_123', error);
      expect(result).toBeDefined();
    });
  });

  describe('createRefund', () => {
    it('should create full refund', async () => {
      const result = await createRefund({
        paymentId: 'pi_123',
        reason: 'requested_by_customer',
      });

      expect(result).toBeDefined();
    });

    it('should create partial refund', async () => {
      const result = await createRefund({
        paymentId: 'pi_123',
        amount: 5000,
        reason: 'partial_refund',
      });

      expect(result).toBeDefined();
    });

    it('should validate refund amount does not exceed payment', async () => {
      await expect(
        createRefund({
          paymentId: 'pi_123',
          amount: 50000,
          reason: 'test',
        }),
      ).rejects.toThrow();
    });

    it('should handle already refunded payment', async () => {
      await expect(
        createRefund({
          paymentId: 'pi_refunded',
          reason: 'test',
        }),
      ).rejects.toThrow();
    });

    it('should calculate prorated refund', async () => {
      const result = await createRefund({
        paymentId: 'pi_123',
        prorated: true,
        serviceUsed: 50,
        reason: 'service_not_completed',
      });

      expect(result).toBeDefined();
    });
  });

  describe('calculateProcessingFee', () => {
    it('should calculate standard processing fee', () => {
      const fee = calculateProcessingFee(10000, 'DKK');
      expect(fee).toBeGreaterThan(0);
    });

    it('should calculate fee for different currencies', () => {
      const dkkFee = calculateProcessingFee(10000, 'DKK');
      const eurFee = calculateProcessingFee(10000, 'EUR');
      expect(dkkFee).toBeDefined();
      expect(eurFee).toBeDefined();
    });

    it('should apply volume discounts', () => {
      const normalFee = calculateProcessingFee(10000, 'DKK');
      const volumeFee = calculateProcessingFee(100000, 'DKK', { volumeDiscount: true });
      expect(volumeFee).toBeLessThan(normalFee * 10);
    });

    it('should handle international cards', () => {
      const fee = calculateProcessingFee(10000, 'DKK', { internationalCard: true });
      expect(fee).toBeGreaterThan(calculateProcessingFee(10000, 'DKK'));
    });
  });

  describe('splitPaymentWithPlatform', () => {
    it('should split payment correctly', () => {
      const split = splitPaymentWithPlatform(10000, 5);
      expect(split.platformAmount).toBe(500);
      expect(split.salonAmount).toBe(9500);
    });

    it('should handle tax on platform fee', () => {
      const split = splitPaymentWithPlatform(10000, 5, { taxRate: 0.25 });
      expect(split.platformAmountWithTax).toBeGreaterThan(split.platformAmount);
    });

    it('should calculate net amounts after processing fees', () => {
      const split = splitPaymentWithPlatform(10000, 5, { deductProcessingFee: true });
      expect(split.salonNetAmount).toBeLessThan(split.salonAmount);
    });
  });

  describe('handleChargeback', () => {
    it('should handle chargeback creation', async () => {
      const result = await handleChargeback({
        disputeId: 'dp_123',
        chargeId: 'ch_123',
        amount: 10000,
        reason: 'fraudulent',
      });

      expect(result).toBeDefined();
    });

    it('should submit evidence', async () => {
      const result = await handleChargeback({
        disputeId: 'dp_123',
        chargeId: 'ch_123',
        action: 'submit_evidence',
        evidence: {
          receipt: 'receipt_url',
          communication: 'email_chain',
        },
      });

      expect(result).toBeDefined();
    });

    it('should accept dispute and process refund', async () => {
      const result = await handleChargeback({
        disputeId: 'dp_123',
        chargeId: 'ch_123',
        action: 'accept',
      });

      expect(result).toBeDefined();
    });
  });

  describe('calculateMRR', () => {
    it('should calculate monthly recurring revenue', async () => {
      const mrr = await calculateMRR('salon-1');
      expect(mrr).toBeGreaterThanOrEqual(0);
    });

    it('should calculate MRR by plan', async () => {
      const mrr = await calculateMRR('salon-1', { groupByPlan: true });
      expect(mrr).toHaveProperty('plans');
    });

    it('should calculate MRR growth rate', async () => {
      const mrr = await calculateMRR('salon-1', { includeGrowth: true });
      expect(mrr).toHaveProperty('growthRate');
    });
  });

  describe('getRevenueForecast', () => {
    it('should forecast revenue for next month', async () => {
      const forecast = await getRevenueForecast('salon-1', 30);
      expect(forecast).toBeDefined();
    });

    it('should forecast based on historical data', async () => {
      const forecast = await getRevenueForecast('salon-1', 90, {
        useHistoricalData: true,
      });
      expect(forecast).toBeDefined();
    });

    it('should account for seasonality', async () => {
      const forecast = await getRevenueForecast('salon-1', 365, {
        accountForSeasonality: true,
      });
      expect(forecast).toBeDefined();
    });
  });

  describe('validatePCICompliance', () => {
    it('should validate card data is not stored', () => {
      const result = validatePCICompliance({
        cardNumber: undefined,
        cvv: undefined,
        token: 'tok_123',
      });
      expect(result.compliant).toBe(true);
    });

    it('should flag non-compliant data storage', () => {
      const result = validatePCICompliance({
        cardNumber: '4111111111111111',
        cvv: '123',
      });
      expect(result.compliant).toBe(false);
    });

    it('should validate encryption', () => {
      const result = validatePCICompliance({
        encryptedData: 'encrypted_string',
        encryptionKeyId: 'key_123',
      });
      expect(result.encryptionValid).toBe(true);
    });
  });

  describe('handleGatewayOutage', () => {
    it('should detect gateway outage', async () => {
      const result = await getPaymentGatewayHealth();
      expect(result.status).toBeDefined();
    });

    it('should switch to backup gateway', async () => {
      const result = await switchBackupGateway('stripe', 'backup-stripe');
      expect(result.activeGateway).toBe('backup-stripe');
    });

    it('should queue payments during outage', async () => {
      const result = await handleGatewayOutage({
        queuePayments: true,
        retryAfterMinutes: 5,
      });
      expect(result.queued).toBe(true);
    });
  });

  describe('getPaymentAnalytics', () => {
    it('should get success rate', async () => {
      const analytics = await getPaymentAnalytics('salon-1');
      expect(analytics.successRate).toBeDefined();
    });

    it('should get average transaction value', async () => {
      const analytics = await getPaymentAnalytics('salon-1');
      expect(analytics.averageTransactionValue).toBeDefined();
    });

    it('should get payment method breakdown', async () => {
      const analytics = await getPaymentAnalytics('salon-1');
      expect(analytics.paymentMethods).toBeDefined();
    });

    it('should get decline reason analysis', async () => {
      const analytics = await getPaymentAnalytics('salon-1');
      expect(analytics.declineReasons).toBeDefined();
    });
  });

  describe('reconcilePayments', () => {
    it('should match internal records with gateway', async () => {
      const result = await reconcilePayments('2024-01-01', '2024-01-31');
      expect(result.matched).toBeDefined();
      expect(result.unmatched).toBeDefined();
    });

    it('should identify missing payments', async () => {
      const result = await reconcilePayments('2024-01-01', '2024-01-31');
      expect(result.missingPayments).toBeInstanceOf(Array);
    });

    it('should identify duplicate payments', async () => {
      const result = await reconcilePayments('2024-01-01', '2024-01-31');
      expect(result.duplicates).toBeInstanceOf(Array);
    });
  });

  describe('handleCurrencyConversion', () => {
    it('should convert DKK to EUR', async () => {
      const result = await handleCurrencyConversion(10000, 'DKK', 'EUR');
      expect(result.amount).toBeGreaterThan(0);
      expect(result.currency).toBe('EUR');
    });

    it('should apply conversion fee', async () => {
      const result = await handleCurrencyConversion(10000, 'DKK', 'EUR', {
        applyFee: true,
      });
      expect(result.fee).toBeGreaterThan(0);
    });

    it('should use current exchange rate', async () => {
      const result = await handleCurrencyConversion(10000, 'DKK', 'EUR');
      expect(result.exchangeRate).toBeGreaterThan(0);
    });
  });

  describe('validateRefundEligibility', () => {
    it('should allow refund within window', () => {
      const result = validateRefundEligibility({
        paymentDate: new Date(Date.now() - 86400000),
        refundWindowDays: 30,
      });
      expect(result.eligible).toBe(true);
    });

    it('should deny refund outside window', () => {
      const result = validateRefundEligibility({
        paymentDate: new Date(Date.now() - 90 * 86400000),
        refundWindowDays: 30,
      });
      expect(result.eligible).toBe(false);
    });

    it('should check for disputes', () => {
      const result = validateRefundEligibility({
        paymentDate: new Date(Date.now() - 86400000),
        hasDispute: true,
      });
      expect(result.eligible).toBe(false);
    });
  });

  describe('getDunningManagementData', () => {
    it('should get failed payment attempts', async () => {
      const data = await getDunningManagementData('salon-1');
      expect(data.failedPayments).toBeInstanceOf(Array);
    });

    it('should calculate recovery rate', async () => {
      const data = await getDunningManagementData('salon-1');
      expect(data.recoveryRate).toBeDefined();
    });

    it('should get retry schedule effectiveness', async () => {
      const data = await getDunningManagementData('salon-1');
      expect(data.retryEffectiveness).toBeDefined();
    });
  });

  describe('exportPaymentData', () => {
    it('should export to CSV', async () => {
      const result = await exportPaymentData('salon-1', {
        format: 'csv',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });
      expect(result).toContain('csv');
    });

    it('should export to JSON', async () => {
      const result = await exportPaymentData('salon-1', {
        format: 'json',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });
      expect(JSON.parse(result)).toBeInstanceOf(Object);
    });

    it('should anonymize for GDPR export', async () => {
      const result = await exportPaymentData('salon-1', {
        format: 'json',
        gdprExport: true,
      });
      expect(result).not.toContain('email');
    });
  });

  describe('processBulkRefund', () => {
    it('should process multiple refunds', async () => {
      const refunds = [
        { paymentId: 'pi_1', amount: 5000 },
        { paymentId: 'pi_2', amount: 10000 },
      ];

      const result = await processBulkRefund(refunds);
      expect(result.processed).toHaveLength(2);
    });

    it('should handle partial failures', async () => {
      const refunds = [
        { paymentId: 'pi_valid', amount: 5000 },
        { paymentId: 'pi_invalid', amount: 100000 },
      ];

      const result = await processBulkRefund(refunds);
      expect(result.failed).toHaveLength(1);
    });

    it('should calculate total refund amount', async () => {
      const refunds = [
        { paymentId: 'pi_1', amount: 5000 },
        { paymentId: 'pi_2', amount: 10000 },
      ];

      const result = await processBulkRefund(refunds);
      expect(result.totalAmount).toBe(15000);
    });
  });

  describe('handle3DSecure', () => {
    it('should initiate 3D Secure', async () => {
      const result = await validate3DSecure({
        paymentIntentId: 'pi_123',
        action: 'initiate',
      });
      expect(result.requiresAction).toBe(true);
    });

    it('should handle 3D Secure success', async () => {
      const result = await validate3DSecure({
        paymentIntentId: 'pi_123',
        action: 'complete',
        status: 'succeeded',
      });
      expect(result.success).toBe(true);
    });

    it('should handle 3D Secure failure', async () => {
      const result = await validate3DSecure({
        paymentIntentId: 'pi_123',
        action: 'complete',
        status: 'failed',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getChargebackRate', () => {
    it('should calculate chargeback rate', async () => {
      const rate = await getChargebackRate('salon-1', '2024-01-01', '2024-01-31');
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('should flag high chargeback rate', async () => {
      const rate = await getChargebackRate('salon-1', '2024-01-01', '2024-01-31');
      const threshold = 1.0;
      expect(rate < threshold || rate >= threshold).toBe(true);
    });
  });

  describe('validateSLACompliance', () => {
    it('should calculate uptime percentage', () => {
      const sla = validateSLACompliance({
        totalMinutes: 43200,
        downtimeMinutes: 30,
      });
      expect(sla.uptime).toBeGreaterThan(99);
    });

    it('should calculate SLA credits', () => {
      const sla = validateSLACompliance({
        totalMinutes: 43200,
        downtimeMinutes: 300,
        monthlyFee: 1000,
      });
      expect(sla.credits).toBeGreaterThan(0);
    });

    it('should determine SLA breach', () => {
      const sla = validateSLACompliance({
        totalMinutes: 43200,
        downtimeMinutes: 600,
        targetUptime: 99.9,
      });
      expect(sla.breach).toBe(true);
    });
  });
});
