import { staffAuthRepo } from '../repo/staff-auth-repo.js';
import { staffSessionRepo, hashToken } from '../repo/staff-session-repo.js';
import { contentService } from '../../content/service/content-service.js';
import { emailService } from '../../notifications/service/email-service.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

// Use bcrypt with 10 rounds for PIN hashing
const SALT_ROUNDS = 10;
const SESSION_DURATION_HOURS = 24;

async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, SALT_ROUNDS);
}

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(pin, hash);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const staffAuthService = {
  async inviteStaff(input: {
    salonId: string;
    email: string;
    name: string;
    role: 'staff' | 'admin';
  }) {
    // Create staff profile first
    const staffProfile = await contentService.createStaff({
      salonId: input.salonId,
      name: input.name,
      role: input.role,
      active: true
    });

    // Generate invite token
    const inviteToken = generateToken();

    // Create staff auth record
    await staffAuthRepo.createStaffInvite({
      staffId: staffProfile.id,
      salonId: input.salonId,
      email: input.email,
      inviteToken
    });

    // Send invitation email
    await emailService.sendStaffInvite({
      email: input.email,
      name: input.name,
      inviteToken,
      salonName: 'Your Salon' // TODO: Get actual salon name
    });

    return {
      success: true,
      staffId: staffProfile.id,
      inviteToken
    };
  },

  async acceptInvite(input: { token: string; pin: string }) {
    const authRecord = await staffAuthRepo.getStaffAuthByInviteToken(input.token);
    
    if (!authRecord) {
      return { success: false, error: 'Invalid invitation token' };
    }

    // Check if invite is expired
    const expiresAt = new Date(authRecord.invite_expires_at);
    if (expiresAt < new Date()) {
      return { success: false, error: 'Invitation has expired' };
    }

    // Check if PIN is already set (invite already used)
    if (authRecord.pin_hash) {
      return { success: false, error: 'Invitation already used' };
    }

    // Hash and set PIN
    const pinHash = await hashPin(input.pin);
    await staffAuthRepo.setPin(authRecord.staff_id, pinHash);

    return { success: true, staffId: authRecord.staff_id };
  },

  async loginWithPin(input: { email: string; pin: string }) {
    const authRecord = await staffAuthRepo.getStaffAuthByEmail(input.email);
    
    if (!authRecord) {
      return { success: false, error: 'Invalid email or PIN' };
    }

    // Check if account is locked
    if (authRecord.locked_until && new Date(authRecord.locked_until) > new Date()) {
      return { success: false, error: 'Account is locked. Try again later.' };
    }

    // Check if PIN is set
    if (!authRecord.pin_hash) {
      return { success: false, error: 'PIN not set. Please accept your invitation first.' };
    }

    // Verify PIN
    const pinValid = await verifyPin(input.pin, authRecord.pin_hash);
    
    if (!pinValid) {
      await staffAuthRepo.recordLogin(authRecord.staff_id, false);
      return { success: false, error: 'Invalid email or PIN' };
    }

    // Record successful login
    await staffAuthRepo.recordLogin(authRecord.staff_id, true);

    // Generate simple token and create session
    const token = generateToken();
    const tokenHash = hashToken(token);
    
    await staffSessionRepo.createSession({
      staffId: authRecord.staff_id,
      salonId: authRecord.salon_id,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)
    });

    return {
      success: true,
      staffId: authRecord.staff_id,
      salonId: authRecord.salon_id,
      token  // Return plain token once
    };
  },

  async resetPin(input: { staffId: string; pin: string }) {
    const pinHash = await hashPin(input.pin);
    await staffAuthRepo.setPin(input.staffId, pinHash);
  },

  async validateToken(token: string) {
    const tokenHash = hashToken(token);
    const session = await staffSessionRepo.getSessionByToken(tokenHash);
    
    if (!session) {
      return { success: false, error: 'Invalid or expired session' };
    }

    return {
      success: true,
      staffId: session.staff_id,
      salonId: session.salon_id,
      sessionId: session.id
    };
  },

  async logout(token: string) {
    const tokenHash = hashToken(token);
    const session = await staffSessionRepo.getSessionByToken(tokenHash);
    
    if (session) {
      await staffSessionRepo.deleteSession(session.id);
    }
    
    return { success: true };
  },

  async getStaffForUser(input: { salonId: string; userId: string }) {
    return contentService.getStaffForUser(input);
  }
};
