# Staff Flow Audit (v1)
Date: 2026-02-03

Scope: Staff daily operations (view schedule, manage bookings, customer context, time-off, status updates).
Goal: Define the minimum complete "basic flow" for staff and identify gaps + required work.

## 1) Current state (evidence)
- Staff console exists with: list bookings by date, update status (in_progress/completed/no_show). `apps/web/src/features/staff/StaffConsole.tsx`
- Staff access is role-restricted in API (bookings list filtered to own staff profile). `apps/api/src/modules/content/api/routes.ts:402`
- No customer detail view in staff UI (only name/id). `apps/web/src/features/staff/StaffConsole.tsx`
- No staff working hours management (table exists, no API/UI). `supabase/migrations/0001_init.sql:155`
- No staff time-off UI (owner-only in console settings). `apps/web/src/features/console/OwnerConsole.tsx`
- Notifications are stubbed (no actual send). `apps/api/src/modules/notifications/worker/notifications-worker.ts`

## 2) Required v1 staff journey (baseline)
1) Login → staff dashboard.
2) View today's bookings (own schedule).
3) See booking details incl. customer contact + notes.
4) Update booking status (started/completed/no-show).
5) See changes reflected in calendar.
6) Optional: mark time-off (request or self-serve) if allowed.

## 3) Gap analysis (staff)
### Critical
- Customer contact/details not accessible from staff UI.
- No ability to view booking notes or payment status in staff view.

### High
- No staff working hours UI or API; availability uses salon hours only.
- No time-off request/self-management (owner-only).

### Medium
- No confirmation dialogs for status changes (risk of accidental updates).
- UI copy is mixed DA/EN and not role-specific.

## 4) API work needed (staff)
- Ensure booking detail endpoint exposes customer + service + staff names (already in OpenAPI).
- Implement customers GET endpoint for staff lookup.
- (Optional v1.1) Staff time-off self-service endpoint with role guard.

## 5) UI work needed (staff)
- Booking detail panel: customer name, phone, email, notes.
- Display payment status (if available) and service name.
- Clear CTA buttons for status updates with confirmation.

## 6) Acceptance criteria (v1)
- Staff can see their own bookings for a day.
- Staff can open a booking and view customer contact info.
- Staff can update booking status and see updates immediately.

## 7) Suggested next build steps (staff)
1) Implement customer GET + booking detail enrichment in API.
2) Update Staff Console UI to show booking + customer details.
3) Add confirmation UI for status changes.

