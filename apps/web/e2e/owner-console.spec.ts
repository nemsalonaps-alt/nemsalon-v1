import { test, expect } from '@playwright/test';
import {
  ensurePlatformAdmin,
  getTomorrowDate,
  uniqueCustomerEmail,
  loginAsOwner
} from './utils';

test.describe('Owner Console', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(false);
    await loginAsOwner(page);
  });

  test('loads dashboard and navigation', async ({ page }) => {
    await expect(page.getByTestId('owner-salon-title')).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('button', { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Calendar$/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Create$/ })).toBeVisible();
  });

  test('creates booking and shows in week/month views', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await nav.getByRole('button', { name: /^Create$/ }).click();

    await page.getByTestId('create-booking-service').selectOption({ index: 1 });
    await page.getByTestId('create-booking-staff').selectOption({ label: 'Dev Staff' });
    await page.getByTestId('create-booking-customer').selectOption('__new__');

    const customerName = `E2E Kunde ${Date.now()}`;
    await page.getByTestId('create-booking-customer-name').fill(customerName);
    await page.getByTestId('create-booking-customer-email').fill(uniqueCustomerEmail());
    await page.getByTestId('create-booking-customer-phone').fill('+45 12 34 56 78');

    const tomorrow = getTomorrowDate(1);
    await page.getByTestId('create-booking-date').fill(tomorrow);
    await page.getByTestId('create-booking-check-availability').click();
    await page.getByTestId('create-booking-slot').first().click();

    await expect(page.getByText('Booking oprettet. Klar til betaling.')).toBeVisible();
    await page.getByTestId('create-booking-goto-calendar').click();

    await page.getByTestId('calendar-date-input').fill(tomorrow);

    await page.getByTestId('calendar-view-week').click();
    await expect(page.getByText(customerName)).toBeVisible();

    await page.getByTestId('calendar-view-month').click();
    await expect(page.getByText(customerName)).toBeVisible();
  });
});
