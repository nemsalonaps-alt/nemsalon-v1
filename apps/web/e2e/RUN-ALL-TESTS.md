# Kør Alle Tests - Guide

Denne guide forklarer hvordan du kører **ALLE** tests i Nemsalon projektet på én gang.

## 🚀 Hurtig Start

### Kør ALLE tests (anbefalet)

```bash
# Kør alle tests sekventielt (sikrest)
pnpm run test:all

# Eller brug scriptet direkte
./scripts/test-all.sh
```

### Hvad kører `test:all`?

1. ✅ TypeScript type checking
2. ✅ ESLint linting
3. ✅ Unit tests (Vitest - API)
4. ✅ Contract tests (Vitest - API)
5. ✅ Smoke tests (Playwright - UI)
6. ✅ Mock tests (Playwright - mocked API)
7. ✅ Integration tests (Playwright - real API)

**Total: 265+ tests**

## 📋 Tilgængelige Kommandoer

### Hovedkommandoer

```bash
# Kør ALLE tests (komplet suite)
pnpm run test:all

# Kør tests sekventielt (sikrest)
pnpm run test:sequential

# Kør tests i parallel (hurtigere, men kan være flaky)
pnpm run test:parallel

# Kør som i CI miljø
pnpm run test:ci
```

### Specifikke Test Typer

```bash
# Unit tests (Vitest)
pnpm run test:unit
pnpm run test:unit:contract
pnpm run test:unit:watch

# E2E tests (Playwright)
pnpm run test:e2e              # Alle E2E tests
pnpm run test:e2e:smoke        # Kun smoke tests (hurtigst)
pnpm run test:e2e:mock         # Kun mock tests
pnpm run test:e2e:integration  # Kun integration tests
pnpm run test:e2e:full         # Alle E2E tests (alias)

# Preflight (hurtigt tjek før commit)
pnpm run test:preflight        # Samme som test:e2e:smoke
```

### Udviklings Kommandoer

```bash
# Med UI (visuel debugging)
pnpm run test:e2e:headed

# Debug mode (step-through)
pnpm run test:e2e:debug

# Se HTML rapport
pnpm run test:e2e:report
```

## 🔧 Test Runner Script

### Brug test-all.sh scriptet

```bash
# Kør alle tests
./scripts/test-all.sh

# Quick mode (skip E2E og lint)
./scripts/test-all.sh --quick

# Skip specifikke test typer
./scripts/test-all.sh --skip-e2e
./scripts/test-all.sh --skip-unit
./scripts/test-all.sh --skip-lint
./scripts/test-all.sh --skip-typecheck

# CI mode (ingen prompts)
./scripts/test-all.sh --ci

# Vis hjælp
./scripts/test-all.sh --help
```

### Script Features

✅ **Automatisk server check** - Advarer hvis API/Web ikke kører  
✅ **Farvet output** - Grøn/rød/gul for nem oversigt  
✅ **Progress tracking** - Viser hvilke tests kører  
✅ **Detaljeret summary** - Pass/fail count til sidst  
✅ **Fejl stop** - Stopper ved kritisk fejl (type errors)

## 🎯 Test Strategi efter Situation

### 1. Under Aktiv Udvikling (hurtigt)

```bash
# Kør smoke tests hver gang du gemmer (30 sek)
pnpm run test:e2e:smoke

# Og unit tests
pnpm run test:unit
```

### 2. Før Commit (standard)

```bash
# Kør preflight tests
pnpm run test:preflight

# Eller alle unit tests
pnpm run test:unit
```

### 3. Før Push (komplet)

```bash
# Kør alle tests
pnpm run test:all

# Eller manuelt:
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:e2e:smoke
pnpm run test:e2e:mock
```

### 4. Før Merge til Main (fuld)

```bash
# Kør komplet test suite
pnpm run test:all

# Eller CI kommandoen
pnpm run test:ci
```

### 5. Ved Refactoring (sikkerhed)

```bash
# Fokus på smoke tests for UI ændringer
pnpm run test:e2e:smoke

# Fokus på unit tests for API ændringer
pnpm run test:unit

# Kombineret
pnpm run test:unit && pnpm run test:e2e:smoke
```

## 📊 Test Kategorier Explained

### 1. Type Checking (`pnpm run typecheck`)

- **Tid:** 10-20 sekunder
- **Formål:** Sikrer ingen TypeScript fejl
- **Vigtigt:** Stopper build hvis fejl

### 2. Linting (`pnpm run lint`)

- **Tid:** 15-30 sekunder
- **Formål:** Kodestil og potentielle bugs
- **Vigtigt:** Vedligeholder kodekvalitet

### 3. Unit Tests (`pnpm run test:unit`)

- **Tid:** 30-60 sekunder
- **Formål:** Test API logik i isolation
- **Vigtigt:** Hurtig feedback på bugs

### 4. Contract Tests (`pnpm run test:unit:contract`)

- **Tid:** 10-20 sekunder
- **Formål:** Verificerer API kontrakter
- **Vigtigt:** Sikrer API ikke ændrer sig uventet

### 5. Smoke Tests (`pnpm run test:e2e:smoke`)

- **Tid:** 30-60 sekunder
- **Formål:** Verificerer UI elementer findes
- **Vigtigt:** Fanger manglende knapper/inputs

### 6. Mock Tests (`pnpm run test:e2e:mock`)

- **Tid:** 1-2 minutter
- **Formål:** Test fejlhåndtering med mocked API
- **Vigtigt:** Deterministiske fejlscenarier

### 7. Integration Tests (`pnpm run test:e2e`)

- **Tid:** 5-10 minutter
- **Formål:** Test mod rigtig backend
- **Vigtigt:** Fanger integration bugs

## ⏱️ Tids Estimater

| Kommando         | Tid | Tests |
| ---------------- | --- | ----- |
| `test:e2e:smoke` | 30s | 25+   |
| `test:unit`      | 1m  | 50+   |
| `test:e2e:mock`  | 2m  | 15+   |
| `test:e2e`       | 10m | 225+  |
| `test:all`       | 15m | 265+  |

## 🔍 Fejlfinding

### Tests fejler

**Type errors:**

```bash
pnpm run typecheck  # Fix type errors først
```

**Lint errors:**

```bash
pnpm run lint       # Fix lint errors
pnpm run format     # Auto-fix med prettier
```

**Unit test fejl:**

```bash
cd apps/api
pnpm run test       # Kør med verbose output
```

**E2E test fejl:**

```bash
# Kør med headed mode for at se hvad der sker
pnpm run test:e2e:headed

# Debug mode
pnpm run test:e2e:debug

# Se screenshots
npx playwright show-report
```

### Tests hænger

**Tjek om servere kører:**

```bash
curl http://localhost:3000/health  # API
curl http://localhost:5173         # Web
```

**Start servere:**

```bash
# Terminal 1
pnpm run dev:api

# Terminal 2
pnpm run dev:web
```

### Flaky tests

**Kør tests sekventielt:**

```bash
pnpm run test:sequential
```

**Kun smoke tests:**

```bash
pnpm run test:e2e:smoke
```

**Øg timeouts:**

```bash
# I playwright.config.ts
expect: { timeout: 20000 }  # Fra 10s til 20s
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Complete Test Suite

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
        run: pnpm run e2e:install

      - name: Run all tests
        run: pnpm run test:ci

      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
```

### Git Hooks (Husky)

```bash
# .husky/pre-commit
pnpm run test:preflight
```

```bash
# .husky/pre-push
pnpm run test:all
```

## 📈 Test Performance Tips

### Hurtigere tests

1. **Kør smoke tests først** (fail fast)
2. **Brug mock tests** (ingen backend latency)
3. **Parallel kørsel** (hvis ikke flaky)
4. **Cache node_modules**

### Optimering

```bash
# Kun ændrede filer
pnpm run test:unit -- --changed

# Specifik test fil
pnpm run test:e2e -- auth-errors.spec.ts

# Specifik test
pnpm run test:e2e -- --grep "login fejl"
```

## 🎓 Best Practices

1. **Kør smoke tests ofte** (før hver commit)
2. **Kør fuld suite før push** (sikrer kvalitet)
3. **Fix fejl straks** (ikke lad dem akkumulere)
4. **Brug test:e2e:headed** til debugging
5. **Opdater tests ved UI ændringer**

## 📞 Support

Ved problemer:

1. Tjek at servere kører (`pnpm run dev:api` og `pnpm run dev:web`)
2. Kør `pnpm run test:e2e:headed` for at se hvad der sker
3. Tjek screenshots i `test-results/`
4. Se logs i terminal output

---

**Husk:** `pnpm run test:all` er din ven! Kør den ofte for at sikre kodekvalitet.
