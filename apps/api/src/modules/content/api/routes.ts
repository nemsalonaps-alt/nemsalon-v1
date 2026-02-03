import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notImplemented } from '../../../server/not-implemented.js';
import { contentService } from '../service/content-service.js';
import { authService } from '../../auth/service/auth-service.js';
import { httpError } from '../../../server/http-error.js';

const bookingCreateSchema = z
  .object({
    serviceId: z.string().uuid(),
    staffId: z.string().uuid(),
    startTime: z.string().datetime().optional(),
    startUtc: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    endUtc: z.string().datetime().optional(),
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
    if (!value.startTime && !value.startUtc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide startTime or startUtc.'
      });
    }
    if (!value.customerId && !value.customer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide customerId or customer details.'
      });
    }
  });

export function registerContentRoutes(app: FastifyInstance) {
  const salonUpdateSchema = z
    .object({
      name: z.string().min(2).max(120).optional(),
      timezone: z.string().min(2).optional(),
      locale: z.string().min(2).optional(),
      currency: z.string().length(3).optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'No updates provided.' });

  const staffCreateSchema = z.object({
    name: z.string().min(2).max(80),
    role: z.enum(['owner', 'admin', 'staff']),
    active: z.boolean().default(true)
  });

  const serviceCreateSchema = z.object({
    name: z.string().min(2).max(80),
    durationMinutes: z.number().int().min(5).max(480),
    bufferMinutes: z.number().int().min(0).max(240).optional(),
    price: z.number().int().min(1),
    currency: z.string().length(3),
    active: z.boolean().default(true)
  });

  const businessHoursEntrySchema = z.object({
    day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    enabled: z.boolean()
  });

  const businessHoursPayloadSchema = z.object({
    weekly: z.array(businessHoursEntrySchema).min(1)
  });

  const staffServicesAssignSchema = z.object({
    serviceIds: z.array(z.string().uuid()).min(1)
  });

  const bookingCancelSchema = z
    .object({
      reasonKey: z.string().min(1).optional(),
      note: z.string().min(1).optional()
    })
    .default({});

  const bookingRescheduleSchema = z.object({
    staffId: z.string().uuid(),
    startUtc: z.string().datetime()
  });

  app.get('/v1/salons/:salonId', async (request, reply) => {
    return notImplemented(reply, request, 'Get salon not implemented');
  });

  app.patch('/v1/salons/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const body = salonUpdateSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    if (salonId !== params.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this salon.');
    }
    const salon = await contentService.updateSalon(params.salonId, body);
    reply.code(200).send(salon);
  });

  app.get('/v1/salons/:salonId/business-hours', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    if (salonId !== params.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this salon.');
    }
    const weekly = await contentService.getSalonBusinessHours(params.salonId);
    reply.code(200).send({ weekly });
  });

  app.put('/v1/salons/:salonId/business-hours', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    if (salonId !== params.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this salon.');
    }
    const body = businessHoursPayloadSchema.parse(request.body);
    const daySet = new Set<string>();
    for (const entry of body.weekly) {
      if (daySet.has(entry.day)) {
        throw httpError(400, 'BUSINESS_HOURS_DUPLICATE_DAY', 'Each day can only appear once.');
      }
      daySet.add(entry.day);
      if (entry.enabled && entry.startTime >= entry.endTime) {
        throw httpError(400, 'BUSINESS_HOURS_INVALID', 'Start time must be before end time.');
      }
    }
    const weekly = await contentService.setSalonBusinessHours(params.salonId, body.weekly);
    reply.code(200).send({ weekly });
  });

  app.get('/v1/services', async (request, reply) => {
    return notImplemented(reply, request, 'List services not implemented');
  });

  app.post('/v1/services', async (request, reply) => {
    const body = serviceCreateSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    const service = await contentService.createService({
      salonId,
      name: body.name,
      durationMinutes: body.durationMinutes,
      bufferMinutes: body.bufferMinutes,
      price: body.price,
      currency: body.currency,
      active: body.active ?? true
    });
    reply.code(201).send(service);
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
    const body = staffCreateSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    const staff = await contentService.createStaff({
      salonId,
      name: body.name,
      role: body.role,
      active: body.active ?? true
    });
    reply.code(201).send(staff);
  });

  app.get('/v1/staff/:staffId/services', async (request, reply) => {
    const params = z.object({ staffId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    const serviceIds = await contentService.getStaffServices({
      salonId,
      staffId: params.staffId
    });
    reply.code(200).send({ staffId: params.staffId, serviceIds });
  });

  app.post('/v1/staff/:staffId/services', async (request, reply) => {
    const params = z.object({ staffId: z.string().uuid() }).parse(request.params);
    const body = staffServicesAssignSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    const result = await contentService.assignStaffServices({
      salonId,
      staffId: params.staffId,
      serviceIds: body.serviceIds
    });
    reply.code(200).send(result);
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
    await authService.requirePrimarySalonId(request);
    return notImplemented(reply, request, 'List bookings not implemented');
  });

  app.post('/v1/bookings', async (request, reply) => {
    const body = bookingCreateSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    const headerKey = request.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const booking = await contentService.createBooking({
      salonId,
      serviceId: body.serviceId,
      staffId: body.staffId,
      startTime: body.startUtc ?? body.startTime ?? '',
      endTime: body.endUtc ?? body.endTime,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      notes: body.notes,
      customerId: body.customerId,
      customer: body.customer
    });
    reply.code(201).send(booking);
  });

  app.get('/v1/bookings/:bookingId', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const salonId = await authService.requirePrimarySalonId(request);
    const booking = await contentService.getBooking(params.bookingId);
    if (booking.salonId !== salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this booking.');
    }
    reply.code(200).send(booking);
  });

  app.patch('/v1/bookings/:bookingId', async (request, reply) => {
    await authService.requirePrimarySalonId(request);
    return notImplemented(reply, request, 'Update booking not implemented');
  });

  app.post('/v1/bookings/:bookingId/cancel', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = bookingCancelSchema.parse(request.body);
    const booking = await contentService.getBooking(params.bookingId);
    await authService.requireSalonRole(request, booking.salonId, ['owner']);
    const cancelled = await contentService.cancelBooking({
      bookingId: params.bookingId,
      reasonKey: body.reasonKey,
      note: body.note
    });
    reply.code(200).send({ booking: cancelled });
  });

  app.post('/v1/bookings/:bookingId/reschedule', async (request, reply) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = bookingRescheduleSchema.parse(request.body);
    const booking = await contentService.getBooking(params.bookingId);
    await authService.requireSalonRole(request, booking.salonId, ['owner']);
    const updated = await contentService.rescheduleBooking({
      bookingId: params.bookingId,
      staffId: body.staffId,
      startTime: body.startUtc
    });
    reply.code(200).send({ booking: updated });
  });
}
