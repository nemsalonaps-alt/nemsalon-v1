import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import { env } from '../../../config/env.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';

// Schema for updating customer profile
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(3).optional()
});

// Helper to get authenticated customer from cookie
async function getAuthenticatedCustomer(request: FastifyRequest) {
  const client = getSupabaseClient();
  const token = request.cookies?.customer_session;
  
  if (!token) {
    throw httpError(401, 'NO_SESSION', 'No active session');
  }

  const { data: { user }, error } = await client.auth.getUser(token);
  
  if (error || !user) {
    throw httpError(401, 'INVALID_SESSION', 'Session expired');
  }

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
      metadata
    });
  } catch {
    // Silently fail - don't block main operation
  }
}

export function registerCustomerPortalRoutes(app: FastifyInstance) {
  // Get customer profile
  app.get('/v1/portal/me', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60_000
      }
    }
  }, async (request, reply) => {
    checkFeatureFlag();
    const { user, customer } = await getAuthenticatedCustomer(request);
    
    await logAudit('profile_view', user.id);
    
    reply.code(200).send({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.created_at
    });
  });

  // Update customer profile
  app.patch('/v1/portal/me', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: 60_000
      }
    }
  }, async (request, reply) => {
    checkFeatureFlag();
    const { user, customer } = await getAuthenticatedCustomer(request);
    const body = updateProfileSchema.parse(request.body);
    
    const client = getSupabaseClient();
    const { data: updated, error } = await client
      .from('customers')
      .update({
        name: body.name,
        phone: body.phone,
        updated_at: new Date().toISOString()
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
      createdAt: updated.created_at
    });
  });

  // List my bookings across all salons
  app.get('/v1/portal/bookings', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60_000
      }
    }
  }, async (request, reply) => {
    checkFeatureFlag();
    const { customer } = await getAuthenticatedCustomer(request);
    
    const querySchema = z.object({
      status: z.enum(['upcoming', 'past', 'cancelled', 'all']).optional().default('all'),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0)
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
      .select(`
        *,
        salons:salon_id (name, slug, phone, email, address_line1, address_line2, city, postal_code, country),
        services:service_id (name, duration_minutes),
        staff:staff_id (name)
      `)
      .eq('customer_id', customer.id)
      .order('start_time', { ascending: false });
    
    // Apply status filters
    if (params.status === 'upcoming') {
      dbQuery = dbQuery.in('status', ['pending', 'confirmed'])
        .gte('start_time', now);
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
    
    // Transform and enrich bookings
    const enrichedBookings = (bookings || []).map(booking => ({
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
        country: booking.salons?.country
      },
      serviceId: booking.service_id,
      serviceName: booking.services?.name,
      serviceDuration: booking.services?.duration_minutes,
      staffId: booking.staff_id,
      staffName: booking.staff?.name,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      paymentStatus: booking.payment_status,
      totalAmount: booking.total_amount,
      currency: booking.currency,
      notes: booking.notes,
      createdAt: booking.created_at
    }));
    
    reply.code(200).send({
      data: enrichedBookings,
      meta: {
        total: totalCount ?? 0,
        offset: params.offset,
        limit: params.limit,
        status: params.status
      }
    });
  });

  // Get single booking details
  app.get('/v1/portal/bookings/:bookingId', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60_000
      }
    }
  }, async (request, reply) => {
    checkFeatureFlag();
    const { customer } = await getAuthenticatedCustomer(request);
    
    const params = z.object({
      bookingId: z.string().uuid()
    }).parse(request.params);
    
    const client = getSupabaseClient();
    const { data: booking, error } = await client
      .from('bookings')
      .select(`
        *,
        salons:salon_id (name, slug, phone, email, address_line1, address_line2, city, postal_code, country, timezone),
        services:service_id (name, duration_minutes, price),
        staff:staff_id (name)
      `)
      .eq('id', params.bookingId)
      .eq('customer_id', customer.id)
      .maybeSingle();
    
    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message);
    }
    
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }
    
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
        country: booking.salons?.country
      },
      salonTimezone: booking.salons?.timezone,
      serviceId: booking.service_id,
      serviceName: booking.services?.name,
      serviceDuration: booking.services?.duration_minutes,
      servicePrice: booking.services?.price,
      staffId: booking.staff_id,
      staffName: booking.staff?.name,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      paymentStatus: booking.payment_status,
      totalAmount: booking.total_amount,
      currency: booking.currency,
      notes: booking.notes,
      cancellationReason: booking.cancellation_reason,
      cancellationNote: booking.cancellation_note,
      createdAt: booking.created_at
    });
  });
}
