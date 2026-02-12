import { test, expect } from '@playwright/test';
import {
  loginAsOwner,
  loginAsCustomer,
  loginAsStaff,
  ensurePlatformAdmin,
  getTomorrowDate,
} from './utils';

test.describe('Comprehensive Error Scenarios - Owner Console', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(false);
  });

  test.describe('Authentication Errors', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill('invalid@example.com');
      await page.getByTestId('login-password').fill('wrongpassword');
      await page.getByTestId('login-submit').click();

      await expect(page.getByText(/invalid|forkert|fejl/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for expired session', async ({ page }) => {
      await page.goto('/owner');

      // Simulate expired session
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired-token');
      });

      await page.reload();

      await expect(page).toHaveURL(/login|auth/i, { timeout: 10000 });
    });

    test('should handle 403 forbidden access', async ({ page }) => {
      await loginAsOwner(page);

      // Try to access admin-only page
      await page.goto('/admin/platform');

      await expect(page.getByText(/access|adgang|forbidden|403/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle token refresh failure', async ({ page }) => {
      await loginAsOwner(page);

      // Mock failed token refresh
      await page.route('**/v1/auth/refresh', (route) =>
        route.fulfill({ status: 401, body: JSON.stringify({ error: 'Token expired' }) }),
      );

      await page.goto('/owner');

      await expect(page.getByText(/session|expired|log ind/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Network Errors', () => {
    test('should show offline indicator', async ({ page }) => {
      await loginAsOwner(page);

      // Simulate offline
      await page.context().setOffline(true);

      await page.goto('/owner/calendar');

      await expect(page.getByText(/offline|forbindelse|network/i).first()).toBeVisible({
        timeout: 10000,
      });

      await page.context().setOffline(false);
    });

    test('should handle timeout errors', async ({ page }) => {
      await loginAsOwner(page);

      await page.route('**/v1/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.abort('timedout');
      });

      await page.goto('/owner');

      await expect(page.getByText(/timeout|langsom|slow/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should handle 502 bad gateway', async ({ page }) => {
      await loginAsOwner(page);

      await page.route('**/v1/**', (route) => route.fulfill({ status: 502, body: 'Bad Gateway' }));

      await page.goto('/owner');

      await expect(page.getByText(/error|fejl|unavailable/i).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('should handle 503 service unavailable', async ({ page }) => {
      await loginAsOwner(page);

      await page.route('**/v1/**', (route) =>
        route.fulfill({ status: 503, body: 'Service Unavailable' }),
      );

      await page.goto('/owner');

      await expect(page.getByText(/maintenance|vedligehold|unavailable/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Booking Creation Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/create');
    });

    test('should show error for missing customer', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/customer|kunde|required|påkrævet/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for missing service', async ({ page }) => {
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/service|ydelse|required|påkrævet/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for missing staff', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/staff|medarbejder|required|påkrævet/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for invalid date format', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      await page.locator('input[type="date"]').fill('invalid-date');
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/date|dato|invalid|ugyldig/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for past date', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await page.locator('input[type="date"]').fill(yesterday.toISOString().split('T')[0]);
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/past|fortid|cannot|kan ikke/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for outside business hours', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });

      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('03:00');

      await page.getByTestId('create-booking-submit').click();

      await expect(
        page.getByText(/business hours|åbningstid|outside|udenfor/i).first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show error for double booking', async ({ page }) => {
      // Create first booking
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('14:00');
      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/created|oprettet|success/i).first()).toBeVisible({
        timeout: 10000,
      });

      // Try to create second booking at same time
      await page.goto('/owner/create');
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 2 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('14:00');
      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/conflict|overlap|optaget|not available/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for staff on time off', async ({ page }) => {
      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate(30));
      await page.locator('input[type="time"]').fill('10:00');

      await page.getByTestId('create-booking-submit').click();

      // May or may not show error depending on time off data
      await expect(page.getByTestId('create-booking-submit')).toBeDisabled({ timeout: 5000 });
    });

    test('should handle API error during creation', async ({ page }) => {
      await page.route('**/v1/bookings', (route) =>
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) }),
      );

      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });
      await page.getByTestId('create-customer-select').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill(getTomorrowDate());
      await page.locator('input[type="time"]').fill('10:00');
      await page.getByTestId('create-booking-submit').click();

      await expect(page.getByText(/error|fejl|try again|prøv igen/i).first()).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Calendar Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/calendar');
    });

    test('should show error for invalid date navigation', async ({ page }) => {
      await page.getByTestId('calendar-date-input').fill('invalid-date');

      await expect(page.getByText(/invalid|ugyldig|date|dato/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle failed booking drag-drop', async ({ page }) => {
      // Try to drag booking to invalid slot
      const booking = page.locator('[data-testid="calendar-booking"]').first();

      if ((await booking.count()) > 0) {
        await booking.dragTo(page.locator('[data-testid="calendar-closed-slot"]').first());

        await expect(page.getByText(/cannot|kan ikke|outside|udenfor/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should show error for failed booking delete', async ({ page }) => {
      await page.route('**/v1/bookings/**', (route) =>
        route.fulfill({ status: 403, body: JSON.stringify({ error: 'Cannot delete' }) }),
      );

      const booking = page.locator('[data-testid="calendar-booking"]').first();

      if ((await booking.count()) > 0) {
        await booking.click({ button: 'right' });
        await page
          .getByText(/delete|slet/i)
          .first()
          .click();
        await page
          .getByRole('button', { name: /confirm|bekræft/i })
          .first()
          .click();

        await expect(page.getByText(/error|fejl|cannot|kan ikke/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should handle calendar data load failure', async ({ page }) => {
      await page.route('**/v1/content/calendar**', (route) =>
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Failed to load' }) }),
      );

      await page.reload();

      await expect(page.getByText(/error|fejl|load|indlæs/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Customer Management Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/customers');
    });

    test('should show error for invalid customer email', async ({ page }) => {
      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name').fill('Test Customer');
      await page.getByTestId('customer-email').fill('invalid-email');
      await page.getByTestId('save-customer').click();

      await expect(page.getByText(/email|invalid|ugyldig/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for duplicate customer email', async ({ page }) => {
      await page.getByTestId('add-customer-button').click();
      await page.getByTestId('customer-name').fill('Test Customer');
      await page.getByTestId('customer-email').fill('existing@example.com');
      await page.getByTestId('customer-phone').fill('12345678');

      await page.route('**/v1/customers', (route) =>
        route.fulfill({ status: 409, body: JSON.stringify({ error: 'Email exists' }) }),
      );

      await page.getByTestId('save-customer').click();

      await expect(page.getByText(/exists|findes|duplicate/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle customer delete with bookings', async ({ page }) => {
      const customerRow = page.locator('[data-testid="customer-row"]').first();

      if ((await customerRow.count()) > 0) {
        await customerRow.locator('[data-testid="delete-customer"]').click();

        await page.route('**/v1/customers/**', (route) =>
          route.fulfill({
            status: 409,
            body: JSON.stringify({ error: 'Customer has bookings' }),
          }),
        );

        await page
          .getByRole('button', { name: /confirm|bekræft/i })
          .first()
          .click();

        await expect(page.getByText(/bookings|bookinger|cannot|kan ikke/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  test.describe('Settings Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');
    });

    test('should show error for invalid business hours', async ({ page }) => {
      await page.getByTestId('business-hours-mon-start').fill('18:00');
      await page.getByTestId('business-hours-mon-end').fill('09:00');
      await page.getByTestId('save-settings').click();

      await expect(page.getByText(/invalid|ugyldig|end time|slut tid/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for invalid timezone', async ({ page }) => {
      await page.getByTestId('timezone-select').selectOption('Invalid/Timezone');
      await page.getByTestId('save-settings').click();

      await expect(page.getByText(/timezone|tidszone|invalid|ugyldig/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle stripe connect failure', async ({ page }) => {
      await page.getByTestId('connect-stripe-button').click();

      await page.route('**/v1/payments/connect', (route) =>
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Connect failed' }) }),
      );

      await expect(page.getByText(/error|fejl|connect|stripe/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Staff Management Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/staff');
    });

    test('should show error for invalid staff email', async ({ page }) => {
      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-name').fill('Test Staff');
      await page.getByTestId('staff-email').fill('invalid-email');
      await page.getByTestId('save-staff').click();

      await expect(page.getByText(/email|invalid|ugyldig/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for duplicate staff email', async ({ page }) => {
      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-name').fill('Test Staff');
      await page.getByTestId('staff-email').fill('existing-staff@example.com');

      await page.route('**/v1/staff', (route) =>
        route.fulfill({ status: 409, body: JSON.stringify({ error: 'Email exists' }) }),
      );

      await page.getByTestId('save-staff').click();

      await expect(page.getByText(/exists|findes|duplicate/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle staff delete with future bookings', async ({ page }) => {
      const staffRow = page.locator('[data-testid="staff-row"]').first();

      if ((await staffRow.count()) > 0) {
        await staffRow.locator('[data-testid="delete-staff"]').click();

        await page.route('**/v1/staff/**', (route) =>
          route.fulfill({
            status: 409,
            body: JSON.stringify({ error: 'Staff has future bookings' }),
          }),
        );

        await page
          .getByRole('button', { name: /confirm|bekræft/i })
          .first()
          .click();

        await expect(page.getByText(/bookings|bookinger|cannot|kan ikke/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  test.describe('Service Management Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/services');
    });

    test('should show error for invalid service price', async ({ page }) => {
      await page.getByTestId('add-service-button').click();
      await page.getByTestId('service-name').fill('Test Service');
      await page.getByTestId('service-price').fill('-100');
      await page.getByTestId('save-service').click();

      await expect(page.getByText(/price|pris|invalid|ugyldig|negative/i).first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show error for zero duration', async ({ page }) => {
      await page.getByTestId('add-service-button').click();
      await page.getByTestId('service-name').fill('Test Service');
      await page.getByTestId('service-duration').fill('0');
      await page.getByTestId('save-service').click();

      await expect(
        page.getByText(/duration|varighed|invalid|ugyldig|zero|nul/i).first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should handle service delete with active bookings', async ({ page }) => {
      const serviceRow = page.locator('[data-testid="service-row"]').first();

      if ((await serviceRow.count()) > 0) {
        await serviceRow.locator('[data-testid="delete-service"]').click();

        await page.route('**/v1/services/**', (route) =>
          route.fulfill({
            status: 409,
            body: JSON.stringify({ error: 'Service has bookings' }),
          }),
        );

        await page
          .getByRole('button', { name: /confirm|bekræft/i })
          .first()
          .click();

        await expect(page.getByText(/bookings|bookinger|cannot|kan ikke/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });
});
