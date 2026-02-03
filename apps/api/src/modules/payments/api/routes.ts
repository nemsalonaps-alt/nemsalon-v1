import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { httpError } from '../../../server/http-error.js';
import { getPaymentById } from '../repo/payments-repo.js';
import { paymentsService } from '../service/payments-service.js';
import { authService } from '../../auth/service/auth-service.js';
import { getBookingById } from '../../content/repo/booking-repo.js';

const checkoutBodySchema = z.object({
  provider: z.enum(['stripe', 'mobilepay']).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().min(8).optional()
});

export function registerPaymentsRoutes(app: FastifyInstance) {
  app.post('/v1/bookings/:bookingId/checkout', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = checkoutBodySchema.parse(request.body);
    const { user } = await authService.resolveAuthUser(request);
    const salonId = await authService.requirePrimarySalonId(request);
    const headerKey = request.headers['idempotency-key'];
    const idempotencyKey = body.idempotencyKey ?? (typeof headerKey === 'string' ? headerKey : undefined);
    const result = await paymentsService.createCheckoutForBooking({
      bookingId: params.bookingId,
      provider: body.provider,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      salonId,
      userId: user.id,
      idempotencyKey
    });
    reply.code(201).send(result);
  });

  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
      (request as { rawBody?: string }).rawBody = body;
      if (body.length === 0) {
        done(null, null);
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        done(error as Error, undefined);
      }
    });

    scope.post(
      '/v1/webhooks/stripe',
      { config: { rawBody: true } },
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
}
