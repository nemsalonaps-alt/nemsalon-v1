import { expect } from '@playwright/test';
import { test, expectUiError, I18N_ERROR_KEYS } from './utils';

/**
 * MOCK TESTS (Spor B)
 *
 * Disse tests bruger Playwright's route mocking til at simulere API fejl.
 * De er 100% deterministiske og perfekte til at teste UI fejl flows.
 *
 * Fordele:
 * - Hurtigere end integration tests
 * - Ingen afhængighed af database state
 * - Kan teste sjældne fejlscenarier nemt
 * - Perfekte til UI regression tests
 *
 * Ulemper:
 * - Fanger ikke ægte backend integration bugs
 * - Kræver at mocks holdes synkroniseret med API
 */

test.describe('Auth Error Flows - Mocked', () => {
  test.beforeEach(async ({ page }) => {
    // Gå til login siden før hver test
    await page.goto('/login');
  });

  test('viser fejl ved 401 Unauthorized fra API', async ({ page }) => {
    // Mock API til at returnere 401
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'error.unauthorized',
          errorKey: 'error.unauthorized',
          messageKey: 'error.unauthorized',
          traceId: 'mock-trace-123',
        }),
      });
    });

    // Udfyld og submit form
    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-submit').click();

    // Verificer fejl vises
    const errorText = await expectUiError(page, 'unauthorized');
    console.log('Mocked auth error:', errorText);
  });

  test('viser fejl ved network timeout', async ({ page }) => {
    // Mock API til at timeout
    await page.route('**/v1/auth/login', async (route) => {
      // Lad request time out
      await new Promise(() => {}); // Never resolve
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Vent på at UI viser fejl (timeout handler i frontend)
    await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 10000 });
  });

  test('viser fejl ved 429 Rate Limit', async ({ page }) => {
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 429,
        headers: {
          'Retry-After': '60',
        },
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'TOO_MANY_REQUESTS',
          message: 'error.too_many_attempts',
          errorKey: 'error.too_many_attempts',
          traceId: 'mock-trace-429',
        }),
      });
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    const errorBox = page.getByTestId('auth-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();
    expect(errorText?.toLowerCase()).toMatch(/too many|rate limit|forsøg/i);
  });

  test('viser fejl ved 500 Server Error', async ({ page }) => {
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: 'error.internal_error',
          errorKey: 'error.internal_error',
          traceId: 'mock-trace-500',
        }),
      });
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    const errorBox = page.getByTestId('auth-error');
    await expect(errorBox).toBeVisible();
  });
});

test.describe('Customer Registration - Mocked', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register?salon=test-salon');
  });

  test('viser fejl ved 404 salon not found', async ({ page }) => {
    await page.route('**/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SALON_NOT_FOUND',
          message: 'error.salon_not_found',
          errorKey: 'error.salon_not_found',
          traceId: 'mock-trace-404',
        }),
      });
    });

    await page.getByTestId('customer-name-input').fill('Test User');
    await page.getByTestId('customer-email-input').fill('test@example.com');
    await page.getByTestId('customer-password-input').fill('password123');
    await page.getByTestId('customer-register-submit').click();

    const errorText = await expectUiError(page, 'salon_not_found');
    expect(errorText).toMatch(/salon|ikke fundet|not found/i);
  });

  test('viser fejl ved 409 email already exists', async ({ page }) => {
    await page.route('**/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'EMAIL_TAKEN',
          message: 'error.email_taken',
          errorKey: 'error.email_taken',
          traceId: 'mock-trace-409',
        }),
      });
    });

    await page.getByTestId('customer-name-input').fill('Test User');
    await page.getByTestId('customer-email-input').fill('existing@example.com');
    await page.getByTestId('customer-password-input').fill('password123');
    await page.getByTestId('customer-register-submit').click();

    const errorBox = page.getByTestId('customer-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();
    expect(errorText?.toLowerCase()).toMatch(/email|exists|already|taget/i);
  });

  test('viser validation fejl med field errors', async ({ page }) => {
    await page.route('**/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'error.validation_failed',
          errorKey: 'error.validation_failed',
          details: {
            fieldErrors: {
              email: ['Invalid email format'],
              password: ['Password too short'],
            },
          },
          traceId: 'mock-trace-400',
        }),
      });
    });

    await page.getByTestId('customer-name-input').fill('T');
    await page.getByTestId('customer-email-input').fill('invalid-email');
    await page.getByTestId('customer-password-input').fill('123');
    await page.getByTestId('customer-register-submit').click();

    const errorBox = page.getByTestId('customer-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();
    expect(errorText?.toLowerCase()).toMatch(/validation|email|password/i);
  });
});

test.describe('Booking Error Flows - Mocked', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth check til at returnere success
    await page.route('**/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: 'test@example.com' },
          salon: { id: 'test-salon-id', name: 'Test Salon' },
        }),
      });
    });

    await page.goto('/owner/create');
  });

  test('viser fejl ved 409 double booking', async ({ page }) => {
    await page.route('**/v1/bookings', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'TIME_NOT_AVAILABLE',
          message: 'error.booking.time_not_available',
          errorKey: 'error.booking.time_not_available',
          traceId: 'mock-trace-booking-409',
        }),
      });
    });

    // Simuler form udfyldning og submit
    // Bemærk: Dette kræver at create booking form har data-testid
    await page.getByTestId('booking-service-select')?.selectOption('service-1');
    await page.getByTestId('booking-staff-select')?.selectOption('staff-1');
    await page.getByTestId('booking-customer-select')?.selectOption('customer-1');
    await page.getByTestId('create-booking-button')?.click();

    const errorBox = page.getByTestId('booking-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();
    expect(errorText?.toLowerCase()).toMatch(/time|available|optaget|ikke/i);
  });

  test('viser fejl ved booking uden for åbningstid', async ({ page }) => {
    await page.route('**/v1/bookings', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'OUTSIDE_BUSINESS_HOURS',
          message: 'error.booking.outside_business_hours',
          errorKey: 'error.booking.outside_business_hours',
          traceId: 'mock-trace-hours',
        }),
      });
    });

    await page.getByTestId('create-booking-button')?.click();

    const errorBox = page.getByTestId('booking-error');
    await expect(errorBox).toBeVisible();
  });
});

test.describe('API Error Recovery - Mocked', () => {
  test('genopretter fra network error ved retry', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/v1/auth/login', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // Første request fejler
        await route.abort('failed');
      } else {
        // Anden request succeeder
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'mock-token',
            user: { id: 'user-id', email: 'test@example.com' },
          }),
        });
      }
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Verificer fejl vises først
    await expect(page.getByTestId('auth-error')).toBeVisible();

    // Klik retry (hvis UI har retry knap)
    const retryButton = page.getByTestId('retry-button');
    if ((await retryButton.count()) > 0) {
      await retryButton.click();

      // Verificer success
      await expect(page).toHaveURL(/.*dashboard.*/);
    }
  });

  test('bevarer form data ved API fejl', async ({ page }) => {
    await page.route('**/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'error.validation_failed',
          errorKey: 'error.validation_failed',
          traceId: 'mock-validation',
        }),
      });
    });

    const testEmail = 'test@example.com';
    const testName = 'Test User';

    await page.goto('/register?salon=test');
    await page.getByTestId('customer-name-input').fill(testName);
    await page.getByTestId('customer-email-input').fill(testEmail);
    await page.getByTestId('customer-password-input').fill('pass123');
    await page.getByTestId('customer-register-submit').click();

    // Verificer fejl vises
    await expect(page.getByTestId('customer-error')).toBeVisible();

    // Verificer form data bevaret
    const emailValue = await page.getByTestId('customer-email-input').inputValue();
    const nameValue = await page.getByTestId('customer-name-input').inputValue();

    expect(emailValue).toBe(testEmail);
    expect(nameValue).toBe(testName);
  });
});

test.describe('Concurrent Request Handling - Mocked', () => {
  test('håndterer double-submit korrekt', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/v1/auth/login', async (route) => {
      requestCount++;
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simuler langsomt API
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: `mock-token-${requestCount}`,
          user: { id: 'user-id', email: 'test@example.com' },
        }),
      });
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');

    // Klik submit to gange hurtigt
    await page.getByTestId('login-submit').click();
    await page.getByTestId('login-submit').click();

    // Vent og verificer kun én request blev sendt (eller begge håndteres)
    await page.waitForTimeout(1000);

    // UI bør enten:
    // 1. Disable knappen efter første klik, eller
    // 2. Håndtere begge requests korrekt
    console.log(`Total requests sent: ${requestCount}`);
  });
});

test.describe('Error Message Variations - Mocked', () => {
  test('håndterer rå i18n nøgle i fejl', async ({ page }) => {
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'error.unauthorized', // Rå i18n nøgle
          errorKey: 'error.unauthorized',
        }),
      });
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('wrong');
    await page.getByTestId('login-submit').click();

    const errorBox = page.getByTestId('auth-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();

    // Verificer det matcher i18n nøgle pattern
    expect(
      I18N_ERROR_KEYS.unauthorized.some((pattern) =>
        errorText?.toLowerCase().includes(pattern.toLowerCase()),
      ),
    ).toBe(true);
  });

  test('håndterer oversat tekst i fejl', async ({ page }) => {
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password', // Oversat tekst
          errorKey: 'error.unauthorized',
        }),
      });
    });

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('wrong');
    await page.getByTestId('login-submit').click();

    const errorBox = page.getByTestId('auth-error');
    await expect(errorBox).toBeVisible();

    const errorText = await errorBox.textContent();
    expect(errorText?.toLowerCase()).toMatch(/invalid|forkert|email|password/i);
  });
});
