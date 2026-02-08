import type { FastifyRequest } from 'fastify';
import { authRepo } from '../repo/auth-repo.js';
import { httpError } from '../../../server/http-error.js';
import { getSupabaseClient } from '../../../server/db.js';
import { env } from '../../../config/env.js';
import type { AuthMeResponse, AuthUser, Membership } from '../domain/auth-domain.js';
import { setRequestContext } from '../../../server/request-context.js';

type AuthResolution = {
  user: AuthUser;
};

const roleWeight: Record<Membership['role'], number> = {
  owner: 2,
  admin: 2,
  staff: 1
};

const platformAdminAllowlist = new Set(
  (env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

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
      const resolved = {
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
          fullName: data.user.user_metadata?.full_name ?? null,
          phone: data.user.phone ?? null
        }
      };
      setRequestContext(request, { userId: resolved.user.id });
      return resolved;
    }

    const devBypassEnabled = env.DEV_AUTH_BYPASS === 'true';
    if (env.NODE_ENV === 'production' && devBypassEnabled) {
      throw httpError(500, 'CONFIG_ERROR', 'DEV_AUTH_BYPASS is not allowed in production.');
    }

    const devUserId = request.headers['x-user-id'];
    if (devBypassEnabled && typeof devUserId === 'string' && devUserId.length > 0) {
      const resolved = {
        user: {
          id: devUserId,
          email: typeof request.headers['x-user-email'] === 'string' ? request.headers['x-user-email'] : null
        }
      };
      setRequestContext(request, { userId: resolved.user.id });
      return resolved;
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
  },
  async requireMembership(request: FastifyRequest, salonId: string): Promise<Membership> {
    const { user } = await this.resolveAuthUser(request);
    const memberships = await authRepo.getMembershipsByUserId(user.id);
    const membership = memberships.find((entry) => entry.salonId === salonId && entry.active);
    if (!membership) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }
    setRequestContext(request, { userId: user.id, salonId, role: membership.role });
    return membership;
  },
  async requireRole(
    request: FastifyRequest,
    salonId: string,
    minRole: Membership['role']
  ): Promise<Membership> {
    const membership = await this.requireMembership(request, salonId);
    if (roleWeight[membership.role] < roleWeight[minRole]) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }
    return membership;
  },
  async requireSalonRole(
    request: FastifyRequest,
    salonId: string,
    roles: Array<'owner' | 'admin' | 'staff'>
  ): Promise<void> {
    const membership = await this.requireMembership(request, salonId);
    if (!roles.includes(membership.role)) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }
  },
  async requirePlatformAdmin(request: FastifyRequest): Promise<AuthUser> {
    const { user } = await this.resolveAuthUser(request);
    const headerToken = request.headers['x-platform-admin-token'];
    const tokenMatch =
      env.PLATFORM_ADMIN_TOKEN &&
      typeof headerToken === 'string' &&
      headerToken === env.PLATFORM_ADMIN_TOKEN;
    const email = user.email?.toLowerCase() ?? null;
    const allowlisted = email ? platformAdminAllowlist.has(email) : false;
    if (!tokenMatch && !allowlisted) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }
    return user;
  }
};
