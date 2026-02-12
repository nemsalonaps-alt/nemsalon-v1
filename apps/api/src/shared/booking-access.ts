import { randomBytes, createHash } from 'crypto';
import { createBookingToken } from '../modules/public/repo/booking-token-repo.js';

const TOKEN_TTL_DAYS = 30;

export async function createBookingAccessToken(bookingId: string) {
  const token = randomBytes(32).toString('base64url');
  const hash = hashToken(token);
  const expiresAt =
    TOKEN_TTL_DAYS > 0
      ? new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;
  await createBookingToken({ bookingId, tokenHash: hash, expiresAt });
  return { token, expiresAt };
}

export function hashBookingToken(token: string) {
  return hashToken(token);
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
