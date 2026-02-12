import { providers } from '../../../config/providers.js';
import { queueNotification } from '../repo/notifications-repo.js';

export type BookingConfirmationPayload = {
  salonId: string;
  bookingId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  startTime: string;
  endTime: string;
  manageUrl?: string | null;
  salonName?: string | null;
};

export type BookingCancellationPayload = {
  salonId: string;
  bookingId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  startTime: string;
  endTime: string;
  reasonKey?: string;
  note?: string;
  manageUrl?: string | null;
  salonName?: string | null;
};

export const notificationsService = {
  async queueBookingConfirmation(payload: BookingConfirmationPayload) {
    const basePayload = {
      bookingId: payload.bookingId,
      customerName: payload.customerName,
      startTime: payload.startTime,
      endTime: payload.endTime,
      manageUrl: payload.manageUrl ?? null,
      salonName: payload.salonName ?? null
    };

    if (payload.customerEmail) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        type: 'booking.confirmed',
        channel: 'email',
        provider: providers.notifications.email.provider,
        recipient: payload.customerEmail,
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:confirmed:email`
      });
    }

    if (payload.customerPhone) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        type: 'booking.confirmed',
        channel: 'sms',
        provider: providers.notifications.sms.provider,
        recipient: payload.customerPhone,
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:confirmed:sms`
      });
    }
  },
  async queueBookingCancelled(payload: BookingCancellationPayload) {
    const basePayload = {
      bookingId: payload.bookingId,
      customerName: payload.customerName,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reasonKey: payload.reasonKey ?? null,
      note: payload.note ?? null,
      manageUrl: payload.manageUrl ?? null,
      salonName: payload.salonName ?? null
    };

    if (payload.customerEmail) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        type: 'booking.cancelled',
        channel: 'email',
        provider: providers.notifications.email.provider,
        recipient: payload.customerEmail,
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:cancelled:email`
      });
    }

    if (payload.customerPhone) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        type: 'booking.cancelled',
        channel: 'sms',
        provider: providers.notifications.sms.provider,
        recipient: payload.customerPhone,
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:cancelled:sms`
      });
    }
  }
};
