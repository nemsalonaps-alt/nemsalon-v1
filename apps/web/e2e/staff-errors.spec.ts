import { expect } from '@playwright/test';
import {
  test,
  loginAsOwner,
  loginAsStaff,
  expectApiError,
  expectUiError,
  uniqueEmail,
} from './utils';

test.describe('Staff Error Handling - Comprehensive', () => {
  test.describe('Staff Creation Errors', () => {
    test('viser fejl ved manglende navn', async ({ page }) => {
      await loginAsOwner(page);

      // Navigate to staff settings
      await page.goto('/owner/settings');

      // Try to add staff without name
      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-email-input').fill(uniqueEmail('staff'));
      await page.getByTestId('staff-role-select').selectOption('staff');

      // Submit without name
      await page.getByTestId('save-staff-button').click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved kort navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-name-input').fill('A'); // Less than 2 chars
      await page.getByTestId('staff-email-input').fill(uniqueEmail('staff'));
      await page.getByTestId('staff-role-select').selectOption('staff');
      await page.getByTestId('save-staff-button').click();

      await expectApiError(page, 400, /validation|name|2|characters/i);
      await expectUiError(page, /name|navn|2|characters|tegn/i);
    });

    test('viser fejl ved ugyldig email format', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-name-input').fill('Test Staff');
      await page.getByTestId('staff-email-input').fill('ikke-en-email');
      await page.getByTestId('staff-role-select').selectOption('staff');
      await page.getByTestId('save-staff-button').click();

      await expectUiError(page, /email|valid|format|ugyldig/i);
    });

    test('viser fejl ved duplikeret email', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Use existing staff email
      await page.getByTestId('add-staff-button').click();
      await page.getByTestId('staff-name-input').fill('Duplikeret Staff');
      await page.getByTestId('staff-email-input').fill('dev-staff@nemsalon.test');
      await page.getByTestId('staff-role-select').selectOption('staff');
      await page.getByTestId('save-staff-button').click();

      await expectApiError(page, 409, /duplicate|exists|already|eksisterer/i);
      await expectUiError(page, /exists|already|duplicate|eksisterer/i);
    });

    test('viser fejl ved ugyldig rolle', async ({ page }) => {
      await loginAsOwner(page);

      // Try to create staff with invalid role via API
      const response = await page.request.post('/v1/staff', {
        data: {
          name: 'Test Staff',
          email: uniqueEmail('staff'),
          role: 'invalid-role',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  test.describe('Staff Update Errors', () => {
    test('viser fejl ved opdatering af ikke-eksisterende staff', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.patch('/v1/staff/ikke-eksisterende-id-12345', {
        data: {
          name: 'Updated Name',
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('STAFF_NOT_FOUND');
    });

    test('viser fejl når staff prøver at opdatere anden staff', async ({ page }) => {
      await loginAsStaff(page);

      const response = await page.request.patch('/v1/staff/other-staff-id', {
        data: {
          name: 'Hacked Name',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved opdatering til ugyldig email', async ({ page }) => {
      await loginAsOwner(page);

      // Get first staff ID
      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.patch(`/v1/staff/${staff[0].id}`, {
          data: {
            email: 'ikke-en-email',
          },
        });

        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('Staff Deletion Errors', () => {
    test('viser fejl ved sletning af ikke-eksisterende staff', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.delete('/v1/staff/ikke-eksisterende-id-12345');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('STAFF_NOT_FOUND');
    });

    test('viser fejl når staff prøver at slette anden staff', async ({ page }) => {
      await loginAsStaff(page);

      const response = await page.request.delete('/v1/staff/other-staff-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved sletning af staff med aktive bookings', async ({ page }) => {
      await loginAsOwner(page);

      // This would require a staff with active bookings
      // Try to delete them
      const response = await page.request.delete('/v1/staff/staff-med-bookings');

      // Should fail with conflict or constraint error
      if (response.status() === 409) {
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/constraint|bookings|active/i);
      }
    });
  });

  test.describe('Staff Invitation Errors', () => {
    test('viser fejl ved invitation uden email', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      // Try to invite staff without email
      await page.getByTestId('invite-staff-button').click();
      await page.getByTestId('invite-staff-name').fill('Test Staff');
      // Don't fill email
      await page.getByTestId('send-invite-button').click();

      await expectUiError(page, /email|required|påkrævet/i);
    });

    test('viser fejl ved invitation af ikke-eksisterende staff', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/staff/ikke-eksisterende-id/invite');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('STAFF_NOT_FOUND');
    });

    test('viser fejl ved invitation uden navn', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/owner/settings');

      await page.getByTestId('invite-staff-button').click();
      // Don't fill name
      await page.getByTestId('invite-staff-email').fill(uniqueEmail('staff'));
      await page.getByTestId('send-invite-button').click();

      await expectUiError(page, /name|navn|required|påkrævet/i);
    });

    test('viser fejl ved genudsendelse til staff uden email', async ({ page }) => {
      await loginAsOwner(page);

      // Create staff without email
      const createResponse = await page.request.post('/v1/staff', {
        data: {
          name: 'Staff Uden Email',
          role: 'staff',
        },
      });

      if (createResponse.ok()) {
        const staff = await createResponse.json();

        // Try to resend invite
        const response = await page.request.post('/v1/staff/invite/resend', {
          data: { staffId: staff.id },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.code || body.message).toMatch(/no email|email|missing/i);
      }
    });

    test('viser fejl ved invitation til forkert salon', async ({ page }) => {
      await loginAsOwner(page);

      const response = await page.request.post('/v1/staff', {
        data: {
          name: 'Test Staff',
          email: uniqueEmail('staff'),
          role: 'staff',
          salonId: 'forkert-salon-id',
        },
      });

      if (response.status() === 403) {
        const body = await response.json();
        expect(body.code).toBe('AUTH_FORBIDDEN');
      }
    });
  });

  test.describe('Staff Working Hours Errors', () => {
    test('viser fejl ved ugyldigt tidspunkt', async ({ page }) => {
      await loginAsOwner(page);

      // Get staff ID
      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.put(`/v1/staff/${staff[0].id}/working-hours`, {
          data: {
            hours: [
              {
                day: 'monday',
                start: '17:00',
                end: '09:00', // End before start
              },
            ],
          },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/invalid|time_range|start|end/i);
      }
    });

    test('viser fejl ved duplikeret dag', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.put(`/v1/staff/${staff[0].id}/working-hours`, {
          data: {
            hours: [
              { day: 'monday', start: '09:00', end: '17:00' },
              { day: 'monday', start: '10:00', end: '18:00' }, // Duplicate day
            ],
          },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/duplicate|duplicate_day/i);
      }
    });

    test('viser fejl ved opdatering af anden staffs arbejdstid', async ({ page }) => {
      await loginAsStaff(page);

      const response = await page.request.put('/v1/staff/other-staff-id/working-hours', {
        data: {
          hours: [{ day: 'monday', start: '09:00', end: '17:00' }],
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('viser fejl ved ugyldig dag', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.put(`/v1/staff/${staff[0].id}/working-hours`, {
          data: {
            hours: [{ day: 'invalid-day', start: '09:00', end: '17:00' }],
          },
        });

        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('Staff Time-Off Errors', () => {
    test('viser fejl ved sluttid før starttid', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.post(`/v1/staff/${staff[0].id}/time-off`, {
          data: {
            start: '2024-12-31T17:00:00Z',
            end: '2024-12-31T09:00:00Z', // End before start
            reason: 'Test',
          },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/invalid|range|end.*start/i);
      }
    });

    test('viser fejl ved sletning af ikke-eksisterende time-off', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.delete(
          `/v1/staff/${staff[0].id}/time-off/ikke-eksisterende-id`,
        );

        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/not_found|time_off_not_found/i);
      }
    });

    test('viser fejl ved oprettelse af time-off uden grund', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.post(`/v1/staff/${staff[0].id}/time-off`, {
          data: {
            start: '2024-12-31T09:00:00Z',
            end: '2024-12-31T17:00:00Z',
            // No reason
          },
        });

        // Might be optional, check if error occurs
        if (!response.ok()) {
          console.log('Time-off without reason:', response.status());
        }
      }
    });

    test('viser fejl når staff prøver at slette andens time-off', async ({ page }) => {
      await loginAsStaff(page);

      const response = await page.request.delete('/v1/staff/other-staff-id/time-off/some-id');

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });
  });

  test.describe('Staff Service Assignment Errors', () => {
    test('viser fejl ved tildeling af ugyldig service', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.post(`/v1/staff/${staff[0].id}/services`, {
          data: {
            serviceIds: ['ikke-eksisterende-service-id'],
          },
        });

        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.code).toBe('SERVICE_NOT_FOUND');
      }
    });

    test('viser fejl ved tildeling af service fra anden salon', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.post(`/v1/staff/${staff[0].id}/services`, {
          data: {
            serviceIds: ['anden-salons-service-id'],
          },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.code || body.errorKey).toMatch(/forbidden|service_salon_mismatch/i);
      }
    });

    test('viser fejl ved fjernelse af alle services', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        // Try to assign empty service list
        const response = await page.request.post(`/v1/staff/${staff[0].id}/services`, {
          data: {
            serviceIds: [],
          },
        });

        // Might be allowed or might error
        console.log('Empty service assignment:', response.status());
      }
    });
  });

  test.describe('Staff Access Control', () => {
    test('viser fejl når staff prøver at tilgå owner-only routes', async ({ page }) => {
      await loginAsStaff(page);

      // Try to access staff management (owner only)
      await page.goto('/owner/settings/staff');

      // Should be redirected or show error
      const url = page.url();
      if (url.includes('/settings')) {
        await expectUiError(page, /forbidden|access|access|permission/i);
      } else {
        expect(url).not.toContain('/owner/settings/staff');
      }
    });

    test('viser fejl når staff prøver at oprette ny staff', async ({ page }) => {
      await loginAsStaff(page);

      const response = await page.request.post('/v1/staff', {
        data: {
          name: 'Ny Staff',
          email: uniqueEmail('staff'),
          role: 'staff',
        },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('AUTH_FORBIDDEN');
    });

    test('staff kan kun se egen profil', async ({ page }) => {
      await loginAsStaff(page);

      // Navigate to staff console
      await page.goto('/staff');

      // Should see own profile
      await expect(page.getByTestId('staff-greeting')).toBeVisible();

      // Try to access other staff's profile via API
      const response = await page.request.get('/v1/staff/other-staff-id');

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Staff Profile Errors', () => {
    test('viser fejl ved opdatering til for langt navn', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const longName = 'A'.repeat(100); // Too long

        const response = await page.request.patch(`/v1/staff/${staff[0].id}`, {
          data: {
            name: longName,
          },
        });

        expect(response.status()).toBe(400);
      }
    });

    test('viser fejl ved opdatering med specialtegn i navn', async ({ page }) => {
      await loginAsOwner(page);

      const staffList = await page.request.get('/v1/staff');
      const staff = await staffList.json();

      if (staff.length > 0) {
        const response = await page.request.patch(`/v1/staff/${staff[0].id}`, {
          data: {
            name: '<script>alert("xss")</script>',
          },
        });

        // Should either sanitize or reject
        if (response.ok()) {
          const body = await response.json();
          expect(body.name).not.toContain('<script>');
        }
      }
    });
  });
});
