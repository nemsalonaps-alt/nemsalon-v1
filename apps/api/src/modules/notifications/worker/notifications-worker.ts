import '../../../env-loader.js';
import { randomUUID, createSign } from 'crypto';
import { Buffer } from 'buffer';
import { env } from '../../../config/env.js';
import { providers } from '../../../config/providers.js';
import {
  claimOutboxEntries,
  markOutboxFailed,
  markOutboxSent,
  upsertWorkerHeartbeat
} from '../repo/notifications-repo.js';
import { getSalonById } from '../../salons/repo/salons-repo.js';

const defaultBatchSize = Number(process.env.NOTIFICATIONS_BATCH_SIZE ?? 10);
const pollIntervalMs = Number(process.env.NOTIFICATIONS_POLL_INTERVAL_MS ?? 3000);
const heartbeatIntervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? 15000);
const workerId =
  process.env.NOTIFICATIONS_WORKER_ID ?? `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

const retryScheduleSeconds = [60, 300, 1800, 7200, 43200];

// Cache for salon locales to minimize DB calls
const salonLocaleCache = new Map<string, string>();
const DEFAULT_LOCALE = 'da-DK';

async function getSalonLocale(salonId: string): Promise<string> {
  const cached = salonLocaleCache.get(salonId);
  if (cached) return cached;

  const salon = await getSalonById(salonId);
  const locale = salon?.locale ?? DEFAULT_LOCALE;
  salonLocaleCache.set(salonId, locale);
  return locale;
}

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

function formatDateTime(value: unknown, locale: string = DEFAULT_LOCALE) {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(locale, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function renderNotification(type: string, payload: Record<string, unknown>, locale: string = DEFAULT_LOCALE) {
  const customerName = typeof payload.customerName === 'string' ? payload.customerName : '';
  const startTime = formatDateTime(payload.startTime ?? payload.startUtc, locale);
  const endTime = formatDateTime(payload.endTime ?? payload.endUtc, locale);
  const reason = typeof payload.reasonKey === 'string' ? payload.reasonKey : '';
  const note = typeof payload.note === 'string' ? payload.note : '';
  const manageUrl = typeof payload.manageUrl === 'string' ? payload.manageUrl : '';
  const salonName = typeof payload.salonName === 'string' ? payload.salonName : '';

  switch (type) {
    case 'booking.confirmed':
      return {
        subject: 'Booking bekræftet',
        text: `Hej ${customerName || 'kunde'}\n\nDin booking er bekræftet${salonName ? ` hos ${salonName}` : ''}.\nTid: ${startTime}${endTime ? ` – ${endTime}` : ''}\n${manageUrl ? `Administrer din booking: ${manageUrl}\n` : ''}\nTak.`
      };
    case 'booking.cancelled':
      return {
        subject: 'Booking annulleret',
        text: `Hej ${customerName || 'kunde'}\n\nDin booking er annulleret${salonName ? ` hos ${salonName}` : ''}.\nTid: ${startTime}${endTime ? ` – ${endTime}` : ''}\n${reason ? `Årsag: ${reason}\n` : ''}${note ? `Note: ${note}\n` : ''}${manageUrl ? `Administrer din booking: ${manageUrl}\n` : ''}\nTak.`
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
  locale: string;
}) {
  // Mock mode: log instead of sending
  if (providers.notifications.email.provider === 'mock') {
    const content = renderNotification(entry.type, entry.payload ?? {}, entry.locale);
    console.log('[MOCK EMAIL] To:', entry.recipient);
    console.log('[MOCK EMAIL] Subject:', content.subject);
    console.log('[MOCK EMAIL] Body:', content.text.slice(0, 200) + (content.text.length > 200 ? '...' : ''));
    return;
  }
  
  if (!providers.notifications.email.enabled) {
    throw new NotificationSendError('Email provider not configured.', true);
  }
  if (!env.POSTMARK_SERVER_TOKEN || !env.POSTMARK_FROM) {
    throw new NotificationSendError('POSTMARK_* env missing.', true);
  }
  const content = renderNotification(entry.type, entry.payload ?? {}, entry.locale);
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
  locale: string;
}) {
  // Mock mode: log instead of sending
  if (providers.notifications.sms.provider === 'mock') {
    const content = renderNotification(entry.type, entry.payload ?? {}, entry.locale);
    console.log('[MOCK SMS] To:', entry.recipient);
    console.log('[MOCK SMS] Body:', content.text.slice(0, 160) + (content.text.length > 160 ? '...' : ''));
    return;
  }
  
  if (!providers.notifications.sms.enabled) {
    throw new NotificationSendError('SMS provider not configured.', true);
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    throw new NotificationSendError('TWILIO_* env missing.', true);
  }
  const content = renderNotification(entry.type, entry.payload ?? {}, entry.locale);
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
  locale: string;
}) {
  if (entry.channel === 'email') {
    return sendEmailPostmark(entry);
  }
  if (entry.channel === 'sms') {
    return sendSmsTwilio(entry);
  }
  if (entry.channel === 'push') {
    return sendPushFcm(entry);
  }
  throw new NotificationSendError('Unsupported notification channel.', true);
}

type FcmTokenCache = { token: string; expiresAt: number } | null;
let fcmTokenCache: FcmTokenCache = null;

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getFcmAccessToken(): Promise<string> {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    throw new NotificationSendError('FCM service account missing.', true);
  }
  const now = Date.now();
  if (fcmTokenCache && fcmTokenCache.expiresAt > now + 30_000) {
    return fcmTokenCache.token;
  }

  const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
    project_id: string;
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(now / 1000);
  const exp = iat + 60 * 60;
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = base64UrlEncode(signer.sign(serviceAccount.private_key));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new NotificationSendError(`FCM auth failed: ${response.status} ${text.slice(0, 120)}`, true);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  fcmTokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

async function sendPushFcm(entry: {
  recipient: string;
  type: string;
  payload: Record<string, unknown>;
  locale: string;
}) {
  if (!providers.notifications.push.enabled) {
    throw new NotificationSendError('Push provider not configured.', true);
  }
  const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON ?? '{}') as { project_id: string };
  const token = await getFcmAccessToken();
  const content = renderNotification(entry.type, entry.payload ?? {}, entry.locale);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: entry.recipient,
          notification: {
            title: content.subject,
            body: content.text.slice(0, 240)
          },
          data: {
            type: entry.type,
            ...Object.fromEntries(
              Object.entries(entry.payload ?? {}).map(([key, value]) => [key, String(value ?? '')])
            )
          }
        }
      })
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new NotificationSendError(`FCM send failed: ${response.status} ${text.slice(0, 120)}`);
  }
}

async function processEntry(entry: {
  id: string;
  salonId: string;
  type: string;
  bookingId?: string | null;
  recipient: string;
  channel: string;
  provider?: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}) {
  const attempts = entry.attempts + 1;
  const locale = await getSalonLocale(entry.salonId);
  try {
    await sendNotification({
      channel: entry.channel,
      provider: entry.provider ?? entry.channel,
      recipient: entry.recipient,
      type: entry.type,
      payload: entry.payload ?? {},
      locale
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
  let lastHeartbeat = 0;
  for (;;) {
    await runOnce();
    const now = Date.now();
    if (now - lastHeartbeat >= heartbeatIntervalMs) {
      lastHeartbeat = now;
      try {
        await upsertWorkerHeartbeat({
          workerName: 'notifications',
          details: { workerId, pollIntervalMs, batchSize: defaultBatchSize }
        });
      } catch (error) {
        console.error('[notification] heartbeat failed', error);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

runLoop().catch((error) => {
  console.error('[notification] worker crashed', error);
  process.exit(1);
});
