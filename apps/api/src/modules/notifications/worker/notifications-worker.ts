import '../../../env-loader.js';
import { randomUUID } from 'crypto';
import {
  claimOutboxEntries,
  markOutboxFailed,
  markOutboxSent
} from '../repo/notifications-repo.js';

const defaultBatchSize = Number(process.env.NOTIFICATIONS_BATCH_SIZE ?? 10);
const pollIntervalMs = Number(process.env.NOTIFICATIONS_POLL_INTERVAL_MS ?? 3000);
const workerId =
  process.env.NOTIFICATIONS_WORKER_ID ?? `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

const retryScheduleSeconds = [60, 300, 1800, 7200, 43200];

function computeNextAttemptAt(attempts: number): string | null {
  if (attempts > retryScheduleSeconds.length) {
    return null;
  }
  const delaySeconds = retryScheduleSeconds[Math.min(attempts - 1, retryScheduleSeconds.length - 1)];
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

async function processEntry(entry: {
  id: string;
  type: string;
  bookingId?: string | null;
  recipient: string;
  channel: string;
  payload: Record<string, unknown>;
  attempts: number;
}) {
  const attempts = entry.attempts + 1;
  try {
    const payload = entry.payload ?? {};
    const startTime = payload.startTime ?? payload.startUtc ?? '';
    const logLine = [
      `[notification]`,
      `type=${entry.type}`,
      `bookingId=${entry.bookingId ?? 'n/a'}`,
      `channel=${entry.channel}`,
      `recipient=${entry.recipient ?? 'n/a'}`,
      `start=${startTime}`
    ].join(' ');
    // V0: stub send = log line
    console.log(logLine);
    await markOutboxSent({ id: entry.id, attempts });
  } catch (error) {
    const nextAttemptAt = computeNextAttemptAt(attempts);
    await markOutboxFailed({ id: entry.id, attempts, nextAttemptAt });
    console.error('[notification] failed', {
      id: entry.id,
      type: entry.type,
      attempts,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function runOnce() {
  const entries = await claimOutboxEntries({ limit: defaultBatchSize, workerId });
  if (!entries.length) {
    return;
  }
  for (const entry of entries) {
    await processEntry(entry);
  }
}

async function runLoop() {
  for (;;) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

runLoop().catch((error) => {
  console.error('[notification] worker crashed', error);
  process.exit(1);
});
