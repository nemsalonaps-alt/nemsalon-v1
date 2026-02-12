# E2E Tests (Playwright)

Kører end‑to‑end tests mod lokal web + API.

**Kørsel**
- `pnpm install`
- `pnpm e2e:install`
- `pnpm e2e:local` (auto‑detecter kørende servers)

**Hvad der sker**
- Playwright starter `apps/api` og `apps/web` automatisk.
- Dev data resettes og seeds via `/v1/dev/reset` og `/v1/dev/setup`.

**Bemærk**
- Tests forventer `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` i `.env.local`.
- Public booking test stopper før ekstern mock checkout (`https://checkout.mock`).
- Hvis du allerede kører API/Web manuelt, så brug `E2E_USE_RUNNING=1 pnpm e2e` for at skippe Playwrights webServer‑start.
- Brug `docs/qa/scenarios.md` for manuelle real‑life flows ud over automatiserede tests.
