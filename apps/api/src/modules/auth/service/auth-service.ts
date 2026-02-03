import type { FastifyRequest } from 'fastify';
import { authRepo } from '../repo/auth-repo.js';
import { httpError } from '../../../server/http-error.js';
import { getSupabaseClient } from '../../../server/db.js';
import { env } from '../../../config/env.js';
import type { AuthMeResponse, AuthUser } from '../domain/auth-domain.js';

type AuthResolution = {
  user: AuthUser;
};

export const authService = {
  async resolveAuthUser(request: FastifyRequest): Promise<AuthResolution> {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user) {
        throw httpError(401, 'UNAUTHORIZED', 'Invalid or expired session.');
      }
      return {
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
          fullName: data.user.user_metadata?.full_name ?? null,
          phone: data.user.phone ?? null
        }
      };
    }

    const devBypassEnabled = env.DEV_AUTH_BYPASS === 'true';
    if (env.NODE_ENV === 'production' && devBypassEnabled) {
      throw httpError(500, 'CONFIG_ERROR', 'DEV_AUTH_BYPASS is not allowed in production.');
    }

    const devUserId = request.headers['x-user-id'];
    if (devBypassEnabled && typeof devUserId === 'string' && devUserId.length > 0) {
      return {
        user: {
          id: devUserId,
          email: typeof request.headers['x-user-email'] === 'string' ? request.headers['x-user-email'] : null
        }
      };
    }

    throw httpError(401, 'UNAUTHORIZED', 'Missing authentication.');
  },

  async getMe(request: FastifyRequest): Promise<AuthMeResponse> {
    const { user } = await this.resolveAuthUser(request);
    const ensured = await authRepo.upsertUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone
    });

    const salonId = await authRepo.provisionSalonForUser({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone
    });

    if (!ensured.primarySalonId || ensured.primarySalonId !== salonId) {
      await authRepo.setPrimarySalon(user.id, salonId);
    }

    const memberships = await authRepo.getMembershipsByUserId(user.id);
    const primarySalonId = salonId ?? ensured.primarySalonId ?? null;
    const salonSummary =
      memberships.find((membership) => membership.salonId === primarySalonId)?.salon ?? null;

    return {
      user: {
        id: ensured.id,
        email: ensured.email ?? null,
        fullName: ensured.fullName ?? null,
        phone: ensured.phone ?? null,
        primarySalonId
      },
      memberships,
      primarySalonId,
      salon: salonSummary
    };
  },

  async requirePrimarySalonId(request: FastifyRequest): Promise<string> {
    const { user } = await this.resolveAuthUser(request);
    const record = await authRepo.getUserById(user.id);
    if (!record?.primarySalonId) {
      throw httpError(403, 'SALON_REQUIRED', 'No primary salon found for user.');
    }
    return record.primarySalonId;
  }
};
