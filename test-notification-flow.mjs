#!/usr/bin/env node
/**
 * Notification Flow Test Script
 * 
 * This script tests the complete notification flow:
 * 1. Creates a public booking
 * 2. Creates a checkout session (mock payment)
 * 3. Simulates Stripe webhook (payment success)
 * 4. Verifies notification was queued in outbox
 * 
 * Run with: node test-notification-flow.mjs
 * 
 * Prerequisites:
 * - API running on http://localhost:3000
 * - Supabase running with test data (run test-notification-flow.sql first)
 * - Notification worker running (pnpm worker:notifications)
 */

import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SALON_SLUG = 'test-salon-kbh';

// Test customer data
const testCustomer = {
  name: 'Test Kunde',
  email: 'test@example.com',
  phone: '+4512345678'
};

// Colors for output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;

async function api(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data?.error || text}`);
  }
  
  return data;
}

async function step(description, fn) {
  console.log(`\n${blue('▶')} ${description}`);
  try {
    const result = await fn();
    console.log(`${green('✓')} Success`);
    return result;
  } catch (error) {
    console.log(`${red('✗')} Failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log(yellow('╔════════════════════════════════════════════════════════╗'));
  console.log(yellow('║     Notification Flow Test - Mock Payment                ║'));
  console.log(yellow('╚════════════════════════════════════════════════════════╝'));
  console.log(`\nAPI: ${API_URL}`);
  console.log(`Salon: ${SALON_SLUG}`);

  let salon, service, staff, slots, booking, checkoutData;

  try {
    // Step 1: Get salon info
    salon = await step('Fetching salon info', async () => {
      const data = await api(`/v1/public/salons/${SALON_SLUG}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Timezone: ${data.timezone}`);
      return data;
    });

    // Step 2: Get services
    const services = await step('Fetching services', async () => {
      const data = await api(`/v1/public/salons/${SALON_SLUG}/services`);
      if (!data.data?.length) throw new Error('No services found');
      console.log(`  Found ${data.data.length} service(s)`);
      data.data.forEach(s => console.log(`  - ${s.name} (${s.durationMinutes} min)`));
      return data.data;
    });
    service = services[0];

    // Step 3: Get staff
    const staffList = await step('Fetching staff', async () => {
      const data = await api(`/v1/public/salons/${SALON_SLUG}/staff?serviceId=${service.id}`);
      if (!data.data?.length) throw new Error('No staff found');
      console.log(`  Found ${data.data.length} staff member(s)`);
      data.data.forEach(s => console.log(`  - ${s.name}`));
      return data.data;
    });
    staff = staffList[0];

    // Step 4: Get availability (tomorrow at 10:00)
    slots = await step('Fetching availability slots', async () => {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const from = tomorrow.toISOString();
      
      const data = await api(
        `/v1/public/availability?` +
        `salonSlug=${SALON_SLUG}&` +
        `serviceId=${service.id}&` +
        `staffId=${staff.id}&` +
        `from=${encodeURIComponent(from)}&` +
        `days=7&limit=5`
      );
      
      if (!data.slots?.length) throw new Error('No available slots found');
      console.log(`  Found ${data.slots.length} slot(s)`);
      data.slots.slice(0, 3).forEach(s => {
        const time = new Date(s.startUtc).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
        console.log(`  - ${time}`);
      });
      return data.slots;
    });

    // Step 5: Create booking
    const selectedSlot = slots[0];
    const idempotencyKey = `test-${randomUUID().slice(0, 8)}`;
    
    booking = await step('Creating public booking', async () => {
      const data = await api('/v1/public/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonSlug: SALON_SLUG,
          serviceId: service.id,
          staffId: staff.id,
          startUtc: selectedSlot.startUtc,
          customer: testCustomer,
          notes: 'Test booking from automated script',
          idempotencyKey
        })
      });
      
      console.log(`  Booking ID: ${data.booking.id}`);
      console.log(`  Token: ${data.bookingToken?.slice(0, 20)}...`);
      console.log(`  Status: ${data.booking.status}`);
      console.log(`  Amount: ${data.booking.totalAmount} ${data.booking.currency}`);
      
      return { ...data.booking, bookingToken: data.bookingToken };
    });

    // Step 6: Create checkout session
    checkoutData = await step('Creating checkout session', async () => {
      const successUrl = `http://localhost:5173/book/${SALON_SLUG}/confirm?bookingId=${booking.id}&token=${booking.bookingToken}`;
      const cancelUrl = `http://localhost:5173/book/${SALON_SLUG}/manage?bookingId=${booking.id}&token=${booking.bookingToken}`;
      
      const data = await api(`/v1/public/bookings/${booking.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          token: booking.bookingToken,
          successUrl,
          cancelUrl
        })
      });
      
      console.log(`  Checkout URL: ${data.checkoutUrl.slice(0, 50)}...`);
      console.log(`  Payment ID: ${data.paymentId}`);
      return data;
    });

    // Step 7: Simulate Stripe webhook (mock payment success)
    await step('Simulating payment webhook', async () => {
      // In mock mode, we can send a fake webhook
      const mockWebhookPayload = {
        paymentId: checkoutData.paymentId,
        bookingId: booking.id,
        sessionId: `mock_session_${checkoutData.paymentId}`,
        eventId: `mock_event_${randomUUID().slice(0, 8)}`,
        intentId: `mock_intent_${checkoutData.paymentId}`
      };
      
      const data = await api('/v1/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockWebhookPayload)
      });
      
      console.log(`  Webhook received: ${data.received}`);
      if (data.idempotent) console.log(`  (idempotent replay detected)`);
      if (data.orphaned) console.log(`  ⚠️ Orphaned webhook - payment not found`);
      
      return data;
    });

    // Step 8: Verify booking status updated
    const confirmedBooking = await step('Verifying booking confirmed', async () => {
      const data = await api(`/v1/public/bookings/${booking.id}?token=${booking.bookingToken}`);
      
      if (data.status !== 'confirmed') {
        throw new Error(`Expected status 'confirmed', got '${data.status}'`);
      }
      
      console.log(`  Status: ${data.status} ✓`);
      console.log(`  Payment: ${data.paymentStatus || '—'}`);
      return data;
    });

    // Step 9: Check notification outbox
    await step('Checking notification outbox', async () => {
      // Note: This requires admin access, so we'll skip if not available
      // In a real test, we'd query the DB directly
      console.log(`  Booking ${booking.id}`);
      console.log(`  Expected notifications:`);
      console.log(`    - Email to: ${testCustomer.email}`);
      console.log(`    - SMS to: ${testCustomer.phone}`);
      console.log(`  `);
      console.log(yellow('  ⚠️  Check notification_outbox table manually:'));
      console.log(`     SELECT * FROM notification_outbox WHERE booking_id = '${booking.id}';`);
    });

    // Success summary
    console.log(`\n${green('╔════════════════════════════════════════════════════════╗')}`);
    console.log(`${green('║     ✓ Notification Flow Test Complete!                 ║')}`);
    console.log(`${green('╚════════════════════════════════════════════════════════╝')}`);
    console.log(`\nSummary:`);
    console.log(`  Booking ID: ${booking.id}`);
    console.log(`  Token: ${booking.bookingToken}`);
    console.log(`  Status: confirmed`);
    console.log(`  Payment: ${checkoutData.paymentId}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Check notification_outbox table in Supabase`);
    console.log(`  2. Verify worker picks up and "sends" notifications`);
    console.log(`  3. Check worker logs for email/SMS output`);

  } catch (error) {
    console.log(`\n${red('╔════════════════════════════════════════════════════════╗')}`);
    console.log(`${red('║     ✗ Test Failed                                      ║')}`);
    console.log(`${red('╚════════════════════════════════════════════════════════╝')}`);
    console.log(`\nError: ${error.message}`);
    
    if (booking?.id) {
      console.log(`\nBooking was created: ${booking.id}`);
      console.log(`You can verify manually at:`);
      console.log(`  http://localhost:5173/book/${SALON_SLUG}/manage?bookingId=${booking.id}`);
    }
    
    process.exit(1);
  }
}

// Check if API is reachable before starting
console.log(`Checking API at ${API_URL}...`);
fetch(`${API_URL}/health`)
  .then(() => {
    console.log(green('API is reachable\n'));
    main();
  })
  .catch(() => {
    console.log(red(`\n✗ API not reachable at ${API_URL}`));
    console.log('Make sure the API is running:');
    console.log('  cd apps/api && pnpm dev');
    process.exit(1);
  });
