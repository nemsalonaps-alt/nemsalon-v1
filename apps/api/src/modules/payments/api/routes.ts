import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { httpError } from '../../../server/http-error.js';
import { getPaymentById } from '../repo/payments-repo.js';
import { paymentsService } from '../service/payments-service.js';

const checkoutBodySchema = z.object({
  provider: z.enum(['stripe', 'mobilepay']).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

export function registerPaymentsRoutes(app: FastifyInstance) {
  app.post('/v1/bookings/:bookingId/checkout', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = checkoutBodySchema.parse(request.body);
    const result = await paymentsService.createCheckoutForBooking({
      bookingId: params.bookingId,
      provider: body.provider,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl
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
    const payment = await getPaymentById(params.paymentId);
    if (!payment) {
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    reply.code(200).send(payment);
  });
}
