import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const screenshotDir = join(process.cwd(), 'all-flows-screenshots');
mkdirSync(screenshotDir, { recursive: true });

let browser: Browser | undefined;
let context: BrowserContext | undefined;

async function setup() {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
}

async function teardown() {
  await browser?.close();
}

type ActionFn = (page: Page) => Promise<void>;

async function capturePage(name: string, url: string, actions?: ActionFn) {
  console.log(`📸 ${name}...`);
  const page = await context!.newPage();
  try {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    if (actions) {
      await actions(page);
    }

    await page.screenshot({
      path: join(screenshotDir, `${name}.png`),
      fullPage: true,
      type: 'png',
    });
    console.log(`   ✅ ${name}.png`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   ⚠️  ${name}: ${errorMessage}`);
    await page.screenshot({
      path: join(screenshotDir, `${name}-error.png`),
      fullPage: true,
      type: 'png',
    });
  } finally {
    await page.close();
  }
}

async function login(email: string, password: string) {
  const page = await context!.newPage();
  await page.goto('http://127.0.0.1:5173/login');
  await page.waitForSelector('[data-testid="login-email"]');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForTimeout(3000);
  return page;
}

async function captureAllFlows() {
  console.log('🎬 Starter optagelse af ALLE flows...\n');

  await setup();

  // ==================== OFFENTLIGE FLOWS ====================
  console.log('\n📍 OFFENTLIGE FLOWS');
  await capturePage('01-public-login', 'http://127.0.0.1:5173/login');
  await capturePage('02-public-login-filled', 'http://127.0.0.1:5173/login', async (page) => {
    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');
  });
  await capturePage('03-public-register', 'http://127.0.0.1:5173/register');
  await capturePage('04-public-booking-service', 'http://127.0.0.1:5173/book/dev-salon');
  await capturePage(
    '05-public-booking-time',
    'http://127.0.0.1:5173/book/dev-salon',
    async (page) => {
      try {
        await page.click('text=Haircut', { timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch {
        // Ignore if element not found
      }
    },
  );

  // ==================== KUNDE PORTAL ====================
  console.log('\n📍 KUNDE PORTAL');
  let customerPage: Page | undefined;
  try {
    customerPage = await login('dev-customer@nemsalon.test', 'dev123456');
    await customerPage.goto('http://127.0.0.1:5173/portal');
    await customerPage.waitForTimeout(3000);
    await customerPage.screenshot({
      path: join(screenshotDir, '06-customer-portal-dashboard.png'),
      fullPage: true,
      type: 'png',
    });
    console.log('   ✅ 06-customer-portal-dashboard.png');

    // ==================== STAFF CONSOLE ====================
    console.log('\n📍 STAFF CONSOLE');
    const staffPage = await login('dev-staff@nemsalon.test', 'dev123456');
    await staffPage.goto('http://127.0.0.1:5173/staff');
    await staffPage.waitForTimeout(3000);
    await staffPage.screenshot({
      path: join(screenshotDir, '07-staff-console.png'),
      fullPage: true,
      type: 'png',
    });
    console.log('   ✅ 07-staff-console.png');

    // ==================== OWNER CONSOLE ====================
    console.log('\n📍 OWNER CONSOLE');
    const ownerPage = await login('dev-owner@nemsalon.test', 'dev123456');
    await ownerPage.goto('http://127.0.0.1:5173/');
    await ownerPage.waitForTimeout(3000);
    await ownerPage.screenshot({
      path: join(screenshotDir, '08-owner-console.png'),
      fullPage: true,
      type: 'png',
    });
    console.log('   ✅ 08-owner-console.png');

    // Capture additional pages
    await capturePage('09-owner-dashboard', 'http://127.0.0.1:5173/');
    await capturePage('10-owner-calendar', 'http://127.0.0.1:5173/?tab=calendar');
    await capturePage('11-owner-customers', 'http://127.0.0.1:5173/?tab=customers');
    await capturePage('12-owner-settings', 'http://127.0.0.1:5173/?tab=settings');

    console.log('\n🎉 Alle flows er optaget!');
    console.log(`📁 Screenshots gemt i: ${screenshotDir}`);
  } catch (error) {
    console.error('Fejl under optagelse:', error);
  } finally {
    await teardown();
  }
}

captureAllFlows().catch(console.error);
