import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notImplemented } from '../../../server/not-implemented.js';
import { contentService } from '../service/content-service.js';

const bookingCreateSchema = z
  .object({
    salonId: z.string().uuid(),
    serviceId: z.string().uuid(),
    staffId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    notes: z.string().optional(),
    customerId: z.string().uuid().optional(),
    customer: z
      .object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        notes: z.string().optional()
      })
      .optional()
  })
  .superRefine((value, ctx) => {
    if (!value.customerId && !value.customer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide customerId or customer details.'
      });
    }
  });

export function registerContentRoutes(app: FastifyInstance) {
  app.get('/v1/salons/:salonId', async (request, reply) => {
    return notImplemented(reply, request, 'Get salon not implemented');
  });

  app.patch('/v1/salons/:salonId', async (request, reply) => {
    return notImplemented(reply, request, 'Update salon not implemented');
  });

  app.get('/v1/services', async (request, reply) => {
    return notImplemented(reply, request, 'List services not implemented');
  });

  app.post('/v1/services', async (request, reply) => {
    return notImplemented(reply, request, 'Create service not implemented');
  });

  app.get('/v1/services/:serviceId', async (request, reply) => {
    return notImplemented(reply, request, 'Get service not implemented');
  });

  app.patch('/v1/services/:serviceId', async (request, reply) => {
    return notImplemented(reply, request, 'Update service not implemented');
  });

  app.get('/v1/staff', async (request, reply) => {
    return notImplemented(reply, request, 'List staff not implemented');
  });

  app.post('/v1/staff', async (request, reply) => {
    return notImplemented(reply, request, 'Create staff not implemented');
  });

  app.get('/v1/customers', async (request, reply) => {
    return notImplemented(reply, request, 'List customers not implemented');
  });

  app.post('/v1/customers', async (request, reply) => {
    return notImplemented(reply, request, 'Create customer not implemented');
  });

  app.get('/v1/customers/:customerId', async (request, reply) => {
    return notImplemented(reply, request, 'Get customer not implemented');
  });

  app.patch('/v1/customers/:customerId', async (request, reply) => {
    return notImplemented(reply, request, 'Update customer not implemented');
  });

  app.get('/v1/bookings', async (request, reply) => {
    return notImplemented(reply, request, 'List bookings not implemented');
  });

  app.post('/v1/bookings', async (request, reply) => {
    const body = bookingCreateSchema.parse(request.body);
    const booking = await contentService.createBooking(body);
    reply.code(201).send(booking);
  });

  app.get('/v1/bookings/:bookingId', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const booking = await contentService.getBooking(params.bookingId);
    reply.code(200).send(booking);
  });

  app.patch('/v1/bookings/:bookingId', async (request, reply) => {
    return notImplemented(reply, request, 'Update booking not implemented');
  });
}
