import { test, expect } from '@playwright/test';
import { ensurePlatformAdmin, staffEmail, loginAsPlatformAdmin } from './utils';

test.describe('Impersonation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(true);
    await loginAsPlatformAdmin(page);
  });

  test.afterEach(async () => {
    await ensurePlatformAdmin(false);
  });

  test('platform admin can impersonate staff and return', async ({ page }) => {
    await page.goto('/platform');
    await expect(page.getByTestId('platform-admin-title')).toBeVisible();

    await page.getByTestId('platform-switch-staff').click();
    await expect(page.getByTestId('impersonation-search')).toBeVisible();

    await page.getByTestId('impersonation-search').fill(staffEmail);
    const staffRow = page.locator(`[data-testid="impersonation-user"][data-email="${staffEmail}"]`);
    await expect(staffRow).toBeVisible();
    await staffRow.getByTestId('impersonation-select').click();

    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Return to Admin' })).toBeVisible();
    await expect(page.getByTestId('staff-bookings-today')).toBeVisible();

    await page.getByRole('button', { name: 'Return to Admin' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('platform-admin-title')).toBeVisible();
  });
});
