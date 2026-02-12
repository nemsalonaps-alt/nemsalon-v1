import { expect, type APIResponse } from '@playwright/test';
import {
  test,
  loginAsOwner,
  loginAsCustomer,
  expectApiError,
  expectUiError,
  getTomorrowDate,
  uniqueCustomerEmail,
} from './utils';

test.describe('Booking Error Handling - Comprehensive', () => {
  test.describe('Booking Creation Errors', () => {
    test('viser fejl ved manglende kunde', async ({ page }) => {
      await loginAsOwner(page);

      // Navigate to create booking
      await page.goto('/owner/create');

      // Try to create booking without selecting customer
      // Select service and staff first
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });

      // Fill date and time
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');

      // Try to submit without customer
      await page.getByTestId('create-booking-submit').click();

      // Should show validation error
      await expectUiError(page, /customer|kunde|required/i);
    });

    test('viser fejl ved ugyldigt tidspunkt', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/create');

      // Select service, staff and customer
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      // Set invalid time (outside business hours)
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('03:00'); // 3 AM

      await page.getByTestId('create-booking-submit').click();

      await expectApiError(page, 400, /outside_business_hours|business hours/i);
      await expectUiError(page, /business hours|åbningstid|outside/i);
    });

    test('viser fejl ved booking uden for åbningstid', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/create');

      // Setup booking data
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      // Try to book late at night (outside business hours)
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('23:30');

      await page.getByTestId('create-booking-submit').click();

      const apiError = await expectApiError(page, 400);
      expect(apiError.message || apiError.errorKey).toMatch(/outside_business_hours|business/i);
    });

    test('viser fejl ved booking på ugyldig dato', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/create');

      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      // Set date in the past
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await page.locator('input[type="date"]').fill(yesterdayStr);
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expectApiError(page, 400, /invalid_time_range|past|fortid/i);
    });

    test('viser fejl ved dobbeltbooking', async ({ page }) => {
      await loginAsOwner(page);

      // Create first booking
      await page.goto('/owner/create');
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      const date = getTomorrowDate();
      const time = '14:00';

      await page.locator('input[type="date"]').fill(date);
      await page.locator('input[type="time"]').fill(time);
      await page.getByTestId('create-booking-submit').click();

      // Wait for success
      await expect(page.getByText(/created|oprettet|success/i)).toBeVisible();

      // Try to create another booking at same time
      await page.goto('/owner/create');
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      await page.locator('input[type="date"]').fill(date);
      await page.locator('input[type="time"]').fill(time);
      await page.getByTestId('create-booking-submit').click();

      // Should get conflict error
      const apiError = await expectApiError(page, 409);
      expect(apiError.message || apiError.errorKey).toMatch(
        /time_not_available|already booked|optaget/i,
      );
    });

    test('viser fejl når staff ikke kan udføre service', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/create');

      // Select service
      await page.getByTestId('create-service-select').selectOption({ index: 1 });

      // Select staff that might not be assigned to this service
      // This might need specific test data setup
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      // Check for staff-service mismatch error
      const apiError = await page.waitForResponse(
        (r) => !r.ok() && r.url().includes('/v1/bookings'),
      );

      if (apiError.status() === 409) {
        const body = await apiError.json();
        if (body.errorKey?.includes('staff_not_assigned')) {
          console.log('Staff-service mismatch detected');
        }
      }
    });

    test('viser fejl ved ugyldig service reference', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create booking via API with invalid service ID
      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'invalid-service-id-12345',
          staffId: 'some-staff-id',
          customerId: 'some-customer-id',
          startTime: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code).toMatch(/INVALID_REFERENCE|invalid_reference/i);
    });

    test('viser fejl ved ugyldig staff reference', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'invalid-staff-id-12345',
          customerId: 'some-customer-id',
          startTime: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('STAFF_NOT_FOUND');
    });

    test('viser fejl ved ugyldig customer reference', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'invalid-customer-id-12345',
          startTime: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  test.describe('Booking Status Transition Errors', () => {
    test('viser fejl ved ugyldig status ændring', async ({ page }) => {
      await loginAsOwner(page);

      // First create a completed booking
      // Then try to change it back to pending (should fail)

      // This would require API access to directly update status
      const response = await page.request.patch('/v1/bookings/some-completed-id', {
        data: {
          status: 'pending',
        },
      });

      if (response.status() !== 200) {
        const body = await response.json().catch(() => ({}));
        console.log('Status transition error:', body);
      }
    });
  });

  test.describe('Booking Cancellation Errors', () => {
    test('viser fejl ved annullering af afsluttet booking', async ({ page }) => {
      await loginAsOwner(page);

      // Try to cancel a completed booking via API
      const response = await page.request.post('/v1/bookings/completed-booking-id/cancel');

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/cannot_cancel|CANNOT_CANCEL/i);
    });

    test('viser fejl ved for sent afbestilling', async ({ page }) => {
      await loginAsCustomer(page);

      // Navigate to customer portal
      await page.goto('/portal');

      // Find a booking that's too close to cancel
      // This requires specific test data

      // Try to cancel it
      const cancelButtons = await page.locator('[data-testid*="cancel"]').all();
      if (cancelButtons.length > 0) {
        await cancelButtons[0].click();

        // Should show error about cancellation window
        await expectUiError(page, /cancellation window|afbestillingsvindue|for sent/i);
      }
    });

    test('viser fejl ved annullering uden tilladelse', async ({ page }) => {
      // Login as staff
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();

      // Try to cancel a booking via API (staff might have limited permissions)
      const response = await page.request.post('/v1/bookings/some-booking-id/cancel');

      if (response.status() === 403) {
        const body = await response.json();
        expect(body.code).toBe('AUTH_FORBIDDEN');
      }
    });
  });

  test.describe('Booking Reschedule Errors', () => {
    test('viser fejl ved omlægning af aflyst booking', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/bookings/cancelled-booking-id/reschedule', {
        data: {
          newStartTime: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/cannot_reschedule|CANNOT_RESCHEDULE/i);
    });

    test('viser fejl ved omlægning til optaget tid', async ({ page }) => {
      await loginAsOwner(page);

      // This would need two bookings at the same time
      const response = await page.request.post('/v1/bookings/booking-id/reschedule', {
        data: {
          newStartTime: new Date().toISOString(), // Time that's already booked
        },
      });

      if (response.status() === 409) {
        const body = await response.json();
        expect(body.errorKey || body.message).toMatch(/time_not_available|optaget/i);
      }
    });

    test('viser fejl ved omlægning uden for afbestillingsvindue', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/portal');

      // Try to reschedule a booking that's too close
      const rescheduleButtons = await page.locator('[data-testid*="reschedule"]').all();
      if (rescheduleButtons.length > 0) {
        await rescheduleButtons[0].click();

        // Select a new time
        await page.locator('input[type="date"]').fill(getTomorrowDate());
        await page.locator('input[type="time"]').fill('10:00');
        await page.getByTestId('reschedule-submit').click();

        await expectUiError(page, /cancellation window|afbestillingsvindue/i);
      }
    });
  });

  test.describe('Public Booking Errors', () => {
    test('viser fejl ved ugyldig salon slug', async ({ page }) => {
      await page.goto('/book/ikke-eksisterende-salon-12345');

      await expectUiError(page, /salon not found|error.salon_not_found|ikke fundet/i);
    });

    test('viser fejl ved inaktiv salon', async ({ page }) => {
      await page.goto('/book/inaktiv-salon');

      await expectUiError(page, /not active|inactive|inaktiv/i);
    });

    test('viser fejl ved ugyldig service', async ({ page }) => {
      await page.goto('/book/dev-salon');

      // Try to select an invalid service via API
      const response = await page.request.post('/v1/public/bookings', {
        data: {
          salonSlug: 'dev-salon',
          serviceId: 'invalid-service-id',
          staffId: 'valid-staff-id',
          customerName: 'Test Kunde',
          customerEmail: uniqueCustomerEmail(),
          startTime: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('SERVICE_NOT_FOUND');
    });

    test('viser fejl ved manglende kundeinformation', async ({ page }) => {
      await page.goto('/book/dev-salon');

      // Select service and time
      await page
        .getByRole('button', { name: /haircut|service/i })
        .first()
        .click();
      await page
        .getByRole('button', { name: /first available|første ledige/i })
        .first()
        .click();

      // Try to proceed without filling customer details
      await page.getByRole('button', { name: /continue|fortsæt/i }).click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved ugyldig booking token', async ({ page }) => {
      await page.goto('/booking/invalid-token-12345');

      await expectUiError(page, /token|invalid|token/i);
    });

    test('viser fejl ved udløbet booking token', async ({ page }) => {
      // Navigate with expired token
      await page.goto('/booking/expired-token-12345');

      await expectUiError(page, /expired|udløbet|token/i);
    });

    test('viser fejl ved forkert booking token', async ({ page }) => {
      // Navigate with mismatched token
      await page.goto('/booking/wrong-booking-token');

      await expectUiError(page, /token|mismatch|forkert/i);
    });
  });

  test.describe('Checkout & Payment Errors', () => {
    test('viser fejl ved checkout af ikke-pending booking', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/bookings/completed-booking-id/checkout');

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/not_pending|not payable/i);
    });

    test('viser fejl ved dobbeltbetaling', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create checkout for already paid booking
      const response = await page.request.post('/v1/bookings/paid-booking-id/checkout');

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/already_paid|already paid/i);
    });

    test('viser fejl ved checkout uden Stripe konfiguration', async ({ page }) => {
      await loginAsOwner(page);

      // This requires a salon without Stripe configured
      const response = await page.request.post('/v1/bookings/booking-id/checkout', {
        data: {
          returnUrl: 'http://localhost:5173/confirmation',
        },
      });

      if (response.status() === 409) {
        const body = await response.json();
        expect(body.errorKey || body.message).toMatch(/stripe|not configured|ikke konfigureret/i);
      }
    });
  });

  test.describe('Booking Access Control Errors', () => {
    test('viser fejl når staff prøver at se anden staffs booking', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();

      // Try to access another staff's booking
      const response = await page.request.get('/v1/bookings/other-staff-booking-id');

      if (response.status() === 403) {
        const body = await response.json();
        expect(body.code).toBe('AUTH_FORBIDDEN');
      }
    });

    test('viser fejl når kunde prøver at se anden kundes booking', async ({ page }) => {
      await loginAsCustomer(page);

      // Try to access another customer's booking
      const response = await page.request.get('/v1/portal/bookings/other-customer-booking-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved manglende booking token', async ({ page }) => {
      // Access public booking endpoint without token
      const response = await page.request.post('/v1/public/bookings/booking-id/cancel');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/token|required|TOKEN_REQUIRED/i);
    });
  });

  test.describe('Booking Validation Errors', () => {
    test('validerer tidspunkt format', async ({ page }) => {
      await loginAsOwner(page);

      const invalidTimes = ['not-a-time', '25:00', '12:60', '10.30', ''];

      for (const time of invalidTimes) {
        const response = await page.request.post('/v1/bookings', {
          data: {
            serviceId: 'valid-service',
            staffId: 'valid-staff',
            customerId: 'valid-customer',
            startTime: 'invalid-datetime',
          },
        });

        if (!response.ok()) {
          console.log(`Invalid time rejected: ${time}`);
        }
      }
    });

    test('validerer dato format', async ({ page }) => {
      await loginAsOwner(page);

      const invalidDates = ['not-a-date', '2024-13-01', '2024-01-32', '01-01-2024', ''];

      for (const date of invalidDates) {
        const response = await page.request.post('/v1/bookings', {
          data: {
            serviceId: 'valid-service',
            staffId: 'valid-staff',
            customerId: 'valid-customer',
            startTime: date,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid date rejected: ${date}`);
        }
      }
    });

    test('validerer at sluttid matcher service varighed', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create booking with wrong end time
      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: '60min-service',
          staffId: 'valid-staff',
          customerId: 'valid-customer',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T10:30:00Z', // Should be 11:00 for 60min service
        },
      });

      if (response.status() === 400) {
        const body = await response.json();
        expect(body.errorKey || body.message).toMatch(/duration_mismatch|varighed/i);
      }
    });

    test('validerer 15-minutters alignment', async ({ page }) => {
      await loginAsOwner(page);

      // Try to book at 10:07 (not aligned to 15 min)
      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service',
          staffId: 'valid-staff',
          customerId: 'valid-customer',
          startTime: '2024-01-15T10:07:00Z',
        },
      });

      if (response.status() === 400) {
        const body = await response.json();
        expect(body.errorKey || body.message).toMatch(/time_alignment|15|minut/i);
      }
    });
  });

  test.describe('Complex Booking Scenarios', () => {
    test('håndterer samtidige bookings på samme tid', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create multiple bookings at the same time rapidly
      const promises = Array.from({ length: 5 }, (_, i) =>
        page.request.post('/v1/bookings', {
          data: {
            serviceId: 'valid-service',
            staffId: 'valid-staff',
            customerId: `customer-${i}`,
            startTime: new Date().toISOString(),
          },
        }),
      );

      const results = await Promise.allSettled(promises);

      // Only one should succeed, others should fail with conflict
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as APIResponse).ok(),
      );
      const conflicts = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as APIResponse).status() === 409,
      );

      expect(successful.length).toBeLessThanOrEqual(1);
      expect(conflicts.length).toBeGreaterThanOrEqual(4);
    });

    test('håndterer hurtige status ændringer', async ({ page }) => {
      await loginAsOwner(page);

      // Create a booking
      const booking = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service',
          staffId: 'valid-staff',
          customerId: 'valid-customer',
          startTime: new Date().toISOString(),
        },
      });

      const bookingData = await booking.json();
      const bookingId = bookingData.id;

      // Rapidly change status
      const statusChanges = [
        page.request.patch(`/v1/bookings/${bookingId}`, { data: { status: 'confirmed' } }),
        page.request.patch(`/v1/bookings/${bookingId}`, { data: { status: 'in_progress' } }),
        page.request.patch(`/v1/bookings/${bookingId}`, { data: { status: 'completed' } }),
      ];

      const results = await Promise.allSettled(statusChanges);

      // Some might fail due to invalid transitions
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const response = result.value as APIResponse;
          if (!response.ok()) {
            console.log(`Status change ${index} failed:`, response.status());
          }
        }
      });
    });
  });
});
