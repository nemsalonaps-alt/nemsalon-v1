# Real-life QA Scenarios

Formålet er at teste komplekse, virkelige flows end-to-end. Brug disse scenarier sammen med seed-data, og dokumentér resultat + eventuelle afvigelser.

**Scenario 1: Første salon går live**
- [ ] Opret ny salon via onboarding.
- [ ] Opret service og staff.
- [ ] Tilføj business hours.
- [ ] Gennemfør Stripe connect (eller mock).
- [ ] Opret første booking via Owner Console.
- [ ] Bekræft booking status og notification.

**Scenario 2: Kunde booking → betaling → status**
- [ ] Public booking via salon slug.
- [ ] Vælg service, staff og tid.
- [ ] Gennemfør checkout (mock).
- [ ] Bekræft booking status = confirmed.
- [ ] Åbn booking i Owner Console og verificér data.

**Scenario 3: Kunde aflyser inden for window**
- [ ] Opret booking 48 timer frem.
- [ ] Log ind som kunde.
- [ ] Aflys booking inden for window.
- [ ] Verificér refund og status = cancelled.

**Scenario 4: Kunde forsøger for sen aflysning**
- [ ] Opret booking tæt på starttid (inden for cancellation window).
- [ ] Forsøg aflysning i Customer Portal.
- [ ] Verificér blokering + korrekt besked.

**Scenario 5: Reschedule flow**
- [ ] Opret booking via Owner Console.
- [ ] Reschedule via Customer Portal.
- [ ] Verificér ny tid i kalender + korrekt status.

**Scenario 6: Staff time off påvirker slots**
- [ ] Opret time off for staff.
- [ ] Tjek availability i public booking.
- [ ] Verificér at slots er fjernet.

**Scenario 7: Dobbeltbooking forhindres**
- [ ] Opret booking for staff på specifik tid.
- [ ] Forsøg at oprette anden booking på samme tid.
- [ ] Verificér at overlap blokkeres.

**Scenario 8: Impersonation kæde**
- [ ] Platform admin impersonates owner.
- [ ] Switch til staff.
- [ ] Switch til customer.
- [ ] Return to admin.
- [ ] Verificér at session state er renset.

**Scenario 9: Staff arbejder på dagen**
- [ ] Log ind som staff.
- [ ] Start booking → status in_progress.
- [ ] Markér færdig → status completed.
- [ ] Markér no-show på anden booking.

**Scenario 10: Datafejl + recovery**
- [ ] Simulér API fejl (fx slå API fra).
- [ ] Verificér loading/error/recovery state i Owner og Staff.
- [ ] Genopret API og brug retry.
- [ ] Verificér recovery til success state.

**Scenario 11: Inaktive staff og services**
- [ ] Deaktivér staff og service.
- [ ] Verificér at de ikke kan vælges i Create Booking.
- [ ] Eksisterende bookinger vises stadig korrekt i kalender.

**Scenario 12: Timezone/DST edge case**
- [ ] Opret booking omkring DST skifte (±1 time).
- [ ] Verificér korrekt visning i kalender.
- [ ] Verificér korrekt tider i emails.

**Scenario 13: Multi-staff + parallel bookings**
- [ ] Opret 3 staff med overlap i arbejdstider.
- [ ] Opret 5 bookings samtidig på forskellige staff.
- [ ] Verificér at alle vises korrekt i uge- og månedskalender.
- [ ] Verificér at staff-filter viser korrekt subset.

**Scenario 14: Walk-in + manual override**
- [ ] Opret walk-in booking med kun navn + telefon.
- [ ] Markér status in_progress → completed.
- [ ] Verificér revenue på dashboard opdateres.

**Scenario 15: Payment failure → retry**
- [ ] Opret booking med checkout.
- [ ] Simulér failed payment.
- [ ] Verificér status = pending/failed.
- [ ] Retry payment og verificér status = confirmed.

**Scenario 16: Partial refund**
- [ ] Opret booking med betaling.
- [ ] Refunder delvist.
- [ ] Verificér payment status og booking note.
- [ ] Verificér dashboard revenue korrekt.

**Scenario 17: Staff time off + reschedule**
- [ ] Opret booking 3 dage frem.
- [ ] Sæt time off der overlapper bookingen.
- [ ] Reschedule booking til andet tidspunkt/staff.
- [ ] Verificér at gamle slot er fri og ny slot er låst.

**Scenario 18: Cancellation window enforcement**
- [ ] Sæt cancellation window til 24 timer.
- [ ] Opret booking 12 timer frem.
- [ ] Kunde forsøger aflysning.
- [ ] Verificér at aflysning blokeres korrekt.

**Scenario 19: Impersonation failure**
- [ ] Platform admin forsøger at impersonate user uden rolle.
- [ ] Verificér tydelig fejl + recovery state.
- [ ] Verificér at state ikke “hænger” i localStorage.

**Scenario 20: Concurrent edits**
- [ ] Åbn samme booking i to faner.
- [ ] Ændr status i fane A.
- [ ] Verificér fane B viser opdateret status efter refresh.

**Scenario 21: Locale switch**
- [ ] Skift salon locale til EN.
- [ ] Verificér datoformat, labels, og valideringsfejl.
- [ ] Skift tilbage til DA og verificér igen.

**Scenario 22: Multi-salon platform admin**
- [ ] Platform admin vælger salon A → impersonate owner.
- [ ] Returner til admin → vælg salon B → impersonate owner.
- [ ] Verificér at data ikke lækker mellem saloner.
