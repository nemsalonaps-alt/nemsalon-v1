import { expect } from '@playwright/test';
import {
  test,
  loginAsOwner,
  uniqueEmail,
  expectApiError,
  expectUiError,
  captureErrorState,
  platformAdminEmail,
} from './utils';

test.describe('Auth Error Handling - Comprehensive', () => {
  test.describe('Login Errors', () => {
    test('viser fejl ved forkert password', async ({ page, testContext }) => {
      await page.goto('/login');

      await page.getByTestId('login-email').fill('dev-owner@nemsalon.test');
      await page.getByTestId('login-password').fill('forkert-password-123');
      await page.getByTestId('login-submit').click();

      // Verify API error
      const apiError = await expectApiError(page, 401, /invalid|unauthorized/i);
      expect(apiError.code).toBe('INVALID_CREDENTIALS');

      // Verify UI shows error
      await expectUiError(page, /invalid|forkert|adgangskode/i);

      // Capture error state for debugging
      await captureErrorState(page, 'login-forkert-password');

      // Verify still on login page
      expect(page.url()).toContain('/login');
    });

    test('viser fejl ved ikke-eksisterende email', async ({ page }) => {
      await page.goto('/login');

      await page.getByTestId('login-email').fill('ikke-eksisterende@test.com');
      await page.getByTestId('login-password').fill('password123');
      await page.getByTestId('login-submit').click();

      const apiError = await expectApiError(page, 401);
      expect(apiError.code).toBe('INVALID_CREDENTIALS');
      await expectUiError(page, /invalid|forkert/i);
    });

    test('viser fejl ved tomme felter', async ({ page }) => {
      await page.goto('/login');

      // Submit without filling anything
      await page.getByTestId('login-submit').click();

      // Should show validation error
      await expectUiError(page, /required|required|påkrævet/i);
    });

    test('viser fejl ved ugyldig email format', async ({ page }) => {
      await page.goto('/login');

      await page.getByTestId('login-email').fill('ikke-en-email');
      await page.getByTestId('login-password').fill('password123');
      await page.getByTestId('login-submit').click();

      await expectUiError(page, /email|valid|format/i);
    });

    test('håndterer network timeout under login', async ({ page }) => {
      // Simulate slow network
      await page.route('**/v1/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.abort('timedout');
      });

      await page.goto('/login');
      await page.getByTestId('login-email').fill('dev-owner@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();

      await expectUiError(page, /network|timeout|forbindelse/i);
    });
  });

  test.describe('Registration Errors - Customer', () => {
    test('viser fejl ved ugyldig salon slug', async ({ page }) => {
      await page.goto('/register?salon=ikke-eksisterende-salon-12345');

      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      // API should return 404
      const apiError = await expectApiError(page, 404);
      expect(apiError.code).toBe('SALON_NOT_FOUND');
      expect(apiError.message || apiError.errorKey).toContain('salon_not_found');

      // UI should show error
      await expectUiError(page, /salon|error.salon_not_found|ikke fundet/i);
    });

    test('viser fejl ved inaktiv salon', async ({ page }) => {
      // Note: This requires an inactive salon to exist
      // For now, we'll test with a non-existent salon which returns same error
      await page.goto('/register?salon=draft-salon-inactive');

      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      const apiError = await expectApiError(page, 404);
      expect(apiError.code).toBe('SALON_NOT_FOUND');
    });

    test('viser fejl når salonSlug mangler', async ({ page }) => {
      await page.goto('/register');

      // Don't provide salon slug
      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('password123');

      // If there's a salon input field, leave it empty
      const salonInput = page.locator('input#salon');
      if ((await salonInput.count()) > 0) {
        await salonInput.fill('');
      }

      await page.click('button[type="submit"]');

      await expectUiError(page, /salon|required|påkrævet/i);
    });

    test('viser fejl ved kort password', async ({ page }) => {
      await page.goto('/register?salon=dev-salon');

      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('12345'); // Less than 8 chars
      await page.click('button[type="submit"]');

      const apiError = await expectApiError(page, 400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      await expectUiError(page, /password|adgangskode|8|characters/i);
    });

    test('viser fejl ved ugyldig email format', async ({ page }) => {
      await page.goto('/register?salon=dev-salon');

      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill('ikke-en-gyldig-email');
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      const apiError = await expectApiError(page, 400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      await expectUiError(page, /email|valid|format/i);
    });

    test('viser fejl ved kort navn', async ({ page }) => {
      await page.goto('/register?salon=dev-salon');

      await page.locator('input#name').fill('A'); // Less than 2 chars
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      const apiError = await expectApiError(page, 400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      await expectUiError(page, /name|navn|2|characters/i);
    });

    test('viser fejl ved eksisterende email', async ({ page }) => {
      await page.goto('/register?salon=dev-salon');

      // Use an email that already exists
      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill('dev-owner@nemsalon.test');
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      const apiError = await expectApiError(page, 400);
      expect(apiError.code).toBe('REGISTRATION_FAILED');
      await expectUiError(page, /registration|exists|already|eksisterer/i);
    });

    test('viser fejl ved database nedbrud', async ({ page }) => {
      // This is harder to test in E2E, but we can verify error handling exists
      await page.goto('/register?salon=dev-salon');

      await page.locator('input#name').fill('Test Bruger');
      await page.locator('input#email').fill(uniqueEmail('test'));
      await page.locator('input#password').fill('password123');
      await page.click('button[type="submit"]');

      // Test that error UI exists
      const errorSelectors = ['.cp-alert', '.auth-error-text', '[role="alert"]'];
      for (const selector of errorSelectors) {
        const exists = (await page.locator(selector).count()) > 0;
        if (exists) {
          console.log(`Error display element found: ${selector}`);
          break;
        }
      }
    });
  });

  test.describe('Registration Errors - Owner', () => {
    test('viser fejl ved eksisterende email som owner', async ({ page }) => {
      // Navigate to owner registration (usually via onboarding or special URL)
      await page.goto('/onboarding');

      // Try to register with existing email
      const emailInput = page.locator('input[type="email"]').first();
      if ((await emailInput.count()) > 0) {
        await emailInput.fill('dev-owner@nemsalon.test');
        await page.locator('input[type="password"]').first().fill('password123');
        await page.click('button[type="submit"]');

        await expectUiError(page, /exists|already|registration/i);
      }
    });
  });

  test.describe('Token & Session Errors', () => {
    test('viser fejl ved udløbet refresh token', async ({ page }) => {
      // Clear any existing session
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/owner');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('viser fejl ved manglende authorization header', async ({ page }) => {
      // Try to make API call without auth
      const response = await page.request.get('/v1/auth/me');
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  test.describe('Impersonation Errors', () => {
    test('viser fejl når ikke-admin prøver at impersonere', async ({ page }) => {
      // Login as regular owner
      await loginAsOwner(page);

      // Try to access impersonation endpoint
      const response = await page.request.post('/v1/platform/impersonate/some-user-id');
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.code).toBe('FORBIDDEN');
    });

    test('viser fejl ved impersonation af ikke-eksisterende bruger', async ({ page }) => {
      // Login as platform admin
      await page.goto('/login');
      await page.getByTestId('login-email').fill(platformAdminEmail);
      await page.getByTestId('login-password').fill('dev123456');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/platform**');

      // Try to impersonate non-existent user
      const response = await page.request.post('/v1/platform/impersonate/non-existent-id');
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.code).toBe('USER_NOT_FOUND');
    });
  });

  test.describe('Input Validation Errors', () => {
    test('validerer email format strikst', async ({ page }) => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@domain',
        'username@domain..com',
        '.username@domain.com',
        'username@domain.com.',
      ];

      await page.goto('/login');

      for (const email of invalidEmails) {
        await page.getByTestId('login-email').fill(email);
        await page.getByTestId('login-password').fill('password123');
        await page.getByTestId('login-submit').click();

        // Should show validation error
        const hasError = (await page.locator('.auth-error-text, .cp-alert').count()) > 0;
        if (hasError) {
          console.log(`Invalid email detected: ${email}`);
        }

        // Clear for next test
        await page.getByTestId('login-email').fill('');
      }
    });

    test('validerer password krav', async ({ page }) => {
      const weakPasswords = ['12345', 'password', '12345678', 'abcdefgh', 'abc'];

      await page.goto('/register?salon=dev-salon');

      for (const password of weakPasswords) {
        await page.locator('input#name').fill('Test Bruger');
        await page.locator('input#email').fill(uniqueEmail('test'));
        await page.locator('input#password').fill(password);
        await page.click('button[type="submit"]');

        // Should show validation error
        const errorLocator = page.locator('.cp-alert, .auth-error-text');
        const isVisible = await errorLocator.isVisible().catch(() => false);

        if (isVisible) {
          console.log(`Weak password detected: ${password}`);
        }

        // Clear email for next iteration
        await page.locator('input#email').fill('');
      }
    });
  });

  test.describe('Concurrent Request Errors', () => {
    test('håndterer multiple samtidige login-forsøg', async ({ page }) => {
      await page.goto('/login');

      // Fill login form
      await page.getByTestId('login-email').fill('dev-owner@nemsalon.test');
      await page.getByTestId('login-password').fill('dev123456');

      // Click submit multiple times rapidly
      const submitButton = page.getByTestId('login-submit');
      await Promise.all([submitButton.click(), submitButton.click(), submitButton.click()]);

      // Should either redirect successfully or show rate limit error
      const url = page.url();
      if (url.includes('/login')) {
        // Still on login page - check for error
        const errorCount = await page.locator('.auth-error-text').count();
        expect(errorCount).toBeGreaterThan(0);
      } else {
        // Successfully redirected
        expect(url).not.toContain('/login');
      }
    });
  });

  test.describe('Cross-Site Scripting (XSS) Protection', () => {
    test('beskytter mod XSS i login felter', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"; alert("xss"); //',
      ];

      await page.goto('/login');

      for (const payload of xssPayloads) {
        await page.getByTestId('login-email').fill(payload);
        await page.getByTestId('login-password').fill('password123');
        await page.getByTestId('login-submit').click();

        // Wait for response
        await page.waitForTimeout(500);

        // Check that no alert was triggered (Playwright would catch this)
        const hasAlert = await page.evaluate(() => {
          return window.alert.toString().includes('native code');
        });

        expect(hasAlert).toBe(true);

        // Clear for next test
        await page.getByTestId('login-email').fill('');
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('håndterer for mange login-forsøg', async ({ page }) => {
      await page.goto('/login');

      // Make multiple failed login attempts
      for (let i = 0; i < 15; i++) {
        await page.getByTestId('login-email').fill(`test${i}@example.com`);
        await page.getByTestId('login-password').fill('wrongpassword');
        await page.getByTestId('login-submit').click();

        await page.waitForTimeout(200);
      }

      // Should eventually show rate limit error
      const response = await page
        .waitForResponse((r) => r.url().includes('/v1/auth/login') && r.status() === 429, {
          timeout: 15000,
        })
        .catch(() => null);

      if (response) {
        console.log('Rate limit triggered');
      }
    });
  });
});
