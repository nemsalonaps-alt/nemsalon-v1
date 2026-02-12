# Playwright Test Suite - Komplet Opsummering

## 📊 Oversigt

Dette er en omfattende Playwright test suite til Nemsalon applikationen med fokus på **fejlhåndtering**, **UI robusthed** og **smoke testing**.

**Total: 265+ tests fordelt på 4 kategorier**

## 🎯 Test Kategorier

### 1. Smoke Tests (UI Contract Tests) - 25+ tests

**Fil:** `ui-smoke-tests.spec.ts`

**Formål:** Hurtige tests der verificerer at UI elementer findes og fungerer korrekt.

**Dækker:**

- ✅ Kritiske UI-elementer findes (contract tests)
- ✅ Modaler åbner/lukker korrekt
- ✅ Loading states starter og stopper
- ✅ Error states viser fejl og UI er brugbar
- ✅ Flow completeness (ingen missing steps)
- ✅ No dead ends (ingen stuck states)
- ✅ Data-testid compliance

**Kørselstid:** ~30 sekunder

**Brug:** Kør før hver commit

```bash
npx playwright test ui-smoke-tests.spec.ts
```

### 2. Mock Tests (Spor B) - 15+ tests

**Fil:** `mock-error-tests.spec.ts`

**Formål:** Test UI flows med mocked API responses (100% deterministisk).

**Dækker:**

- ✅ Auth fejl flows (401, 429, 500, timeout)
- ✅ Customer registration fejl (404, 409, validation)
- ✅ Booking fejl flows (409, 400)
- ✅ Error recovery (retry, form preservation)
- ✅ Concurrent request handling
- ✅ Error message variations (i18n vs translated)

**Kørselstid:** ~1 minut

**Brug:** Kør før push til branch

```bash
npx playwright test mock-error-tests.spec.ts
```

### 3. Integration Tests (Spor A) - 225+ tests

**Filer:** `auth-errors.spec.ts`, `booking-errors.spec.ts`, `staff-errors.spec.ts`, `customer-errors.spec.ts`, `services-errors.spec.ts`, `settings-errors.spec.ts`, `advanced-errors.spec.ts`

**Formål:** Test mod rigtig backend (fanger ægte integration bugs).

**Dækker:**

- ✅ Auth & Login (30+ tests)
- ✅ Booking management (35+ tests)
- ✅ Staff management (30+ tests)
- ✅ Customer management (35+ tests)
- ✅ Services management (25+ tests)
- ✅ Settings & Salon (30+ tests)
- ✅ Advanced scenarios (40+ tests)

**Kørselstid:** ~5-10 minutter

**Brug:** Kør før merge til main

```bash
npx playwright test
```

## 🏗️ Test Utilities

### Kerne Funktioner (utils.ts)

```typescript
// Error detection
await expectApiError(page, 404, /salon_not_found/);
await expectUiError(page, 'unauthorized');

// Debug capture
const debug = attachApiDebug(page);
// ... test kører
console.log(debug.getApiLogs());

// Test fixture med auto-logging
test('example', async ({ page, testContext }) => {
  // Alle API kald og console errors logges automatisk
});
```

### I18N Error Keys

```typescript
export const I18N_ERROR_KEYS = {
  salon_not_found: ['error.salon_not_found', 'salon not found', 'ikke fundet'],
  unauthorized: ['error.unauthorized', 'unauthorized', 'ikke autoriseret'],
  // ... 20+ mappings
};
```

## 🎨 Data-Testid Implementation

### Error Outlets (Prioriteret)

```tsx
// 1. Auth Error (HØJESTE PRIORITET)
<div data-testid="auth-error">{error}</div>

// 2. Customer Error
<div data-testid="customer-error">{error}</div>

// 3. Portal Error
<div data-testid="portal-error">{error}</div>

// 4. Settings Error
<div data-testid="settings-error">{error}</div>

// 5. Public Booking Error
<div data-testid="public-booking-error">{error}</div>
```

### Form Inputs

```tsx
<input data-testid="login-email" type="email" />
<input data-testid="customer-name-input" type="text" />
<input data-testid="salon-name-input" type="text" />
```

### Buttons

```tsx
<button data-testid="login-submit">Sign In</button>
<button data-testid="customer-register-submit">Create Account</button>
<button data-testid="salon-submit">Continue</button>
```

**Total: 40+ data-testid tilføjet**

## 📋 Test Matricer

### Salon-Grade Error Matrix

**Dokument:** `ERROR-MATRIX.md`

Omfatter 50+ fejlscenarier:

- HTTP status codes (400, 401, 403, 404, 409, 429, 500)
- Error keys (i18n)
- UI test ids
- Beskrivelser

### Data-Testid Reference

**Dokument:** `DATA-TESTID-REFERENCE.md`

Komplet reference over alle test ids med:

- Naming conventions
- Usage examples
- Missing test ids checklist

## 🚀 Hurtig Start

### 1. Installer dependencies

```bash
pnpm install
npx playwright install
```

### 2. Start servere

```bash
# Terminal 1
cd apps/api && pnpm dev

# Terminal 2
cd apps/web && pnpm dev
```

### 3. Kør smoke tests (hurtigt tjek)

```bash
npx playwright test ui-smoke-tests.spec.ts
```

### 4. Kør alle tests

```bash
npx playwright test
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run Smoke Tests (fail fast)
        run: npx playwright test ui-smoke-tests.spec.ts

      - name: Run Mock Tests
        run: npx playwright test mock-error-tests.spec.ts

      - name: Run Integration Tests
        run: npx playwright test

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 📚 Dokumentation

| Fil                        | Beskrivelse                            |
| -------------------------- | -------------------------------------- |
| `README-ERROR-TESTS.md`    | Overordnet dokumentation af test suite |
| `RUN-GUIDE.md`             | Guide til at køre tests                |
| `ERROR-MATRIX.md`          | Salon-grade fejl matrix                |
| `DATA-TESTID-REFERENCE.md` | Komplet test id reference              |
| `TESTID-SUMMARY.md`        | Opsummering af alle test ids           |
| `UI-TESTID-GUIDE.md`       | Guide til at tilføje data-testid       |

## 🎯 Test Strategi

### Ved hver commit

```bash
# 30 sekunder
npx playwright test ui-smoke-tests.spec.ts
```

### Før push

```bash
# 1.5 minutter
npx playwright test ui-smoke-tests.spec.ts mock-error-tests.spec.ts
```

### Før merge

```bash
# 10 minutter
npx playwright test
```

### Efter UI refactoring

```bash
# Fokus på smoke tests
npx playwright test ui-smoke-tests.spec.ts --grep "Contract"
```

## 🔍 Debugging

### Se test køre

```bash
npx playwright test --headed
```

### Debug mode

```bash
npx playwright test --debug
```

### Se screenshots/video

```bash
npx playwright show-report
```

## 📊 Test Coverage

### Auth Flows

- ✅ Login med forkert password
- ✅ Login med ugyldig email
- ✅ Registrering med eksisterende email
- ✅ Registrering med ugyldig salon slug
- ✅ Session timeout
- ✅ Rate limiting

### Booking Flows

- ✅ Opret booking (happy path)
- ✅ Dobbeltbooking (race condition)
- ✅ Booking uden for åbningstid
- ✅ Afbestilling efter deadline
- ✅ Omlægning af afsluttet booking

### Error Handling

- ✅ API fejl vises korrekt
- ✅ Network errors håndteres
- ✅ Form data bevares ved fejl
- ✅ Retry fungerer
- ✅ Ingen stuck states

### UI Robustness

- ✅ Alle kritiske elementer findes
- ✅ Loading states fungerer
- ✅ Modaler åbner/lukker
- ✅ Responsivt design (implicit)
- ✅ Accessibility (basal)

## ✅ Checklist for Nye Features

Når du tilføjer en ny feature:

- [ ] Tilføj data-testid til error outlets
- [ ] Tilføj data-testid til form inputs
- [ ] Tilføj data-testid til action buttons
- [ ] Skriv smoke test (UI elementer findes)
- [ ] Skriv mock test (fejlhåndtering)
- [ ] Skriv integration test (happy path)
- [ ] Verificer alle tests passer
- [ ] Opdater dokumentation

## 🎉 Højdepunkter

### Hvad gør denne test suite unik?

1. **Trefoldig strategi:** Smoke + Mock + Integration tests
2. **Fokus på fejl:** 80% af tests dækker fejlscenarier
3. **Stabile selectors:** 40+ data-testid (ikke CSS klasser)
4. **I18N support:** Tests virker med alle sprog
5. **Automatisk debugging:** API logs + screenshots ved fejl
6. **Hurtig feedback:** Smoke tests på 30 sekunder
7. **Comprehensive:** 265+ tests dækker alle flows

## 📞 Support

Ved problemer:

1. Tjek `RUN-GUIDE.md` for fejlfinding
2. Verificer data-testid med browser dev tools
3. Kør tests med `--headed` for at se hvad der sker
4. Tjek screenshots i `test-results/`

---

**Status:** ✅ Klar til brug

**Sidst opdateret:** 2026-02-11

**Næste skridt:** Kør smoke tests og verificér alt virker!

```bash
npx playwright test ui-smoke-tests.spec.ts
```
