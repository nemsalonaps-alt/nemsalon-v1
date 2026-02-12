import { buildApp } from '../src/server/build-app.js';
import { getSupabaseClient } from '../src/server/db.js';
import { randomUUID } from 'crypto';

export async function createTestServer() {
  const app = buildApp();
  await app.ready();
  return app;
}

export async function seedTestSalon(options?: { runId?: string; slug?: string; name?: string }) {
  const supabase = getSupabaseClient();
  const runId = options?.runId ?? process.env.TEST_RUN_ID ?? randomUUID().slice(0, 8);
  const uniqueSuffix = randomUUID().slice(0, 6);
  const salonId = randomUUID();
  const serviceId = randomUUID();
  const staffId = randomUUID();
  const slug = options?.slug ?? `test-salon-${runId}-${uniqueSuffix}`;
  const salonName = options?.name ?? 'Test Salon Integration';
  const staffEmail = `staff+${runId}-${uniqueSuffix}@test.com`;
  
  // Create salon
  const { error: salonError } = await supabase.from('salons').upsert({
    id: salonId,
    name: salonName,
    slug,
    timezone: 'Europe/Copenhagen',
    locale: 'da-DK',
    currency: 'DKK',
    status: 'active',
    cancellation_window_minutes: 1440,
    salon_type: 'hair_salon'
  });
  if (salonError) {
    throw salonError;
  }
  
  // Create service
  const { error: serviceError } = await supabase.from('services').upsert({
    id: serviceId,
    salon_id: salonId,
    name: 'Test Service',
    duration_minutes: 30,
    buffer_minutes: 0,
    price_amount: 29900,
    currency: 'DKK',
    active: true
  });
  if (serviceError) {
    throw serviceError;
  }
  
  // Create staff
  const { error: staffError } = await supabase.from('staff_profiles').upsert({
    id: staffId,
    salon_id: salonId,
    display_name: 'Test Staff',
    email: staffEmail,
    role: 'staff',
    active: true
  });
  if (staffError) {
    throw staffError;
  }
  
  // Link staff to service
  const { error: staffServiceError } = await supabase.from('staff_services').upsert({
    staff_id: staffId,
    service_id: serviceId
  });
  if (staffServiceError) {
    throw staffServiceError;
  }
  
  // Business hours
  const days = [
    { day: 'mon', start: '09:00', end: '17:00' },
    { day: 'tue', start: '09:00', end: '17:00' },
    { day: 'wed', start: '09:00', end: '17:00' },
    { day: 'thu', start: '09:00', end: '17:00' },
    { day: 'fri', start: '09:00', end: '17:00' },
    { day: 'sat', start: '09:00', end: '14:00' },
    { day: 'sun', start: '09:00', end: '17:00', enabled: false }
  ];
  
  for (const d of days) {
    const { error: hoursError } = await supabase.from('salon_business_hours').upsert({
      salon_id: salonId,
      day: d.day,
      enabled: d.enabled !== false,
      start_time: d.start,
      end_time: d.end
    });
    if (hoursError) {
      throw hoursError;
    }
  }
  
  // Staff working hours
  for (const d of days.filter(d => d.enabled !== false)) {
    const { error: staffHoursError } = await supabase.from('staff_working_hours').upsert({
      staff_id: staffId,
      day: d.day,
      enabled: true,
      start_time: d.start,
      end_time: d.end
    });
    if (staffHoursError) {
      throw staffHoursError;
    }
  }
  
  return { salonId, serviceId, staffId, slug };
}

export async function cleanupTestData(salonId: string) {
  const supabase = getSupabaseClient();

  // Collect staff IDs for dependent cleanup
  const { data: staffRows } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('salon_id', salonId);
  const staffIds = (staffRows ?? []).map((row: { id: string }) => row.id);

  // Delete in safe order (no-op if empty)
  await supabase.from('notification_outbox').delete().eq('salon_id', salonId);
  await supabase.from('bookings').delete().eq('salon_id', salonId);
  await supabase.from('customers').delete().eq('salon_id', salonId);
  await supabase.from('staff_time_off').delete().eq('salon_id', salonId);
  if (staffIds.length > 0) {
    await supabase.from('staff_services').delete().in('staff_id', staffIds);
    await supabase.from('staff_working_hours').delete().in('staff_id', staffIds);
  }
  await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
  await supabase.from('services').delete().eq('salon_id', salonId);
  await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
  await supabase.from('salons').delete().eq('id', salonId);
}

export function generateTestCustomer() {
  return {
    name: `Test Customer ${randomUUID().slice(0, 8)}`,
    email: `test-${randomUUID().slice(0, 8)}@example.com`,
    phone: `+45${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`
  };
}

export function getTomorrowAt(hour: number, minute: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function createTestBooking(
  server: any,
  testData: any,
  customer?: ReturnType<typeof generateTestCustomer>,
  options?: {
    from?: Date;
    slotIndex?: number;
    limit?: number;
    days?: number;
    maxAttempts?: number;
  }
) {
  const slotIndex = options?.slotIndex ?? 0;
  const limit = options?.limit ?? 50;
  const days = options?.days ?? 7;
  const maxAttempts = options?.maxAttempts ?? 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const startFrom = options?.from ?? getTomorrowAt(10 + attempt);

    const slotsResponse = await server.inject({
      method: 'GET',
      url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${startFrom.toISOString()}&days=${days}&limit=${limit}`
    });

    if (slotsResponse.statusCode !== 200) {
      console.error('Availability request failed:', {
        status: slotsResponse.statusCode,
        body: slotsResponse.body
      });
      throw new Error(`Availability request failed: ${slotsResponse.statusCode}`);
    }

    const slotsData = JSON.parse(slotsResponse.body);
    if (!slotsData.slots || slotsData.slots.length === 0) {
      if (attempt === maxAttempts - 1) {
        console.error('No slots available:', {
          status: slotsResponse.statusCode,
          body: slotsData,
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${startFrom.toISOString()}&days=${days}&limit=${limit}`
        });
        throw new Error('No availability slots found for test booking');
      }
      continue;
    }

    const startIndex = Math.min(slotIndex, slotsData.slots.length - 1);
    const slotsToTry = slotsData.slots.slice(startIndex);

    for (const slot of slotsToTry) {
      const bookingResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: customer || generateTestCustomer(),
          idempotencyKey: `test-${randomUUID().slice(0, 8)}`
        }
      });

      if (bookingResponse.statusCode === 201) {
        return JSON.parse(bookingResponse.body);
      }

      const body = JSON.parse(bookingResponse.body);
      const retryable = [400, 409, 422].includes(bookingResponse.statusCode);
      if (!retryable) {
        console.error('Booking creation failed:', {
          status: bookingResponse.statusCode,
          body
        });
        throw new Error(`Failed to create test booking: ${bookingResponse.statusCode}`);
      }
    }

    if (attempt === maxAttempts - 1) {
      throw new Error('Failed to create test booking after trying all slots');
    }
  }

  throw new Error('Failed to create test booking');
}

export async function checkoutAndPay(
  server: any,
  booking: any,
  bookingToken: string,
  options?: { status?: 'succeeded' | 'failed' | 'canceled' }
) {
  const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
  // Create checkout
  const checkoutResponse = await server.inject({
    method: 'POST',
    url: `/v1/public/bookings/${booking.id}/checkout`,
    headers: { 
      'Content-Type': 'application/json',
      'X-Booking-Token': bookingToken
    },
    payload: {
      successUrl: `${publicUrl}/success`,
      cancelUrl: `${publicUrl}/cancel`
    }
  });
  
  if (checkoutResponse.statusCode !== 201) {
    console.error('Checkout failed:', {
      status: checkoutResponse.statusCode,
      body: JSON.parse(checkoutResponse.body)
    });
    throw new Error(`Failed to create checkout: ${checkoutResponse.statusCode}`);
  }

  const checkoutData = JSON.parse(checkoutResponse.body);
  
  // Process payment webhook
  await server.inject({
    method: 'POST',
    url: '/v1/webhooks/stripe',
    headers: { 'Content-Type': 'application/json' },
    payload: {
      paymentId: checkoutData.paymentId,
      bookingId: booking.id,
      sessionId: `mock_session_${checkoutData.paymentId}`,
      eventId: `mock_event_${randomUUID().slice(0, 8)}`,
      ...(options?.status ? { status: options.status } : {})
    }
  });
  
  return checkoutData;
}
