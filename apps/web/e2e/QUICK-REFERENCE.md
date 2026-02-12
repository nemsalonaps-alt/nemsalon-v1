# 🧪 Hurtig Reference - Kør Alle Tests

## One-Liners

```bash
# Kør ALT (15 minutter)
pnpm run test:all

# Kør kun hurtige tests (2 minutter)
pnpm run test:unit && pnpm run test:e2e:smoke

# Kør som CI (ingen prompts)
pnpm run test:ci
```

## Komplet Test Suite

### Trin 1: Forberedelse

```bash
# Sikr at servere kører
pnpm run dev:api   # Terminal 1
pnpm run dev:web   # Terminal 2
```

### Trin 2: Kør Tests

```bash
# Fra projekt root
pnpm run test:all
```

### Hvad kører den?

```
✅ TypeScript type checking (10s)
✅ ESLint linting (20s)
✅ Unit tests - API (1m)
✅ Contract tests - API (20s)
✅ Smoke tests - UI (30s)
✅ Mock tests - UI (2m)
✅ Integration tests - UI (10m)
─────────────────────────────────
Total: 265+ tests på ~15 minutter
```

## Alternative Måder

### Brug Script

```bash
./scripts/test-all.sh

# Med options
./scripts/test-all.sh --quick      # Skip E2E
./scripts/test-all.sh --skip-e2e   # Skip E2E
./scripts/test-all.sh --ci         # CI mode
```

### Manuel Sekvens

```bash
# Step-by-step (hvis du vil se progress)
pnpm run typecheck      # 1. Types
pnpm run lint           # 2. Lint
pnpm run test:unit      # 3. Unit tests
pnpm run test:e2e:smoke # 4. Smoke tests
pnpm run test:e2e:mock  # 5. Mock tests
pnpm run test:e2e       # 6. Integration tests
```

## Hyppige Scenarier

### Før Commit (30 sek)

```bash
pnpm run test:e2e:smoke
```

### Før Push (3 min)

```bash
pnpm run test:unit && pnpm run test:e2e:smoke && pnpm run test:e2e:mock
```

### Før Merge (15 min)

```bash
pnpm run test:all
```

### Ved Refactoring

```bash
# UI ændringer
pnpm run test:e2e:smoke

# API ændringer
pnpm run test:unit

# Begge
pnpm run test:unit && pnpm run test:e2e:smoke
```

## Fejlfinding

### Tests fejler

```bash
# Se hvad der sker
pnpm run test:e2e:headed

# Debug mode
pnpm run test:e2e:debug

# Se screenshots
npx playwright show-report
```

### Servere kører ikke

```bash
# Start API
pnpm run dev:api

# Start Web (ny terminal)
pnpm run dev:web
```

### Vil kun køre specifikke tests

```bash
# Kun auth tests
pnpm run test:e2e -- auth-errors.spec.ts

# Kun login tests
pnpm run test:e2e -- --grep "login"

# Kun smoke tests
pnpm run test:e2e:smoke
```

## Test Kommandoer Cheat Sheet

| Kommando               | Hvad den gør    | Tid |
| ---------------------- | --------------- | --- |
| `test:all`             | ALT             | 15m |
| `test:sequential`      | ALT sekventielt | 15m |
| `test:parallel`        | ALT parallel    | 10m |
| `test:ci`              | ALT (CI mode)   | 15m |
| `test:unit`            | Unit tests      | 1m  |
| `test:unit:contract`   | Contract tests  | 20s |
| `test:e2e`             | Alle E2E        | 10m |
| `test:e2e:smoke`       | Smoke tests     | 30s |
| `test:e2e:mock`        | Mock tests      | 2m  |
| `test:e2e:integration` | Integration     | 10m |
| `test:preflight`       | Smoke tests     | 30s |

## Miljø Krav

Før du kører `test:all`:

- [ ] Node.js 20+ installeret
- [ ] pnpm 9+ installeret
- [ ] Dependencies installeret (`pnpm install`)
- [ ] Playwright browsers installeret (`pnpm run e2e:install`)
- [ ] API server kører (`pnpm run dev:api`)
- [ ] Web server kører (`pnpm run dev:web`)
- [ ] Supabase kører (`pnpm run supabase:start`)

## Output Interpretation

### Success

```
✅ Type Checking
✅ Linting
✅ Unit Tests
✅ Contract Tests
✅ Smoke Tests
✅ Mock Tests
✅ Integration Tests

🎉 All tests passed!
```

### Failure

```
✅ Type Checking
✅ Linting
❌ Unit Tests

Please fix the failing tests before committing.
```

## Tips

1. **Start med smoke tests** - Hurtigste feedback
2. **Kør fuld suite før push** - Sikrer kvalitet
3. **Brug `--quick` mode** - Hvis du vil skippe E2E
4. **Check server status** - Tests fejler uden servere
5. **Se screenshots** - Ved E2E fejl

## Support

Se detaljeret guide i:

- `RUN-ALL-TESTS.md` - Komplet guide
- `RUN-GUIDE.md` - Kørsel guide
- `COMPLETE-SUMMARY.md` - Test suite oversigt

---

**Klar til at køre tests?**

```bash
pnpm run test:all
```
