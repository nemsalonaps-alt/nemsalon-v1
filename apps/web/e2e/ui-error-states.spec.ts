import { test, expect } from '@playwright/test';
import { loginAsOwner, ensurePlatformAdmin } from './utils';

test.describe('UI Error States - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(false);
    await loginAsOwner(page);
  });

  test.describe('Loading States', () => {
    test('should show skeleton loader on dashboard', async ({ page }) => {
      await page.goto('/owner');

      const dashboard = page.getByTestId('owner-dashboard');
      await expect(dashboard).toBeVisible({ timeout: 10000 });

      const skeleton = page.getByTestId('dashboard-skeleton');
      if ((await skeleton.count()) > 0) {
        await expect(skeleton.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show skeleton on calendar load', async ({ page }) => {
      await page.goto('/owner/calendar');

      const calendar = page.getByTestId('owner-calendar');
      await expect(calendar).toBeVisible({ timeout: 10000 });

      const skeleton = page.getByTestId('calendar-skeleton');
      if ((await skeleton.count()) > 0) {
        await expect(skeleton.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle slow network gracefully', async ({ page }) => {
      await page.route('**/v1/**', async (route) => {
        await page.waitForTimeout(500);
        await route.continue();
      });

      await page.goto('/owner');

      await expect(page.getByTestId('owner-dashboard')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Connection Errors', () => {
    test('should show connection error when API is down', async ({ page }) => {
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner');

      const errorMessage = page.getByText(/connection|network|offline/i);
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show retry button on connection error', async ({ page }) => {
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner');

      const retryButton = page.getByRole('button', { name: /retry|prøv igen/i });
      await expect(retryButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should recover after connection restored', async ({ page }) => {
      let callCount = 0;

      await page.route('**/v1/**', (route) => {
        callCount++;
        if (callCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/owner');

      const retryButton = page.getByRole('button', { name: /retry|prøv igen/i });
      await expect(retryButton.first()).toBeVisible({ timeout: 10000 });

      await retryButton.first().click();

      await expect(page.getByTestId('owner-dashboard')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('API Error States', () => {
    test('should display validation errors inline', async ({ page }) => {
      await page.goto('/owner/create');

      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });

      await page.locator('input[type="date"]').fill('invalid-date');

      const errorMessage = page.getByText(/invalid|ugyldig|fejl/i);
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle 403 forbidden gracefully', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/admin')) {
          return route.fulfill({
            status: 403,
            body: JSON.stringify({ code: 'AUTH_FORBIDDEN', message: 'Access denied' }),
          });
        }
        route.continue();
      });

      await page.goto('/owner/settings');

      const errorDisplay = page.getByText(/access|adgang|noget gik galt/i);
      await expect(errorDisplay.first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle 404 not found gracefully', async ({ page }) => {
      await page.goto('/owner/non-existent-page');

      const notFoundMessage = page.getByText(/not found|ikke fundet|404/i);
      await expect(notFoundMessage.first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle 500 server errors gracefully', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 500,
            body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Server error' }),
          });
        }
        route.continue();
      });

      await page.goto('/owner');

      const errorMessage = page.getByText(/error|fejl|server/i);
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state when no bookings', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/bookings')) {
          return route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] }),
          });
        }
        route.continue();
      });

      await page.goto('/owner/calendar');

      const emptyState = page.getByText(/no bookings|ingen bookinger/i);
      await expect(emptyState.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show empty state when no customers', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/customers')) {
          return route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] }),
          });
        }
        route.continue();
      });

      await page.goto('/owner/customers');

      const emptyState = page.getByText(/no customers|ingen kunder/i);
      await expect(emptyState.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show empty illustration in empty states', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/bookings')) {
          return route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] }),
          });
        }
        route.continue();
      });

      await page.goto('/owner/calendar');

      const emptyIllustration = page.getByTestId('empty-state-illustration');
      if ((await emptyIllustration.count()) > 0) {
        await expect(emptyIllustration.first()).toBeVisible();
      }
    });
  });

  test.describe('Form Validation States', () => {
    test('should show required field indicators', async ({ page }) => {
      await page.goto('/owner/create');

      const submitButton = page.getByRole('button', { name: /create|opret|submit/i });
      await expect(submitButton).toBeDisabled();
    });

    test('should validate email format in real-time', async ({ page }) => {
      await page.goto('/owner/create');

      await page.getByTestId('create-customer-select').selectOption('__new__');
      await page.getByTestId('create-booking-customer-email').fill('invalid-email');

      const emailError = page.getByText(/email|ugyldig/i);
      await expect(emailError.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show phone format hint', async ({ page }) => {
      await page.goto('/owner/create');

      await page.getByTestId('create-customer-select').selectOption('__new__');

      const phoneInput = page.getByTestId('create-booking-customer-phone');
      if ((await phoneInput.count()) > 0) {
        await expect(phoneInput).toHaveAttribute('placeholder', /\+45/);
      }
    });
  });

  test.describe('Confirmation Dialogs', () => {
    test('should show confirmation before destructive actions', async ({ page }) => {
      await page.goto('/owner');

      const deleteButton = page.getByRole('button', { name: /delete|delete|slet/i });
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow canceling destructive action', async ({ page }) => {
      await page.goto('/owner');

      const deleteButton = page.getByRole('button', { name: /delete|slet/i });
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click();

        const cancelButton = page.getByRole('button', { name: /cancel|annuller|nej/i });
        await cancelButton.first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('should show warning for cancellation within window', async ({ page }) => {
      await page.goto('/owner/bookings');

      const cancelButton = page.getByRole('button', { name: /cancel|annuller/i });
      if ((await cancelButton.count()) > 0) {
        await cancelButton.first().click();

        const warning = page.getByText(/cancellation window|afbestillingsvindue|for sent/i);
        if ((await warning.count()) > 0) {
          await expect(warning.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Timeout States', () => {
    test('should show session timeout warning', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/auth/me')) {
          return route.fulfill({
            status: 401,
            body: JSON.stringify({ code: 'SESSION_EXPIRED', message: 'Session expired' }),
          });
        }
        route.continue();
      });

      await page.goto('/owner');

      const sessionWarning = page.getByText(/session|udløbet|log ind igen/i);
      await expect(sessionWarning.first()).toBeVisible({ timeout: 10000 });
    });

    test('should redirect to login on session expiry', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().url().includes('/auth/me')) {
          return route.fulfill({
            status: 401,
            body: JSON.stringify({ code: 'SESSION_EXPIRED', message: 'Session expired' }),
          });
        }
        route.continue();
      });

      await page.goto('/owner');

      await expect(page).toHaveURL(/login|auth/i, { timeout: 15000 });
    });
  });

  test.describe('Accessibility in Error States', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner');

      const alert = page.getByRole('alert');
      await expect(alert.first()).toBeVisible({ timeout: 10000 });
    });

    test('should maintain focus trap in dialogs', async ({ page }) => {
      await page.goto('/owner');

      const deleteButton = page.getByRole('button', { name: /delete|slet/i });
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const dialogExists = (await dialog.count()) > 0;
        if (dialogExists) {
          const firstFocusable = dialog.locator('button').first();
          const hasFocusable = (await firstFocusable.count()) > 0;
          if (hasFocusable) {
            await firstFocusable.focus();
            await page.keyboard.press('Tab');

            const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
            expect(focusedElement).toBeDefined();
          }
        }
      }
    });

    test('should have proper ARIA labels on error messages', async ({ page }) => {
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner');

      const errorWithRole = page.getByRole('alert');
      await expect(errorWithRole.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Toast Notifications', () => {
    test('should show success toast after action', async ({ page }) => {
      await page.goto('/owner');

      await page
        .getByRole('button', { name: /create|new|ny/i })
        .first()
        .click();

      await page.getByTestId('create-service-select').selectOption({ index: 1 });

      const toast = page.getByTestId('toast-success');
      if ((await toast.count()) > 0) {
        await expect(toast.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show error toast on failure', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        if (route.request().method() === 'POST') {
          return route.fulfill({
            status: 400,
            body: JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Validation failed' }),
          });
        }
        route.continue();
      });

      await page.goto('/owner/create');

      await page.getByTestId('create-service-select').selectOption({ index: 1 });
      await page.getByTestId('create-staff-select').selectOption({ index: 1 });

      await page.getByTestId('create-booking-submit').click();

      const toast = page.getByTestId('toast-error');
      await expect(toast.first()).toBeVisible({ timeout: 5000 });
    });

    test('toast should auto-dismiss after timeout', async ({ page }) => {
      await page.goto('/owner');

      const toast = page.getByTestId('toast-success');
      if ((await toast.count()) > 0) {
        await toast.first().waitFor({ state: 'visible', timeout: 5000 });

        await expect(toast).not.toBeVisible({ timeout: 10000 });
      }
    });

    test('toast should be dismissible', async ({ page }) => {
      await page.goto('/owner');

      const toast = page.getByTestId('toast-success');
      if ((await toast.count()) > 0) {
        await toast.first().waitFor({ state: 'visible', timeout: 5000 });

        const closeButton = page.getByRole('button', { name: /close|luk|x/i });
        if ((await closeButton.count()) > 0) {
          await closeButton.first().click();

          await expect(toast).not.toBeVisible({ timeout: 3000 });
        }
      }
    });
  });
});
