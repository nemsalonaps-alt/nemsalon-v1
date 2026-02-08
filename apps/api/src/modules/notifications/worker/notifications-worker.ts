import '../../../env-loader.js';
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { env } from '../../../config/env.js';
import { providers } from '../../../config/providers.js';
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

class NotificationSendError extends Error {
  permanent: boolean;

  constructor(message: string, permanent = false) {
    super(message);
    this.permanent = permanent;
  }
}

function computeNextAttemptAt(attempts: number): string | null {
  if (attempts > retryScheduleSeconds.length) {
    return null;
  }
  const delaySeconds = retryScheduleSeconds[Math.min(attempts - 1, retryScheduleSeconds.length - 1)]!;
  if (delaySeconds === undefined) {
    return null;
  }
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('da-DK', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function renderNotification(type: string, payload: Record<string, unknown>) {
  const customerName = typeof payload.customerName === 'string' ? payload.customerName : '';
  const startTime = formatDateTime(payload.startTime ?? payload.startUtc);
  const endTime = formatDateTime(payload.endTime ?? payload.endUtc);
  const reason = typeof payload.reasonKey === 'string' ? payload.reasonKey : '';
  const note = typeof payload.note === 'string' ? payload.note : '';

  switch (type) {
    case 'booking.confirmed':
      return {
        subject: 'Booking bekræftet',
        text: `Hej ${customerName || 'kunde'}\n\nDin booking er bekræftet.\nTid: ${startTime}${endTime ? ` – ${endTime}` : ''}\n\nTak.`
      };
    case 'booking.cancelled':
      return {
        subject: 'Booking annulleret',
        text: `Hej ${customerName || 'kunde'}\n\nDin booking er annulleret.\nTid: ${startTime}${endTime ? ` – ${endTime}` : ''}\n${reason ? `Årsag: ${reason}\n` : ''}${note ? `Note: ${note}\n` : ''}\nTak.`
      };
    default:
      return {
        subject: 'Notifikation',
        text: JSON.stringify(payload, null, 2)
      };
  }
}

async function sendEmailPostmark(entry: {
  recipient: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  if (!providers.notifications.email.enabled) {
    throw new NotificationSendError('Email provider not configured.', true);
  }
  if (!env.POSTMARK_SERVER_TOKEN || !env.POSTMARK_FROM) {
    throw new NotificationSendError('POSTMARK_* env missing.', true);
  }
  const content = renderNotification(entry.type, entry.payload ?? {});
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN
    },
    body: JSON.stringify({
      From: env.POSTMARK_FROM,
      To: entry.recipient,
      Subject: content.subject,
      TextBody: content.text
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new NotificationSendError(`Postmark failed: ${response.status} ${text.slice(0, 120)}`);
  }
}

async function sendSmsTwilio(entry: {
  recipient: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  if (!providers.notifications.sms.enabled) {
    throw new NotificationSendError('SMS provider not configured.', true);
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    throw new NotificationSendError('TWILIO_* env missing.', true);
  }
  const content = renderNotification(entry.type, entry.payload ?? {});
  const body = new URLSearchParams({
    From: env.TWILIO_FROM,
    To: entry.recipient,
    Body: content.text.slice(0, 1200)
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new NotificationSendError(`Twilio failed: ${response.status} ${text.slice(0, 120)}`);
  }
}

async function sendNotification(entry: {
  channel: string;
  provider: string;
  recipient: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  if (entry.channel === 'email') {
    return sendEmailPostmark(entry);
  }
  if (entry.channel === 'sms') {
    return sendSmsTwilio(entry);
  }
  throw new NotificationSendError('Push notifications not implemented.', true);
}

async function processEntry(entry: {
  id: string;
  type: string;
  bookingId?: string | null;
  recipient: string;
  channel: string;
  provider?: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}) {
  const attempts = entry.attempts + 1;
  try {
    await sendNotification({
      channel: entry.channel,
      provider: entry.provider ?? entry.channel,
      recipient: entry.recipient,
      type: entry.type,
      payload: entry.payload ?? {}
    });
    await markOutboxSent({ id: entry.id, attempts });
  } catch (error) {
    const permanent = error instanceof NotificationSendError ? error.permanent : false;
    const nextAttemptAt = permanent ? null : computeNextAttemptAt(attempts);
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
