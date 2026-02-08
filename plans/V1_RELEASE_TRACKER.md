# V1 Release Tracker (Minimum Robust Launch)
Date: 2026-02-03

**Goal**  
Deliver a production‑ready V1 with robust, long‑term foundations.  
Scope decisions: **MobilePay = NO**, **SMS = YES**, **Customer UI = YES**.

---

## Principles (Non‑negotiable)
- **Robustness first**: every feature must be stable and auditable.
- **Security by default**: all endpoints scoped + rate‑limited.
- **Operational clarity**: logs, metrics, and playbooks exist before launch.
- **No hidden shortcuts**: no dev‑only hacks in production paths.
- **Process discipline**: after each implementation, run tests + quality checks and update progress below.

## Quality Gate (after each implementation)
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] Update progress in this tracker (what changed, what’s left)

---

## Environments
- **Local**: Supabase local + Vite + API (dev bypass OK).
- **Staging**: production‑like config, real email/SMS sandbox keys.
- **Production**: locked CORS, real keys, no dev bypass.

---

## Milestones (PR order)
1) **Customer UI + Booking/Payment flow**
2) **Notifications (Email + SMS)**
3) **Staff onboarding + daily usage**
4) **Release readiness (security/ops/tests)**

---

## Tracker (Workstreams)

### A) Customer UI & Booking Flow
- [ ] Customer booking page (availability → booking → payment)
- [ ] Customer can select service, staff, date/time
- [ ] Booking creation persists correctly (salon‑scoped)
- [ ] Checkout link generated and delivered to customer
- [ ] Booking confirmed on payment webhook
- [ ] Customer confirmation page (success state)

### B) Payments (Stripe only)
- [ ] Stripe checkout creation stable + idempotent
- [ ] Webhook verified (signature) + booking confirmed
- [ ] Refund/reconcile flows verified
- [ ] Payment status shown in admin views
- [x] MobilePay completely removed from V1 flow

### C) Notifications (Email + SMS)
- [ ] Email: checkout link
- [ ] SMS: checkout link
- [ ] Email: booking confirmed
- [ ] SMS: booking confirmed
- [ ] Delivery retries/backoff (queue/outbox)
- [ ] Templates are localized (da‑DK default)
- [ ] Audit log for each send

### D) Owner Onboarding (hard gate)
- [ ] Owner must complete onboarding before console access
- [ ] Settings: timezone/locale/currency/cancellation window
- [ ] Business hours + services + staff required
- [ ] Owner can create manual booking and send payment link

### E) Staff Flow (daily usage)
- [ ] Staff invite creates linked auth user + staff_profile
- [ ] Staff can log in and see own dashboard
- [ ] Staff can update booking status (in_progress/completed/no_show)
- [ ] Staff cannot access owner‑only settings

### F) Security & Ops
- [ ] Rate limits on critical endpoints
- [ ] CORS locked to web origin
- [ ] Secrets scanning + Dependabot in CI
- [ ] Backup/restore checklist tested monthly
- [ ] Structured logs + requestId + error_events
- [ ] Health/readiness endpoints verified

### G) QA & Tests
- [ ] Cross‑tenant tests passing (availability, booking, staff/services)
- [ ] Critical path tests passing (booking → payment → confirm)
- [ ] Manual staging smoke test checklist
- [ ] No P1/P2 bugs open

### H) i18n (DA + EN)
- [x] System supports Danish + English in onboarding + owner console UI
- [x] Locale selection stored on salon (already exists) and applied in onboarding
- [ ] Copy coverage complete for onboarding + customer UI

### I) Onboarding: 8 Salon Types
- [x] Define 8 salon types
  - Frisørsalon — Klipning, farvning, styling og hårbehandlinger for både damer, herrer og børn
  - Neglesalon — Manicure, pedicure, gelenegle, akrylnegle og negledesign
  - Velvære- og behandlingscenter — Zoneterapi, akupunktur, kropsbehandlinger og holistiske terapier
  - Massageklinik — Afspændingsmassage, sportsmassage, dybdevævsmassage og wellness-behandlinger
  - Tatoveringsstudie — Tatoveringer, piercinger og permanent makeup
  - Barbershop — Herreklipning, skægtrimning, traditionel barbering med barberkniv
  - Spa & Wellness — Kombinerede behandlinger med sauna, massagebad, ansigts- og kropsbehandlinger
  - Kosmetisk klinik — Avancerede skønhedsbehandlinger som laserbehandling, fillers, botox og kemisk peeling
- [x] Onboarding step for selecting salon type
- [x] Type stored on salon and reflected in experience
- [x] Analytics tagged with salon type

### J) Roles (expanded enums only)
**Platform Roles**
```
super_admin | admin | support | dev | billing
```

**Chain Roles**
```
chain_owner | chain_admin | regional_manager | viewer
```

**Salon/Staff Roles**
```
owner | admin | manager | staff | receptionist
```

> Note: This section is about **role enums only**, not permissions. Permission design is tracked separately.

---

## Minimum Go‑Live Criteria (Definition of Done)
- All items in sections A–G complete.
- Customer can book + pay via Stripe end‑to‑end.
- Notifications (email + SMS) deliver correctly.
- Owner + staff flows work without manual DB edits.
- Security gates (rate limits, CORS, secrets) enabled.
- Staging passes smoke tests and critical tests green.

---

## Test Matrix (must pass)
- [ ] Customer booking flow (service → staff → time → payment → confirm)
- [ ] Payment webhook replay is idempotent
- [ ] Manual booking + send checkout link to customer
- [ ] Staff can update status; owner‑only actions forbidden
- [ ] Cross‑tenant access denied

---

## Risks / Open Questions
- [ ] SMS provider choice + pricing confirmed?
- [ ] Customer UI design ready for production?
- [ ] Refund policy in V1 (manual vs auto)?
- [ ] Support workflow for “paid but not confirmed”?

---

## Change Log
- 2026‑02‑03: V1 tracker created (MobilePay=NO, SMS=YES, Customer UI=YES)
- 2026‑02‑03: Added i18n + salon types + expanded role enums to V1 scope
- 2026‑02‑03: Implemented DA/EN i18n (onboarding + owner console) and salon types (DB/API/UI); OpenAPI/SDK updated; tests: lint/typecheck/test (API tests skipped)
- 2026‑02‑03: Tagged onboarding analytics with salonType; applied migration 0012; tests: lint/typecheck/test (API tests skipped)
- 2026‑02‑03: Fixed locale propagation for day labels/validation and moved onboarding.started to salon save; tests: lint/typecheck/test (API tests skipped)
