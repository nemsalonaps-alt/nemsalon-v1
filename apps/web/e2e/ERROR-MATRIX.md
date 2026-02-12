# Salon-Grade Fejl-Matrix

Dette dokument beskriver alle fejlscenarier i Nemsalon systemet organiseret efter funktionelt område.

## 1. Auth / Registration

### Customer Registration

| Scenarie                | HTTP | Error Key                 | UI Test ID   | Beskrivelse                        |
| ----------------------- | ---- | ------------------------- | ------------ | ---------------------------------- |
| Ugyldig salon slug      | 404  | `error.salon_not_found`   | `auth-error` | Salon findes ikke                  |
| Salon ikke aktiv        | 403  | `error.salon_inactive`    | `auth-error` | Salon accepterer ikke tilmeldinger |
| Email allerede brugt    | 409  | `error.email_taken`       | `auth-error` | Konto eksisterer allerede          |
| For svagt password      | 400  | `error.password_too_weak` | `auth-error` | Password opfylder ikke krav        |
| Ugyldigt navn           | 400  | `error.validation_failed` | `auth-error` | For kort eller tomt navn           |
| Manglende påkrævet felt | 400  | `error.validation_failed` | `auth-error` | Form validering fejlede            |
| Double-click submit     | -    | -                         | `auth-error` | UI må ikke oprette 2 accounts      |

### Owner Registration

| Scenarie                | HTTP | Error Key                | UI Test ID   | Beskrivelse                |
| ----------------------- | ---- | ------------------------ | ------------ | -------------------------- |
| Email eksisterer        | 409  | `error.email_taken`      | `auth-error` | Ejer email allerede i brug |
| Salon provisioning fejl | 500  | `error.provision_failed` | `auth-error` | Kunne ikke oprette salon   |

### Login

| Scenarie           | HTTP | Error Key                 | UI Test ID   | Beskrivelse                |
| ------------------ | ---- | ------------------------- | ------------ | -------------------------- |
| Forkert password   | 401  | `error.unauthorized`      | `auth-error` | Ugyldige login oplysninger |
| Konto låst         | 429  | `error.too_many_attempts` | `auth-error` | For mange forsøg           |
| Session udløbet    | 401  | `error.session_expired`   | `auth-error` | Genlogin påkrævet          |
| CSRF token ugyldig | 403  | `error.invalid_token`     | `auth-error` | Sikkerheds token fejl      |

## 2. Booking Management

### Booking Oprettelse

| Scenarie                          | HTTP | Error Key                              | UI Test ID      | Beskrivelse                            |
| --------------------------------- | ---- | -------------------------------------- | --------------- | -------------------------------------- |
| Tid i fortiden                    | 400  | `error.booking.past_time`              | `booking-error` | Kan ikke booke tilbage i tid           |
| Tid uden for åbningstid           | 400  | `error.booking.outside_business_hours` | `booking-error` | Uden for salonens åbningstid           |
| Tid allerede optaget              | 409  | `error.booking.time_not_available`     | `booking-error` | Race condition - tid lige blevet taget |
| Medarbejder tilbyder ikke service | 400  | `error.booking.staff_not_assigned`     | `booking-error` | Staff-service mismatch                 |
| Manglende kunde                   | 400  | `error.booking.customer_required`      | `booking-error` | Ingen kunde valgt                      |
| Manglende service                 | 400  | `error.booking.service_required`       | `booking-error` | Ingen service valgt                    |
| Ugyldig tid (ikke 15-min)         | 400  | `error.booking.invalid_alignment`      | `booking-error` | Tid ikke på 15-minutters grid          |
| Duplikeret booking                | 409  | `error.booking.duplicate`              | `booking-error` | Idempotency konflikt                   |

### Booking Ændringer

| Scenarie                     | HTTP | Error Key                           | UI Test ID      | Beskrivelse                  |
| ---------------------------- | ---- | ----------------------------------- | --------------- | ---------------------------- |
| Ugyldig status overgang      | 400  | `error.booking.invalid_transition`  | `booking-error` | F.eks. completed → pending   |
| Afbestilling uden for vindue | 409  | `error.booking.cancellation_window` | `booking-error` | For tæt på booking tid       |
| Omlægning uden for vindue    | 409  | `error.booking.reschedule_window`   | `booking-error` | For tæt på booking tid       |
| Afbestilling af afsluttet    | 409  | `error.booking.cannot_cancel`       | `booking-error` | Kan ikke annullere afsluttet |
| Omlægning af aflyst          | 409  | `error.booking.cannot_reschedule`   | `booking-error` | Kan ikke omlægge aflyst      |

### Booking Access

| Scenarie                 | HTTP | Error Key                     | UI Test ID      | Beskrivelse                       |
| ------------------------ | ---- | ----------------------------- | --------------- | --------------------------------- |
| Ingen adgang til booking | 403  | `error.auth.forbidden`        | `booking-error` | Kunde prøver at se andens booking |
| Ugyldig booking token    | 401  | `error.booking.invalid_token` | `booking-error` | Token ikke gyldig                 |
| Udløbet booking token    | 401  | `error.booking.token_expired` | `booking-error` | Token for gammel                  |
| Booking ikke fundet      | 404  | `error.booking.not_found`     | `booking-error` | Booking ID eksisterer ikke        |

## 3. Staff Management

### Staff CRUD

| Scenarie             | HTTP | Error Key                 | UI Test ID    | Beskrivelse              |
| -------------------- | ---- | ------------------------- | ------------- | ------------------------ |
| Manglende navn       | 400  | `error.validation_failed` | `staff-error` | Staff skal have navn     |
| For kort navn        | 400  | `error.validation_failed` | `staff-error` | Min 2 karakterer         |
| Duplikeret email     | 409  | `error.email_taken`       | `staff-error` | Email allerede i brug    |
| Ugyldig email format | 400  | `error.validation_failed` | `staff-error` | Ikke valid email         |
| Ugyldig rolle        | 400  | `error.validation_failed` | `staff-error` | Ikke valid rolle enum    |
| Staff ikke fundet    | 404  | `error.staff.not_found`   | `staff-error` | Staff ID eksisterer ikke |

### Staff Access Control

| Scenarie                  | HTTP | Error Key              | UI Test ID    | Beskrivelse                |
| ------------------------- | ---- | ---------------------- | ------------- | -------------------------- |
| Staff ændrer anden staff  | 403  | `error.auth.forbidden` | `staff-error` | Kan kun ændre egen profil  |
| Staff sletter anden staff | 403  | `error.auth.forbidden` | `staff-error` | Kun owner/admin kan slette |
| Staff ændrer arbejdstider | 403  | `error.auth.forbidden` | `staff-error` | Kun owner/admin kan ændre  |

### Working Hours

| Scenarie             | HTTP | Error Key                   | UI Test ID    | Beskrivelse              |
| -------------------- | ---- | --------------------------- | ------------- | ------------------------ |
| Sluttid før starttid | 400  | `error.hours.invalid_range` | `staff-error` | Logisk ugyldigt interval |
| Duplikeret dag       | 400  | `error.hours.duplicate_day` | `staff-error` | Samme dag flere gange    |
| Ugyldig dag          | 400  | `error.validation_failed`   | `staff-error` | Ikke valid ugedag        |
| Ugyldigt tid format  | 400  | `error.validation_failed`   | `staff-error` | Ikke HH:MM format        |

### Time-Off

| Scenarie              | HTTP | Error Key                     | UI Test ID    | Beskrivelse               |
| --------------------- | ---- | ----------------------------- | ------------- | ------------------------- |
| Sluttid før starttid  | 400  | `error.timeoff.invalid_range` | `staff-error` | Logisk ugyldigt interval  |
| Overlappende time-off | 409  | `error.timeoff.overlap`       | `staff-error` | Konflikt med eksisterende |
| Time-off ikke fundet  | 404  | `error.timeoff.not_found`     | `staff-error` | ID eksisterer ikke        |
| Time-off i fortiden   | 400  | `error.timeoff.past`          | `staff-error` | Kan ikke blokere fortid   |

## 4. Customer Management

### Customer CRUD

| Scenarie             | HTTP | Error Key                  | UI Test ID       | Beskrivelse             |
| -------------------- | ---- | -------------------------- | ---------------- | ----------------------- |
| Manglende navn       | 400  | `error.validation_failed`  | `customer-error` | Kunde skal have navn    |
| For kort navn        | 400  | `error.validation_failed`  | `customer-error` | Min 2 karakterer        |
| Ugyldig email        | 400  | `error.validation_failed`  | `customer-error` | Ikke valid email format |
| Duplikeret email     | 409  | `error.email_taken`        | `customer-error` | Email allerede i brug   |
| Customer ikke fundet | 404  | `error.customer.not_found` | `customer-error` | ID eksisterer ikke      |

### Customer Portal

| Scenarie            | HTTP | Error Key                       | UI Test ID       | Beskrivelse                |
| ------------------- | ---- | ------------------------------- | ---------------- | -------------------------- |
| Ingen login         | 401  | `error.unauthorized`            | `customer-error` | Skal være logget ind       |
| Forkert kunde salon | 403  | `error.customer.salon_mismatch` | `customer-error` | Kunde tilhører anden salon |
| Ugyldig token       | 401  | `error.token.invalid`           | `customer-error` | Booking token ugyldig      |

### Customer-Salon Relation

| Scenarie                   | HTTP | Error Key                     | UI Test ID       | Beskrivelse          |
| -------------------------- | ---- | ----------------------------- | ---------------- | -------------------- |
| Slet kunde med bookings    | 409  | `error.customer.has_bookings` | `customer-error` | Constraint violation |
| Flyt kunde til anden salon | 403  | `error.auth.forbidden`        | `customer-error` | Kan ikke ændre salon |

## 5. Services Management

### Service CRUD

| Scenarie            | HTTP | Error Key                 | UI Test ID      | Beskrivelse            |
| ------------------- | ---- | ------------------------- | --------------- | ---------------------- |
| Manglende navn      | 400  | `error.validation_failed` | `service-error` | Service skal have navn |
| For kort navn       | 400  | `error.validation_failed` | `service-error` | Min 2 karakterer       |
| For langt navn      | 400  | `error.validation_failed` | `service-error` | Max 80 karakterer      |
| Ugyldig varighed    | 400  | `error.validation_failed` | `service-error` | Min 5, max 480 min     |
| Ugyldig buffer      | 400  | `error.validation_failed` | `service-error` | Skal være 0, 5, 10, 15 |
| Ugyldig pris        | 400  | `error.validation_failed` | `service-error` | Skal være positiv      |
| Ugyldig valuta      | 400  | `error.validation_failed` | `service-error` | Skal være 3 chars      |
| Service ikke fundet | 404  | `error.service.not_found` | `service-error` | ID eksisterer ikke     |

### Service Assignments

| Scenarie                    | HTTP | Error Key                      | UI Test ID      | Beskrivelse            |
| --------------------------- | ---- | ------------------------------ | --------------- | ---------------------- |
| Tildel ugyldig service      | 404  | `error.service.not_found`      | `service-error` | Service ID findes ikke |
| Tildel ugyldig staff        | 404  | `error.staff.not_found`        | `service-error` | Staff ID findes ikke   |
| Tildel anden salons service | 403  | `error.service.salon_mismatch` | `service-error` | Cross-salon assignment |
| Tildel anden salons staff   | 403  | `error.staff.salon_mismatch`   | `service-error` | Cross-salon assignment |

## 6. Salon Settings

### Salon Info

| Scenarie         | HTTP | Error Key                 | UI Test ID       | Beskrivelse           |
| ---------------- | ---- | ------------------------- | ---------------- | --------------------- |
| Manglende navn   | 400  | `error.validation_failed` | `settings-error` | Salon skal have navn  |
| For kort navn    | 400  | `error.validation_failed` | `settings-error` | Min 2 karakterer      |
| Ugyldig slug     | 400  | `error.validation_failed` | `settings-error` | Format ikke valid     |
| Duplikeret slug  | 409  | `error.salon.slug_taken`  | `settings-error` | Slug allerede brugt   |
| Ugyldig timezone | 400  | `error.validation_failed` | `settings-error` | Ikke IANA timezone    |
| Ugyldig locale   | 400  | `error.validation_failed` | `settings-error` | Ikke supported locale |
| Ugyldig valuta   | 400  | `error.validation_failed` | `settings-error` | Ikke 3-char code      |

### Business Hours

| Scenarie             | HTTP | Error Key                   | UI Test ID       | Beskrivelse            |
| -------------------- | ---- | --------------------------- | ---------------- | ---------------------- |
| Sluttid før starttid | 400  | `error.hours.invalid_range` | `settings-error` | Logisk fejl            |
| Duplikeret dag       | 400  | `error.hours.duplicate_day` | `settings-error` | Samme dag 2 gange      |
| Ingen dage valgt     | 400  | `error.hours.no_days`       | `settings-error` | Mindst én dag påkrævet |
| Ugyldig dag          | 400  | `error.validation_failed`   | `settings-error` | Ikke valid ugedag      |

### Cancellation Window

| Scenarie       | HTTP | Error Key                 | UI Test ID       | Beskrivelse           |
| -------------- | ---- | ------------------------- | ---------------- | --------------------- |
| Negativ værdi  | 400  | `error.validation_failed` | `settings-error` | Kan ikke være negativ |
| For stor værdi | 400  | `error.validation_failed` | `settings-error` | Max 1 uge             |

## 7. Payments (hvis aktiveret)

| Scenarie              | HTTP | Error Key                      | UI Test ID      | Beskrivelse          |
| --------------------- | ---- | ------------------------------ | --------------- | -------------------- |
| Payment provider down | 502  | `error.payment.unavailable`    | `booking-error` | Stripe utilgængelig  |
| Card declined         | 402  | `error.payment.declined`       | `booking-error` | Bank afviste kort    |
| Double charge         | 409  | `error.payment.duplicate`      | `booking-error` | Idempotency konflikt |
| Ugyldig beløb         | 400  | `error.payment.invalid_amount` | `booking-error` | Negativt eller nul   |

## 8. Network / Edge Cases

| Scenarie         | HTTP | Error Key                 | UI Test ID      | Beskrivelse       |
| ---------------- | ---- | ------------------------- | --------------- | ----------------- |
| API timeout      | 0    | -                         | `error-message` | Network timeout   |
| Offline          | 0    | -                         | `error-message` | Ingen forbindelse |
| Rate limit       | 429  | `error.too_many_requests` | `error-message` | Prøv igen senere  |
| Server error     | 500  | `error.internal`          | `error-message` | Generisk fejl     |
| Validation error | 400  | `error.validation_failed` | `error-message` | Form validering   |

## UI Test ID Mapping

For at tests er stabile, skal disse data-testid findes i UI:

### Auth

```tsx
<div data-testid="auth-error">{error}</div>
```

### Booking

```tsx
<div data-testid="booking-error">{error}</div>
```

### Customer

```tsx
<div data-testid="customer-error">{error}</div>
```

### Staff

```tsx
<div data-testid="staff-error">{error}</div>
```

### Services

```tsx
<div data-testid="service-error">{error}</div>
```

### Settings

```tsx
<div data-testid="settings-error">{error}</div>
```

### Generelt

```tsx
<div data-testid="error-message">{error}</div>
<div data-testid="form-error">{fieldError}</div>
<div data-testid="api-error">{apiError}</div>
```

## Test Strategi

### Spor A: Integration Tests (mod rigtig backend)

- ✅ Fanger ægte integration bugs
- ✅ Tester database constraints
- ⚠️ Kræver seedet test data
- ⚠️ Kan være flaky hvis data ikke er deterministisk

**Løsning på flakiness:**

1. Seed test data før hver test suite
2. Brug unikke emails (timestamp/uuid)
3. Ryd op efter tests
4. Kør tests i isolation

### Spor B: Mock Tests (UI flows)

- ✅ 100% deterministisk
- ✅ Hurtigere
- ✅ Perfekt til UI fejl flows
- ⚠️ Fanger ikke backend integration bugs

**Anbefaling:**

- Kritiske auth flows: Begge spor
- UI komponenter: Spor B
- Integrationer: Spor A

## Implementerings Checklist

- [ ] Tilføj data-testid til alle fejl outlets
- [ ] Implementer fejl matrix i tests
- [ ] Sæt op auto-debugging (screenshots, logs)
- [ ] Konfigurer trace på failure
- [ ] Seed test data deterministisk
- [ ] Ryd op efter tests
- [ ] Dokumenter flaky tests
- [ ] Sæt op CI integration
