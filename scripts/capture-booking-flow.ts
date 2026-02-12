import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

async function captureBookingFlow() {
  const screenshotDir = join(process.cwd(), 'booking-flow-screenshots');
  mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High quality
  });
  const page = await context.newPage();

  try {
    console.log('📸 Taget 1: Login side');
    await page.goto('http://127.0.0.1:5173/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(screenshotDir, '01-login.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 2: Udfylder login form');
    await page.getByTestId('login-email').fill('dev-customer@nemsalon.test');
    await page.getByTestId('login-password').fill('dev123456');
    await page.screenshot({
      path: join(screenshotDir, '02-login-filled.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 3: Efter login - Dashboard');
    await page.getByTestId('login-submit').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotDir, '03-dashboard.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 4: Booking flow - Vælg service');
    // Navigate to public booking
    await page.goto('http://127.0.0.1:5173/book/dev-salon');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotDir, '04-booking-service-selection.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 5: Booking flow - Vælg tid');
    // Select first service if available
    const serviceButtons = page
      .locator('[data-testid^="service-"]')
      .or(page.locator('button:has-text("Haircut")'));
    if ((await serviceButtons.count()) > 0) {
      await serviceButtons.first().click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: join(screenshotDir, '05-booking-time-selection.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 6: Booking flow - Kunde information');
    // Fill customer info
    const nameInput = page.locator('input[type="text"]').or(page.getByTestId('customer-name'));
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Test Kunde');
    }
    const emailInput = page.locator('input[type="email"]').or(page.getByTestId('customer-email'));
    if ((await emailInput.count()) > 0) {
      await emailInput.fill('test@example.com');
    }
    await page.screenshot({
      path: join(screenshotDir, '06-booking-customer-info.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('📸 Taget 7: Bekræftelse');
    // Look for confirmation
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotDir, '07-confirmation.png'),
      fullPage: true,
      type: 'png',
    });

    console.log('\n✅ Screenshots gemt i:', screenshotDir);
    console.log('Filer:');
    console.log('  - 01-login.png');
    console.log('  - 02-login-filled.png');
    console.log('  - 03-dashboard.png');
    console.log('  - 04-booking-service-selection.png');
    console.log('  - 05-booking-time-selection.png');
    console.log('  - 06-booking-customer-info.png');
    console.log('  - 07-confirmation.png');
  } catch (error) {
    console.error('Fejl:', error);
    await page.screenshot({
      path: join(screenshotDir, 'error.png'),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
}

captureBookingFlow();
