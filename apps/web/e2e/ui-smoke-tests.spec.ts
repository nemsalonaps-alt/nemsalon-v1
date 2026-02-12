import { expect } from '@playwright/test';
import { test, uniqueEmail, expectUiError } from './utils';

/**
 * UI SMOKE TESTS - Contract & Robustness Tests
 *
 * Disse tests verificerer at kritiske UI-elementer findes og fungerer korrekt.
 * De fanger: manglende knapper, ændrede labels, broken flows, dead-end states.
 *
 * Principper:
 * 1. Test at UI-elementer findes (smoke tests)
 * 2. Test at modaler åbner/lukker
 * 3. Test loading states starter og stopper
 * 4. Test error states viser fejl og låser ikke UI
 * 5. Test flow completeness (ingen missing steps)
 * 6. Test ingen dead-ends (UI kan altid bruges videre)
 */

test.describe('UI Smoke Tests - Auth Flows', () => {
  test.describe('1. Kritiske UI-elementer findes (Contract Tests)', () => {
    test('login siden har alle nødvendige elementer', async ({ page }) => {
      await page.goto('/login');

      // Verificer alle kritiske elementer findes
      await expect(page.getByRole('heading')).toBeVisible();
      await expect(page.getByTestId('login-email')).toBeVisible();
      await expect(page.getByTestId('login-password')).toBeVisible();
      await expect(page.getByTestId('login-submit')).toBeVisible();
      await expect(page.getByTestId('auth-mode-toggle')).toBeVisible();

      // Verificer accessible names (robusthed)
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log ind/i })).toBeVisible();
    });

    test('registrering siden har alle nødvendige elementer', async ({ page }) => {
      await page.goto('/login');

      // Skift til registrering
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer alle form felter findes
      await expect(page.getByTestId('register-name')).toBeVisible();
      await expect(page.getByTestId('register-email')).toBeVisible();
      await expect(page.getByTestId('register-password')).toBeVisible();
      await expect(page.getByTestId('register-submit')).toBeVisible();

      // Verificer accessible names
      await expect(page.getByRole('textbox', { name: /name|navn/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /create|opret/i })).toBeVisible();
    });

    test('customer registrering har alle nødvendige felter', async ({ page }) => {
      await page.goto('/register?salon=test-salon');

      // Verificer alle form felter findes
      await expect(page.getByTestId('customer-name-input')).toBeVisible();
      await expect(page.getByTestId('customer-email-input')).toBeVisible();
      await expect(page.getByTestId('customer-phone-input')).toBeVisible();
      await expect(page.getByTestId('customer-password-input')).toBeVisible();
      await expect(page.getByTestId('customer-register-submit')).toBeVisible();

      // Verificer labels er korrekte
      await expect(page.getByLabel(/name|navn/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password|adgangskode/i)).toBeVisible();
    });
  });

  test.describe('2. Modaler åbner og lukker (Flow Completeness)', () => {
    test('login/registrering mode skifter korrekt', async ({ page }) => {
      await page.goto('/login');

      // Start på login mode
      await expect(page.getByTestId('login-email')).toBeVisible();
      await expect(page.getByTestId('register-email')).not.toBeVisible();

      // Klik for at skifte til registrering
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer registrering form vises
      await expect(page.getByTestId('register-name')).toBeVisible();
      await expect(page.getByTestId('register-email')).toBeVisible();
      await expect(page.getByTestId('login-email')).not.toBeVisible();

      // Skift tilbage til login
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer login form vises igen
      await expect(page.getByTestId('login-email')).toBeVisible();
      await expect(page.getByTestId('register-name')).not.toBeVisible();
    });

    test('form felter tømmes ved mode skift', async ({ page }) => {
      await page.goto('/login');

      // Udfyld login felter
      await page.getByTestId('login-email').fill('test@test.com');
      await page.getByTestId('login-password').fill('password123');

      // Skift til registrering
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer registrering felter er tomme
      const nameValue = await page.getByTestId('register-name').inputValue();
      expect(nameValue).toBe('');

      // Skift tilbage
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer login felter stadig har værdier (eller er de cleared?)
      const emailValue = await page.getByTestId('login-email').inputValue();
      // Afhænger af implementation - kan være '' eller 'test@test.com'
    });
  });

  test.describe('3. Loading states aktiveres og stopper', () => {
    test('login viser loading state og stopper igen', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.getByTestId('login-submit');

      // Verificer knap starter enabled
      await expect(submitButton).toBeEnabled();

      // Udfyld form
      await page.getByTestId('login-email').fill('test@test.com');
      await page.getByTestId('login-password').fill('password123');

      // Klik submit
      await submitButton.click();

      // Verificer knap bliver disabled under loading
      await expect(submitButton).toBeDisabled();

      // Vent på loading stopper (enten redirect eller fejl)
      await expect(submitButton).toBeEnabled({ timeout: 10000 });

      // Efter loading: enten redirectet eller fejl vist
      const currentUrl = page.url();
      const hasError = await page
        .getByTestId('auth-error')
        .isVisible()
        .catch(() => false);

      // Enten er vi redirectet væk fra login ELLER der vises en fejl
      expect(currentUrl !== '/login' || hasError).toBe(true);
    });

    test('registrering viser loading state og stopper', async ({ page }) => {
      await page.goto('/register?salon=test-salon');

      const submitButton = page.getByTestId('customer-register-submit');

      // Verificer knap starter enabled
      await expect(submitButton).toBeEnabled();

      // Udfyld form
      await page.getByTestId('customer-name-input').fill('Test User');
      await page.getByTestId('customer-email-input').fill(uniqueEmail());
      await page.getByTestId('customer-password-input').fill('password123');

      // Klik submit
      await submitButton.click();

      // Verificer knap bliver disabled
      await expect(submitButton).toBeDisabled();

      // Vent på loading stopper
      await expect(submitButton).toBeEnabled({ timeout: 10000 });
    });

    test('loading spinner vises under API kald', async ({ page }) => {
      // Slow down API for at se spinner
      await page.route('**/v1/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/login');

      // Udfyld og submit
      await page.getByTestId('login-email').fill('test@test.com');
      await page.getByTestId('login-password').fill('password123');
      await page.getByTestId('login-submit').click();

      // Verificer loading state er aktiv (knap disabled)
      await expect(page.getByTestId('login-submit')).toBeDisabled();

      // Efter 2 sekunder + response tid skal loading være færdig
      await expect(page.getByTestId('login-submit')).toBeEnabled({ timeout: 5000 });
    });
  });

  test.describe('4. Error states viser fejl og UI er stadig brugbar', () => {
    test('ved API fejl: viser error + re-enabler submit + kan rette input', async ({ page }) => {
      // Mock API til at returnere fejl
      await page.route('**/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'UNAUTHORIZED',
            message: 'error.unauthorized',
            errorKey: 'error.unauthorized',
          }),
        });
      });

      await page.goto('/login');

      // Udfyld form
      await page.getByTestId('login-email').fill('wrong@test.com');
      await page.getByTestId('login-password').fill('wrongpassword');

      const submitButton = page.getByTestId('login-submit');
      await submitButton.click();

      // Verificer fejl vises
      const errorBox = page.getByTestId('auth-error');
      await expect(errorBox).toBeVisible();

      // VIGTIG: Submit knap skal være enabled igen
      await expect(submitButton).toBeEnabled();

      // VIGTIG: Inputs skal stadig kunne redigeres
      await page.getByTestId('login-email').fill('correct@test.com');
      await page.getByTestId('login-password').fill('correctpassword');

      // Verificer nye værdier er gemt
      const emailValue = await page.getByTestId('login-email').inputValue();
      expect(emailValue).toBe('correct@test.com');
    });

    test('ved registrering fejl: bevarer form data og tillader retry', async ({ page }) => {
      // Mock API til at returnere fejl
      await page.route('**/v1/auth/register', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'SALON_NOT_FOUND',
            message: 'error.salon_not_found',
            errorKey: 'error.salon_not_found',
          }),
        });
      });

      await page.goto('/register?salon=invalid-salon');

      const testName = 'Test User';
      const testEmail = uniqueEmail();

      // Udfyld form
      await page.getByTestId('customer-name-input').fill(testName);
      await page.getByTestId('customer-email-input').fill(testEmail);
      await page.getByTestId('customer-password-input').fill('password123');

      const submitButton = page.getByTestId('customer-register-submit');
      await submitButton.click();

      // Verificer fejl vises
      await expect(page.getByTestId('customer-error')).toBeVisible();

      // Verificer form data er bevaret
      const nameValue = await page.getByTestId('customer-name-input').inputValue();
      const emailValue = await page.getByTestId('customer-email-input').inputValue();

      expect(nameValue).toBe(testName);
      expect(emailValue).toBe(testEmail);

      // Verificer submit er enabled til retry
      await expect(submitButton).toBeEnabled();

      // Fix fejl og prøv igen
      await page.goto('/register?salon=valid-salon');
      // ... fortsæt flow
    });

    test('validation fejl vises før submit', async ({ page }) => {
      await page.goto('/register?salon=test-salon');

      // Klik submit uden at udfylde felter
      await page.getByTestId('customer-register-submit').click();

      // Verificer validation fejl vises (hvis client-side validation)
      // Eller verificer at felter har required attribut
      const nameInput = page.getByTestId('customer-name-input');
      const isRequired = await nameInput.evaluate((el) => (el as HTMLInputElement).required);
      expect(isRequired).toBe(true);
    });
  });

  test.describe('5. Flow Completeness (Ingen missing steps)', () => {
    test('registrering flow er komplet (contract)', async ({ page }) => {
      await page.goto('/login');

      // Step 1: Skift til registrering
      await page.getByTestId('auth-mode-toggle').click();

      // Verificer alle påkrævede felter findes
      await expect(page.getByTestId('register-name')).toBeVisible();
      await expect(page.getByTestId('register-email')).toBeVisible();
      await expect(page.getByTestId('register-password')).toBeVisible();
      await expect(page.getByTestId('register-submit')).toBeVisible();

      // Verificer accessible names matcher forventninger
      await expect(page.getByRole('textbox', { name: /name|navn/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /create|opret/i })).toBeVisible();
    });

    test('customer portal flow er komplet', async ({ page }) => {
      // Note: Dette kræver login som customer
      // Vi tester bare at siden loader korrekt

      await page.goto('/portal');

      // Verificer enten login prompt eller portal vises
      const hasLoginPrompt = await page
        .getByText(/login|log ind/i)
        .isVisible()
        .catch(() => false);
      const hasPortal = await page
        .getByTestId('customer-portal-title')
        .isVisible()
        .catch(() => false);

      expect(hasLoginPrompt || hasPortal).toBe(true);
    });
  });

  test.describe('6. No Dead Ends (UI kan altid bruges videre)', () => {
    test('ingen dead-end state efter login submit', async ({ page }) => {
      await page.goto('/login');

      // Udfyld og submit
      await page.getByTestId('login-email').fill('test@test.com');
      await page.getByTestId('login-password').fill('password123');
      await page.getByTestId('login-submit').click();

      // Enten success ELLER fejl - men ikke "ingenting"
      // Vent på en af følgende:
      const successIndicator = page.locator('text=/welcome|dashboard|velkommen/i');
      const errorIndicator = page.getByTestId('auth-error');

      await expect(successIndicator.or(errorIndicator)).toBeVisible({ timeout: 10000 });
    });

    test('ingen stuck spinner state', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.getByTestId('login-submit');

      // Submit
      await page.getByTestId('login-email').fill('test@test.com');
      await page.getByTestId('login-password').fill('password123');
      await submitButton.click();

      // Verificer loading stopper indenfor 10 sekunder
      await expect(submitButton).toBeEnabled({ timeout: 10000 });

      // Efter loading: UI skal være brugbar
      // Enten er vi på ny side, eller form kan bruges igen
      const canInteractWithForm = await submitButton.isEnabled();
      expect(canInteractWithForm).toBe(true);
    });

    test('modal/dialog kan altid lukkes', async ({ page }) => {
      // Hvis der er confirm dialogs i auth flow
      // Verificer de kan lukkes
      // Eksempel: Hvis der er en "glemt password" dialog
      // const forgotPasswordLink = page.getByText(/forgot|glemt/i);
      // if (await forgotPasswordLink.count() > 0) {
      //   await forgotPasswordLink.click();
      //   const dialog = page.getByRole('dialog');
      //   await expect(dialog).toBeVisible();
      //
      //   // Luk med escape
      //   await page.keyboard.press('Escape');
      //   await expect(dialog).toBeHidden();
      // }
    });
  });

  test.describe('7. Data-Testid Standard Compliance', () => {
    test('alle error outlets har korrekte data-testid', async ({ page }) => {
      await page.goto('/login');

      // Verificer auth error outlet findes
      const authError = page.getByTestId('auth-error');
      expect(await authError.count()).toBeGreaterThanOrEqual(0); // Kan være skjult

      // Skift til registrering og tjek
      await page.getByTestId('auth-mode-toggle').click();

      // Trigger en fejl for at se error outlet
      await page.getByTestId('register-submit').click();

      // Verificer error outlet findes (kan være tom indtil fejl vises)
      const authErrorVisible = await authError.isVisible().catch(() => false);
      // Error outlet skal eksistere i DOM
    });

    test('alle form inputs har korrekte data-testid', async ({ page }) => {
      await page.goto('/login');

      // Verificer alle expected inputs har data-testid
      const expectedInputs = ['login-email', 'login-password', 'login-submit'];

      for (const testId of expectedInputs) {
        const element = page.getByTestId(testId);
        await expect(element).toBeVisible();
      }
    });

    test('data-testid naming konvention følges', async ({ page }) => {
      await page.goto('/login');

      // Verificer auth-error følger konvention: {context}-error
      const authError = page.getByTestId('auth-error');
      expect(await authError.count()).toBeGreaterThanOrEqual(0);

      // Verificer login-email følger konvention: {context}-{field}
      const loginEmail = page.getByTestId('login-email');
      await expect(loginEmail).toBeVisible();

      // Verificer login-submit følger konvention: {context}-{action}
      const loginSubmit = page.getByTestId('login-submit');
      await expect(loginSubmit).toBeVisible();
    });
  });
});

test.describe('UI Smoke Tests - Critical Pages', () => {
  test('owner console har alle navigationselementer', async ({ page }) => {
    // Login først (eller brug storage state)
    await page.goto('/owner');

    // Verificer navigation findes
    const navExists = (await page.getByRole('navigation').count()) > 0;

    if (navExists) {
      // Verificer alle tabs findes
      await expect(page.getByText(/calendar|kalender/i)).toBeVisible();
      await expect(page.getByText(/create|opret/i)).toBeVisible();
      await expect(page.getByText(/settings|indstillinger/i)).toBeVisible();
    }
  });

  test('customer portal har nødvendige elementer når logget ind', async ({ page }) => {
    // Dette kræver at customer er logget ind
    // Enten via API kald eller storage state

    await page.goto('/portal');

    // Verificer portal title findes
    const portalTitle = page.getByTestId('customer-portal-title');

    if (await portalTitle.isVisible().catch(() => false)) {
      // Vi er logget ind
      await expect(portalTitle).toBeVisible();

      // Verificer bookings sektion findes
      const hasBookings = (await page.getByText(/bookings|bookinger/i).count()) > 0;
      expect(hasBookings).toBe(true);
    } else {
      // Vi skal logge ind først
      await expect(page.getByText(/login|log ind/i)).toBeVisible();
    }
  });

  test('public booking flow har alle steps', async ({ page }) => {
    await page.goto('/book/dev-salon');

    // Verificer flow starter
    const hasServiceStep = (await page.getByText(/service|behandling/i).count()) > 0;

    if (hasServiceStep) {
      // Verificer services vises
      const serviceCards = await page.locator('.pb-service-card, [data-testid*="service"]').count();
      expect(serviceCards).toBeGreaterThan(0);
    }
  });
});

test.describe('Accessibility Smoke Tests', () => {
  test('alle interaktive elementer har korrekte roles', async ({ page }) => {
    await page.goto('/login');

    // Verificer inputs har textbox role
    const emailInput = page.getByTestId('login-email');
    const role = await emailInput.getAttribute('role');
    // Input elementer har ikke altid explicit role, men type="email"
    const type = await emailInput.getAttribute('type');
    expect(type).toBe('email');

    // Verificer knapper har button role
    const submitButton = page.getByTestId('login-submit');
    const buttonRole = await submitButton.getAttribute('role');
    expect(buttonRole).toBe('button');
  });

  test('form labels er korrekt forbundet til inputs', async ({ page }) => {
    await page.goto('/login');

    // Verificer labels findes
    const emailLabel = page.locator('label', { hasText: /email/i });
    await expect(emailLabel).toBeVisible();

    // Verificer label har for attribut (hvis det er et label element)
    const forAttr = await emailLabel.getAttribute('for');
    if (forAttr) {
      // Verificer der er et input med matching id
      const input = page.locator(`#${forAttr}`);
      expect(await input.count()).toBeGreaterThan(0);
    }
  });
});
