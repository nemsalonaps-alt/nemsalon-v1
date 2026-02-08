# Customer Flow Audit (v1)
Date: 2026-02-03

Scope: Customer-facing booking + payment + confirmation + self-service flows.
Goal: Define the minimum complete "basic flow" for customers, identify gaps, and list required UI/API work.

## 1) Current state (evidence)
- No customer UI exists. Web entry routes only to owner/staff consoles. `apps/web/src/index.tsx`
- Mobile app is empty. `apps/mobile/src/index.tsx`
- API is fully authenticated (owner/admin/staff). No public booking endpoints. `apps/api/src/modules/content/api/routes.ts`
- Customer CRUD endpoints are not implemented. `apps/api/src/modules/content/api/routes.ts:390`
- Notifications are stubbed (worker only logs). `apps/api/src/modules/notifications/worker/notifications-worker.ts`
- Stripe checkout URLs in onboarding use placeholders. `apps/web/src/features/onboarding/api.ts:187`

## 2) Required v1 customer journey (baseline)
A "complete" customer flow should include:
1) Entry: Public booking page for a salon (shareable link).
2) Service selection: list services + durations + prices.
3) Staff selection: choose staff or "any".
4) Time selection: availability slots from API.
5) Customer details: name, email, phone, consent/terms.
6) Payment: Stripe Checkout (or pay in store if disabled).
7) Confirmation: booking summary + receipt + calendar invite (optional).
8) Self-service: reschedule/cancel within policy.
9) Notifications: email/SMS confirmations and updates.

## 3) Gap analysis (customer-specific)
### Critical
- No customer UI or route exists (web + mobile). Must be added.
- No public booking API (auth-only). Need a public token or signed link strategy.
- Customer CRUD endpoints are 501 (no direct profile create/update for customer self-service).
- Notifications are not actually delivered (email/SMS integration missing).

### High
- Payments are configured only in onboarding (owner side). No customer-facing payment flow.
- Cancellation/reschedule policy not enforced in API (cancellation window exists in DB but unused).
- No consent/terms collection for GDPR.

### Medium
- No localized copy for customer-facing flow; existing copy is mixed DA/EN.
- No modals/dialogs for user confirmations (cancel/reschedule/payment fail).

## 4) API work needed for customer flow
### New public endpoints (suggested)
- POST /v1/public/booking-intent
  - Input: salonSlug, serviceId, staffId?, dateTime
  - Output: bookingIntentId + short-lived token
- GET /v1/public/availability
  - Input: salonSlug, serviceId, staffId?, from, days
- POST /v1/public/bookings
  - Input: bookingIntentId, customer details, notes, consent flags
  - Output: bookingId, status, paymentRequired
- POST /v1/public/bookings/{id}/checkout
  - Input: successUrl, cancelUrl
  - Output: checkoutUrl
- GET /v1/public/bookings/{id}
  - Input: bookingAccessToken
  - Output: booking summary
- POST /v1/public/bookings/{id}/cancel
- POST /v1/public/bookings/{id}/reschedule

### Existing endpoints to implement
- POST /v1/customers
- GET /v1/customers/:id
- PATCH /v1/customers/:id

## 5) UI work needed (web)
### New pages
- /book/:salonSlug (public booking)
- /book/:salonSlug/confirmation/:bookingId
- /book/:salonSlug/manage/:bookingId?token=...

### Required components
- Service list + staff picker
- Availability slot picker
- Customer details form
- Payment state (redirect to Stripe + return state)
- Booking summary + receipt info

## 6) Modals & dialogs (customer)
- Confirm cancel (shows policy + refund status)
- Confirm reschedule (shows old vs new time)
- Payment failed (retry / contact salon)
- Consent/terms disclosure (checkbox with link)

## 7) Copy checklist (customer)
- Booking status: pending, confirmed, cancelled, rescheduled
- Payment states: required, processing, succeeded, failed
- Policy text: cancellation window + refund policy
- Notifications: email/SMS templates for confirmation/cancellation/reschedule

## 8) Acceptance criteria (v1)
- A customer can complete a booking from a public link without logging in.
- Payments go through Stripe Checkout and confirm booking on webhook.
- Customer receives confirmation (email; SMS if enabled).
- Customer can cancel/reschedule within the salon policy window.
- All flows have clear error states and confirmation modals.

## 9) Suggested next build steps (customer)
1) Define public booking security model (signed link + token). 
2) Add public availability + booking endpoints.
3) Build public booking UI (web first).
4) Integrate Stripe Checkout return flow.
5) Implement notification delivery (Postmark/Twilio).
6) Add cancel/reschedule + policy enforcement.

