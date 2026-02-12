import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStripeCheckout,
  getStripeCheckoutSession,
  getStripePaymentIntent,
  getStripeCheckoutUrl,
  constructStripeEvent,
  createStripeRefund,
  getStripeAccount,
  exchangeStripeConnectCode,
} from '../../../src/modules/payments/service/stripe-gateway.js';
import { env } from '../../../src/config/env.js';

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
  paymentIntents: {
    retrieve: vi.fn(),
    create: vi.fn(),
  },
  refunds: {
    create: vi.fn(),
  },
  accounts: {
    retrieve: vi.fn(),
    create: vi.fn(),
  },
  oauth: {
    token: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}));

describe('Stripe Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createStripeCheckout', () => {
    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        payment_intent: 'pi_test_123',
      };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await createStripeCheckout({
        amount: 10000,
        currency: 'dkk',
        bookingId: 'booking-1',
        paymentId: 'payment-test-001',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerEmail: 'customer@example.com',
        description: 'Haircut booking',
      });

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/test');
      expect(result.paymentIntentId).toBe('pi_test_123');
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Invalid API Key'));

      await expect(
        createStripeCheckout({
          amount: 10000,
          currency: 'dkk',
          bookingId: 'booking-1',
          paymentId: 'payment-test-001',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('STRIPE_ERROR');
    });

    it('should apply salon stripe account for connect', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createStripeCheckout({
        amount: 10000,
        currency: 'dkk',
        bookingId: 'booking-1',
        paymentId: 'payment-test-001',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        stripeAccountId: 'acct_salon_123',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.any(Object), {
        stripeAccount: 'acct_salon_123',
      });
    });

    it('should handle different currencies', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createStripeCheckout({
        amount: 10000,
        currency: 'eur',
        bookingId: 'booking-1',
        paymentId: 'payment-test-001',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'eur',
              }),
            }),
          ],
        }),
        expect.any(Object),
      );
    });

    it('should include metadata', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createStripeCheckout({
        amount: 10000,
        currency: 'dkk',
        bookingId: 'booking-1',
        paymentId: 'payment-test-001',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { salonId: 'salon-1', customerId: 'cust-1' },
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bookingId: 'booking-1',
          paymentId: 'payment-test-001',
            salonId: 'salon-1',
            customerId: 'cust-1',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('getStripeCheckoutSession', () => {
    it('should retrieve checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123',
        status: 'complete',
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
      };
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await getStripeCheckoutSession('cs_test_123');

      expect(result.id).toBe('cs_test_123');
      expect(result.status).toBe('complete');
    });

    it('should retrieve with payment intent expanded', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_intent: {
          id: 'pi_test_123',
          status: 'succeeded',
        },
      };
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await getStripeCheckoutSession('cs_test_123');

      expect(result.payment_intent).toBeDefined();
    });

    it('should handle invalid session ID', async () => {
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(
        new Error('No such checkout session'),
      );

      await expect(getStripeCheckoutSession('invalid_id')).rejects.toThrow();
    });
  });

  describe('getStripePaymentIntent', () => {
    it('should retrieve payment intent', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 10000,
        currency: 'dkk',
      };
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await getStripePaymentIntent('pi_test_123');

      expect(result.id).toBe('pi_test_123');
      expect(result.status).toBe('succeeded');
    });

    it('should handle requires_action status', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        status: 'requires_action',
        client_secret: 'secret_123',
      };
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await getStripePaymentIntent('pi_test_123');

      expect(result.status).toBe('requires_action');
    });
  });

  describe('createStripeRefund', () => {
    it('should create full refund', async () => {
      const mockRefund = {
        id: 're_test_123',
        status: 'succeeded',
        amount: 10000,
      };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createStripeRefund('pi_test_123', {
        reason: 'requested_by_customer',
      });

      expect(result.refundId).toBe('re_test_123');
      expect(result.status).toBe('succeeded');
    });

    it('should create partial refund', async () => {
      const mockRefund = {
        id: 're_test_123',
        status: 'succeeded',
        amount: 5000,
      };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createStripeRefund('pi_test_123', {
        amount: 5000,
        reason: 'partial_refund',
      });

      expect(result.refundId).toBe('re_test_123');
      expect(result.status).toBe('succeeded');
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test_123',
          amount: 5000,
        }),
        expect.any(Object),
      );
    });

    it('should handle refund failure', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Charge has already been refunded'));

      await expect(createStripeRefund('pi_test_123', {})).rejects.toThrow();
    });
  });

  describe('constructStripeEvent', () => {
    it('should construct valid webhook event', () => {
      const mockPayload = JSON.stringify({
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
      });
      const mockSignature = 'sig_test_123';

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = constructStripeEvent(mockPayload, mockSignature);

      expect(result.type).toBe('payment_intent.succeeded');
    });

    it('should throw on invalid signature', () => {
      const mockPayload = '{}';
      const mockSignature = 'invalid_sig';

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => constructStripeEvent(mockPayload, mockSignature)).toThrow(
        'Invalid signature',
      );
    });

    it('should handle different event types', () => {
      const eventTypes = [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'customer.subscription.created',
      ];

      eventTypes.forEach((eventType) => {
        const mockEvent = {
          id: 'evt_test_123',
          type: eventType,
          data: {},
        };

        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

        const result = constructStripeEvent('{}', 'sig');
        expect(result.type).toBe(eventType);
      });
    });
  });

  describe('getStripeAccount', () => {
    it('should retrieve connect account', async () => {
      const mockAccount = {
        id: 'acct_salon_123',
        charges_enabled: true,
        payouts_enabled: true,
        requirements: { currently_due: [] },
      };
      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await getStripeAccount('acct_salon_123');

      expect(result.id).toBe('acct_salon_123');
      expect(result.charges_enabled).toBe(true);
    });

    it('should handle restricted account', async () => {
      const mockAccount = {
        id: 'acct_salon_123',
        charges_enabled: false,
        requirements: { currently_due: ['business_profile.url'] },
      };
      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await getStripeAccount('acct_salon_123');

      expect(result.charges_enabled).toBe(false);
    });
  });

  describe('exchangeStripeConnectCode', () => {
    it('should exchange code for account', async () => {
      const mockResponse = {
        stripe_user_id: 'acct_salon_123',
        stripe_publishable_key: 'pk_test_salon',
      };
      mockStripe.oauth.token.mockResolvedValue(mockResponse);

      const result = await exchangeStripeConnectCode('auth_code_123');

      expect(result.accountId).toBe('acct_salon_123');
      expect(result.publishableKey).toBe('pk_test_salon');
    });

    it('should handle invalid auth code', async () => {
      mockStripe.oauth.token.mockRejectedValue(new Error('Invalid authorization code'));

      await expect(exchangeStripeConnectCode('invalid_code')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Network error'));

      await expect(
        createStripeCheckout({
          amount: 10000,
          currency: 'dkk',
          bookingId: 'booking-1',
          paymentId: 'payment-test-001',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('STRIPE_ERROR');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 'rate_limit';
      mockStripe.checkout.sessions.create.mockRejectedValue(rateLimitError);

      await expect(
        createStripeCheckout({
          amount: 10000,
          currency: 'dkk',
          bookingId: 'booking-1',
          paymentId: 'payment-test-001',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('STRIPE_RATE_LIMIT');
    });

    it('should handle idempotency conflicts', async () => {
      const idempotencyError = new Error('Idempotency key in use');
      (idempotencyError as any).code = 'idempotency_error';
      mockStripe.checkout.sessions.create.mockRejectedValue(idempotencyError);

      await expect(
        createStripeCheckout({
          amount: 10000,
          currency: 'dkk',
          bookingId: 'booking-1',
          paymentId: 'payment-test-001',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          idempotencyKey: 'test-key',
        }),
      ).rejects.toThrow('STRIPE_IDEMPOTENCY_ERROR');
    });
  });

  describe('Idempotency', () => {
    it('should use idempotency key for retry safety', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createStripeCheckout({
        amount: 10000,
        currency: 'dkk',
        bookingId: 'booking-1',
        paymentId: 'payment-test-001',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        idempotencyKey: 'unique-key-123',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          idempotencyKey: 'unique-key-123',
        }),
      );
    });
  });
});
