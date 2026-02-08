import type { FastifyInstance } from 'fastify';
import { ZodError, z } from 'zod';
import { authService } from '../../auth/service/auth-service.js';
import { httpError } from '../../../server/http-error.js';
import { availabilityService } from '../service/availability-service.js';
import { createEvent } from '../../events/repo/events-repo.js';
import { getRequestContext } from '../../../server/request-context.js';

const querySchema = z.object({
  serviceId: z.string().uuid(),
  from: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  staffId: z.string().uuid().optional(),
  intervalMinutes: z.coerce.number().int().min(5).max(60).optional()
});

export function registerAvailabilityRoutes(app: FastifyInstance) {
  app.get(
    '/v1/availability/slots',
    { config: { rateLimit: { max: 120, timeWindow: 60_000 } } },
    async (request, reply) => {
    let query: z.infer<typeof querySchema>;
    try {
      query = querySchema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        throw httpError(400, 'AVAILABILITY_INVALID_QUERY', 'error.availability.invalid_query', {
          details: error.flatten()
        });
      }
      throw error;
    }

    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'staff');
    const result = await availabilityService.getSlots({
      salonId,
      serviceId: query.serviceId,
      fromUtc: query.from,
      days: query.days,
      limit: query.limit,
      staffId: query.staffId,
      intervalMinutes: query.intervalMinutes
    });
    const context = getRequestContext(request);
    await createEvent({
      eventKey: 'availability.viewed',
      userId: context.userId ?? null,
      salonId,
      metadata: {
        serviceId: query.serviceId,
        staffId: query.staffId ?? null,
        from: query.from ?? null,
        days: query.days ?? null,
        intervalMinutes: query.intervalMinutes ?? null
      }
    });
    reply.code(200).send(result);
    }
  );
}
