# Data-Testid Reference Guide

Komplet liste over alle data-testid attributter tilføjet til UI komponenter for Playwright testing.

## Auth Komponenter

### UnifiedLogin.tsx

| Element             | data-testid           | Beskrivelse                  |
| ------------------- | --------------------- | ---------------------------- |
| Error outlet        | `auth-error`          | Fejlmeddelelse container     |
| Email input         | `login-email`         | Login email felt             |
| Password input      | `login-password`      | Login password felt          |
| Submit button       | `login-submit`        | Login knap                   |
| Register name       | `register-name`       | Registrering navn felt       |
| Register email      | `register-email`      | Registrering email felt      |
| Register password   | `register-password`   | Registrering password felt   |
| Register salon slug | `register-salon-slug` | Registrering salon slug felt |
| Register submit     | `register-submit`     | Registrering submit knap     |
| Mode toggle         | `auth-mode-toggle`    | Skift login/register knap    |

## Customer Portal

### CustomerRegister.tsx (routes/Register.tsx)

| Element        | data-testid                | Beskrivelse              |
| -------------- | -------------------------- | ------------------------ |
| Error outlet   | `customer-error`           | Fejlmeddelelse container |
| Salon slug     | `customer-salon-slug`      | Salon slug input         |
| Name input     | `customer-name-input`      | Navn input felt          |
| Email input    | `customer-email-input`     | Email input felt         |
| Phone input    | `customer-phone-input`     | Telefon input felt       |
| Password input | `customer-password-input`  | Password input felt      |
| Submit button  | `customer-register-submit` | Opret konto knap         |

### Portal.tsx

| Element         | data-testid                | Beskrivelse           |
| --------------- | -------------------------- | --------------------- |
| Portal error    | `portal-error`             | Portal fejlmeddelelse |
| Portal fallback | `customer-portal-fallback` | FeatureState fallback |

## Owner Console

### SettingsTab.tsx

| Element              | data-testid               | Beskrivelse                  |
| -------------------- | ------------------------- | ---------------------------- |
| Settings error       | `settings-error`          | Generel settings fejl        |
| Settings fallback    | `settings-fallback`       | Settings loading/error state |
| Staff fallback       | `settings-staff-fallback` | Staff section fallback       |
| Staff hours fallback | `staff-hours-fallback`    | Staff hours loading/error    |
| Timeoff fallback     | `timeoff-fallback`        | Time off loading/error       |

### CreateBookingTab.tsx

| Element                 | data-testid                         | Beskrivelse                |
| ----------------------- | ----------------------------------- | -------------------------- |
| Create booking fallback | `create-booking-fallback`           | Loading/error state        |
| Service select          | `create-booking-service`            | Service dropdown           |
| Staff select            | `create-booking-staff`              | Staff dropdown             |
| Check availability      | `create-booking-check-availability` | Check knap                 |
| Time slot               | `create-booking-slot`               | Tidspunkt knap             |
| Availability fallback   | `availability-fallback`             | Availability loading/error |

## Offentlig Booking

### BookingFlow.tsx

| Element              | data-testid             | Beskrivelse    |
| -------------------- | ----------------------- | -------------- |
| Public booking error | `public-booking-error`  | Fejlmeddelelse |
| Service selection    | `public-service-select` | Service valg   |
| Staff selection      | `public-staff-select`   | Staff valg     |
| Date picker          | `public-date-picker`    | Dato vælger    |
| Time slot            | `public-time-slot`      | Tidspunkt      |
| Submit booking       | `public-booking-submit` | Book knap      |

### ManageBooking.tsx

| Element           | data-testid                 | Beskrivelse    |
| ----------------- | --------------------------- | -------------- |
| Manage error      | `manage-booking-error`      | Fejlmeddelelse |
| Cancel button     | `booking-cancel-button`     | Annuller knap  |
| Reschedule button | `booking-reschedule-button` | Omlæg knap     |

## Staff Console

### StaffConsole.tsx

| Element          | data-testid              | Beskrivelse         |
| ---------------- | ------------------------ | ------------------- |
| Staff greeting   | `staff-greeting`         | Staff velkomst      |
| Staff error      | `staff-error`            | Fejlmeddelelse      |
| Staff fallback   | `staff-console-fallback` | Loading/error state |
| Today's bookings | `staff-today-bookings`   | Dagens bookinger    |
| Booking item     | `staff-booking-item`     | Booking i listen    |

## Platform Admin

### PlatformConsole.tsx

| Element        | data-testid            | Beskrivelse          |
| -------------- | ---------------------- | -------------------- |
| Platform title | `platform-admin-title` | Platform admin titel |
| Platform error | `platform-error`       | Fejlmeddelelse       |
| Salon list     | `platform-salon-list`  | Salon liste          |
| Salon item     | `platform-salon-item`  | Salon i listen       |

## Onboarding

### Gate.tsx

| Element      | data-testid        | Beskrivelse      |
| ------------ | ------------------ | ---------------- |
| Gate loading | `gate-loading`     | Loading state    |
| Gate error   | `gate-error`       | Fejl state       |
| Needs login  | `gate-needs-login` | Login påkrævet   |
| Has salon    | `gate-has-salon`   | Salon eksisterer |

### SalonStep.tsx

| Element        | data-testid             | Beskrivelse    |
| -------------- | ----------------------- | -------------- |
| Salon form     | `salon-setup-form`      | Salon formular |
| Salon name     | `salon-name-input`      | Salon navn     |
| Salon type     | `salon-type-select`     | Salon type     |
| Salon timezone | `salon-timezone-select` | Timezone       |
| Salon submit   | `salon-submit`          | Gem knap       |
| Salon error    | `salon-error`           | Fejlmeddelelse |

### StaffForm.tsx

| Element      | data-testid         | Beskrivelse    |
| ------------ | ------------------- | -------------- |
| Staff form   | `staff-form`        | Staff formular |
| Staff name   | `staff-form-name`   | Navn input     |
| Staff email  | `staff-form-email`  | Email input    |
| Staff role   | `staff-form-role`   | Rolle select   |
| Staff submit | `staff-form-submit` | Gem knap       |
| Staff error  | `staff-form-error`  | Fejlmeddelelse |

### ServiceForm.tsx

| Element          | data-testid             | Beskrivelse      |
| ---------------- | ----------------------- | ---------------- |
| Service form     | `service-form`          | Service formular |
| Service name     | `service-form-name`     | Navn input       |
| Service duration | `service-form-duration` | Varighed input   |
| Service price    | `service-form-price`    | Pris input       |
| Service submit   | `service-form-submit`   | Gem knap         |
| Service error    | `service-form-error`    | Fejlmeddelelse   |

## Fælles Komponenter

### FeatureState.tsx

| Element       | data-testid    | Beskrivelse      |
| ------------- | -------------- | ---------------- |
| Feature state | Prop: `testId` | Dynamisk test id |

FeatureState component accepterer en `testId` prop som bruges til at identificere forskellige loading/error states.

**Brug:**

```tsx
<FeatureState status="error" title="Error" testId="settings-fallback" />
```

Dette renderer:

```html
<div data-testid="settings-fallback">...</div>
```

## Navigation

### Layout.tsx (Console)

| Element       | data-testid    | Beskrivelse        |
| ------------- | -------------- | ------------------ |
| Nav home      | `nav-home`     | Hjem link          |
| Nav calendar  | `nav-calendar` | Kalender link      |
| Nav create    | `nav-create`   | Opret link         |
| Nav details   | `nav-details`  | Detaljer link      |
| Nav settings  | `nav-settings` | Indstillinger link |
| Logout button | `nav-logout`   | Log ud knap        |

## Fejl Outlets - Prioriteret Liste

Dette er de VIGTIGSTE test ids tests bruger:

### 1. Auth Error (HØJESTE PRIORITET)

```tsx
<div data-testid="auth-error">{error}</div>
```

**Bruges i:** UnifiedLogin.tsx

### 2. Customer Error

```tsx
<div data-testid="customer-error">{error}</div>
```

**Bruges i:** CustomerRegister.tsx

### 3. Portal Error

```tsx
<div data-testid="portal-error">{error}</div>
```

**Bruges i:** Portal.tsx

### 4. Settings Error

```tsx
<div data-testid="settings-error">{error}</div>
```

**Bruges i:** SettingsTab.tsx

### 5. Booking Error

```tsx
<div data-testid="booking-error">{error}</div>
```

**Bør bruges i:** CreateBookingTab.tsx (hvis ikke allerede)

## Form Input Reference

### Standard Input Test IDs

| Input Type      | Naming Convention          | Eksempel                 |
| --------------- | -------------------------- | ------------------------ |
| Text input      | `{context}-{field}-input`  | `customer-name-input`    |
| Email input     | `{context}-email-input`    | `login-email`            |
| Password input  | `{context}-password-input` | `register-password`      |
| Select dropdown | `{context}-{field}-select` | `create-booking-service` |
| Date picker     | `{context}-date-input`     | `booking-date-input`     |
| Time picker     | `{context}-time-input`     | `booking-time-input`     |
| Submit button   | `{context}-submit`         | `login-submit`           |
| Cancel button   | `{context}-cancel`         | `form-cancel`            |

## Button Reference

### Standard Button Test IDs

| Button Type    | Naming Convention           | Eksempel                |
| -------------- | --------------------------- | ----------------------- |
| Primary action | `{context}-{action}-button` | `save-customer-button`  |
| Add new        | `add-{context}-button`      | `add-staff-button`      |
| Edit item      | `edit-{context}-button`     | `edit-service-button`   |
| Delete item    | `delete-{context}-button`   | `delete-booking-button` |
| Close modal    | `close-button`              | `close-button`          |
| Retry action   | `retry-button`              | `retry-button`          |

## List Reference

### Standard List Test IDs

| List Type      | Naming Convention     | Eksempel          |
| -------------- | --------------------- | ----------------- |
| List container | `{context}-list`      | `staff-list`      |
| List item      | `{context}-item-{id}` | `staff-item-123`  |
| Empty state    | `empty-{context}`     | `empty-customers` |

## Tips til Tilføjelse af Nye Test IDs

### 1. Error Outlets (MEST VIGTIGE)

**Skal** altid have data-testid:

```tsx
{
  error && (
    <div data-testid="{context}-error" className="error">
      {error}
    </div>
  );
}
```

### 2. Form Inputs

**Bør** have data-testid:

```tsx
<input data-testid="{context}-{field}-input" {...props} />
```

### 3. Action Buttons

**Bør** have data-testid:

```tsx
<button
  data-testid="{context}-{action}-button"
  {...props}
>
```

### 4. Navigation

**Bør** have data-testid:

```tsx
<a data-testid="nav-{route}" href="/{route}">
```

## Playwright Brug

### Finde elementer

```typescript
// Error outlets
const error = page.getByTestId('auth-error');

// Form inputs
const emailInput = page.getByTestId('login-email');

// Buttons
const submitButton = page.getByTestId('login-submit');

// Lists
const staffList = page.getByTestId('staff-list');
const staffItems = page.getByTestId(/^staff-item-/);
```

### Verificere fejl

```typescript
// Error er synlig
await expect(page.getByTestId('auth-error')).toBeVisible();

// Error har specifik tekst
await expect(page.getByTestId('auth-error')).toHaveText(/forkert/i);
```

### Interagere med formularer

```typescript
// Udfyld input
await page.getByTestId('customer-name-input').fill('Test Navn');
await page.getByTestId('customer-email-input').fill('test@test.com');

// Klik submit
await page.getByTestId('customer-register-submit').click();
```

## Manglende Test IDs

Følgende komponenter bør have data-testid tilføjet:

- [ ] SettingsTab.tsx - flere section specifikke errors
- [ ] CreateBookingTab.tsx - customer select, submit knap
- [ ] DashboardTab.tsx - error states
- [ ] CalendarTab.tsx - error states
- [ ] StaffConsole.tsx - flere interaktive elementer
- [ ] OwnerConsole.tsx - navigation elements
- [ ] BookingFlow.tsx - alle interaktive elementer
- [ ] Confirmation.tsx - error states
- [ ] All modal dialogs

## Opdatering af Denne Guide

Når du tilføjer nye data-testid:

1. Tilføj til relevant sektion ovenfor
2. Følg naming konventionerne
3. Opdater Playwright tests til at bruge dem
4. Verificér tests stadig virker

## Support

Spørgsmål om data-testid?

1. Se naming konventionerne ovenfor
2. Tjek eksisterende komponenter for eksempler
3. Se Playwright tests for brug
