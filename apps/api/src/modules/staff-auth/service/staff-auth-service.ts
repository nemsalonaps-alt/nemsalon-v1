import { randomUUID } from 'crypto';
import { env } from '../../../config/env.js';
import { httpError } from '../../../server/http-error.js';
import { createStaffProfile, getStaffById, updateStaffRole } from '../../staff/repo/staff-repo.js';
import { contentService } from '../../content/service/content-service.js';
import { getSalonById } from '../../salons/repo/salons-repo.js';
import { emailService } from '../../notifications/service/email-service.js';
import { upsertStaffInvite, listPendingInvites } from '../repo/staff-auth-repo.js';

function buildInviteUrl(actionLink?: string | null, inviteToken?: string | null) {
  if (actionLink) return actionLink;
  if (env.WEB_URL && inviteToken) {
    return `${env.WEB_URL.replace(/\/$/, '')}/invite/staff?token=${inviteToken}`;
  }
  return 'missing-invite-url';
}

export const staffAuthService = {
  async inviteStaff(input: {
    salonId: string;
    email: string;
    name: string;
    role?: 'staff' | 'admin';
    staffId?: string;
  }): Promise<{ staffId: string; inviteToken: string; actionLink?: string | null }> {
    const email = input.email.trim().toLowerCase();
    const role = input.role ?? 'staff';
    let staffId = input.staffId ?? null;

    if (staffId) {
      const staff = await getStaffById(staffId);
      if (!staff || staff.salonId !== input.salonId) {
        throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }
      if (staff.role !== role) {
        await updateStaffRole({ staffId: staff.id, salonId: input.salonId, role });
      }
    } else {
      const created = await createStaffProfile({
        salonId: input.salonId,
        name: input.name,
        role,
        active: true,
        email
      });
      staffId = created.id;
    }

    if (!staffId) {
      throw httpError(500, 'STAFF_INVITE_FAILED', 'Unable to resolve staff profile.');
    }

    const invite = await contentService.inviteStaff({
      salonId: input.salonId,
      staffId,
      email,
      role
    });

    const salon = await getSalonById(input.salonId);
    const salonName = salon?.name ?? 'Salon';

    const inviteToken = randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await upsertStaffInvite({
      staffId,
      salonId: input.salonId,
      invitedEmail: email,
      inviteToken,
      inviteExpiresAt
    });

    await emailService.sendStaffInvite({
      email,
      name: input.name,
      salonName,
      inviteUrl: buildInviteUrl(invite.actionLink, inviteToken)
    });

    return {
      staffId,
      inviteToken,
      actionLink: invite.actionLink
    };
  },

  async listPendingInvitations(salonId: string) {
    return listPendingInvites(salonId);
  }
};
