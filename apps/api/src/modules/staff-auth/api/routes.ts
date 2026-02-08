import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { staffAuthService } from '../service/staff-auth-service.js';
import { authService } from '../../auth/service/auth-service.js';
import { getRequestContext } from '../../../server/request-context.js';
import { httpError } from '../../../server/http-error.js';

const staffInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  role: z.enum(['staff', 'admin']).optional()
});

const staffAcceptInviteSchema = z.object({
  token: z.string(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

const staffLoginPinSchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

const staffResetPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

const resetPinQuerySchema = z.object({
  staffId: z.string().uuid().optional()
});

export function registerStaffAuthRoutes(app: FastifyInstance) {
  // Invite staff member (owner/admin only)
  app.post('/v1/auth/staff/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = staffInviteSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'admin');
    
    const result = await staffAuthService.inviteStaff({
      salonId,
      email: body.email,
      name: body.name,
      role: body.role ?? 'staff'
    });
    
    reply.code(201).send(result);
  });

  // Accept invitation and set PIN
  app.post('/v1/auth/staff/accept-invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = staffAcceptInviteSchema.parse(request.body);
    
    const result = await staffAuthService.acceptInvite({
      token: body.token,
      pin: body.pin
    });
    
    if (!result.success) {
      throw httpError(400, 'INVALID_INVITE', result.error ?? 'Invalid or expired invitation');
    }
    
    reply.code(200).send({ success: true, staffId: result.staffId });
  });

  // Login with PIN - sets httpOnly cookie
  app.post('/v1/auth/staff/login-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = staffLoginPinSchema.parse(request.body);
    
    const result = await staffAuthService.loginWithPin({
      email: body.email,
      pin: body.pin
    });
    
    if (!result.success || !result.token) {
      throw httpError(401, 'INVALID_CREDENTIALS', result.error ?? 'Invalid email or PIN');
    }
    
    // Set httpOnly cookie with session token
    reply.setCookie('staff_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
    
    reply.code(200).send({
      success: true,
      staffId: result.staffId,
      salonId: result.salonId
      // Token NOT sent in body - only in httpOnly cookie
    });
  });

  // Logout - clears cookie
  app.post('/v1/auth/staff/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.staff_session;
    if (token) {
      await staffAuthService.logout(token);
    }
    
    // Clear the cookie
    reply.clearCookie('staff_session', { path: '/' });
    reply.code(200).send({ success: true });
  });

  // Validate session from cookie
  app.get('/v1/auth/staff/session', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.staff_session;
    
    if (!token) {
      throw httpError(401, 'NO_SESSION', 'No active session');
    }
    
    const result = await staffAuthService.validateToken(token);
    
    if (!result.success) {
      // Clear invalid cookie
      reply.clearCookie('staff_session', { path: '/' });
      throw httpError(401, 'INVALID_SESSION', result.error ?? 'Invalid session');
    }
    
    reply.code(200).send({
      success: true,
      staffId: result.staffId,
      salonId: result.salonId
    });
  });

  // Reset PIN (requires authentication)
  app.post('/v1/auth/staff/reset-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = staffResetPinSchema.parse(request.body);
    const query = resetPinQuerySchema.parse(request.query);
    const salonId = await authService.requirePrimarySalonId(request);
    const membership = await authService.requireRole(request, salonId, 'staff');
    
    const context = getRequestContext(request);
    const userId = context.userId;
    if (!userId) {
      throw httpError(401, 'UNAUTHORIZED', 'Not authenticated');
    }
    
    // Find staff profile for this user
    const staffProfile = await staffAuthService.getStaffForUser({ salonId, userId });
    if (!staffProfile) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff profile not found');
    }
    
    // Only allow resetting own PIN, or admin can reset others
    const targetStaffId = query.staffId;
    if (targetStaffId && membership.role !== 'staff') {
      await staffAuthService.resetPin({ staffId: targetStaffId, pin: body.pin });
    } else {
      await staffAuthService.resetPin({ staffId: staffProfile.id, pin: body.pin });
    }
    
    reply.code(200).send({ success: true });
  });

  // Get current staff profile
  app.get('/v1/auth/staff/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    const context = getRequestContext(request);
    const userId = context.userId;
    if (!userId) {
      throw httpError(401, 'UNAUTHORIZED', 'Not authenticated');
    }
    
    const profile = await staffAuthService.getStaffForUser({ salonId, userId });
    if (!profile) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff profile not found');
    }
    
    reply.code(200).send(profile);
  });
}
