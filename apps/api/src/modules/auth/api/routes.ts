import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient } from '../../../server/db.js';
import { authService } from '../service/auth-service.js';
import { httpError } from '../../../server/http-error.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const ownerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  salonName: z.string().min(2),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['owner', 'customer', 'staff', 'admin']).default('customer'),
  salonName: z.string().min(2).optional(),
  salonSlug: z.string().min(2).optional(),
});

export function registerAuthRoutes(app: FastifyInstance) {
  const authRateLimit = { max: 60, timeWindow: 60_000 };

  app.post(
    '/v1/auth/owner/register',
    { config: { rateLimit: { max: 5, timeWindow: 60_000 } } },
    async (request, reply) => {
      const body = ownerRegisterSchema.parse(request.body);
      const client = getSupabaseClient();

      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.name,
          role: 'owner',
        },
      });

      if (authError || !authData.user) {
        throw httpError(400, 'REGISTRATION_FAILED', authError?.message ?? 'Registration failed');
      }

      await client.from('users').insert({
        id: authData.user.id,
        email: body.email.toLowerCase(),
        full_name: body.name,
      });

      const { data: salonId, error: salonError } = await client.rpc('provision_salon_for_user', {
        p_user_id: authData.user.id,
        p_email: body.email.toLowerCase(),
        p_full_name: body.name,
        p_phone: null,
        p_role: 'owner',
      });

      if (salonError || !salonId) {
        throw httpError(
          500,
          'SALON_CREATE_FAILED',
          salonError?.message ?? 'Failed to create salon',
        );
      }

      await client.from('salons').update({ name: body.salonName }).eq('id', salonId);

      reply.code(201).send({
        success: true,
        salonId: salonId,
        userId: authData.user.id,
        message: 'Registration successful. You can now log in.',
      });
    },
  );

  app.post(
    '/v1/auth/register',
    { config: { rateLimit: { max: 5, timeWindow: 60_000 } } },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const client = getSupabaseClient();

      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.name,
          role: body.role,
        },
      });

      if (authError || !authData.user) {
        throw httpError(400, 'REGISTRATION_FAILED', authError?.message ?? 'Registration failed');
      }

      if (body.role === 'owner') {
        await client.from('users').insert({
          id: authData.user.id,
          email: body.email.toLowerCase(),
          full_name: body.name,
        });

        const { data: salonId, error: salonError } = await client.rpc('provision_salon_for_user', {
          p_user_id: authData.user.id,
          p_email: body.email.toLowerCase(),
          p_full_name: body.name,
          p_phone: null,
          p_role: 'owner',
        });

        if (salonError || !salonId) {
          throw httpError(
            500,
            'SALON_CREATE_FAILED',
            salonError?.message ?? 'Failed to create salon',
          );
        }

        if (body.salonName) {
          await client.from('salons').update({ name: body.salonName }).eq('id', salonId);
        }

        reply.code(201).send({
          success: true,
          salonId: salonId,
          userId: authData.user.id,
          role: body.role,
          message: 'Registration successful. You can now log in.',
        });
      } else if (body.role === 'customer') {
        if (!body.salonSlug) {
          throw httpError(400, 'SALON_REQUIRED', 'Salon slug is required for customer registration.');
        }

        const { data: salon, error: salonError } = await client
          .from('salons')
          .select('id, status')
          .eq('slug', body.salonSlug)
          .maybeSingle();

        if (salonError) {
          throw httpError(500, 'SALON_LOOKUP_FAILED', salonError.message);
        }
        if (!salon || salon.status !== 'active') {
          throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
        }

        const { data: customer, error: customerError } = await client
          .from('customers')
          .insert({
            salon_id: salon.id,
            user_id: authData.user.id,
            name: body.name,
            email: body.email.toLowerCase(),
          })
          .select()
          .single();

        if (customerError) {
          throw httpError(500, 'CUSTOMER_CREATE_FAILED', customerError.message);
        }

        reply.code(201).send({
          success: true,
          customerId: customer.id,
          userId: authData.user.id,
          role: body.role,
          message: 'Registration successful. You can now log in.',
        });
      } else {
        reply.code(201).send({
          success: true,
          userId: authData.user.id,
          role: body.role,
          message: 'Registration successful. Wait for salon invitation to access the system.',
        });
      }
    },
  );

  app.post(
    '/v1/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: 60_000 } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error || !data.session) {
        throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      reply.code(200).send({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    },
  );

  app.post('/v1/auth/refresh', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: body.refreshToken,
    });

    if (error || !data.session) {
      throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Session expired. Please log in again.');
    }

    reply.code(200).send({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  });

  app.post('/v1/auth/logout', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      throw httpError(401, 'UNAUTHORIZED', 'Missing authentication.');
    }

    const token = authHeader.slice(7).trim();
    const supabase = getSupabaseClient();

    const { data: userData } = await supabase.auth.getUser(token);
    const { error } = await supabase.auth.admin.signOut(userData?.user?.id ?? '', 'global');

    if (error) {
      request.log.warn({ error: error.message }, 'Logout warning');
    }

    reply.code(204).send();
  });

  app.get('/v1/auth/me', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const me = await authService.getMe(request);
    reply.code(200).send(me);
  });
}
