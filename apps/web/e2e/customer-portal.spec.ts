import { test, expect } from '@playwright/test';
import { ensurePlatformAdmin, loginAsCustomer, seedCustomerBookings } from './utils';

test.describe('Customer Portal', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(false);
    await loginAsCustomer(page);
  });

  test('shows portal header and filters', async ({ page }) => {
    await page.goto('/portal');
    await expect(page.getByTestId('customer-portal-title')).toBeVisible();
    await expect(page.getByTestId('portal-filter-upcoming')).toBeVisible();
    await expect(page.getByTestId('portal-filter-past')).toBeVisible();
    await expect(page.getByTestId('portal-filter-cancelled')).toBeVisible();
    await expect(page.getByTestId('portal-filter-all')).toBeVisible();
  });

  test('can cancel and reschedule bookings', async ({ page }) => {
    const { first, second } = await seedCustomerBookings();

    await page.goto('/portal', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('customer-portal-title')).toBeVisible();

    const firstCard = page.locator(`[data-testid="portal-booking-card"][data-booking-id="${first.id}"]`);
    await expect(firstCard).toBeVisible();
    await firstCard.click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('portal-cancel-booking')).toBeVisible();

    await page.getByTestId('portal-cancel-booking').click();
    await page.getByTestId('portal-filter-upcoming').click();
    await expect(
      page.locator(`[data-testid="portal-booking-card"][data-booking-id="${first.id}"]`),
    ).toHaveCount(0);
    await page.getByTestId('portal-filter-cancelled').click();
    await expect(
      page.locator(`[data-testid="portal-booking-card"][data-booking-id="${first.id}"]`),
    ).toBeVisible();

    await page.getByTestId('portal-filter-upcoming').click();
    const secondCard = page.locator(`[data-testid="portal-booking-card"][data-booking-id="${second.id}"]`);
    await expect(secondCard).toBeVisible();
    await secondCard.click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId('portal-reschedule-date')).toBeVisible();

    const currentDate = await page.getByTestId('portal-reschedule-date').inputValue();
    await page.getByTestId('portal-reschedule-date').fill(currentDate);
    await page.getByTestId('portal-reschedule-slot').first().click();
    await expect(page.getByText('Booking flyttet.')).toBeVisible();
  });
});
