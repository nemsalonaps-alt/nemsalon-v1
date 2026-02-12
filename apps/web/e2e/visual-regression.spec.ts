import { test, expect } from '@playwright/test';
import {
  loginAsOwner,
  loginAsCustomer,
  loginAsStaff,
  ensurePlatformAdmin,
  getTomorrowDate,
} from './utils';

test.describe('Visual Regression Tests - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe('Public Booking Flow', () => {
    test('public booking step 1 - service selection', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('public-booking-step-1.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('public booking with long service names', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('public-booking-long-names.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Owner Console', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(false);
      await loginAsOwner(page);
    });

    test('owner dashboard', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('owner-dashboard-desktop.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });
    });

    test('owner calendar week view', async ({ page }) => {
      await page.goto('/owner/calendar');
      await page.waitForLoadState('networkidle');

      const tomorrow = getTomorrowDate(1);
      await page.getByTestId('calendar-date-input').fill(tomorrow);
      await page.getByTestId('calendar-view-week').click();

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('owner-calendar-week.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });
    });

    test('owner create booking modal', async ({ page }) => {
      await page.goto('/owner/calendar');
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('navigation')
        .getByRole('button', { name: /^Create$/ })
        .click();

      await expect(page).toHaveScreenshot('owner-create-booking-modal.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });
    });

    test('owner settings page', async ({ page }) => {
      await page.goto('/owner/settings');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('owner-settings.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Staff Console', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStaff(page);
    });

    test('staff day view', async ({ page }) => {
      await page.goto('/staff');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('staff-day-view.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Customer Portal', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsCustomer(page);
    });

    test('customer portal bookings', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('customer-portal-bookings.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Platform Admin', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(true);
    });

    test('platform admin dashboard', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('platform-admin-dashboard.png', {
        fullPage: true,
      });
    });

    test('platform admin salon detail', async ({ page }) => {
      await page.goto('/admin/salons/dev-salon');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('platform-admin-salon-detail.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Error States', () => {
    test('error 404 page', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('error-404.png', {
        fullPage: true,
      });
    });

    test('error 500 page', async ({ page }) => {
      await page.route('**/v1/**', (route) => {
        return route.fulfill({
          status: 500,
          body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
        });
      });

      await loginAsOwner(page);
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('error-500.png', {
        fullPage: true,
      });
    });

    test('loading skeleton state', async ({ page }) => {
      await page.route('**/v1/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        route.continue();
      });

      await loginAsOwner(page);
      await page.goto('/owner');

      await expect(page).toHaveScreenshot('loading-skeleton.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Empty States', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(false);
      await loginAsOwner(page);
    });

    test('empty calendar state', async ({ page }) => {
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
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('empty-calendar.png', {
        fullPage: true,
      });
    });
  });
});

test.describe('Visual Regression Tests - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test.describe('Public Booking Flow - Mobile', () => {
    test('public booking mobile view', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('public-booking-mobile.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Owner Console - Mobile', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(false);
      await loginAsOwner(page);
    });

    test('owner dashboard mobile', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('owner-dashboard-mobile.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });
    });

    test('owner calendar mobile', async ({ page }) => {
      await page.goto('/owner/calendar');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('owner-calendar-mobile.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });
    });

    test('mobile navigation drawer', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('mobile-menu-toggle').click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('mobile-navigation-drawer.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });
    });
  });

  test.describe('Staff Console - Mobile', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStaff(page);
    });

    test('staff mobile view', async ({ page }) => {
      await page.goto('/staff');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('staff-mobile-view.png', {
        fullPage: true,
      });
    });
  });
});

test.describe('Long String Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route('**/v1/public/salons/dev-salon', (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-id',
          name: 'Meget Langt Salonnavn Med Masser Af Ord Og Karakterer Der Kan Bøje UI',
          slug: 'dev-salon',
          status: 'active',
          timezone: 'Europe/Copenhagen',
          locale: 'da-DK',
          currency: 'DKK',
          email: 'meget.langt.email.der.kan.bryde.layout@salonen.example.com',
          phone: '+45 12 34 56 78 90 12 34 56 78 90',
        }),
      });
    });
  });

  test('long salon name layout', async ({ page }) => {
    await page.goto('/book/dev-salon');
    await page.waitForLoadState('networkidle');

    const salonTitle = page.getByTestId('public-booking-title');
    await expect(salonTitle).toBeVisible();

    await expect(page).toHaveScreenshot('long-salon-name.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 400 },
    });
  });

  test('long customer name in booking', async ({ page }) => {
    await ensurePlatformAdmin(false);
    await loginAsOwner(page);

    await page.route('**/v1/**', (route) => {
      if (route.request().url().includes('/bookings')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: [
              {
                id: 'test-booking-1',
                customerName: 'Meget Langt Kundenavn Med Masser Af Ord Og Karakterer',
                serviceName: 'Test Service',
                status: 'confirmed',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
          }),
        });
      }
      route.continue();
    });

    await page.goto('/owner/calendar');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('long-customer-name.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 600 },
    });
  });
});

test.describe('Pseudo-Locale Layout Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('pseudo-locale text wrapping', async ({ page }) => {
    await page.route('**/i18n/da.json', (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          'booking.title': '[!! MEGET LANG TEKST TIL TEST AF WRAPPING !!]',
          'booking.submit': '[!! INDsend KnAP !!]',
          'booking.cancel': '[!! AnNULLER MEget LANG !!]',
        }),
      });
    });

    await page.goto('/book/dev-salon');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('pseudo-locale-layout.png', {
      fullPage: true,
    });
  });
});
