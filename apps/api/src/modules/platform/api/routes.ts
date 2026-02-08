import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../auth/service/auth-service.js';
import {
  getSalonById,
  listAuditLogs,
  listBookingsForSalon,
  listPaymentsForSalon,
  listSalons
} from '../repo/platform-repo.js';
import { httpError } from '../../../server/http-error.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';

const listOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export function registerPlatformRoutes(app: FastifyInstance) {
  app.get('/v1/platform/salons', async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        query: z.string().min(1).optional()
      })
      .merge(listOptionsSchema)
      .parse(request.query);
    const user = await authService.requirePlatformAdmin(request);
    const salons = await listSalons({
      status: query.status,
      query: query.query,
      limit: query.limit,
      offset: query.offset
    });
    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.read',
      entityType: 'salon',
      metadata: { route: '/v1/platform/salons', query }
    });
    reply.code(200).send({ data: salons });
  });

  app.get('/v1/platform/salons/:salonId', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const user = await authService.requirePlatformAdmin(request);
    const salon = await getSalonById(params.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    await createAuditLog({
      salonId: params.salonId,
      actorUserId: user.id,
      action: 'platform.read',
      entityType: 'salon',
      entityId: params.salonId,
      metadata: { route: '/v1/platform/salons/:salonId' }
    });
    reply.code(200).send(salon);
  });

  app.get('/v1/platform/salons/:salonId/bookings', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        status: z.string().optional()
      })
      .merge(listOptionsSchema)
      .parse(request.query);
    const user = await authService.requirePlatformAdmin(request);
    const bookings = await listBookingsForSalon({
      salonId: params.salonId,
      from: query.from,
      to: query.to,
      status: query.status,
      limit: query.limit,
      offset: query.offset
    });
    await createAuditLog({
      salonId: params.salonId,
      actorUserId: user.id,
      action: 'platform.read',
      entityType: 'booking',
      metadata: { route: '/v1/platform/salons/:salonId/bookings', query }
    });
    reply.code(200).send({ data: bookings });
  });

  app.get('/v1/platform/salons/:salonId/payments', async (request, reply) => {
    const params = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        status: z.string().optional()
      })
      .merge(listOptionsSchema)
      .parse(request.query);
    const user = await authService.requirePlatformAdmin(request);
    const payments = await listPaymentsForSalon({
      salonId: params.salonId,
      status: query.status,
      limit: query.limit,
      offset: query.offset
    });
    await createAuditLog({
      salonId: params.salonId,
      actorUserId: user.id,
      action: 'platform.read',
      entityType: 'payment',
      metadata: { route: '/v1/platform/salons/:salonId/payments', query }
    });
    reply.code(200).send({ data: payments });
  });

  app.get('/v1/platform/audit', async (request, reply) => {
    const query = z
      .object({
        salonId: z.string().uuid().optional(),
        actorUserId: z.string().uuid().optional(),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional()
      })
      .merge(listOptionsSchema)
      .parse(request.query);
    const user = await authService.requirePlatformAdmin(request);
    const entries = await listAuditLogs({
      salonId: query.salonId,
      actorUserId: query.actorUserId,
      entityType: query.entityType,
      entityId: query.entityId,
      limit: query.limit,
      offset: query.offset
    });
    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.read',
      entityType: 'audit_log',
      metadata: { route: '/v1/platform/audit', query }
    });
    reply.code(200).send({ data: entries });
  });
}
