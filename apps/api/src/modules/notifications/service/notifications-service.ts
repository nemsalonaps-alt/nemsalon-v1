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
};

export const notificationsService = {
  async queueBookingConfirmation(payload: BookingConfirmationPayload) {
    const basePayload = {
      bookingId: payload.bookingId,
      customerName: payload.customerName,
      startTime: payload.startTime,
      endTime: payload.endTime
    };

    if (payload.customerEmail) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        channel: 'email',
        provider: providers.notifications.email.provider,
        recipient: payload.customerEmail,
        template: 'booking_confirmed',
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:booking_confirmed:email`
      });
    }

    if (payload.customerPhone) {
      await queueNotification({
        salonId: payload.salonId,
        bookingId: payload.bookingId,
        channel: 'sms',
        provider: providers.notifications.sms.provider,
        recipient: payload.customerPhone,
        template: 'booking_confirmed',
        payload: basePayload,
        dedupeKey: `booking:${payload.bookingId}:booking_confirmed:sms`
      });
    }
  }
};
