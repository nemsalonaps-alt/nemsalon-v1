export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type NotificationOutboxEntry = {
  id: string;
  salonId: string;
  bookingId?: string | null;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  dedupeKey?: string | null;
};
