import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  loginAsOwner,
  loginAsCustomer,
  loginAsStaff,
  ensurePlatformAdmin,
  getTomorrowDate,
} from './utils';

test.describe('Accessibility Tests with Axe', () => {
  test.describe('Public Booking Flow', () => {
    test('public booking landing page should be accessible', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('public booking flow steps should be accessible', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /Haircut|Coloring|Styling/ })
        .first()
        .click();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('booking confirmation page should be accessible', async ({ page }) => {
      await page.goto('/booking/test-booking-id?token=test-token');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('Owner Console', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(false);
      await loginAsOwner(page);
    });

    test('owner dashboard should be accessible', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });

    test('owner calendar should be accessible', async ({ page }) => {
      await page.goto('/owner/calendar');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.calendar-grid-event')
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });

    test('create booking modal should be accessible', async ({ page }) => {
      await page.goto('/owner/calendar');
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('navigation')
        .getByRole('button', { name: /^Create$/ })
        .click();
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });

    test('settings page should be accessible', async ({ page }) => {
      await page.goto('/owner/settings');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });

    test('navigation should have proper focus management', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      const firstNavItem = page.getByRole('navigation').getByRole('button').first();
      await firstNavItem.focus();

      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        return (
          document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName
        );
      });

      expect(focusedElement).toBeDefined();
    });

    test('forms should have proper labels', async ({ page }) => {
      await page.goto('/owner/create');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .withRules(['label'])
        .analyze();

      const labelViolations = accessibilityScanResults.violations.filter((v) => v.id === 'label');
      expect(labelViolations).toEqual([]);
    });
  });

  test.describe('Customer Portal', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsCustomer(page);
    });

    test('customer portal should be accessible', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });

    test('booking details should be accessible', async ({ page }) => {
      await page.goto('/portal/bookings');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('Staff Console', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStaff(page);
    });

    test('staff day view should be accessible', async ({ page }) => {
      await page.goto('/staff');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });

    test('staff status buttons should have proper aria labels', async ({ page }) => {
      await page.goto('/staff');
      await page.waitForLoadState('networkidle');

      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
        const buttonText = await buttons.nth(i).textContent();
        expect(ariaLabel || buttonText).toBeTruthy();
      }
    });
  });

  test.describe('Platform Admin', () => {
    test.beforeEach(async ({ page }) => {
      await ensurePlatformAdmin(true);
    });

    test('admin dashboard should be accessible', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });
  });

  test.describe('Error Pages', () => {
    test('404 page should be accessible', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });

    test('error state should be accessible', async ({ page }) => {
      await page.route('**/v1/**', (route) => route.abort('failed'));

      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical',
      );
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    test('mobile booking flow should be accessible', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalAndSerious).toEqual([]);
    });

    test('touch targets should be large enough', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      const buttons = await page.locator('button').all();

      for (const button of buttons.slice(0, 10)) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA contrast requirements', async ({ page }) => {
      await page.goto('/book/dev-salon');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast',
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('all interactive elements should be keyboard accessible', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await ensurePlatformAdmin(false);
      await loginAsOwner(page);

      const focusableElements = await page
        .locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        .all();
      const keyboardAccessibleCount = focusableElements.length;

      expect(keyboardAccessibleCount).toBeGreaterThan(0);

      const firstElement = focusableElements[0];
      await firstElement.focus();

      let tabPresses = 0;
      const maxTabs = 20;

      while (tabPresses < maxTabs) {
        const activeBefore = await page.evaluate(() => document.activeElement?.tagName);
        await page.keyboard.press('Tab');
        const activeAfter = await page.evaluate(() => document.activeElement?.tagName);

        if (activeBefore === activeAfter) {
          break;
        }

        tabPresses++;
      }

      expect(tabPresses).toBeGreaterThan(0);
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('images should have alt text', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await ensurePlatformAdmin(false);
      await loginAsOwner(page);

      const images = await page.locator('img').all();

      for (const img of images) {
        const altText = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');

        if (role !== 'presentation') {
          expect(altText || ariaLabel).toBeTruthy();
        }
      }
    });

    test('headings should be properly structured', async ({ page }) => {
      await page.goto('/owner');
      await page.waitForLoadState('networkidle');

      await ensurePlatformAdmin(false);
      await loginAsOwner(page);

      const h1s = await page.locator('h1').count();
      expect(h1s).toBeLessThanOrEqual(1);

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = await Promise.all(
        headings.map(async (h) => {
          const tagName = await h.evaluate((el) => el.tagName.toLowerCase());
          return parseInt(tagName.replace('h', ''));
        }),
      );

      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1);
      }
    });
  });
});
