# Nemsalon Playwright Error Test Suite

## Oversigt

Dette er en omfattende Playwright test suite designet til at fange og validere alle fejlscenarier i Nemsalon systemet. Testene dækker:

- **Auth & Login**: Login/registrering fejl, session management
- **Booking**: Oprettelse, ændring, afbestilling fejl
- **Staff**: Medarbejder management fejl
- **Customer**: Kunde management fejl
- **Services**: Service management fejl
- **Settings**: Salon indstillinger fejl
- **Advanced**: Komplekse scenarier, race conditions, security

## Test Struktur

```
apps/web/e2e/
├── utils.ts                  # Test utilities & fixtures
├── auth-errors.spec.ts       # Auth fejl tests (30+ tests)
├── booking-errors.spec.ts    # Booking fejl tests (35+ tests)
├── staff-errors.spec.ts      # Staff fejl tests (30+ tests)
├── customer-errors.spec.ts   # Customer fejl tests (35+ tests)
├── services-errors.spec.ts   # Services fejl tests (25+ tests)
├── settings-errors.spec.ts   # Settings fejl tests (30+ tests)
└── advanced-errors.spec.ts   # Avancerede scenarier (40+ tests)
```

## Hvordan man kører testene

### Kør alle tests

```bash
npx playwright test
```

### Kør specifik test fil

```bash
npx playwright test auth-errors.spec.ts
npx playwright test booking-errors.spec.ts
```

### Kør specifik test gruppe

```bash
npx playwright test --grep "Login Errors"
npx playwright test --grep "Booking Creation"
```

### Kør med UI mode (til debugging)

```bash
npx playwright test --ui
```

### Kør med headed browser

```bash
npx playwright test --headed
```

### Kør med debugging

```bash
npx playwright test --debug
```

## Test Utilities

### Grundlæggende hjælpefunktioner

```typescript
// Login hjælpere
await loginAsOwner(page);
await loginAsStaff(page);
await loginAsCustomer(page);
await loginAsPlatformAdmin(page);

// Fejl detection
await expectApiError(page, 404, /not found/);
await expectUiError(page, /error message/);
await waitForAnyError(page);

// API hjælpere
const response = await page.request.post('/v1/customers', { data: {} });
expect(response.status()).toBe(400);
```

### Error Capture

```typescript
// Fanger detaljerede fejlinformationer
const errorState = await captureErrorState(page, 'test-name');
console.log(errorState.screenshots);
console.log(errorState.consoleErrors);
console.log(errorState.failedRequests);
```

### Test Context

```typescript
test('example', async ({ page, testContext }) => {
  // Alle API kald og console errors logges automatisk
  // Tilgås via testContext.apiCalls
  // Tilgås via testContext.consoleMessages
});
```

## Fejltyper der testes

### HTTP Status Codes

- **400** - Validation errors
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict
- **429** - Rate Limited
- **500** - Server Error

### Error Keys (i18n)

- `error.salon_not_found`
- `error.registration_failed`
- `error.validation_failed`
- `error.unauthorized`
- `error.auth.forbidden`
- `error.booking.time_not_available`
- `error.customer_salon_mismatch`
- ... og mange flere

## Test Scenarier

### 1. Input Validation

- Tomme felter
- For korte/lange værdier
- Ugyldigt format (email, telefon, dato)
- Specialtegn og Unicode
- XSS forsøg
- SQL injection forsøg

### 2. Business Logic

- Dobbeltbooking
- Ugyldige status overgange
- Uden for åbningstid
- Manglende dependencies
- Concurrent operations

### 3. Access Control

- Uautoriseret adgang
- Cross-salon adgang
- Role-based restrictions
- Token validering

### 4. Edge Cases

- Race conditions
- Network failures
- API timeouts
- Database constraints
- Circular dependencies

### 5. Security

- XSS beskyttelse
- SQL injection beskyttelse
- Path traversal beskyttelse
- CSRF validering
- Rate limiting

## Konfiguration

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: 'apps/web/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },
});
```

### Miljø variabler

```bash
# .env.local
DEV_OWNER_EMAIL=dev-owner@nemsalon.test
DEV_OWNER_PASSWORD=dev123456
DEV_STAFF_EMAIL=dev-staff@nemsalon.test
DEV_STAFF_PASSWORD=dev123456
DEV_CUSTOMER_EMAIL=dev-customer@nemsalon.test
DEV_CUSTOMER_PASSWORD=dev123456
E2E_BASE_URL=http://localhost:5173
```

## Debugging

### Se screenshots og video

Efter test kørsel, find resultater i:

```
test-results/
├── auth-errors.spec.ts/
│   ├── test-name-1/
│   │   ├── test-failed-1.png
│   │   └── video.webm
│   └── ...
└── errors/          # Screenshots af fejl
    └── test-name-timestamp.png
```

### HTML Report

```bash
npx playwright show-report
```

### Trace Viewer

```bash
npx playwright show-trace test-results/trace.zip
```

## Vedligeholdelse

### Tilføj nye tests

1. Find relevant test fil (f.eks. `booking-errors.spec.ts`)
2. Tilføj ny test i eksisterende describe blok
3. Følg mønsteret: Arrange → Act → Assert
4. Brug utilities til fejl detection

### Opdater eksisterende tests

- Test selectors kan opdateres ved UI ændringer
- API endpoints kan opdateres ved backend ændringer
- Error patterns kan opdateres ved nye fejlmeddelelser

## Kendte Begrænsninger

1. **Test data dependencies**: Nogle tests kræver specifikke data (f.eks. eksisterende bookings)
2. **Timing issues**: Concurrent tests kan have race conditions
3. **Browser specifikke**: Nogle fejl kan variere mellem browsere
4. **State dependencies**: Tests er afhængige af clean state

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Playwright tests
  run: npx playwright test
  env:
    E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
    DEV_OWNER_PASSWORD: ${{ secrets.DEV_OWNER_PASSWORD }}
```

### Retry logic

Tests er konfigureret med `retries: 2` i CI for at håndtere flaky tests.

## Support

For spørgsmål eller problemer med testene:

1. Tjek at miljø variabler er korrekte
2. Verificer at API og web server kører
3. Kør tests i headed mode for debugging
4. Tjek screenshots og video i test-results

## Fremtidige Forbedringer

- [ ] Visual regression tests
- [ ] Performance tests
- [ ] Accessibility tests
- [ ] Mobile responsive tests
- [ ] Load tests
- [ ] Chaos engineering tests
