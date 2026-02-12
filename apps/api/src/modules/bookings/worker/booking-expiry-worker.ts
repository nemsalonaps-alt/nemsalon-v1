import '../../../env-loader.js';
import { randomUUID } from 'crypto';
import { listExpiredPendingBookings, expirePendingBookings } from '../repo/bookings-repo.js';

const pollIntervalMs = Number(process.env.BOOKING_EXPIRY_POLL_INTERVAL_MS ?? 30000);
const batchSize = Number(process.env.BOOKING_EXPIRY_BATCH_SIZE ?? 50);
const workerId = process.env.BOOKING_EXPIRY_WORKER_ID ?? `booking-expiry-${randomUUID().slice(0, 8)}`;

export async function runExpirySweepOnce(): Promise<number> {
  const expired = await listExpiredPendingBookings(batchSize);
  if (expired.length === 0) return 0;
  const expiredIds = expired.map((booking) => booking.id);
  return expirePendingBookings(expiredIds);
}

async function runLoop() {
  // eslint-disable-next-line no-console
  console.log('[booking-expiry] worker started', { workerId, pollIntervalMs, batchSize });
  for (;;) {
    try {
      const expiredCount = await runExpirySweepOnce();
      if (expiredCount > 0) {
        // eslint-disable-next-line no-console
        console.log('[booking-expiry] expired', { count: expiredCount });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[booking-expiry] sweep failed', error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

runLoop().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[booking-expiry] worker crashed', error);
  process.exit(1);
});
