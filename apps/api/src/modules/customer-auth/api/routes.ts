import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import { emailService } from '../../notifications/service/email-service.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';
import crypto from 'crypto';

const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional()
});

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const customerInviteSchema = z.object({
  email: z.string().email()
});

// Simple hash for invite tokens
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function registerCustomerAuthRoutes(app: FastifyInstance) {
  // Customer self-registration
  app.post('/v1/auth/customer/register', async (request, reply) => {
    const body = customerRegisterSchema.parse(request.body);
    const client = getSupabaseClient();

    // Check if customer email already exists
    const { data: existing } = await client
      .from('customers')
      .select('id')
      .eq('email', body.email.toLowerCase())
      .single();

    if (existing) {
      throw httpError(409, 'EMAIL_EXISTS', 'Email already registered');
    }

    // Create auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name,
          role: 'customer'
        }
      }
    });

    if (authError || !authData.user) {
      throw httpError(400, 'REGISTRATION_FAILED', authError?.message ?? 'Registration failed');
    }

    // Create customer record
    const { data: customer, error: customerError } = await client
      .from('customers')
      .insert({
        user_id: authData.user.id,
        name: body.name,
        email: body.email.toLowerCase(),
        phone: body.phone || null
      })
      .select()
      .single();

    if (customerError) {
      throw httpError(500, 'CUSTOMER_CREATE_FAILED', customerError.message);
    }

    reply.code(201).send({
      success: true,
      customerId: customer.id,
      message: 'Registration successful. Please check your email to confirm your account.'
    });

    // Audit log (after response to not delay)
    await createAuditLog({
      action: 'customer_register',
      actorUserId: authData.user.id,
      entityType: 'customer',
      entityId: customer.id,
      metadata: { email: body.email }
    }).catch(() => { /* silently fail */ });
  });

  // Customer login
  app.post('/v1/auth/customer/login', async (request, reply) => {
    const body = customerLoginSchema.parse(request.body);
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password
    });

    if (error || !data.session) {
      throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if email is verified
    if (!data.user.email_confirmed_at) {
      throw httpError(401, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
    }

    // Set session cookie
    reply.setCookie('customer_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Audit log
    await createAuditLog({
      action: 'customer_login',
      actorUserId: data.user.id,
      entityType: 'customer',
      entityId: data.user.id,
      metadata: { email: data.user.email }
    }).catch(() => { /* silently fail */ });

    reply.code(200).send({
      success: true,
      customerId: data.user?.id,
      email: data.user?.email
    });
  });

  // Customer logout
  app.post('/v1/auth/customer/logout', async (request, reply) => {
    const client = getSupabaseClient();
    const token = request.cookies?.customer_session;
    
    if (token) {
      await client.auth.signOut();
    }
    
    reply.clearCookie('customer_session', { path: '/' });

    // Audit log
    if (token) {
      await createAuditLog({
        action: 'customer_logout',
        actorUserId: 'anonymous',
        entityType: 'customer',
        entityId: 'anonymous',
        metadata: {}
      }).catch(() => { /* silently fail */ });
    }

    reply.code(200).send({ success: true });
  });

  // Invite customer (owner/admin only)
  app.post('/v1/auth/customer/invite', async (request, reply) => {
    const body = customerInviteSchema.parse(request.body);
    const client = getSupabaseClient();
    
    // Get salon ID from authenticated user
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw httpError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Get user's salon membership
    const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      throw httpError(401, 'UNAUTHORIZED', 'Invalid token');
    }

    const { data: membership } = await client
      .from('memberships')
      .select('salon_id, role')
      .eq('user_id', user.id)
      .eq('active', true)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw httpError(403, 'FORBIDDEN', 'Only salon owners and admins can invite customers');
    }

    // Generate invite token
    const inviteToken = generateToken();
    const tokenHash = hashToken(inviteToken);

    // Create invitation record
    const { error } = await client
      .from('customer_invitations')
      .insert({
        salon_id: membership.salon_id,
        email: body.email.toLowerCase(),
        invite_token: tokenHash,
        created_by_user_id: user.id
      });

    if (error) {
      throw httpError(500, 'INVITE_FAILED', error.message);
    }

    // Send invitation email
    await emailService.sendCustomerInvite({
      email: body.email,
      salonName: 'Your Salon', // TODO: Get actual salon name
      inviteToken
    });

    reply.code(201).send({
      success: true,
      inviteToken
    });
  });

  // Get current customer session
  app.get('/v1/auth/customer/session', async (request, reply) => {
    const client = getSupabaseClient();
    const token = request.cookies?.customer_session;
    
    if (!token) {
      throw httpError(401, 'NO_SESSION', 'No active session');
    }

    const { data: { user }, error } = await client.auth.getUser(token);
    
    if (error || !user) {
      reply.clearCookie('customer_session', { path: '/' });
      throw httpError(401, 'INVALID_SESSION', 'Session expired');
    }

    reply.code(200).send({
      success: true,
      customerId: user.id,
      email: user.email
    });
  });
}
