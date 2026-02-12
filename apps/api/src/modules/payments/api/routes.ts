import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { httpError } from '../../../server/http-error.js';
import { getPaymentById } from '../repo/payments-repo.js';
import { paymentsService } from '../service/payments-service.js';
import { authService } from '../../auth/service/auth-service.js';
import { getBookingById } from '../../bookings/repo/bookings-repo.js';
import { createEvent } from '../../events/repo/events-repo.js';

const checkoutBodySchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().min(8).optional(),
});

const refundBodySchema = z.object({
  idempotencyKey: z.string().min(8).optional(),
  reason: z.string().min(1).optional(),
});

const connectCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

function appendQuery(url: string, key: string, value: string) {
  try {
    const target = new URL(url);
    target.searchParams.set(key, value);
    return target.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

export function registerPaymentsRoutes(app: FastifyInstance) {
  app.post('/v1/payments/connect/start', async (request, reply) => {
    const { user } = await authService.resolveAuthUser(request);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.startStripeConnect({ salonId, userId: user.id });
    reply.code(200).send(result);
  });

  app.get('/v1/payments/connect/status', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const status = await paymentsService.getStripeConnectStatus({ salonId });
    reply.code(200).send(status);
  });

  app.get('/v1/payments/connect/callback', async (request, reply) => {
    const query = connectCallbackSchema.parse(request.query);
    try {
      await paymentsService.handleStripeConnectCallback({
        code: query.code,
        state: query.state,
        error: query.error,
        errorDescription: query.error_description,
      });
      const successUrl = env.STRIPE_CONNECT_SUCCESS_URL ?? env.PUBLIC_APP_URL ?? '/';
      reply.redirect(appendQuery(successUrl, 'stripe', 'success'));
    } catch (error) {
      const failureUrl = env.STRIPE_CONNECT_FAILURE_URL ?? env.PUBLIC_APP_URL ?? '/';
      const message = error instanceof Error ? error.message : 'Stripe connect failed';
      reply.redirect(appendQuery(failureUrl, 'stripe', message));
    }
  });

  app.post(
    '/v1/bookings/:bookingId/checkout',
    { config: { rateLimit: { max: 30, timeWindow: 60_000 } } },
    async (request, reply) => {
      const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
      const body = checkoutBodySchema.parse(request.body);
      const { user } = await authService.resolveAuthUser(request);
      const salonId = await authService.requirePrimarySalonId(request);
      await authService.requireRole(request, salonId, 'owner');
      const headerKey = request.headers['idempotency-key'];
      const idempotencyKey =
        body.idempotencyKey ?? (typeof headerKey === 'string' ? headerKey : undefined);
      const result = await paymentsService.createCheckoutForBooking({
        bookingId: params.bookingId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        salonId,
        userId: user.id,
        idempotencyKey,
      });
      await createEvent({
        eventKey: 'checkout.started',
        userId: user.id,
        salonId,
        metadata: {
          bookingId: params.bookingId,
          provider: result.provider ?? null,
        },
      });
      reply.code(201).send(result);
    },
  );

  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
      const bodyStr = typeof body === 'string' ? body : body.toString();
      (request as { rawBody?: string }).rawBody = bodyStr;
      if (bodyStr.length === 0) {
        done(null, null);
        return;
      }
      try {
        done(null, JSON.parse(bodyStr));
      } catch (error) {
        done(error as Error, undefined);
      }
    });

    scope.post(
      '/v1/webhooks/stripe',
      { config: { rawBody: true, rateLimit: { max: 600, timeWindow: 60_000 } } },
      async (request, reply) => {
        const signatureHeader = request.headers['stripe-signature'];
        const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;
        const rawBody = (request as { rawBody?: string }).rawBody;
        const fallbackBody =
          env.PAYMENTS_USE_MOCK === 'true' && request.body
            ? JSON.stringify(request.body)
            : undefined;
        const resolvedRawBody = rawBody ?? fallbackBody;

        if (!resolvedRawBody) {
          throw httpError(400, 'STRIPE_RAW_BODY_MISSING', 'Missing raw body for Stripe webhook.');
        }

        const result = await paymentsService.handleStripeWebhook(resolvedRawBody, signature);
        reply.code(200).send(result);
      },
    );
  });

  app.get('/v1/payments/:paymentId', async (request, reply) => {
    const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const payment = await getPaymentById(params.paymentId);
    if (!payment) {
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    const booking = await getBookingById(payment.bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }
    if (booking.salonId !== salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this payment.');
    }
    reply.code(200).send(payment);
  });

  app.post('/v1/payments/:paymentId/refund', async (request, reply) => {
    const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
    const body = refundBodySchema.parse(request.body ?? {});
    const { user } = await authService.resolveAuthUser(request);
    const salonId = await authService.requirePrimarySalonId(request);
    const headerKey = request.headers['idempotency-key'];
    const idempotencyKey =
      body.idempotencyKey ?? (typeof headerKey === 'string' ? headerKey : undefined);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.refundPayment({
      paymentId: params.paymentId,
      salonId,
      userId: user.id,
      idempotencyKey,
      reason: body.reason,
    });
    reply.code(200).send(result);
  });

  app.post('/v1/payments/:paymentId/reconcile', async (request, reply) => {
    const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.reconcilePayment({
      paymentId: params.paymentId,
      salonId,
    });
    reply.code(200).send(result);
  });

  // ========== PAYMENT LISTING & FILTERING ==========

  app.get('/v1/payments', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const query = z
      .object({
        status: z.enum(['succeeded', 'failed', 'refunded', 'pending', 'cancelled']).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.string().transform(Number).default('50'),
        offset: z.string().transform(Number).default('0'),
      })
      .parse(request.query);

    const payments = await paymentsService.listPayments({
      salonId,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      limit: query.limit,
      offset: query.offset,
    });
    reply.code(200).send(payments);
  });

  // ========== ANALYTICS ROUTES ==========

  app.get('/v1/payments/analytics/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    await authService.requireRole(request, params.salonId, ['owner', 'staff']);
    const analytics = await paymentsService.getPaymentAnalytics(params.salonId);
    reply.code(200).send(analytics);
  });

  app.get('/v1/payments/analytics/mrr/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        groupByPlan: z
          .string()
          .transform((v) => v === 'true')
          .optional(),
        includeGrowth: z
          .string()
          .transform((v) => v === 'true')
          .optional(),
      })
      .parse(request.query);
    await authService.requireRole(request, params.salonId, ['owner', 'staff']);
    const mrr = await paymentsService.calculateMRR(params.salonId, {
      groupByPlan: query.groupByPlan,
      includeGrowth: query.includeGrowth,
    });
    reply.code(200).send(mrr);
  });

  app.get('/v1/payments/analytics/forecast/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        days: z.string().transform(Number).default('30'),
        useHistoricalData: z
          .string()
          .transform((v) => v === 'true')
          .optional(),
        accountForSeasonality: z
          .string()
          .transform((v) => v === 'true')
          .optional(),
      })
      .parse(request.query);
    await authService.requireRole(request, params.salonId, ['owner', 'staff']);
    const forecast = await paymentsService.getRevenueForecast(params.salonId, query.days, {
      useHistoricalData: query.useHistoricalData,
      accountForSeasonality: query.accountForSeasonality,
    });
    reply.code(200).send(forecast);
  });

  app.get('/v1/payments/analytics/failed/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        fromDate: z.string(),
        toDate: z.string(),
      })
      .parse(request.query);
    await authService.requireRole(request, params.salonId, ['owner', 'staff']);
    const report = await paymentsService.getFailedPaymentsReport(
      params.salonId,
      query.fromDate,
      query.toDate,
    );
    reply.code(200).send(report);
  });

  app.get('/v1/payments/analytics/chargeback-rate', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const query = z
      .object({
        fromDate: z.string(),
        toDate: z.string(),
      })
      .parse(request.query);
    const rate = await paymentsService.getChargebackRate(salonId, query.fromDate, query.toDate);
    reply.code(200).send({ rate });
  });

  // ========== REFUND ROUTES ==========

  app.get('/v1/payments/refunds', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const refunds = await paymentsService.listRefunds({ salonId });
    reply.code(200).send(refunds);
  });

  app.post('/v1/payments/refunds/bulk', async (request, reply) => {
    const { user } = await authService.resolveAuthUser(request);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const body = z
      .object({
        refunds: z.array(
          z.object({
            paymentId: z.string().uuid(),
            amount: z.number().int().positive(),
          }),
        ),
      })
      .parse(request.body);
    const result = await paymentsService.processBulkRefund(body.refunds);
    reply.code(200).send(result);
  });

  // ========== DISPUTE ROUTES ==========

  app.get('/v1/payments/disputes', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const disputes = await paymentsService.listDisputes({ salonId });
    reply.code(200).send(disputes);
  });

  app.post('/v1/payments/disputes/:disputeId/action', async (request, reply) => {
    const params = z.object({ disputeId: z.string() }).parse(request.params);
    const body = z
      .object({
        action: z.enum(['challenge', 'accept']),
      })
      .parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.handlePaymentDispute(params.disputeId, body.action);
    reply.code(200).send(result);
  });

  // ========== PAYMENT METHODS ROUTES ==========

  app.get('/v1/payments/methods', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const methods = await paymentsService.listPaymentMethods({ salonId });
    reply.code(200).send(methods);
  });

  // ========== GATEWAY HEALTH ROUTES ==========

  app.get('/v1/payments/gateway/health', async (request, reply) => {
    const health = await paymentsService.getPaymentGatewayHealth();
    reply.code(200).send(health);
  });

  app.post('/v1/payments/gateway/test/:gateway', async (request, reply) => {
    const params = z.object({ gateway: z.string() }).parse(request.params);
    const result = await paymentsService.testGatewayConnection(params.gateway);
    reply.code(200).send(result);
  });

  // ========== EXPORT/IMPORT ROUTES ==========

  app.get('/v1/payments/export/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        format: z.enum(['csv', 'json']),
        fromDate: z.string(),
        toDate: z.string(),
        gdprExport: z
          .string()
          .transform((v) => v === 'true')
          .optional(),
      })
      .parse(request.query);
    await authService.requireRole(request, params.salonId, 'owner');
    const data = await paymentsService.exportPaymentData(params.salonId, {
      format: query.format,
      fromDate: query.fromDate,
      toDate: query.toDate,
      gdprExport: query.gdprExport,
    });
    reply.code(200).send(data);
  });

  // ========== SUBSCRIPTION ROUTES ==========

  app.get('/v1/payments/subscriptions', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const subscriptions = await paymentsService.listSubscriptions({ salonId });
    reply.code(200).send(subscriptions);
  });

  app.get('/v1/payments/invoices', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const invoices = await paymentsService.listInvoices({ salonId });
    reply.code(200).send(invoices);
  });

  // ========== RECONCILIATION ROUTES ==========

  app.post('/v1/payments/reconcile', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const body = z
      .object({
        fromDate: z.string(),
        toDate: z.string(),
      })
      .parse(request.body);
    const result = await paymentsService.reconcilePayments(body.fromDate, body.toDate);
    reply.code(200).send(result);
  });

  app.get('/v1/payments/unreconciled', async (request, reply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, ['owner', 'staff']);
    const query = z
      .object({
        fromDate: z.string(),
        toDate: z.string(),
      })
      .parse(request.query);
    const payments = await paymentsService.getUnreconciledPayments(query.fromDate, query.toDate);
    reply.code(200).send(payments);
  });

  // ========== FEE CALCULATION ROUTES ==========

  app.post('/v1/payments/calculate-fee', async (request, reply) => {
    const body = z
      .object({
        amount: z.number().int().positive(),
        currency: z.string().default('DKK'),
        options: z
          .object({
            volumeDiscount: z.boolean().optional(),
            internationalCard: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(request.body);
    const fee = await paymentsService.calculateProcessingFee(
      body.amount,
      body.currency,
      body.options,
    );
    reply.code(200).send({ fee });
  });

  app.post('/v1/payments/split', async (request, reply) => {
    const body = z
      .object({
        amount: z.number().int().positive(),
        platformFeePercent: z.number().min(0).max(100),
        options: z
          .object({
            taxRate: z.number().optional(),
            deductProcessingFee: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(request.body);
    const result = await paymentsService.splitPaymentWithPlatform(
      body.amount,
      body.platformFeePercent,
      body.options,
    );
    reply.code(200).send(result);
  });
}
