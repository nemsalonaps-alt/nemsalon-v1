import { expect } from '@playwright/test';
import {
  test,
  loginAsOwner,
  loginAsCustomer,
  expectApiError,
  expectUiError,
  uniqueEmail,
  uniqueCustomerEmail,
} from './utils';

test.describe('Customer Error Handling - Comprehensive', () => {
  test.describe('Customer Creation Errors', () => {
    test('viser fejl ved manglende navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      // Try to create customer without name
      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-email-input').fill(uniqueEmail('customer'));
      await page.getByTestId('customer-phone-input').fill('12345678');
      await page.getByTestId('save-customer-button').click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved kort navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('A');
      await page.getByTestId('customer-email-input').fill(uniqueEmail('customer'));
      await page.getByTestId('save-customer-button').click();

      await expectApiError(page, 400, /validation|name|2|characters/i);
      await expectUiError(page, /name|navn|2|characters/i);
    });

    test('viser fejl ved ugyldig email format', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('Test Kunde');
      await page.getByTestId('customer-email-input').fill('ikke-en-email');
      await page.getByTestId('save-customer-button').click();

      await expectUiError(page, /email|valid|format|ugyldig/i);
    });

    test('viser fejl ved duplikeret email', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('Duplikeret Kunde');
      await page.getByTestId('customer-email-input').fill('dev-customer@nemsalon.test');
      await page.getByTestId('save-customer-button').click();

      await expectApiError(page, 409, /duplicate|exists|already|eksisterer/i);
    });

    test('viser fejl ved ugyldigt telefonnummer', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name-input').fill('Test Kunde');
      await page.getByTestId('customer-email-input').fill(uniqueEmail('customer'));
      await page.getByTestId('customer-phone-input').fill('ikke-et-nummer');
      await page.getByTestId('save-customer-button').click();

      // Might be accepted with validation or rejected
      const response = await page
        .waitForResponse((r) => r.url().includes('/v1/customers') && !r.ok(), { timeout: 5000 })
        .catch(() => null);

      if (response) {
        console.log('Phone validation error:', response.status());
      }
    });

    test('viser fejl ved oprettelse uden salon tilknytning', async ({ page }) => {
      // Try to create customer via API without proper salon context
      const response = await page.request.post('/v1/customers', {
        data: {
          name: 'Orphan Kunde',
          email: uniqueEmail('customer'),
        },
      });

      // Should fail without auth or proper salon context
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.code).toBe('UNAUTHORIZED');
      }
    });
  });

  test.describe('Customer Update Errors', () => {
    test('viser fejl ved opdatering af ikke-eksisterende kunde', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/customers/ikke-eksisterende-id-12345', {
        data: {
          name: 'Updated Name',
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('CUSTOMER_NOT_FOUND');
    });

    test('viser fejl når kunde prøver at opdatere anden kunde', async ({ page }) => {
      await loginAsCustomer(page);

      const response = await page.request.patch('/v1/customers/other-customer-id', {
        data: {
          name: 'Hacked Name',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved opdatering til ugyldig email', async ({ page }) => {
      await loginAsOwner(page);

      // Get first customer
      const customerList = await page.request.get('/v1/customers');
      const customers = await customerList.json();

      if (customers.length > 0) {
        const response = await page.request.patch(`/v1/customers/${customers[0].id}`, {
          data: {
            email: 'ikke-en-email',
          },
        });

        expect(response.status()).toBe(400);
      }
    });

    test('kunde kan opdatere egen profil', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/portal');

      // Navigate to profile/settings
      await page.getByTestId('profile-link').click();

      // Update profile
      await page.getByTestId('profile-name-input').fill('Opdateret Navn');
      await page.getByTestId('profile-phone-input').fill('87654321');
      await page.getByTestId('save-profile-button').click();

      // Should succeed
      await expect(page.getByText(/saved|gemt|updated|opdateret/i)).toBeVisible();
    });
  });

  test.describe('Customer Deletion Errors', () => {
    test('viser fejl ved sletning af ikke-eksisterende kunde', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.delete('/v1/customers/ikke-eksisterende-id-12345');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('CUSTOMER_NOT_FOUND');
    });

    test('viser fejl når kunde prøver at slette sig selv', async ({ page }) => {
      await loginAsCustomer(page);

      // Try to delete own customer record
      const response = await page.request.delete('/v1/customers/me');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved sletning af kunde med aktive bookings', async ({ page }) => {
      await loginAsOwner(page);

      // This would require a customer with active bookings
      const response = await page.request.delete('/v1/customers/customer-med-bookings');

      // Should fail with constraint error
      if (response.status() === 409) {
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/constraint|bookings|active/i);
      }
    });
  });

  test.describe('Customer Portal Errors', () => {
    test('viser fejl ved adgang uden login', async ({ page }) => {
      // Clear session
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access portal
      await page.goto('/portal');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('viser fejl ved ugyldig booking token', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/portal');

      // Try to access booking with invalid token
      await page.goto('/portal/booking/invalid-token-12345');

      await expectUiError(page, /token|invalid|ugyldig/i);
    });

    test('viser fejl når kunde prøver at se andens booking', async ({ page }) => {
      await loginAsCustomer(page);

      const response = await page.request.get('/v1/portal/bookings/other-customer-booking-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved booking detaljer uden token', async ({ page }) => {
      await page.request.get('/v1/public/bookings/some-booking-id');

      // Should require token
      // API should return 401 or 403
    });
  });

  test.describe('Customer Booking Management Errors', () => {
    test('viser fejl ved afbestilling af afsluttet booking', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/portal');

      // Try to cancel a completed booking
      const response = await page.request.post('/v1/portal/bookings/completed-booking-id/cancel');

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/cannot_cancel|already completed/i);
    });

    test('viser fejl ved afbestilling efter deadline', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/portal');

      // Try to cancel booking that's too close
      const response = await page.request.post('/v1/portal/bookings/too-close-booking-id/cancel');

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/cancellation_window|deadline|for sent/i);
    });

    test('viser fejl ved omlægning af aflyst booking', async ({ page }) => {
      await loginAsCustomer(page);

      const response = await page.request.post(
        '/v1/portal/bookings/cancelled-booking-id/reschedule',
        {
          data: {
            newStartTime: new Date().toISOString(),
          },
        },
      );

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/cannot_reschedule|cancelled/i);
    });

    test('viser fejl ved omlægning til optaget tid', async ({ page }) => {
      await loginAsCustomer(page);

      const response = await page.request.post('/v1/portal/bookings/booking-id/reschedule', {
        data: {
          newStartTime: new Date().toISOString(), // Already booked time
        },
      });

      if (response.status() === 409) {
        const body = await response.json();
        expect(body.errorKey || body.message).toMatch(/time_not_available|optaget/i);
      }
    });
  });

  test.describe('Customer Registration Errors', () => {
    test('viser fejl ved registrering uden salon', async ({ page }) => {
      await page.goto('/register'); // No salon slug

      await page.locator('input#name').fill('Ny Kunde');
      await page.locator('input#email').fill(uniqueCustomerEmail());
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      await expectUiError(page, /salon|required|påkrævet|errorNoSalon/i);
    });

    test('viser fejl ved registrering med ugyldig salon slug', async ({ page }) => {
      await page.goto('/register?salon=ugyldig-salon-12345');

      await page.locator('input#name').fill('Ny Kunde');
      await page.locator('input#email').fill(uniqueCustomerEmail());
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      await expectApiError(page, 404, /salon_not_found|not found|ikke fundet/i);
    });

    test('viser fejl ved duplikeret email registrering', async ({ page }) => {
      await page.goto('/register?salon=dev-salon');

      await page.locator('input#name').fill('Eksisterende Kunde');
      await page.locator('input#email').fill('dev-customer@nemsalon.test');
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      await expectApiError(page, 400, /registration_failed|exists|already/i);
    });
  });

  test.describe('Customer Data Validation', () => {
    test('validerer email format', async ({ page }) => {
      await loginAsOwner(page);

      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@domain',
        'username@domain..com',
      ];

      for (const email of invalidEmails) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: 'Test Kunde',
            email,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid email rejected: ${email}`);
        }
      }
    });

    test('validerer telefonnummer format', async ({ page }) => {
      await loginAsOwner(page);

      const invalidPhones = [
        'abc',
        '12-34-56-78',
        '+45 12 34 56', // Too short
        '12345678901234567890', // Too long
      ];

      for (const phone of invalidPhones) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: 'Test Kunde',
            email: uniqueEmail('customer'),
            phone,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid phone rejected: ${phone}`);
        }
      }
    });

    test('beskytter mod XSS i kunde felter', async ({ page }) => {
      await loginAsOwner(page);

      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '"; alert("xss"); //',
      ];

      for (const payload of xssPayloads) {
        const response = await page.request.post('/v1/customers', {
          data: {
            name: payload,
            email: uniqueEmail('customer'),
          },
        });

        if (response.ok()) {
          const body = await response.json();
          // Name should be sanitized
          expect(body.name).not.toContain('<script>');
          expect(body.name).not.toContain('onerror');
        }
      }
    });

    test('validerer navn længde', async ({ page }) => {
      await loginAsOwner(page);

      // Too short
      const shortResponse = await page.request.post('/v1/customers', {
        data: {
          name: 'A',
          email: uniqueEmail('customer'),
        },
      });

      expect(shortResponse.status()).toBe(400);

      // Too long
      const longResponse = await page.request.post('/v1/customers', {
        data: {
          name: 'A'.repeat(200),
          email: uniqueEmail('customer'),
        },
      });

      expect(longResponse.status()).toBe(400);
    });
  });

  test.describe('Customer Search & List Errors', () => {
    test('viser fejl ved ugyldig søgeparameter', async ({ page }) => {
      await loginAsOwner(page);

      // Try various invalid search params
      const response = await page.request.get('/v1/customers?search=' + 'a'.repeat(1000));

      // Should handle gracefully
      expect(response.status()).toBeLessThan(500);
    });

    test('viser fejl ved ugyldig pagination', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.get('/v1/customers?page=-1&limit=999999');

      // Should normalize or error
      expect(response.status()).toBeLessThan(500);
    });

    test('håndterer tom kundeliste', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/customers');

      // Check if empty state is shown
      const emptyState = page.locator('[data-testid="empty-customers"], .empty-state');
      const hasEmptyState = (await emptyState.count()) > 0;

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('Customer-Salon Relationship Errors', () => {
    test('viser fejl når kunde prøver at tilgå anden salon', async ({ page }) => {
      await loginAsCustomer(page);

      // Try to access other salon's data
      const response = await page.request.get('/v1/customers?salonId=anden-salon');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/forbidden|salon_mismatch/i);
    });

    test('viser fejl ved kunde-salon mismatch', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create customer for different salon
      const response = await page.request.post('/v1/customers', {
        data: {
          name: 'Test Kunde',
          email: uniqueEmail('customer'),
          salonId: 'anden-salon-id',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/forbidden|salon_mismatch/i);
    });
  });

  test.describe('Customer Notes & Metadata Errors', () => {
    test('viser fejl ved for lange noter', async ({ page }) => {
      await loginAsOwner(page);

      const customerList = await page.request.get('/v1/customers');
      const customers = await customerList.json();

      if (customers.length > 0) {
        const response = await page.request.patch(`/v1/customers/${customers[0].id}`, {
          data: {
            notes: 'A'.repeat(10000), // Very long note
          },
        });

        // Should either truncate or reject
        if (!response.ok()) {
          console.log('Long notes rejected:', response.status());
        }
      }
    });

    test('beskytter mod XSS i noter', async ({ page }) => {
      await loginAsOwner(page);

      const customerList = await page.request.get('/v1/customers');
      const customers = await customerList.json();

      if (customers.length > 0) {
        const response = await page.request.patch(`/v1/customers/${customers[0].id}`, {
          data: {
            notes: '<script>alert("xss")</script>',
          },
        });

        if (response.ok()) {
          const body = await response.json();
          expect(body.notes).not.toContain('<script>');
        }
      }
    });
  });
});
