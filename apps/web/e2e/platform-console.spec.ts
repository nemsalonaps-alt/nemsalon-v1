import { test, expect } from '@playwright/test';
import { ensurePlatformAdmin, loginAsPlatformAdmin } from './utils';

test.describe('Platform Console', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePlatformAdmin(true);
    await loginAsPlatformAdmin(page);
  });

  test.afterEach(async () => {
    await ensurePlatformAdmin(false);
  });

  test('loads platform admin overview', async ({ page }) => {
    await page.goto('/platform');
    await expect(page.getByTestId('platform-admin-title')).toBeVisible();
    await expect(page.getByTestId('platform-console-switcher')).toBeVisible();
  });
});
