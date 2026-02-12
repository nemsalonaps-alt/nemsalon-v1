import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { staffAuthService } from '../../staff-auth/service/staff-auth-service.js';
import { getStaffById } from '../../staff/repo/staff-repo.js';
import { authService } from '../../auth/service/auth-service.js';
import { httpError } from '../../../server/http-error.js';

const unifiedInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['staff', 'admin']).optional().default('staff'),
  staffId: z.string().uuid().optional(),
});

const resendInviteSchema = z.object({
  staffId: z.string().uuid(),
});

/**
 * Unified staff invitation routes
 * 
 * Consolidates duplicate invite endpoints:
 * - POST /v1/auth/staff/invite (onboarding - creates staff + invites)
 * - POST /v1/staff/:staffId/invite (console - invites existing staff)
 * 
 * New unified endpoint:
 * - POST /v1/staff/invite (handles both cases)
 */
export function registerStaffInviteRoutes(app: FastifyInstance) {
  
  /**
   * POST /v1/staff/invite
   * 
   * Unified staff invitation endpoint.
   * 
   * If staffId is provided: invites existing staff member
   * If staffId is NOT provided: creates new staff profile then invites
   */
  app.post('/v1/staff/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = unifiedInviteSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');

    if (body.staffId) {
      // Inviting existing staff member - validate staff exists
      const existingStaff = await getStaffById(body.staffId);
      if (!existingStaff || existingStaff.salonId !== salonId) {
        throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }
      
      // Use provided name if available, otherwise use existing staff name
      const inviteName = body.name ?? existingStaff.name;
      
      // Create invitation for existing staff
      const result = await staffAuthService.inviteStaff({
        salonId,
        staffId: existingStaff.id,
        email: body.email,
        name: inviteName,
        role: body.role,
      });
      
      reply.code(200).send({
        success: true,
        staffId: result.staffId,
        email: body.email,
        message: 'Invitation sent successfully',
      });
    } else {
      // Creating new staff member then inviting
      if (!body.name) {
        throw httpError(400, 'MISSING_NAME', 'Name is required when creating new staff member');
      }

      const result = await staffAuthService.inviteStaff({
        salonId,
        email: body.email,
        name: body.name,
        role: body.role,
      });

      reply.code(201).send({
        success: true,
        staffId: result.staffId,
        email: body.email,
        inviteToken: result.inviteToken,
        message: 'Staff created and invitation sent successfully',
      });
    }
  });

  /**
   * POST /v1/staff/invite/resend
   * 
   * Resend invitation to a staff member.
   */
  app.post('/v1/staff/invite/resend', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = resendInviteSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');

    const staff = await getStaffById(body.staffId);
    if (!staff || staff.salonId !== salonId) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }

    if (!staff.email) {
      throw httpError(400, 'NO_EMAIL', 'Staff member has no email address');
    }

    // Create a new invite
    await staffAuthService.inviteStaff({
      salonId,
      email: staff.email,
      name: staff.name,
      role: staff.role === 'owner' ? 'admin' : staff.role,
    });

    reply.code(200).send({
      success: true,
      staffId: body.staffId,
      email: staff.email,
      message: 'Invitation resent successfully',
    });
  });

  /**
   * GET /v1/staff/invitations
   * 
   * List pending invitations for the salon.
   */
  app.get('/v1/staff/invitations', async (request: FastifyRequest, reply: FastifyReply) => {
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');

    const invitations = await staffAuthService.listPendingInvitations(salonId);
    reply.code(200).send({
      data: invitations,
      message: 'Pending invitations',
    });
  });
}
