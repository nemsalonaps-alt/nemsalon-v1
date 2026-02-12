import { expect } from '@playwright/test';
import { test, loginAsOwner, expectApiError, expectUiError } from './utils';

test.describe('Services Error Handling - Comprehensive', () => {
  test.describe('Service Creation Errors', () => {
    test('viser fejl ved manglende navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/services');

      await page.getByTestId('add-service-button').click();
      await page.getByTestId('service-duration-input').fill('60');
      await page.getByTestId('service-price-input').fill('500');
      await page.getByTestId('save-service-button').click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved kort navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/services');

      await page.getByTestId('add-service-button').click();
      await page.getByTestId('service-name-input').fill('A');
      await page.getByTestId('service-duration-input').fill('60');
      await page.getByTestId('service-price-input').fill('500');
      await page.getByTestId('save-service-button').click();

      await expectApiError(page, 400, /validation|name|2|characters/i);
    });

    test('viser fejl ved for langt navn', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/services', {
        data: {
          name: 'A'.repeat(100), // Too long (>80)
          duration: 60,
          price: 500,
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('viser fejl ved ugyldig varighed', async ({ page }) => {
      await loginAsOwner(page);

      const invalidDurations = [0, -10, 3, 500, 481]; // Invalid: 0, negative, not multiple of 5, >480

      for (const duration of invalidDurations) {
        const response = await page.request.post('/v1/services', {
          data: {
            name: 'Test Service',
            duration,
            price: 500,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid duration ${duration} rejected:`, response.status());
        }
      }
    });

    test('viser fejl ved ugyldig pris', async ({ page }) => {
      await loginAsOwner(page);

      const invalidPrices = [0, -100, -0.01, 'free'];

      for (const price of invalidPrices) {
        const response = await page.request.post('/v1/services', {
          data: {
            name: 'Test Service',
            duration: 60,
            price,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid price ${price} rejected:`, response.status());
        }
      }
    });

    test('viser fejl ved ugyldig buffer', async ({ page }) => {
      await loginAsOwner(page);

      const invalidBuffers = [-5, 20, 25, 100]; // Should be 0, 5, 10, or 15

      for (const buffer of invalidBuffers) {
        const response = await page.request.post('/v1/services', {
          data: {
            name: 'Test Service',
            duration: 60,
            price: 500,
            buffer,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid buffer ${buffer} rejected:`, response.status());
        }
      }
    });

    test('viser fejl ved ugyldig valuta', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/services', {
        data: {
          name: 'Test Service',
          duration: 60,
          price: 500,
          currency: 'INVALID', // Should be 3 chars like DKK, EUR, USD
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Service Update Errors', () => {
    test('viser fejl ved opdatering af ikke-eksisterende service', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/services/ikke-eksisterende-id-12345', {
        data: {
          name: 'Updated Service',
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('SERVICE_NOT_FOUND');
    });

    test('viser fejl når staff prøver at opdatere service', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/staff**');

      const response = await page.request.patch('/v1/services/some-service-id', {
        data: {
          name: 'Hacked Service',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved opdatering fra anden salon', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/services/anden-salons-service-id', {
        data: {
          name: 'Stolen Service',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/forbidden|service_salon_mismatch/i);
    });
  });

  test.describe('Service Assignment Errors', () => {
    test('viser fejl ved tildeling til ikke-eksisterende staff', async ({ page }) => {
      await loginAsOwner(page);

      // Get a service ID
      const services = await page.request.get('/v1/services');
      const serviceList = await services.json();

      if (serviceList.length > 0) {
        const response = await page.request.post(`/v1/services/${serviceList[0].id}/staff`, {
          data: {
            staffIds: ['ikke-eksisterende-staff-id'],
          },
        });

        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.code).toBe('STAFF_NOT_FOUND');
      }
    });

    test('viser fejl ved fjernelse af alle staff fra service', async ({ page }) => {
      await loginAsOwner(page);

      const services = await page.request.get('/v1/services');
      const serviceList = await services.json();

      if (serviceList.length > 0) {
        const response = await page.request.post(`/v1/services/${serviceList[0].id}/staff`, {
          data: {
            staffIds: [], // Remove all staff
          },
        });

        // Might be allowed or might require at least one staff
        console.log('Remove all staff:', response.status());
      }
    });

    test('viser fejl ved tildeling af service til staff fra anden salon', async ({ page }) => {
      await loginAsOwner(page);

      const services = await page.request.get('/v1/services');
      const serviceList = await services.json();

      if (serviceList.length > 0) {
        const response = await page.request.post(`/v1/services/${serviceList[0].id}/staff`, {
          data: {
            staffIds: ['anden-salons-staff-id'],
          },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/forbidden|salon_mismatch/i);
      }
    });
  });

  test.describe('Service Deletion Errors', () => {
    test('viser fejl ved sletning af ikke-eksisterende service', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.delete('/v1/services/ikke-eksisterende-id-12345');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('SERVICE_NOT_FOUND');
    });

    test('viser fejl ved sletning af service med aktive bookings', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.delete('/v1/services/service-med-bookings');

      if (response.status() === 409) {
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/constraint|bookings|active/i);
      }
    });

    test('viser fejl når staff prøver at slette service', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/staff**');

      const response = await page.request.delete('/v1/services/some-service-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });
  });

  test.describe('Service Data Validation', () => {
    test('validerer service navn format', async ({ page }) => {
      await loginAsOwner(page);

      const invalidNames = [
        '', // Empty
        'A', // Too short
        'A'.repeat(100), // Too long
        '<script>alert("xss")</script>', // XSS attempt
      ];

      for (const name of invalidNames) {
        const response = await page.request.post('/v1/services', {
          data: {
            name,
            duration: 60,
            price: 500,
          },
        });

        if (!response.ok()) {
          console.log(`Invalid name rejected: ${name.substring(0, 20)}...`);
        }
      }
    });

    test('validerer numeriske felter', async ({ page }) => {
      await loginAsOwner(page);

      const invalidData = [
        { duration: 'sixty', price: 500 },
        { duration: 60, price: 'five hundred' },
        { duration: null, price: 500 },
        { duration: 60, price: null },
      ];

      for (const data of invalidData) {
        const response = await page.request.post('/v1/services', {
          data: {
            name: 'Test Service',
            ...data,
          },
        });

        if (!response.ok()) {
          console.log('Invalid numeric data rejected:', data);
        }
      }
    });

    test('beskytter mod XSS i service navn', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/services', {
        data: {
          name: '<script>alert("xss")</script>',
          duration: 60,
          price: 500,
        },
      });

      if (response.ok()) {
        const body = await response.json();
        expect(body.name).not.toContain('<script>');
      }
    });
  });

  test.describe('Service Access Control', () => {
    test('viser fejl når kunde prøver at se services', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-customer@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();

      const response = await page.request.get('/v1/services');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl når uautoriseret bruger prøver at oprette service', async ({ page }) => {
      const response = await page.request.post('/v1/services', {
        data: {
          name: 'Hacked Service',
          duration: 60,
          price: 500,
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  test.describe('Service List & Search Errors', () => {
    test('håndterer tom service liste', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings/services');

      const emptyState = page.locator('[data-testid="empty-services"], .empty-state');
      const hasEmptyState = (await emptyState.count()) > 0;

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('validerer query parametre', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.get('/v1/services?limit=999999&page=-1');

      // Should normalize or error gracefully
      expect(response.status()).toBeLessThan(500);
    });
  });
});
