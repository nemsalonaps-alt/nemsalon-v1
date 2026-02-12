# Owner/Admin Flow Audit (v1)
Date: 2026-02-03

Scope: Owner/admin setup + operations (salon settings, staff/services, calendar, payments, customers).
Goal: Define the minimum complete "basic flow" for owners/admins and identify gaps + required work.

## 1) Current state (evidence)
- Owner console exists with tabs: home, calendar, create booking, booking details, settings. `apps/web/src/features/console/OwnerConsole.tsx`
- Onboarding flow exists (salon, staff+service, payments, first booking). `apps/web/src/features/onboarding/OnboardingFlow.tsx`
- Customer CRUD endpoints are not implemented. `apps/api/src/modules/content/api/routes.ts:390`
- Salon GET + service GET endpoints are 501. `apps/api/src/modules/content/api/routes.ts:142`, `:204`
- Notifications are stubbed (no actual email/SMS). `apps/api/src/modules/notifications/worker/notifications-worker.ts`
- Stripe connect step is UI-only and checkout uses placeholder URLs. `apps/web/src/features/onboarding/OnboardingFlow.tsx`, `apps/web/src/features/onboarding/api.ts:187`

## 2) Required v1 owner/admin journey (baseline)
1) Login + onboarding (salon settings, staff, services).
2) Configure business hours + staff availability.
3) Create bookings (manual) and view calendar.
4) Manage customers (create/update/view).
5) Payments: enable checkout + handle refund/reconcile.
6) Notifications: confirmation, cancellation, reschedule.

## 3) Gap analysis (owner/admin)
### Critical
- Customer management missing (API + UI).
- Notifications are not delivered.
- Payments setup is not real (no Stripe connect / success/cancel handling).

### High
- Staff working hours not configurable (table exists, no API/UI).
- Missing salon/service GET endpoints (OpenAPI mismatch).
- No confirmation dialogs for destructive actions (cancel/refund).

### Medium
- Copy is mixed DA/EN and includes test placeholders.
- No customer list/search in console.

## 4) API work needed (owner/admin)
- Implement customer CRUD endpoints.
- Implement GET /v1/salons/:id and GET /v1/services/:id.
- (Optional v1.1) Staff working hours endpoints.
- Implement notification sending (Postmark/Twilio).

## 5) UI work needed (owner/admin)
- Customers panel (list + create + edit).
- Booking detail view should include customer contact + payment status.
- Payments setup should be real (Stripe connect + webhook flow).

## 6) Acceptance criteria (v1)
- Owner can create/edit staff + services.
- Owner can manage customers from console.
- Owner can create bookings + open checkout + refund/reconcile.
- Customer notifications are actually delivered.

## 7) Suggested next build steps (owner/admin)
1) Implement customer endpoints + console UI.
2) Implement GET salon/service endpoints.
3) Replace payment setup stub with real Stripe connect flow.
4) Wire notification providers + templates.

