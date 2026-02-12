import { expect, type Page, test as baseTest, type APIResponse } from '@playwright/test';
import { toLocalDateInputValue } from '../src/lib/dates';
import {
  createCustomerBooking,
  createStaffTimeOffEntry,
  setPlatformAdmin,
} from './support/supabase';

export const ownerEmail = process.env.DEV_OWNER_EMAIL ?? 'dev-owner@nemsalon.test';
export const ownerPassword = process.env.DEV_OWNER_PASSWORD ?? 'dev123456';
export const staffEmail = process.env.DEV_STAFF_EMAIL ?? 'dev-staff@nemsalon.test';
export const staffPassword = process.env.DEV_STAFF_PASSWORD ?? 'dev123456';
export const customerEmail = process.env.DEV_CUSTOMER_EMAIL ?? 'dev-customer@nemsalon.test';
export const customerPassword = process.env.DEV_CUSTOMER_PASSWORD ?? 'dev123456';
export const platformAdminEmail =
  process.env.DEV_PLATFORM_ADMIN_EMAIL ?? 'dev-platform-admin@nemsalon.test';
export const platformAdminPassword = process.env.DEV_PLATFORM_ADMIN_PASSWORD ?? 'dev123456';
const platformAdminId = process.env.DEV_PLATFORM_ADMIN_ID ?? '00000000-0000-0000-0000-000000000010';

function getSupabaseStorageKey() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  try {
    const hostname = new URL(url).hostname;
    const ref = hostname.split('.')[0] ?? 'supabase';
    return `sb-${ref}-auth-token`;
  } catch {
    return 'supabase.auth.token';
  }
}

export function getTomorrowDate(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return toLocalDateInputValue(d);
}

function dateAt(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function nextWeekdayDate(daysFromNow: number, hour: number, minute = 0) {
  const d = dateAt(daysFromNow, hour, minute);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForFunction(() => window.location.pathname !== '/login');
  const storageKey = getSupabaseStorageKey();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), storageKey);
}

export async function loginAsOwner(page: Page) {
  await login(page, ownerEmail, ownerPassword);
  await expect(page.getByTestId('owner-salon-title')).toBeVisible();
}

export async function loginAsStaff(page: Page) {
  await login(page, staffEmail, staffPassword);
  await expect(page.getByTestId('staff-greeting')).toBeVisible();
}

export async function loginAsCustomer(page: Page) {
  await login(page, customerEmail, customerPassword);
  await page.goto('/portal');
  await expect(page.getByTestId('customer-portal-title')).toBeVisible();
}

export async function ensurePlatformAdmin(active: boolean) {
  await setPlatformAdmin(platformAdminId, platformAdminEmail, active);
}

export async function loginAsPlatformAdmin(page: Page) {
  await login(page, platformAdminEmail, platformAdminPassword);
  await page.goto('/platform');
  await expect(page.getByTestId('platform-admin-title')).toBeVisible();
}

export function uniqueCustomerEmail(prefix = 'e2e') {
  const stamp = Date.now();
  return `${prefix}+${stamp}@example.com`;
}

export function uniqueEmail(prefix = 'test') {
  const stamp = Date.now();
  return `${prefix}+${stamp}@example.com`;
}

export function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export async function seedCustomerBookings() {
  const first = await createCustomerBooking({
    customerEmail,
    startTime: nextWeekdayDate(3, 11, 0),
    status: 'confirmed',
  });
  const second = await createCustomerBooking({
    customerEmail,
    startTime: nextWeekdayDate(4, 12, 0),
    status: 'confirmed',
  });
  return { first, second };
}

export async function seedStaffTimeOff() {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return createStaffTimeOffEntry({ startTime: start, endTime: end, reason: 'E2E fravær' });
}

// ============================================================================
// STABILT ERROR OUTLET - Data-testid baseret
// ============================================================================

/**
 * Error outlet locators - disse SKAL eksistere i UI når der er fejl
 * Brug data-testid="auth-error", data-testid="booking-error", etc.
 */
export const ERROR_OUTLETS = {
  auth: '[data-testid="auth-error"]',
  booking: '[data-testid="booking-error"]',
  customer: '[data-testid="customer-error"]',
  staff: '[data-testid="staff-error"]',
  service: '[data-testid="service-error"]',
  settings: '[data-testid="settings-error"]',
  general: '[data-testid="error-message"], [data-testid="form-error"], [data-testid="api-error"]',
};

/**
 * i18n nøgler der kan vises i UI (før frontend fix)
 */
export const I18N_ERROR_KEYS = {
  salon_not_found: ['error.salon_not_found', 'salon not found', 'ikke fundet'],
  registration_failed: ['error.registration_failed', 'registration failed', 'registrering fejlede'],
  validation_failed: ['error.validation_failed', 'validation failed', 'validering fejlede'],
  unauthorized: ['error.unauthorized', 'unauthorized', 'ikke autoriseret'],
  forbidden: ['error.auth.forbidden', 'forbidden', 'adgang nægtet'],
  not_found: ['error.not_found', 'not found', 'ikke fundet'],
  conflict: ['error.conflict', 'conflict', 'konflikt'],
  time_not_available: [
    'error.booking.time_not_available',
    'time not available',
    'tid ikke tilgængelig',
  ],
  outside_hours: [
    'error.booking.outside_business_hours',
    'outside business hours',
    'uden for åbningstid',
  ],
};

/**
 * Matcher error tekst mod i18n nøgle, oversat tekst eller fallback
 */
export function matchesErrorKey(text: string, errorType: keyof typeof I18N_ERROR_KEYS): boolean {
  const patterns = I18N_ERROR_KEYS[errorType];
  return patterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()));
}

// ============================================================================
// FORBEDRET ERROR ASSERTION - Både UI og API
// ============================================================================

export interface ApiErrorResponse {
  code: string;
  message: string;
  errorKey: string;
  messageKey: string;
  traceId: string;
  details?: Record<string, unknown>;
}

/**
 * Forventer API fejl - logger responsen for debugging
 */
export async function expectApiError(
  page: Page,
  expectedStatusCode: number,
  expectedErrorPattern?: string | RegExp | string[],
): Promise<ApiErrorResponse> {
  const response = await page.waitForResponse(
    (response) => !response.ok() && response.status() === expectedStatusCode,
    { timeout: 10000 },
  );

  let body: ApiErrorResponse;
  try {
    body = (await response.json()) as ApiErrorResponse;

    // Log til debugging
    console.log(`[API Error] ${response.url()}:`, {
      status: response.status(),
      code: body.code,
      message: body.message,
      errorKey: body.errorKey,
      traceId: body.traceId,
    });
  } catch {
    throw new Error(`Failed to parse error response. Status: ${response.status()}`);
  }

  if (expectedErrorPattern) {
    const errorText = body.message || body.errorKey || body.code || '';

    if (Array.isArray(expectedErrorPattern)) {
      // Matcher mod flere mulige patterns (i18n nøgle ELLER oversat tekst)
      const matches = expectedErrorPattern.some((pattern) =>
        errorText.toLowerCase().includes(pattern.toLowerCase()),
      );
      expect(matches).toBe(true);
    } else if (typeof expectedErrorPattern === 'string') {
      expect(errorText.toLowerCase()).toContain(expectedErrorPattern.toLowerCase());
    } else {
      expect(errorText).toMatch(expectedErrorPattern);
    }
  }

  return body;
}

/**
 * Forventer UI fejl - bruger stabile data-testid locators
 * Matcher mod både i18n nøgle OG oversat tekst
 */
export async function expectUiError(
  page: Page,
  errorTypeOrPattern?: keyof typeof I18N_ERROR_KEYS | string | RegExp,
  timeout = 5000,
): Promise<string> {
  // Prøv alle error outlets
  const allOutlets = Object.values(ERROR_OUTLETS).join(', ');
  const errorLocator = page.locator(allOutlets).first();

  try {
    await expect(errorLocator).toBeVisible({ timeout });
    const text = (await errorLocator.textContent()) || '';

    // Log fejlen
    console.log(`[UI Error] ${text}`);

    if (errorTypeOrPattern) {
      if (typeof errorTypeOrPattern === 'string' && errorTypeOrPattern in I18N_ERROR_KEYS) {
        // Matcher mod i18n nøgle
        const matches = matchesErrorKey(text, errorTypeOrPattern as keyof typeof I18N_ERROR_KEYS);
        expect(matches).toBe(true);
      } else if (typeof errorTypeOrPattern === 'string') {
        // Matcher mod specifik tekst
        expect(text.toLowerCase()).toContain(errorTypeOrPattern.toLowerCase());
      } else {
        // Matcher mod regex
        expect(text).toMatch(errorTypeOrPattern);
      }
    }

    return text;
  } catch (e) {
    // Hvis ingen error outlet findes, tag screenshot og throw
    await page.screenshot({ path: `test-results/no-error-found-${Date.now()}.png` });
    throw new Error(`Ingen fejl outlet fundet. Prøvede: ${allOutlets}`);
  }
}

/**
 * Venter på enten API eller UI fejl
 */
export async function waitForAnyError(
  page: Page,
  timeout = 10000,
): Promise<{ type: 'api' | 'ui'; message: string; details?: ApiErrorResponse }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for API error
    try {
      const apiResponse = await page.waitForResponse((r) => !r.ok() && r.url().includes('/v1/'), {
        timeout: 1000,
      });

      const body = await apiResponse.json().catch(() => null);
      if (body) {
        console.log(`[API Error Detected] ${apiResponse.status()}:`, body.message || body.errorKey);
        return {
          type: 'api',
          message: body.message || body.errorKey || body.code || 'Unknown API error',
          details: body,
        };
      }
    } catch {
      // No API error yet
    }

    // Check for UI error
    const errorLocator = page.locator(Object.values(ERROR_OUTLETS).join(', ')).first();
    const isVisible = await errorLocator.isVisible().catch(() => false);
    if (isVisible) {
      const text = (await errorLocator.textContent()) || '';
      console.log(`[UI Error Detected]: ${text}`);
      return { type: 'ui', message: text };
    }

    await page.waitForTimeout(100);
  }

  throw new Error(`Ingen fejl fundet indenfor ${timeout}ms`);
}

// ============================================================================
// AVANCERET DEBUGGING - Fanger alt ved fejl
// ============================================================================

export interface DebugInfo {
  consoleLogs: Array<{ type: string; text: string; location?: string }>;
  apiLogs: Array<{
    url: string;
    status: number;
    requestBody?: unknown;
    responseBody?: unknown;
  }>;
  screenshot?: string;
  htmlSnapshot?: string;
  timestamp: string;
}

/**
 * Attacher debugging info til test - kaldes ved test start
 */
export function attachApiDebug(page: Page) {
  const apiLogs: DebugInfo['apiLogs'] = [];
  const consoleLogs: DebugInfo['consoleLogs'] = [];

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/v1/')) return;

    let body: unknown = null;
    if (!res.ok()) {
      try {
        body = await res.json();
      } catch {
        // Ignore JSON parse errors
      }
    }

    apiLogs.push({
      url,
      status: res.status(),
      responseBody: body,
    });
  });

  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  return {
    getLogs: () => ({ apiLogs, consoleLogs }),
    getApiLogs: () => apiLogs,
    getConsoleLogs: () => consoleLogs,
  };
}

/**
 * Fanger fuld debug info ved test failure
 */
export async function captureFullDebugInfo(page: Page, testName: string): Promise<DebugInfo> {
  const timestamp = new Date().toISOString();

  // Screenshot
  const screenshotPath = `test-results/debug/${testName}-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // HTML snapshot
  const htmlSnapshot = await page.content();

  // Console logs
  const consoleLogs: DebugInfo['consoleLogs'] = [];
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  return {
    consoleLogs,
    apiLogs: [], // Bliver fyldt af attachApiDebug
    screenshot: screenshotPath,
    htmlSnapshot: htmlSnapshot.substring(0, 50000), // Begræns størrelse
    timestamp,
  };
}

// Alias for bagudkompatibilitet
export const captureErrorState = captureFullDebugInfo;

// ============================================================================
// TEST FIXTURE MED AUTO DEBUGGING
// ============================================================================

export interface TestContext {
  debug: ReturnType<typeof attachApiDebug> | null;
  capturedErrors: Array<{ type: 'api' | 'ui'; message: string; timestamp: string }>;
  apiCalls: Array<{
    url: string;
    method: string;
    status: number;
    requestBody?: unknown;
    responseBody?: unknown;
  }>;
  consoleMessages: Array<{ type: string; text: string }>;
}

export const test = baseTest.extend<{
  testContext: TestContext;
}>({
  // eslint-disable-next-line no-empty-pattern
  testContext: async ({}, use) => {
    const context: TestContext = {
      debug: null,
      capturedErrors: [],
      apiCalls: [],
      consoleMessages: [],
    };
    await use(context);
  },

  page: async ({ page, testContext }, use) => {
    // Setup debugging
    testContext.debug = attachApiDebug(page);

    // Auto-capture all API calls
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('/v1/')) return;

      const request = response.request();
      let body: unknown = null;

      if (!response.ok()) {
        try {
          body = await response.json();
          testContext.capturedErrors.push({
            type: 'api',
            message:
              (body as ApiErrorResponse).message ||
              (body as ApiErrorResponse).errorKey ||
              'Unknown error',
            timestamp: new Date().toISOString(),
          });
        } catch {
          testContext.capturedErrors.push({
            type: 'api',
            message: `HTTP ${response.status()}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      testContext.apiCalls.push({
        url,
        method: request.method(),
        status: response.status(),
        responseBody: body,
      });
    });

    // Auto-capture all console messages
    page.on('console', (msg) => {
      testContext.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });

      if (msg.type() === 'error') {
        testContext.capturedErrors.push({
          type: 'ui',
          message: msg.text(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    page.on('pageerror', (error) => {
      testContext.capturedErrors.push({
        type: 'ui',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    });

    await use(page);

    // Ved test slut: log captured errors
    if (testContext.capturedErrors.length > 0) {
      console.log('[Test Summary] Captured errors:', testContext.capturedErrors);
    }
  },
});

// ============================================================================
// API HELPERS - Med automatisk fejl logging
// ============================================================================

export async function createBookingViaApi(
  page: Page,
  bookingData: {
    customerId?: string;
    staffId?: string;
    serviceId?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  },
): Promise<{ id: string; [key: string]: unknown }> {
  const response = await page.request.post('/v1/bookings', {
    data: bookingData,
  });

  if (!response.ok()) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('[API Error] createBooking:', error);
    throw new Error(`Failed to create booking: ${error.message || error.errorKey}`);
  }

  return await response.json();
}

export async function createCustomerViaApi(
  page: Page,
  customerData: {
    name: string;
    email?: string;
    phone?: string;
  },
): Promise<{ id: string; [key: string]: unknown }> {
  const response = await page.request.post('/v1/customers', {
    data: customerData,
  });

  if (!response.ok()) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('[API Error] createCustomer:', error);
    throw new Error(`Failed to create customer: ${error.message || error.errorKey}`);
  }

  return await response.json();
}

// ============================================================================
// FORM HELPERS
// ============================================================================

export async function fillFormField(page: Page, testId: string, value: string): Promise<void> {
  const field = page.getByTestId(testId);
  await field.fill(value);
}

export async function submitForm(page: Page, testId = 'submit-button'): Promise<void> {
  await page.getByTestId(testId).click();
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

export async function navigateToOwnerConsole(page: Page): Promise<void> {
  await page.goto('/owner');
  await expect(page.getByTestId('owner-salon-title')).toBeVisible();
}

export async function navigateToCustomerPortal(page: Page): Promise<void> {
  await page.goto('/portal');
  await expect(page.getByTestId('customer-portal-title')).toBeVisible();
}
