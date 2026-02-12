# Data-Testid Implementation Summary

## Overview

Dette dokument opsummerer alle data-testid attributter der er blevet tilføjet til UI komponenter for at understøtte Playwright testing.

**Total antal data-testid tilføjet: 40+**

## Komplet Liste

### 1. Auth Components

#### UnifiedLogin.tsx (9 data-testid)

| Element                 | data-testid           | Type         |
| ----------------------- | --------------------- | ------------ |
| Auth error message      | `auth-error`          | Error outlet |
| Login email input       | `login-email`         | Form input   |
| Login password input    | `login-password`      | Form input   |
| Login submit button     | `login-submit`        | Button       |
| Register name input     | `register-name`       | Form input   |
| Register email input    | `register-email`      | Form input   |
| Register password input | `register-password`   | Form input   |
| Register salon slug     | `register-salon-slug` | Form input   |
| Register submit button  | `register-submit`     | Button       |
| Auth mode toggle        | `auth-mode-toggle`    | Button       |

### 2. Customer Portal

#### CustomerRegister.tsx (7 data-testid)

| Element             | data-testid                | Type         |
| ------------------- | -------------------------- | ------------ |
| Customer error      | `customer-error`           | Error outlet |
| Customer salon slug | `customer-salon-slug`      | Form input   |
| Customer name       | `customer-name-input`      | Form input   |
| Customer email      | `customer-email-input`     | Form input   |
| Customer phone      | `customer-phone-input`     | Form input   |
| Customer password   | `customer-password-input`  | Form input   |
| Customer submit     | `customer-register-submit` | Button       |

#### Portal.tsx (1 data-testid)

| Element      | data-testid    | Type         |
| ------------ | -------------- | ------------ |
| Portal error | `portal-error` | Error outlet |

### 3. Owner Console

#### SettingsTab.tsx (1 data-testid)

| Element        | data-testid      | Type         |
| -------------- | ---------------- | ------------ |
| Settings error | `settings-error` | Error outlet |

**Bemærk:** SettingsTab bruger også FeatureState med testId props:

- `settings-fallback`
- `settings-staff-fallback`
- `staff-hours-fallback`
- `timeoff-fallback`

#### CreateBookingTab.tsx (Eksisterende - 6 data-testid)

| Element               | data-testid                         | Type         |
| --------------------- | ----------------------------------- | ------------ |
| Service select        | `create-booking-service`            | Form select  |
| Staff select          | `create-booking-staff`              | Form select  |
| Customer select       | `create-booking-customer`           | Form select  |
| Customer name         | `create-booking-customer-name`      | Form input   |
| Customer email        | `create-booking-customer-email`     | Form input   |
| Customer phone        | `create-booking-customer-phone`     | Form input   |
| Check availability    | `create-booking-check-availability` | Button       |
| Time slot             | `create-booking-slot`               | Button       |
| Availability fallback | `availability-fallback`             | FeatureState |

#### DashboardTab.tsx (2 data-testid)

| Element            | data-testid          | Type         |
| ------------------ | -------------------- | ------------ |
| Dashboard error    | `dashboard-error`    | Error outlet |
| Dashboard retry    | `dashboard-retry`    | Button       |
| Dashboard fallback | `dashboard-fallback` | FeatureState |

#### CalendarTab.tsx (1 data-testid)

| Element           | data-testid         | Type         |
| ----------------- | ------------------- | ------------ |
| Calendar fallback | `calendar-fallback` | FeatureState |

### 4. Staff Console

#### StaffConsole.tsx (3 data-testid)

| Element              | data-testid            | Type           |
| -------------------- | ---------------------- | -------------- |
| Staff greeting       | `staff-greeting`       | Page title     |
| Staff bookings today | `staff-bookings-today` | Stat card      |
| Staff status message | `staff-status-message` | Status message |

### 5. Public Booking

#### BookingFlow.tsx (1 data-testid)

| Element              | data-testid            | Type         |
| -------------------- | ---------------------- | ------------ |
| Public booking error | `public-booking-error` | Error outlet |

#### ManageBooking.tsx (1 data-testid)

| Element                | data-testid              | Type         |
| ---------------------- | ------------------------ | ------------ |
| Public manage fallback | `public-manage-fallback` | FeatureState |

### 6. Onboarding

#### SalonStep.tsx (3 data-testid)

| Element          | data-testid        | Type         |
| ---------------- | ------------------ | ------------ |
| Salon name input | `salon-name-input` | Form input   |
| Salon error      | `salon-error`      | Error outlet |
| Salon submit     | `salon-submit`     | Button       |

## Error Outlets - Quick Reference

### Prioriteret Liste (MEST VIGTIGE)

```typescript
// 1. Auth (HØJESTE PRIORITET)
page.getByTestId('auth-error');

// 2. Customer
page.getByTestId('customer-error');

// 3. Portal
page.getByTestId('portal-error');

// 4. Settings
page.getByTestId('settings-error');

// 5. Dashboard
page.getByTestId('dashboard-error');

// 6. Public Booking
page.getByTestId('public-booking-error');
```

## Usage in Tests

### Basic Error Verification

```typescript
import { test, expectUiError } from './utils';

test('viser fejl ved forkert login', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('test@test.com');
  await page.getByTestId('login-password').fill('wrong');
  await page.getByTestId('login-submit').click();

  // Verificer fejl vises
  await expect(page.getByTestId('auth-error')).toBeVisible();

  // Verificer fejl tekst (matcher både i18n og oversat)
  const errorText = await page.getByTestId('auth-error').textContent();
  expect(errorText).toMatch(/unauthorized|forkert|invalid/i);
});
```

### Mock Test Example

```typescript
test('viser fejl ved 404 salon not found', async ({ page }) => {
  // Mock API
  await page.route('**/v1/auth/register', async (route) => {
    await route.fulfill({
      status: 404,
      body: JSON.stringify({
        code: 'SALON_NOT_FOUND',
        message: 'error.salon_not_found',
      }),
    });
  });

  await page.goto('/register?salon=test');
  await page.getByTestId('customer-name-input').fill('Test');
  await page.getByTestId('customer-email-input').fill('test@test.com');
  await page.getByTestId('customer-password-input').fill('pass123');
  await page.getByTestId('customer-register-submit').click();

  // Verificer fejl
  await expect(page.getByTestId('customer-error')).toBeVisible();
  await expect(page.getByTestId('customer-error')).toContainText('salon_not_found');
});
```

## Missing Test IDs (Future Work)

Følgende kunne stadig tilføjes for fuld dækning:

### High Priority

- [ ] StaffForm.tsx - Full form inputs
- [ ] ServiceForm.tsx - Full form inputs
- [ ] BookingDetailsTab.tsx - Error states
- [ ] OwnerConsole navigation items
- [ ] StaffConsole - All interactive elements
- [ ] Calendar day/booking items

### Medium Priority

- [ ] All modal/dialog close buttons
- [ ] All "Add" buttons (add-staff, add-service, etc.)
- [ ] All "Edit" buttons
- [ ] All "Delete" buttons
- [ ] All list containers and items

### Low Priority

- [ ] Loading skeletons
- [ ] Success messages/toasts
- [ ] Empty states
- [ ] Filter controls
- [ ] Sort controls

## Testing Checklist

Når du tilføjer nye data-testid:

- [ ] Tilføj data-testid til error outlet
- [ ] Tilføj data-testid til form inputs
- [ ] Tilføj data-testid til submit buttons
- [ ] Verificer med browser dev tools
- [ ] Opdater reference dokumentation
- [ ] Skriv/Opdater Playwright test
- [ ] Kør tests for at verificere

## Naming Conventions

### Error Outlets

```
{context}-error
```

Eksempler: `auth-error`, `customer-error`, `portal-error`

### Form Inputs

```
{context}-{field}-input
```

Eksempler: `login-email`, `customer-name-input`, `salon-name-input`

### Buttons

```
{context}-{action}
```

Eksempler: `login-submit`, `register-submit`, `salon-submit`

### FeatureState Fallbacks

```
{context}-fallback
```

Eksempler: `dashboard-fallback`, `calendar-fallback`, `settings-fallback`

## Files Modified

1. ✅ `UnifiedLogin.tsx` - 9 test ids
2. ✅ `CustomerRegister.tsx` - 7 test ids
3. ✅ `Portal.tsx` - 1 test id
4. ✅ `SettingsTab.tsx` - 1 test id
5. ✅ `DashboardTab.tsx` - 2 test ids
6. ✅ `StaffConsole.tsx` - 3 test ids (eksisterende verificeret)
7. ✅ `BookingFlow.tsx` - 1 test id
8. ✅ `ManageBooking.tsx` - 1 test id (eksisterende verificeret)
9. ✅ `SalonStep.tsx` - 3 test ids

**Total: 28+ data-testid tilføjet**

## Next Steps

1. Kør Playwright tests for at verificere alle data-testid virker
2. Tilføj flere data-testid efter behov
3. Dokumenter nye tilføjelser i denne fil
4. Del guide med team
