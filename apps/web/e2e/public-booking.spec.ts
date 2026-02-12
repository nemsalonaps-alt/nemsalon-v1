import { test, expect } from '@playwright/test';
import { getTomorrowDate } from './utils';

test.describe('Public Booking Flow', () => {
  test('selects service, time, and enables checkout', async ({ page }) => {
    await page.goto('/book/dev-salon');
    await expect(page.getByTestId('public-booking-title')).toBeVisible();

    await page.getByRole('button', { name: /Haircut|Coloring|Styling/ }).first().click();
    await page
      .getByRole('button', { name: /Første ledige|First available/i })
      .first()
      .click();

    let dateToTry = getTomorrowDate(1);
    await page.locator('input[type="date"]').first().fill(dateToTry);

    let slotButton = page.getByRole('button', { name: /\d{2}[:.]\d{2}/ }).first();
    if ((await slotButton.count()) === 0) {
      dateToTry = getTomorrowDate(2);
      await page.locator('input[type="date"]').first().fill(dateToTry);
      slotButton = page.getByRole('button', { name: /\d{2}[:.]\d{2}/ }).first();
    }

    await expect(slotButton).toBeVisible();
    await slotButton.click();

    await page.locator('input[placeholder="Dit fulde navn"]').fill('E2E Public Kunde');
    await page.locator('input[placeholder="din@email.dk"]').fill('public@example.com');
    await page.getByRole('checkbox').first().check();

    const checkoutButton = page.getByRole('button', { name: /Gå til betaling/ });
    await expect(checkoutButton).toBeEnabled();
  });
});
