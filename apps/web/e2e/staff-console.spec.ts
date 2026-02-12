import { test, expect } from '@playwright/test';
import { ensurePlatformAdmin, toLocalDateTimeInput, loginAsStaff } from './utils';

test.describe('Staff Console', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(false);
    await loginAsStaff(page);
  });

  test('loads staff dashboard', async ({ page }) => {
    await expect(page.getByTestId('staff-greeting')).toBeVisible();
    await expect(page.getByTestId('staff-bookings-today')).toBeVisible();
  });

  test('can add and remove time off', async ({ page }) => {
    await expect(page.getByTestId('staff-greeting')).toBeVisible();

    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const startValue = toLocalDateTimeInput(start);
    const endValue = toLocalDateTimeInput(end);
    const startInput = page.getByTestId('staff-timeoff-start');
    const endInput = page.getByTestId('staff-timeoff-end');

    await startInput.fill(startValue);
    await startInput.blur();

    await endInput.fill(endValue);
    await endInput.blur();
    await page.getByTestId('staff-timeoff-reason').fill('E2E fravær');
    await expect(startInput).toHaveValue(startValue);
    await expect(endInput).toHaveValue(endValue);

    const addButton = page.getByTestId('staff-timeoff-add');
    await addButton.waitFor({ state: 'visible' });
    await expect(addButton).toBeEnabled();
    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/v1/staff/') && req.url().includes('/time-off') && req.method() === 'POST',
      ),
      addButton.click(),
    ]);

    const response = await request.response();
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText('E2E fravær')).toBeVisible();
    await expect(page.getByTestId('staff-timeoff-remove').first()).toBeVisible();
    await expect(page.getByTestId('staff-timeoff-remove').first()).toBeVisible();

    await page.getByTestId('staff-timeoff-remove').first().click();
    await expect(page.getByText(/Remove this block\?|Fjern/)).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Remove|Confirm|Fjern/ }).click();
  });
});
