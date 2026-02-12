import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../service/auth-service.js';
import { usersRepo } from '../../users/repo/users-repo.js';
import { httpError } from '../../../server/http-error.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';

const IMPERSONATION_HEADER = 'x-impersonated-user-id';

export function registerImpersonationRoutes(app: FastifyInstance) {
  app.get(
    '/v1/platform/impersonation/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await authService.resolveAuthUser(request);
      const isPlatformAdmin = await authService.isUserPlatformAdmin(user.user.id, user.user.email);

      if (!isPlatformAdmin) {
        throw httpError(403, 'FORBIDDEN', 'Only platform admins can check impersonation status.');
      }

      const impersonatedId = request.headers[IMPERSONATION_HEADER];
      if (!impersonatedId || typeof impersonatedId !== 'string') {
        reply.code(200).send({ isImpersonating: false });
        return;
      }

      const impersonatedUser = await usersRepo.getUserById(impersonatedId);

      reply.code(200).send({
        isImpersonating: !!impersonatedUser,
        impersonator: {
          id: user.user.id,
          email: user.user.email,
          fullName: user.user.fullName,
        },
        impersonatedUser: impersonatedUser
          ? {
              id: impersonatedUser.id,
              email: impersonatedUser.email,
              fullName: impersonatedUser.fullName,
              role: impersonatedUser.role,
              salonName: impersonatedUser.salonName,
            }
          : null,
      });
    },
  );

  app.post(
    '/v1/platform/impersonate/:userId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = z.object({ userId: z.string().uuid() }).parse(request.params);
      const actor = await authService.resolveAuthUser(request);
      const isPlatformAdmin = await authService.isUserPlatformAdmin(actor.user.id, actor.user.email);

      if (!isPlatformAdmin) {
        throw httpError(403, 'FORBIDDEN', 'Only platform admins can impersonate users.');
      }

      const targetUser = await usersRepo.getUserById(params.userId);
      if (!targetUser) {
        throw httpError(404, 'USER_NOT_FOUND', 'Target user not found.');
      }
      reply.code(200).send({
        success: true,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.fullName,
          role: targetUser.role,
          salonName: targetUser.salonName,
        },
      });

      await createAuditLog({
        actorUserId: actor.user.id,
        action: 'platform.impersonate.start',
        entityType: 'user',
        entityId: params.userId,
        metadata: {
          targetUserEmail: targetUser.email,
          targetRole: targetUser.role,
        },
      });
    },
  );

  app.post(
    '/v1/platform/stop-impersonation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authService.resolveAuthUser(request);
      reply.code(200).send({
        success: true,
        message: 'Stopped impersonating.',
      });

      await createAuditLog({
        actorUserId: actor.user.id,
        action: 'platform.impersonate.stop',
        entityType: 'user',
        entityId: actor.user.id,
        metadata: {
          impersonatedUserEmail: actor.user.email,
        },
      });
    },
  );
}
