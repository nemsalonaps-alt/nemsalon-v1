# QA Master Checklist (E2E, SaaS)

Denne liste er designet til at være totalt fyldestgørende for nuværende system. Alt bør valideres ved release, større ændringer og månedlig regression.

**Scope**
- Alle roller: Platform Admin, Owner, Staff, Customer, Public (ikke logget ind).
- Alle kritiske flows: onboarding, booking, kalender, betaling, notifikationer, impersonation, logout.
- Alle primære knapper og navigationer på tværs af konsoller.
- Alle fallback states: success, loading, error, recovery.

**Forudsætninger (før test)**
- [ ] API kører og svarer på `GET /health`.
- [ ] Web kører på `http://127.0.0.1:5173`.
- [ ] Supabase adgang og nøgler er sat korrekt.
- [ ] Feature flags er dokumenteret og testet både true/false.
- [ ] Testdata er seeded og dokumenteret (salon, services, staff, customers, bookings).
- [ ] Testdata inkluderer kommende, historiske, cancelled og no-show bookinger.
- [ ] Ingen gamle impersonation- eller auth-sessions i localStorage/cookies.
- [ ] Timezone for salon er kendt og konsistent for test.
- [ ] RLS policies er aktive og ikke bypassed.

**Autentifikation og Session**
- [ ] Login med gyldig email/password fungerer for alle roller.
- [ ] Login med forkert password giver tydelig fejl.
- [ ] Login med ukendt email giver tydelig fejl.
- [ ] Logout rydder session og impersonation state.
- [ ] Session timeout håndteres (kræver login igen).
- [ ] Refresh af side bevarer session korrekt.
- [ ] Ugyldig token giver 401/403 og redirect til login.
- [ ] Parallel login i to faner giver konsistent session state.
- [ ] Brug af `DEV_AUTH_BYPASS` virker kun i dev.

**Platform Admin Console**
- [ ] Platform Console loader korrekt ("Platform Admin" header).
- [ ] Salons-listen loader og kan filtreres (status + query).
- [ ] Salon detail loader korrekt (betalinger, audit, bookings).
- [ ] Payments-liste loader med status-filter.
- [ ] Audit-log liste loader og vises korrekt.
- [ ] Console Switcher: Owner vælges og åbner impersonation.
- [ ] Console Switcher: Staff vælges og åbner impersonation.
- [ ] Console Switcher: Customer vælges og åbner impersonation.
- [ ] Impersonation banner vises efter skift.
- [ ] “Return to Admin” virker og rydder impersonation state.
- [ ] Logout fra Platform Console virker.
- [ ] Tomme lister viser tydelig empty state.
- [ ] Fejl i platform data giver error state og recovery state.

**Impersonation (globalt)**
- [ ] Impersonation status endpoint returnerer korrekt status.
- [ ] Impersonation banner vises i Owner Console.
- [ ] Impersonation banner vises i Staff Console.
- [ ] Impersonation banner vises i Customer Portal.
- [ ] “Switch role” virker fra Owner til Staff.
- [ ] “Switch role” virker fra Owner til Customer Portal.
- [ ] “Return to Admin” rydder state og sender tilbage.
- [ ] Impersonation header påvirker ikke /impersonation/status.
- [ ] Logout under impersonation rydder state.
- [ ] Impersonation af brugere uden rolle viser tydelig fejl.

**Owner Console – Navigation og layout**
- [ ] Header viser salon-navn korrekt.
- [ ] Logout knap fungerer.
- [ ] “Back to Platform Admin” vises kun ved impersonation.
- [ ] Navigation tabs: Home, Calendar, Create, Details, Settings kan åbnes.
- [ ] Status messages kan vises og fjernes.
- [ ] Banner er sticky og dækker ikke vigtige knapper.

**Owner Console – Dashboard**
- [ ] KPI: Today Bookings korrekt.
- [ ] KPI: Today Revenue korrekt.
- [ ] KPI: Upcoming Bookings korrekt (Next at).
- [ ] KPI: System Status korrekt.
- [ ] “Create booking” knap går til Create tab.
- [ ] “View calendar” knap går til Calendar tab.
- [ ] KPI matcher kalender data for samme periode.

**Owner Console – Kalender (Dag)**
- [ ] Dagvisning loader korrekt.
- [ ] Navigation frem/tilbage virker.
- [ ] “Today” knap går til dags dato.
- [ ] Booking vises korrekt med tid, kunde, service.
- [ ] Booking klik åbner detaljer.
- [ ] Staff filter “All staff” viser alle.
- [ ] Staff filter for specifik staff virker.
- [ ] Booking med ukendt/udgået staff vises i egen kolonne.

**Owner Console – Kalender (Uge)**
- [ ] Ugevisning viser 7 dage korrekt (mandag som første dag).
- [ ] Alle bookinger i ugen vises.
- [ ] Uge-navigation frem/tilbage virker.
- [ ] Booking klik åbner detaljer.
- [ ] Week header viser korrekt dato-interval.

**Owner Console – Kalender (Måned)**
- [ ] Månedvisning viser alle dage korrekt (mandag som første dag).
- [ ] Bookinger vises i månedsceller.
- [ ] Klik på dag skifter til dagvisning.
- [ ] Måned-navigation frem/tilbage virker.
- [ ] Bookinger tæt på månedsskifte vises på korrekt dag.

**Owner Console – Create Booking**
- [ ] Service dropdown loader og filter for aktive services virker.
- [ ] Staff dropdown loader og viser kun relevante staff.
- [ ] Customer dropdown loader og viser eksisterende kunder.
- [ ] “Add new customer” flow virker (name/email/phone).
- [ ] Check Availability returnerer slots.
- [ ] Valg af slot skaber booking.
- [ ] Booking Created viser checkout link og “Go to calendar”.
- [ ] Custom time booking virker.
- [ ] Validering fejler korrekt ved manglende input.
- [ ] Sletning af valgt service/staff resetter availability state.
- [ ] Fejl ved availability giver error + recovery state.

**Owner Console – Booking Details**
- [ ] Liste af bookings vises.
- [ ] Booking kan åbnes og viser alle felter korrekt.
- [ ] Status ændringer (pending/confirmed/cancelled/complete) virker.
- [ ] Reschedule flow virker.
- [ ] Cancel flow virker og opdaterer status.
- [ ] Refund flow opdaterer betaling status.
- [ ] Booking uden kunde viser korrekt fallback.

**Owner Console – Settings**
- [ ] Staff list vises.
- [ ] Staff oprettelse virker.
- [ ] Staff aktiv/inaktiv virker.
- [ ] Services oprettelse virker.
- [ ] Services aktiv/inaktiv virker.
- [ ] Salon profil (navn, slug, locale) kan opdateres.
- [ ] Business hours kan opdateres.
- [ ] Cancellation window opdateres og håndhæves.
- [ ] Staff services mapping kan gemmes.
- [ ] Staff working hours kan gemmes.
- [ ] Time off kan oprettes og slettes.
- [ ] Error state i settings giver recovery state og bevarer brugerinput.

**Staff Console – Header og navigation**
- [ ] Header viser navn og dato korrekt.
- [ ] “bookinger i dag” count korrekt.
- [ ] Logout virker.
- [ ] Back to Platform Admin vises kun ved impersonation.
- [ ] Banner er sticky og dækker ikke vigtige knapper.

**Staff Console – Booking day view**
- [ ] Booking liste for dagen loader korrekt.
- [ ] Klik på booking åbner detaljer.
- [ ] Booking status kan ændres.
- [ ] Booking detaljer viser kunde og service korrekt.
- [ ] Error state i booking detaljer giver recovery state.

**Staff Console – Working Hours & Time Off**
- [ ] Working hours kan opdateres.
- [ ] Time off kan oprettes og slettes.
- [ ] Kalender respekterer time off.
- [ ] Loading/error/recovery states vises ved datafejl.

**Customer Portal – Login og Profile**
- [ ] Customer login redirecter til /portal.
- [ ] Header viser kundens navn.
- [ ] Logout virker.
- [ ] Profile data loader korrekt.
- [ ] Profil opdatering gemmer og viser success.
- [ ] Fejl i profil update vises korrekt.

**Customer Portal – Bookings**
- [ ] Bookings list vises (upcoming/past/cancelled/all).
- [ ] Booking detail vises korrekt.
- [ ] Cancel booking fungerer inden for window.
- [ ] Cancel booking blokeres inden for window.
- [ ] Reschedule booking viser slots.
- [ ] Reschedule booking opdaterer tid.
- [ ] No-show eller cancelled vises korrekt i historik.
- [ ] Recovery state vises ved fejlede requests.

**Public Booking Flow**
- [ ] Salon slug i URL fungerer.
- [ ] Services loader korrekt.
- [ ] Staff filter virker.
- [ ] Slots loader for valgt dato.
- [ ] Booking oprettes med customer data.
- [ ] Error states (ingen slots, invalid data) vises korrekt.
- [ ] Confirmation URL fungerer.
- [ ] Manage booking URL fungerer.
- [ ] Rate limit fejl vises med recovery.
- [ ] Offline/timeout giver recovery state.

**Onboarding**
- [ ] Gate viser korrekt status.
- [ ] Stepper virker korrekt.
- [ ] Salon setup kan fuldføres.
- [ ] Staff + services step virker.
- [ ] Payments step virker.
- [ ] First booking CTA fungerer.
- [ ] Efter onboarding redirecter til Owner Console.
- [ ] Error i onboarding step giver recovery state.

**Payments**
- [ ] Checkout link genereres korrekt.
- [ ] Mock betaling gennemføres via webhook.
- [ ] Betaling status opdateres korrekt.
- [ ] Refund flow virker.
- [ ] Already paid booking håndteres korrekt.
- [ ] Stripe connect flow returnerer korrekt status.
- [ ] Payout status vises korrekt (hvis relevant).

**Notifications**
- [ ] Email notifikation for booking oprettes.
- [ ] Email ved cancellation sendes.
- [ ] Email ved reschedule sendes.
- [ ] SMS sendes (hvis aktiveret).
- [ ] Notification queue håndterer retries.
- [ ] Fejl i notifier giver recovery state uden datatab.

**Data Integrity**
- [ ] Dobbelt booking for samme staff/time blokkeres.
- [ ] Bookinger respekterer salon business hours.
- [ ] Bookinger respekterer staff working hours.
- [ ] Booking overlap valideres korrekt.
- [ ] Sletning/deaktivering af staff påvirker eksisterende bookings korrekt.
- [ ] Sletning/deaktivering af service påvirker eksisterende bookings korrekt.
- [ ] Booking tider respekterer time zone og DST.

**Security & Permissions**
- [ ] Owner kan kun se egen salon data.
- [ ] Staff kan kun se egne bookings.
- [ ] Customer kan kun se egne bookings.
- [ ] Platform admin kan se alt.
- [ ] RLS brydes ikke ved impersonation.
- [ ] SQL injection input afvises.
- [ ] XSS input sanitiseres.

**Performance & Stability**
- [ ] Kalender loader på under 3 sekunder ved 100+ bookings.
- [ ] Public booking flow loader på under 3 sekunder.
- [ ] API rate limiting reagerer korrekt.
- [ ] 500 errors logges og viser brugervenlig besked.
- [ ] WebSocket/Realtime events (hvis brugt) synkroniserer korrekt.

**Cross‑browser & Devices**
- [ ] Chrome desktop.
- [ ] Safari desktop.
- [ ] Mobile Safari.
- [ ] Mobile Chrome.
- [ ] iPad/tablet layout fungerer.

**Accessibility**
- [ ] Fokus states synlige.
- [ ] Kontrast ok for CTA knapper.
- [ ] Formularfelter kan bruges med tastatur.
- [ ] Tab navigation fungerer.
- [ ] ARIA labels på dialoger og modals.

**Observability & Audit**
- [ ] Audit logs opdateres ved bookings, payments, impersonation.
- [ ] Error logs gemmes ved failures.
- [ ] Sensitive data maskes i logs.

**Fallback States (Success/Loading/Error/Recovery)**
- [ ] Alle tabs viser loading state ved første load.
- [ ] Fejl i API giver error state med retry.
- [ ] Retry viser recovery state uden at fjerne brugerinput.
- [ ] Recovery afsluttes til success state.
- [ ] Globalt netværksnedbrud giver konsistent error state.

**Feature State Matrix (skal opfyldes per feature)**
- [ ] Platform Console: Success state.
- [ ] Platform Console: Loading state.
- [ ] Platform Console: Error state.
- [ ] Platform Console: Recovery state.
- [ ] Impersonation flow: Success state.
- [ ] Impersonation flow: Loading state.
- [ ] Impersonation flow: Error state.
- [ ] Impersonation flow: Recovery state.
- [ ] Owner Dashboard: Success state.
- [ ] Owner Dashboard: Loading state.
- [ ] Owner Dashboard: Error state.
- [ ] Owner Dashboard: Recovery state.
- [ ] Owner Calendar: Success state.
- [ ] Owner Calendar: Loading state.
- [ ] Owner Calendar: Error state.
- [ ] Owner Calendar: Recovery state.
- [ ] Create Booking: Success state.
- [ ] Create Booking: Loading state.
- [ ] Create Booking: Error state.
- [ ] Create Booking: Recovery state.
- [ ] Booking Details: Success state.
- [ ] Booking Details: Loading state.
- [ ] Booking Details: Error state.
- [ ] Booking Details: Recovery state.
- [ ] Staff Console: Success state.
- [ ] Staff Console: Loading state.
- [ ] Staff Console: Error state.
- [ ] Staff Console: Recovery state.
- [ ] Customer Portal: Success state.
- [ ] Customer Portal: Loading state.
- [ ] Customer Portal: Error state.
- [ ] Customer Portal: Recovery state.
- [ ] Public Booking: Success state.
- [ ] Public Booking: Loading state.
- [ ] Public Booking: Error state.
- [ ] Public Booking: Recovery state.
- [ ] Onboarding: Success state.
- [ ] Onboarding: Loading state.
- [ ] Onboarding: Error state.
- [ ] Onboarding: Recovery state.
- [ ] Payments: Success state.
- [ ] Payments: Loading state.
- [ ] Payments: Error state.
- [ ] Payments: Recovery state.

**Data Integrity & Consistency**
- [ ] Booking totals matcher service pris + buffer.
- [ ] Currency er konsistent på booking, payment og dashboard.
- [ ] Status transitions følger gyldig state machine (pending → confirmed → completed).
- [ ] Reschedule skaber ikke dobbeltbooking eller orphan records.
- [ ] Cancel sætter cancel_reason og timestamp korrekt.
- [ ] No-show påvirker revenue korrekt.
- [ ] Staff deletion håndterer eksisterende bookings uden datatab.
- [ ] Customer merge/dedupe (hvis findes) påvirker bookings korrekt.
- [ ] Audit log entries refererer korrekt entityId.

**Notifications & Communications**
- [ ] Booking confirmation email sendes korrekt.
- [ ] Reschedule email sendes korrekt.
- [ ] Cancellation email sendes korrekt.
- [ ] Reminder (hvis aktiveret) sendes korrekt tidsvindue.
- [ ] Fejlede notifikationer retryes og logges.
- [ ] SMS fallback (hvis email mangler) fungerer.

**SaaS Subscription & Billing**
- [ ] Trial → paid transition fungerer.
- [ ] Dunning flow (failed payments) håndteres korrekt.
- [ ] Plan upgrade/downgrade påvirker limits korrekt.
- [ ] Cancellation af abonnement låser features korrekt.
- [ ] Fakturaer genereres og er synlige (hvis relevant).

**Search, Filters & Pagination**
- [ ] Search query matcher på navn + email + phone.
- [ ] Pagination bevarer filters og sortering.
- [ ] Empty search result viser tydelig empty state.
- [ ] Filter kombinationer giver korrekt dataset.

**Localization & Timezone**
- [ ] Locale styrer dato- og tidsformat korrekt.
- [ ] Salon timezone respekteres i alle tider (dashboard, kalender, emails).
- [ ] DST shift vises korrekt i kalender og booking confirmation.

**Role Changes & Lifecycle**
- [ ] Owner kan opgradere staff til admin (hvis relevant).
- [ ] Deaktiveret staff kan ikke logge ind.
- [ ] Deaktiveret staff vises stadig på historiske bookings.
- [ ] Customer deaktiveres uden at slette historik.

**Privacy & Compliance**
- [ ] PII maskeres i logs.
- [ ] Export af data (hvis relevant) følger GDPR.
- [ ] Account deletion fjerner PII men bevarer nødvendige booking data.

**Regression Scenarios (Real‑life)**
- [ ] Ny salon går fra onboarding til første booking uden fejl.
- [ ] Owner opretter booking → customer modtager notifikation → betaling gennemføres → status confirmed.
- [ ] Customer aflyser booking 48 timer før og får refund.
- [ ] Customer forsøger aflysning inden for window og blokeres.
- [ ] Staff tager time off og kalender fjerner slots.
- [ ] Owner rescheduler booking til anden staff.
- [ ] Dobbeltbooking attempt blokkeres.
- [ ] Impersonation: Platform admin → Owner → Staff → Customer → Return to Admin.
- [ ] Booking reschedule flow i Customer Portal fungerer.
- [ ] Public booking uden email men telefon fungerer.
- [ ] Public booking uden kontaktfejl giver korrekt validering.
- [ ] Booking med specialtegn i navn håndteres korrekt.
- [ ] System håndterer 10 samtidige bookings uden fejl.
- [ ] Måned/uge kalender viser korrekt data for bookinger fra KPI “Upcoming Bookings”.
