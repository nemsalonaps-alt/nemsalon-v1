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
  idempotencyKey: z.string().min(8).optional()
});

const refundBodySchema = z.object({
  idempotencyKey: z.string().min(8).optional(),
  reason: z.string().min(1).optional()
});

export function registerPaymentsRoutes(app: FastifyInstance) {
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
    const idempotencyKey = body.idempotencyKey ?? (typeof headerKey === 'string' ? headerKey : undefined);
    const result = await paymentsService.createCheckoutForBooking({
      bookingId: params.bookingId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      salonId,
      userId: user.id,
      idempotencyKey
    });
    await createEvent({
      eventKey: 'checkout.started',
      userId: user.id,
      salonId,
      metadata: {
        bookingId: params.bookingId,
        provider: result.provider ?? null
      }
    });
    reply.code(201).send(result);
    }
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
      }
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
    const idempotencyKey = body.idempotencyKey ?? (typeof headerKey === 'string' ? headerKey : undefined);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.refundPayment({
      paymentId: params.paymentId,
      salonId,
      userId: user.id,
      idempotencyKey,
      reason: body.reason
    });
    reply.code(200).send(result);
  });

  app.post('/v1/payments/:paymentId/reconcile', async (request, reply) => {
    const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const result = await paymentsService.reconcilePayment({
      paymentId: params.paymentId,
      salonId
    });
    reply.code(200).send(result);
  });
}
