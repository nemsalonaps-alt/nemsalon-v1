# Test Køre Guide

Denne guide forklarer hvordan du kører både integration tests (Spor A) og mock tests (Spor B).

## Hurtig Start

### Kør alle tests

```bash
npx playwright test
```

### Kør kun integration tests (Spor A)

```bash
npx playwright test auth-errors.spec.ts booking-errors.spec.ts staff-errors.spec.ts customer-errors.spec.ts services-errors.spec.ts settings-errors.spec.ts advanced-errors.spec.ts
```

### Kør kun mock tests (Spor B)

```bash
npx playwright test mock-error-tests.spec.ts
```

### Kør med UI (til debugging)

```bash
npx playwright test --ui
```

## Test Fil Oversigt

### Integration Tests (Spor A)

Tester mod rigtig backend. Kræver at API kører.

| Fil                       | Tests | Beskrivelse                               |
| ------------------------- | ----- | ----------------------------------------- |
| `auth-errors.spec.ts`     | 30+   | Login, registrering, session fejl         |
| `booking-errors.spec.ts`  | 35+   | Booking oprettelse, ændring, afbestilling |
| `staff-errors.spec.ts`    | 30+   | Staff CRUD, invitations, hours            |
| `customer-errors.spec.ts` | 35+   | Kunde management, portal                  |
| `services-errors.spec.ts` | 25+   | Services CRUD, assignments                |
| `settings-errors.spec.ts` | 30+   | Salon indstillinger, business hours       |
| `advanced-errors.spec.ts` | 40+   | Komplekse scenarier, race conditions      |

**Total: 225+ integration tests**

### Mock Tests (Spor B)

Tester UI flows med mocked API. Kræver ikke backend.

| Fil                        | Tests | Beskrivelse                   |
| -------------------------- | ----- | ----------------------------- |
| `mock-error-tests.spec.ts` | 15+   | Auth, booking, recovery flows |

**Total: 15+ mock tests**

### Smoke Tests (UI Contract Tests)

Hurtige tests der verificerer UI elementer findes og fungerer.
Perfekte til at køre før hver commit.

| Fil                      | Tests | Beskrivelse                                         |
| ------------------------ | ----- | --------------------------------------------------- |
| `ui-smoke-tests.spec.ts` | 25+   | UI elementer findes, loading states, error handling |

**Dækker:**

- ✅ Kritiske UI-elementer findes (contract tests)
- ✅ Modaler åbner/lukker korrekt
- ✅ Loading states starter og stopper
- ✅ Error states viser fejl og UI er brugbar
- ✅ Flow completeness (ingen missing steps)
- ✅ No dead ends (ingen stuck states)
- ✅ Data-testid compliance

**Kør smoke tests:**

```bash
# Kør smoke tests (hurtige - ca. 30 sekunder)
npx playwright test ui-smoke-tests.spec.ts

# Kør smoke tests i headed mode
npx playwright test ui-smoke-tests.spec.ts --headed
```

**Total: 25+ smoke tests**

## Miljø Opsætning

### 1. Start udviklings servere

```bash
# Terminal 1: Start API
cd apps/api && pnpm dev

# Terminal 2: Start Web
cd apps/web && pnpm dev
```

### 2. Verificer servere kører

- API: http://localhost:3000/health
- Web: http://localhost:5173

### 3. Kør tests

```bash
# Fra projekt root
npx playwright test
```

## Specifikke Test Scenarier

### Auth Tests

```bash
# Alle auth tests
npx playwright test auth-errors.spec.ts

# Kun login fejl
npx playwright test --grep "Login Errors"

# Kun registrering fejl
npx playwright test --grep "Registration"
```

### Booking Tests

```bash
# Alle booking tests
npx playwright test booking-errors.spec.ts

# Kun oprettelse fejl
npx playwright test --grep "Booking Creation"

# Kun afbestilling fejl
npx playwright test --grep "Cancellation"
```

### Mock Tests

```bash
# Alle mocked tests
npx playwright test mock-error-tests.spec.ts

# Kun mocked auth
npx playwright test --grep "Auth Error Flows - Mocked"

# Kun mocked booking
npx playwright test --grep "Booking Error Flows - Mocked"
```

### Smoke Tests

```bash
# Alle smoke tests
npx playwright test ui-smoke-tests.spec.ts

# Kun UI element contract tests
npx playwright test --grep "Kritiske UI-elementer findes"

# Kun loading state tests
npx playwright test --grep "loading state"

# Kun error state tests
npx playwright test --grep "Error states"

# Kun flow completeness tests
npx playwright test --grep "Flow Completeness"

# Kun no dead-end tests
npx playwright test --grep "No Dead Ends"
```

## Test Strategi - Hvornår kører du hvad?

### Før hver commit (hurtigt)

```bash
# 1. Smoke tests først (30 sek)
npx playwright test ui-smoke-tests.spec.ts

# 2. Mock tests (1 min)
npx playwright test mock-error-tests.spec.ts
```

### Før push til branch (komplet)

```bash
# Kør alle tests
npx playwright test
```

### CI/CD Pipeline

```bash
# Step 1: Smoke tests (fail fast)
npx playwright test ui-smoke-tests.spec.ts

# Step 2: Mock tests
npx playwright test mock-error-tests.spec.ts

# Step 3: Integration tests
npx playwright test auth-errors.spec.ts booking-errors.spec.ts

# Step 4: Resten
npx playwright test
```

### Ved refactoring af UI

```bash
# Fokus på smoke tests for at sikre UI elementer stadig findes
npx playwright test ui-smoke-tests.spec.ts --grep "Contract"
```

### Ved ændring af auth flow

```bash
# Kør auth tests + smoke tests
npx playwright test auth-errors.spec.ts ui-smoke-tests.spec.ts
```

## Debugging

### Se test køre i browser

```bash
npx playwright test --headed
```

### Debug mode (step-through)

```bash
npx playwright test --debug
```

### Kør specifik test med debugging

```bash
npx playwright test --grep "viser fejl ved forkert password" --debug
```

### Se screenshots og video

Efter test kørsel:

```bash
# Åbn HTML report
npx playwright show-report

# Eller se filer direkte
ls test-results/
```

## CI/CD Integration

### GitHub Actions

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

      - name: Run integration tests
        run: npx playwright test --project=chromium
        env:
          E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}

      - name: Run mock tests
        run: npx playwright test mock-error-tests.spec.ts

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Strategi

### Daglig udvikling

```bash
# Kør hurtige mock tests først
npx playwright test mock-error-tests.spec.ts

# Hvis de passer, kør integration tests
npx playwright test
```

### Før commit

```bash
# Kør relevante tests baseret på ændringer
# Hvis du har ændret auth kode:
npx playwright test auth-errors.spec.ts mock-error-tests.spec.ts

# Hvis du har ændret booking kode:
npx playwright test booking-errors.spec.ts
```

### Før release

```bash
# Kør alle tests
npx playwright test

# Kør kun smoke tests (hurtige UI checks)
npx playwright test ui-smoke-tests.spec.ts

# Kør smoke tests først, så fulde test suite
npx playwright test ui-smoke-tests.spec.ts && npx playwright test
```

## Fejlfinding

### Tests fejler lokalt

1. Verificer servere kører
2. Tjek `.env.local` har korrekte værdier
3. Kør med `--headed` for at se hvad der sker
4. Tjek screenshots i `test-results/`

### Flaky tests

- Kør med `--retries=2`
- Tjek om test er afhængig af specifik data
- Verificer test data seeding fungerer

### Timeout errors

- Øg timeout i `playwright.config.ts`
- Tjek om API er langsom
- Kør færre tests parallelt

## Parallel Kørsel

### Kør tests parallelt (hurtigere)

```bash
# Kør alle tests parallelt
npx playwright test --workers=4

# Bemærk: Integration tests kræver workers=1 hvis de deler state
```

### Kør tests sekventielt (sikrere)

```bash
# Kør én test ad gangen
npx playwright test --workers=1
```

## Resultater

### Se HTML rapport

```bash
npx playwright show-report
```

### Eksporter resultater

```bash
# JSON format
npx playwright test --reporter=json > results.json

# JUnit format (til CI)
npx playwright test --reporter=junit > results.xml
```

## Tips

1. **Brug `--grep` til at filtrere tests**

   ```bash
   npx playwright test --grep "salon_not_found"
   ```

2. **Kun failed tests**

   ```bash
   npx playwright test --last-failed
   ```

3. **Opdater snapshots**

   ```bash
   npx playwright test --update-snapshots
   ```

4. **Liste alle tests uden at køre**
   ```bash
   npx playwright test --list
   ```

## Support

Hvis tests fejler:

1. Tjek `test-results/` for screenshots og video
2. Kør med `--debug` for step-through
3. Verificer test data er korrekt seedet
4. Tjek om UI komponenter har korrekte `data-testid`
