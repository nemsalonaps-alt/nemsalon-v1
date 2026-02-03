export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed';

export type NotificationOutboxEntry = {
  id: string;
  salonId: string;
  bookingId?: string | null;
  type: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  dedupeKey?: string | null;
  attempts: number;
  nextAttemptAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
};
