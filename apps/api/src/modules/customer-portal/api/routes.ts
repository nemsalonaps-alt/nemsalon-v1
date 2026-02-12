import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import { env } from '../../../config/env.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';
import { authService } from '../../auth/service/auth-service.js';
import { getBookingById } from '../../bookings/repo/bookings-repo.js';
import { listPaymentsForBookingIds } from '../../payments/repo/payments-repo.js';
import { getSalonById } from '../../salons/repo/salons-repo.js';
import { availabilityService } from '../../availability/service/availability-service.js';
import { contentService } from '../../content/service/content-service.js';
import { createBookingAccessToken } from '../../../shared/booking-access.js';

// Schema for updating customer profile
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(3).optional(),
});

// Helper to get authenticated customer from Bearer token
async function getAuthenticatedCustomer(request: FastifyRequest) {
  const client = getSupabaseClient();
  const { user } = await authService.resolveAuthUser(request);

  // Get customer record by user_id
  const { data: customer, error: customerError } = await client
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (customerError || !customer) {
    throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer profile not found');
  }

  return { user, customer };
}

// Feature flag check
function checkFeatureFlag() {
  if (env.FEATURE_CUSTOMER_PORTAL === 'false') {
    throw httpError(404, 'FEATURE_DISABLED', 'Customer portal is not enabled');
  }
}

// Audit log helper
async function logAudit(action: string, userId: string, metadata?: Record<string, unknown>) {
  try {
    await createAuditLog({
      action,
      actorUserId: userId,
      entityType: 'customer',
      entityId: userId,
      metadata,
    });
  } catch {
    // Silently fail - don't block main operation
  }
}

export function registerCustomerPortalRoutes(app: FastifyInstance) {
  // Get customer profile
  app.get(
    '/v1/portal/me',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { user, customer } = await getAuthenticatedCustomer(request);

      await logAudit('profile_view', user.id);

      reply.code(200).send({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.created_at,
      });
    },
  );

  // Update customer profile
  app.patch(
    '/v1/portal/me',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { user, customer } = await getAuthenticatedCustomer(request);
      const body = updateProfileSchema.parse(request.body);

      const client = getSupabaseClient();
      const { data: updated, error } = await client
        .from('customers')
        .update({
          name: body.name,
          phone: body.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (error) {
        throw httpError(500, 'UPDATE_FAILED', error.message);
      }

      await logAudit('profile_update', user.id, { name: body.name, phone: body.phone });

      reply.code(200).send({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        createdAt: updated.created_at,
      });
    },
  );

  // List my bookings across all salons
  app.get(
    '/v1/portal/bookings',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const querySchema = z.object({
        status: z.enum(['upcoming', 'past', 'cancelled', 'all']).optional().default('all'),
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
      });

      const params = querySchema.parse(request.query);

      const client = getSupabaseClient();

      // Get total count first for proper pagination
      let countQuery = client
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id);

      const now = new Date().toISOString();
      if (params.status === 'upcoming') {
        countQuery = countQuery.in('status', ['pending', 'confirmed']).gte('start_time', now);
      } else if (params.status === 'past') {
        countQuery = countQuery.in('status', ['completed', 'in_progress', 'no_show']);
      } else if (params.status === 'cancelled') {
        countQuery = countQuery.eq('status', 'cancelled');
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        throw httpError(500, 'DATABASE_ERROR', countError.message);
      }

      // Build data query
      let dbQuery = client
        .from('bookings')
        .select(
          `
        *,
        salons:salon_id (name, slug, phone, email, address_line1, address_line2, city, postal_code, country),
        services:service_id (name, duration_minutes),
        staff:staff_id (display_name)
      `,
        )
        .eq('customer_id', customer.id)
        .order('start_time', { ascending: false });

      // Apply status filters
      if (params.status === 'upcoming') {
        dbQuery = dbQuery.in('status', ['pending', 'confirmed']).gte('start_time', now);
      } else if (params.status === 'past') {
        dbQuery = dbQuery.in('status', ['completed', 'in_progress', 'no_show']);
      } else if (params.status === 'cancelled') {
        dbQuery = dbQuery.eq('status', 'cancelled');
      }

      // Apply pagination
      dbQuery = dbQuery.range(params.offset, params.offset + params.limit - 1);

      const { data: bookings, error } = await dbQuery;

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      const bookingIds = (bookings ?? []).map((booking) => booking.id);
      const payments = await listPaymentsForBookingIds(bookingIds);
      const paymentMap = new Map<string, { status: string | null }>();
      for (const payment of payments) {
        if (!paymentMap.has(payment.bookingId)) {
          paymentMap.set(payment.bookingId, { status: payment.status ?? null });
        }
      }

      const manageUrlMap = new Map<string, string | null>();
      if (env.PUBLIC_APP_URL) {
        await Promise.all(
          (bookings || []).map(async (booking) => {
            try {
              const { token } = await createBookingAccessToken(booking.id);
              manageUrlMap.set(
                booking.id,
                buildManageUrl({
                  salonSlug: booking.salons?.slug ?? null,
                  bookingId: booking.id,
                  token,
                }),
              );
            } catch {
              manageUrlMap.set(booking.id, null);
            }
          }),
        );
      }

      // Transform and enrich bookings
      const enrichedBookings = (bookings || []).map((booking) => {
        const latestPayment = paymentMap.get(booking.id);
        return {
          id: booking.id,
          customerId: booking.customer_id,
          salonId: booking.salon_id,
          salonName: booking.salons?.name,
          salonSlug: booking.salons?.slug,
          salonPhone: booking.salons?.phone,
          salonEmail: booking.salons?.email,
          salonAddress: {
            line1: booking.salons?.address_line1,
            line2: booking.salons?.address_line2,
            city: booking.salons?.city,
            postalCode: booking.salons?.postal_code,
            country: booking.salons?.country,
          },
          serviceId: booking.service_id,
          serviceName: booking.services?.name,
          serviceDuration: booking.services?.duration_minutes,
          staffId: booking.staff_id,
          staffName: booking.staff?.display_name,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          paymentStatus: latestPayment?.status ?? null,
          totalAmount: booking.total_amount,
          currency: booking.currency,
          notes: booking.notes,
          manageUrl: manageUrlMap.get(booking.id) ?? null,
          createdAt: booking.created_at,
        };
      });

      reply.code(200).send({
        data: enrichedBookings,
        meta: {
          total: totalCount ?? 0,
          offset: params.offset,
          limit: params.limit,
          status: params.status,
        },
      });
    },
  );

  // Get single booking details
  app.get(
    '/v1/portal/bookings/:bookingId',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const params = z
        .object({
          bookingId: z.string().uuid(),
        })
        .parse(request.params);

      const client = getSupabaseClient();
      const { data: booking, error } = await client
        .from('bookings')
        .select(
          `
        *,
        salons:salon_id (name, slug, phone, email, address_line1, address_line2, city, postal_code, country, timezone),
        services:service_id (name, duration_minutes, price),
        staff:staff_id (display_name)
      `,
        )
        .eq('id', params.bookingId)
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      if (!booking) {
        throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }

      const payments = await listPaymentsForBookingIds([booking.id]);
      const latestPayment = payments[0] ?? null;

      reply.code(200).send({
        id: booking.id,
        salonId: booking.salon_id,
        salonName: booking.salons?.name,
        salonSlug: booking.salons?.slug,
        salonPhone: booking.salons?.phone,
        salonEmail: booking.salons?.email,
        salonAddress: {
          line1: booking.salons?.address_line1,
          line2: booking.salons?.address_line2,
          city: booking.salons?.city,
          postalCode: booking.salons?.postal_code,
          country: booking.salons?.country,
        },
        salonTimezone: booking.salons?.timezone,
        serviceId: booking.service_id,
        serviceName: booking.services?.name,
        serviceDuration: booking.services?.duration_minutes,
        servicePrice: booking.services?.price,
        staffId: booking.staff_id,
        staffName: booking.staff?.display_name,
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: booking.status,
        paymentStatus: latestPayment?.status ?? null,
        totalAmount: booking.total_amount,
        currency: booking.currency,
        notes: booking.notes,
        cancellationReason: booking.cancel_reason_key,
        cancellationNote: booking.cancel_note,
        createdAt: booking.created_at,
      });
    },
  );

  // Cancel a booking (customer)
  app.post(
    '/v1/portal/bookings/:bookingId/cancel',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);
      const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);

      const booking = await getBookingById(params.bookingId);
      if (!booking) {
        throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (booking.customerId !== customer.id) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Forbidden');
      }

      const salon = await getSalonById(booking.salonId);
      if (!salon) {
        throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found');
      }

      enforceCancellationWindow(booking.startTime, salon.cancellationWindowMinutes ?? 0);

      const cancelled = await contentService.cancelBooking({
        bookingId: booking.id,
        reasonKey: 'customer.portal',
      });

      reply.code(200).send({ booking: cancelled });
    },
  );

  // Reschedule a booking (customer)
  app.post(
    '/v1/portal/bookings/:bookingId/reschedule',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);
      const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          startUtc: z.string().datetime(),
          staffId: z.string().uuid().optional(),
        })
        .parse(request.body);

      const booking = await getBookingById(params.bookingId);
      if (!booking) {
        throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (booking.customerId !== customer.id) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'Forbidden');
      }

      const salon = await getSalonById(booking.salonId);
      if (!salon) {
        throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found');
      }

      enforceCancellationWindow(booking.startTime, salon.cancellationWindowMinutes ?? 0);

      const slots = await availabilityService.getSlots({
        salonId: booking.salonId,
        serviceId: booking.serviceId,
        staffId: body.staffId ?? booking.staffId,
        fromUtc: body.startUtc,
        days: 1,
        limit: 50,
        intervalMinutes: 15,
      });

      const match = slots.slots.find((slot) => slot.startUtc === body.startUtc);
      if (!match) {
        throw httpError(409, 'BOOKING_TIME_NOT_AVAILABLE', 'error.booking.time_not_available');
      }

      const rescheduled = await contentService.rescheduleBooking({
        bookingId: booking.id,
        staffId: match.staffId,
        startTime: body.startUtc,
      });

      reply.code(200).send({ booking: rescheduled });
    },
  );
}

function enforceCancellationWindow(startTime: string, windowMinutes: number) {
  if (!windowMinutes || windowMinutes <= 0) return;
  const start = new Date(startTime);
  const deadline = new Date(start.getTime() - windowMinutes * 60 * 1000);
  if (Date.now() > deadline.getTime()) {
    throw httpError(409, 'BOOKING_CANCEL_WINDOW_PASSED', 'error.booking.cancellation_window');
  }
}

function buildManageUrl(input: { salonSlug: string | null; bookingId: string; token: string }) {
  if (!env.PUBLIC_APP_URL) return null;
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  const slug = input.salonSlug ?? 'salon';
  return `${base}/book/${slug}/manage/${input.bookingId}?token=${encodeURIComponent(input.token)}`;
}

// ============================================
// NEW V2 ENDPOINTS
// ============================================

// Schema for notification settings
const notificationSettingsSchema = z.object({
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  reminder24h: z.boolean(),
  reminder1h: z.boolean(),
  marketingEmail: z.boolean(),
  marketingSms: z.boolean(),
  dataProcessing: z.boolean(),
});

// Schema for adding favorite
const addFavoriteSchema = z.object({
  salonId: z.string().uuid(),
});

export function registerCustomerPortalV2Routes(app: FastifyInstance) {
  // ============================================
  // RECEIPTS
  // ============================================

  // List my receipts
  app.get(
    '/v1/portal/receipts',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const client = getSupabaseClient();
      const { data: receipts, error } = await client
        .from('receipts')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      reply.code(200).send(receipts ?? []);
    },
  );

  // Get receipt PDF URL
  app.get(
    '/v1/portal/receipts/:receiptId/pdf',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);
      const params = z.object({ receiptId: z.string().uuid() }).parse(request.params);

      const client = getSupabaseClient();
      const { data: receipt, error } = await client
        .from('receipts')
        .select('pdf_url')
        .eq('id', params.receiptId)
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      if (!receipt) {
        throw httpError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found');
      }

      reply.code(200).send({ pdfUrl: receipt.pdf_url });
    },
  );

  // ============================================
  // NOTIFICATIONS
  // ============================================

  // Get notification settings
  app.get(
    '/v1/portal/notifications/settings',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const client = getSupabaseClient();
      const { data: settings, error } = await client
        .from('customer_notification_settings')
        .select('*')
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      if (!settings) {
        // Auto-create settings if missing
        const { data: newSettings, error: createError } = await client
          .from('customer_notification_settings')
          .insert({ customer_id: customer.id })
          .select()
          .single();

        if (createError) {
          throw httpError(500, 'DATABASE_ERROR', createError.message);
        }

        reply.code(200).send({
          smsEnabled: newSettings.sms_enabled,
          emailEnabled: newSettings.email_enabled,
          reminder24h: newSettings.reminder_24h,
          reminder1h: newSettings.reminder_1h,
          marketingEmail: newSettings.marketing_email,
          marketingSms: newSettings.marketing_sms,
          dataProcessing: newSettings.data_processing_consent,
        });
        return;
      }

      reply.code(200).send({
        smsEnabled: settings.sms_enabled,
        emailEnabled: settings.email_enabled,
        reminder24h: settings.reminder_24h,
        reminder1h: settings.reminder_1h,
        marketingEmail: settings.marketing_email,
        marketingSms: settings.marketing_sms,
        dataProcessing: settings.data_processing_consent,
      });
    },
  );

  // Update notification settings
  app.patch(
    '/v1/portal/notifications/settings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { user, customer } = await getAuthenticatedCustomer(request);
      const body = notificationSettingsSchema.parse(request.body);

      const client = getSupabaseClient();
      const { data: updated, error } = await client
        .from('customer_notification_settings')
        .update({
          sms_enabled: body.smsEnabled,
          email_enabled: body.emailEnabled,
          reminder_24h: body.reminder24h,
          reminder_1h: body.reminder1h,
          marketing_email: body.marketingEmail,
          marketing_sms: body.marketingSms,
          data_processing_consent: body.dataProcessing,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customer.id)
        .select()
        .single();

      if (error) {
        throw httpError(500, 'UPDATE_FAILED', error.message);
      }

      await logAudit('notification_settings_update', user.id, body);

      reply.code(200).send({
        smsEnabled: updated.sms_enabled,
        emailEnabled: updated.email_enabled,
        reminder24h: updated.reminder_24h,
        reminder1h: updated.reminder_1h,
        marketingEmail: updated.marketing_email,
        marketingSms: updated.marketing_sms,
        dataProcessing: updated.data_processing_consent,
      });
    },
  );

  // Get notification history
  app.get(
    '/v1/portal/notifications/history',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      });

      const params = querySchema.parse(request.query);

      const client = getSupabaseClient();
      const { data: history, error } = await client
        .from('customer_notification_history')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(params.limit);

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      reply.code(200).send(
        (history ?? []).map((h) => ({
          id: h.id,
          type: h.type,
          purpose: h.purpose,
          sentAt: h.sent_at,
          status: h.status,
        })),
      );
    },
  );

  // ============================================
  // FAVORITES
  // ============================================

  // List my favorites
  app.get(
    '/v1/portal/favorites',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { customer } = await getAuthenticatedCustomer(request);

      const client = getSupabaseClient();
      const { data: favorites, error } = await client
        .from('customer_favorites')
        .select(
          `
          id,
          salon_id,
          created_at,
          salons:salon_id (name, slug, phone, address_line1, city, postal_code)
        `,
        )
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      const typedFavorites = (favorites ?? []) as unknown as Array<{
        id: string;
        salon_id: string;
        created_at: string;
        salons: {
          name: string;
          slug: string;
          phone: string | null;
          address_line1: string | null;
          city: string | null;
          postal_code: string | null;
        } | null;
      }>;

      reply.code(200).send(
        typedFavorites.map((f) => ({
          id: f.id,
          salonId: f.salon_id,
          salonName: f.salons?.name,
          salonSlug: f.salons?.slug,
          address: {
            line1: f.salons?.address_line1,
            city: f.salons?.city,
            postalCode: f.salons?.postal_code,
          },
          phone: f.salons?.phone,
          addedAt: f.created_at,
        })),
      );
    },
  );

  // Add favorite
  app.post(
    '/v1/portal/favorites',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { user, customer } = await getAuthenticatedCustomer(request);
      const body = addFavoriteSchema.parse(request.body);

      const client = getSupabaseClient();

      // Check if salon exists
      const { data: salon, error: salonError } = await client
        .from('salons')
        .select('id')
        .eq('id', body.salonId)
        .maybeSingle();

      if (salonError || !salon) {
        throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found');
      }

      const { data: favorite, error } = await client
        .from('customer_favorites')
        .insert({
          customer_id: customer.id,
          salon_id: body.salonId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw httpError(409, 'ALREADY_FAVORITE', 'Salon is already in favorites');
        }
        throw httpError(500, 'DATABASE_ERROR', error.message);
      }

      await logAudit('favorite_added', user.id, { salonId: body.salonId });

      reply.code(201).send({
        id: favorite.id,
        salonId: favorite.salon_id,
        addedAt: favorite.created_at,
      });
    },
  );

  // Remove favorite
  app.post(
    '/v1/portal/favorites/:salonId/remove',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      checkFeatureFlag();
      const { user, customer } = await getAuthenticatedCustomer(request);
      const params = z.object({ salonId: z.string().uuid() }).parse(request.params);

      const client = getSupabaseClient();

      // Find and delete the favorite
      const { data: favorite, error: findError } = await client
        .from('customer_favorites')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('salon_id', params.salonId)
        .maybeSingle();

      if (findError) {
        throw httpError(500, 'DATABASE_ERROR', findError.message);
      }

      if (!favorite) {
        throw httpError(404, 'FAVORITE_NOT_FOUND', 'Favorite not found');
      }

      const { error: deleteError } = await client
        .from('customer_favorites')
        .delete()
        .eq('id', favorite.id);

      if (deleteError) {
        throw httpError(500, 'DELETE_FAILED', deleteError.message);
      }

      await logAudit('favorite_removed', user.id, { salonId: params.salonId });

      reply.code(200).send({ success: true });
    },
  );
}
