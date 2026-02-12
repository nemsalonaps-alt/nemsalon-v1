import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { httpError } from '../../../server/http-error.js';
import { publicBookingService } from '../service/public-booking-service.js';

const slugSchema = z.string().min(2).max(120);

const publicAvailabilitySchema = z.object({
  salonSlug: slugSchema,
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  intervalMinutes: z.coerce.number().int().min(5).max(60).optional()
});

const publicBookingSchema = z.object({
  salonSlug: slugSchema,
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  startUtc: z.string().datetime(),
  notes: z.string().optional(),
  idempotencyKey: z.string().min(8).optional(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(3).optional()
  }).refine((value) => Boolean(value.email || value.phone), {
    message: 'Provide email or phone.'
  })
});

const bookingTokenSchema = z.object({
  bookingToken: z.string().min(12).optional(),
  token: z.string().min(12).optional()
});

const checkoutSchema = z.object({
  bookingToken: z.string().min(12).optional(),
  token: z.string().min(12).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

const cancelSchema = z.object({
  bookingToken: z.string().min(12).optional(),
  token: z.string().min(12).optional(),
  reasonKey: z.string().min(1).optional(),
  note: z.string().min(1).optional()
});

const rescheduleSchema = z.object({
  bookingToken: z.string().min(12).optional(),
  token: z.string().min(12).optional(),
  staffId: z.string().uuid().optional(),
  startUtc: z.string().datetime()
});

export function registerPublicRoutes(app: FastifyInstance) {
  app.get('/v1/public/salons/:slug', async (request, reply) => {
    const params = z.object({ slug: slugSchema }).parse(request.params);
    const salon = await publicBookingService.getSalonBySlug(params.slug);
    reply.code(200).send(salon);
  });

  app.get('/v1/public/salons/:slug/services', async (request, reply) => {
    const params = z.object({ slug: slugSchema }).parse(request.params);
    const services = await publicBookingService.listServices(params.slug);
    reply.code(200).send({ data: services });
  });

  app.get('/v1/public/salons/:slug/staff', async (request, reply) => {
    const params = z.object({ slug: slugSchema }).parse(request.params);
    const query = z.object({ serviceId: z.string().uuid().optional() }).parse(request.query);
    const staff = await publicBookingService.listStaff(params.slug, query.serviceId);
    reply.code(200).send({ data: staff });
  });

  app.get('/v1/public/availability', { config: { rateLimit: { max: 120, timeWindow: 60_000 } } }, async (request, reply) => {
    const query = publicAvailabilitySchema.parse(request.query);
    const result = await publicBookingService.listAvailability({
      salonSlug: query.salonSlug,
      serviceId: query.serviceId,
      staffId: query.staffId,
      fromUtc: query.from,
      days: query.days,
      limit: query.limit,
      intervalMinutes: query.intervalMinutes
    });
    reply.code(200).send(result);
  });

  app.post('/v1/public/bookings', { config: { rateLimit: { max: 30, timeWindow: 60_000 } } }, async (request, reply) => {
    const body = publicBookingSchema.parse(request.body);
    const result = await publicBookingService.createPublicBooking(body);
    reply.code(201).send(result);
  });

  app.get('/v1/public/bookings/:bookingId', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const query = bookingTokenSchema.parse(request.query);
    const token = resolveToken(query, request.headers['x-booking-token']);
    const booking = await publicBookingService.getPublicBooking({
      bookingId: params.bookingId,
      token
    });
    reply.code(200).send(booking);
  });

  app.post('/v1/public/bookings/:bookingId/checkout', { config: { rateLimit: { max: 30, timeWindow: 60_000 } } }, async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = checkoutSchema.parse(request.body ?? {});
    const token = resolveToken(body, request.headers['x-booking-token']);
    assertReturnUrlAllowed(body.successUrl);
    assertReturnUrlAllowed(body.cancelUrl);
    const result = await publicBookingService.createPublicCheckout({
      bookingId: params.bookingId,
      token,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl
    });
    reply.code(201).send(result);
  });

  app.post('/v1/public/bookings/:bookingId/cancel', { config: { rateLimit: { max: 20, timeWindow: 60_000 } } }, async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = cancelSchema.parse(request.body ?? {});
    const token = resolveToken(body, request.headers['x-booking-token']);
    const booking = await publicBookingService.cancelPublicBooking({
      bookingId: params.bookingId,
      token,
      reasonKey: body.reasonKey,
      note: body.note
    });
    reply.code(200).send(booking);
  });

  app.post('/v1/public/bookings/:bookingId/reschedule', { config: { rateLimit: { max: 20, timeWindow: 60_000 } } }, async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = rescheduleSchema.parse(request.body ?? {});
    const token = resolveToken(body, request.headers['x-booking-token']);
    const booking = await publicBookingService.reschedulePublicBooking({
      bookingId: params.bookingId,
      token,
      staffId: body.staffId,
      startUtc: body.startUtc
    });
    reply.code(200).send(booking);
  });
}

function resolveToken(
  body: { bookingToken?: string; token?: string },
  headerToken: string | string[] | undefined
) {
  if (typeof headerToken === 'string' && headerToken.length > 0) return headerToken;
  const token = body.bookingToken ?? body.token;
  if (!token) {
    throw httpError(401, 'BOOKING_TOKEN_REQUIRED', 'Booking token is required.');
  }
  return token;
}

function assertReturnUrlAllowed(url: string) {
  if (!env.PUBLIC_APP_URL) return;
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  if (!url.startsWith(base)) {
    throw httpError(400, 'CHECKOUT_RETURN_URL_INVALID', 'Return URL is not allowed.');
  }
}
