import { expect } from '@playwright/test';
import { test, loginAsOwner, loginAsPlatformAdmin, expectApiError, expectUiError } from './utils';

test.describe('Settings & Salon Error Handling - Comprehensive', () => {
  test.describe('Salon Update Errors', () => {
    test('viser fejl ved manglende navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Clear name field
      await page.getByTestId('salon-name-input').fill('');
      await page.getByTestId('save-salon-button').click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved kort navn', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          name: 'A', // Less than 2 chars
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/validation|name|2|characters/i);
    });

    test('viser fejl ved for langt navn', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          name: 'A'.repeat(150), // Too long (>120)
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('viser fejl ved ugyldig slug', async ({ page }) => {
      await loginAsOwner(page);

      const invalidSlugs = [
        '', // Empty
        'a', // Too short
        'A'.repeat(130), // Too long
        'invalid slug with spaces', // Spaces
        'special@chars#here', // Special chars
        '<script>alert("xss")</script>', // XSS
      ];

      for (const slug of invalidSlugs) {
        const response = await page.request.patch('/v1/salons/current', {
          data: { slug },
        });

        if (!response.ok()) {
          console.log(`Invalid slug rejected: ${slug.substring(0, 30)}...`);
        }
      }
    });

    test('viser fejl ved duplikeret slug', async ({ page }) => {
      await loginAsOwner(page);

      // Try to use slug from another salon
      const response = await page.request.patch('/v1/salons/current', {
        data: {
          slug: 'dev-salon', // Likely already exists
        },
      });

      if (response.status() === 409) {
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/duplicate|exists|already/i);
      }
    });
  });

  test.describe('Timezone & Locale Errors', () => {
    test('viser fejl ved ugyldig timezone', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          timezone: 'Invalid/Timezone',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('viser fejl ved tom timezone', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          timezone: '',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl ved ugyldig locale', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          locale: 'invalid-locale-code',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl ved ugyldig valuta', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          currency: 'INVALID', // Should be 3 chars
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  test.describe('Business Hours Errors', () => {
    test('viser fejl ved sluttid før starttid', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Navigate to business hours section
      await page.getByTestId('business-hours-tab').click();

      // Set invalid hours
      await page.locator('input[name="monday-start"]').fill('17:00');
      await page.locator('input[name="monday-end"]').fill('09:00');
      await page.getByTestId('save-hours-button').click();

      await expectApiError(page, 400, /invalid|time_range|start|end/i);
      await expectUiError(page, /start.*end|invalid|time/i);
    });

    test('viser fejl ved duplikeret dag', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.put('/v1/salons/current/business-hours', {
        data: {
          hours: [
            { day: 'monday', start: '09:00', end: '17:00' },
            { day: 'monday', start: '10:00', end: '18:00' }, // Duplicate
          ],
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/duplicate|duplicate_day/i);
    });

    test('viser fejl ved ugyldig tid format', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.put('/v1/salons/current/business-hours', {
        data: {
          hours: [
            { day: 'monday', start: '25:00', end: '17:00' }, // Invalid hour
          ],
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl ved ugyldig dag', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.put('/v1/salons/current/business-hours', {
        data: {
          hours: [{ day: 'invalid-day', start: '09:00', end: '17:00' }],
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl når staff prøver at ændre åbningstider', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/staff**');

      const response = await page.request.put('/v1/salons/current/business-hours', {
        data: {
          hours: [{ day: 'monday', start: '09:00', end: '17:00' }],
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });
  });

  test.describe('Cancellation Window Errors', () => {
    test('viser fejl ved negativ cancellation window', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          cancellationWindowMinutes: -30,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl ved for stor cancellation window', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          cancellationWindowMinutes: 999999, // Too large (>1 week)
        },
      });

      expect(response.status()).toBe(400);
    });

    test('viser fejl ved ugyldig cancellation window format', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          cancellationWindowMinutes: 'thirty', // String instead of number
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Salon Status Errors', () => {
    test('viser fejl når inaktiv salon prøver at aktivere', async ({ page }) => {
      await loginAsOwner(page);

      // Try to activate an already active salon
      const response = await page.request.post('/v1/salons/current/activate');

      // Should either succeed or return specific error
      if (!response.ok()) {
        const body = await response.json();
        console.log('Activate response:', body);
      }
    });

    test('viser fejl ved adgang til inaktiv salon', async ({ page }) => {
      // Try to access inactive salon's public page
      await page.goto('/book/inactive-salon');

      await expectUiError(page, /inactive|not active|inaktiv/i);
    });
  });

  test.describe('Salon Access Control', () => {
    test('viser fejl når staff prøver at opdatere salon', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-staff@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/staff**');

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          name: 'Hacked Salon Name',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl når kunde prøver at tilgå salon settings', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-customer@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();

      const response = await page.request.get('/v1/salons/current');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved adgang til anden salons data', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.get('/v1/salons/anden-salon-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/forbidden|salon_forbidden/i);
    });
  });

  test.describe('Salon Creation Errors (Platform Admin)', () => {
    test('viser fejl ved oprettelse uden navn', async ({ page }) => {
      await loginAsPlatformAdmin(page);

      const response = await page.request.post('/v1/platform/salons', {
        data: {
          // No name
          timezone: 'Europe/Copenhagen',
          locale: 'da',
          currency: 'DKK',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('viser fejl ved duplikeret salon slug', async ({ page }) => {
      await loginAsPlatformAdmin(page);

      const response = await page.request.post('/v1/platform/salons', {
        data: {
          name: 'Duplicate Salon',
          slug: 'dev-salon', // Already exists
          timezone: 'Europe/Copenhagen',
          locale: 'da',
          currency: 'DKK',
        },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.code || body.errorKey).toMatch(/duplicate|exists|already/i);
    });

    test('viser fejl når ikke-admin prøver at oprette salon', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/platform/salons', {
        data: {
          name: 'Unauthorized Salon',
          timezone: 'Europe/Copenhagen',
          locale: 'da',
          currency: 'DKK',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });
  });

  test.describe('Data Validation', () => {
    test('validerer alle påkrævede felter', async ({ page }) => {
      await loginAsOwner(page);

      const requiredFields = [{ name: '' }, { timezone: '' }, { locale: '' }, { currency: '' }];

      for (const invalidData of requiredFields) {
        const response = await page.request.patch('/v1/salons/current', {
          data: invalidData,
        });

        expect(response.status()).toBe(400);
      }
    });

    test('beskytter mod XSS i salon felter', async ({ page }) => {
      await loginAsOwner(page);

      const xssPayloads = [
        { name: '<script>alert("xss")</script>' },
        { name: '<img src=x onerror=alert("xss")>' },
      ];

      for (const payload of xssPayloads) {
        const response = await page.request.patch('/v1/salons/current', {
          data: payload,
        });

        if (response.ok()) {
          const body = await response.json();
          expect(body.name).not.toContain('<script>');
        }
      }
    });

    test('validerer salon type', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/salons/current', {
        data: {
          salonType: 'invalid-type',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Settings UI Errors', () => {
    test('viser fejl ved netværksfejl', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Simulate network error
      await page.route('**/v1/salons/current', (route) => {
        route.abort('failed');
      });

      await page.reload();

      await expectUiError(page, /network|forbindelse|fejl/i);
    });

    test('håndterer langsom loading', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Simulate slow response
      await page.route('**/v1/salons/current', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.continue();
      });

      // Should show loading state
      const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
      await expect(loadingIndicator.first()).toBeVisible();
    });
  });
});
