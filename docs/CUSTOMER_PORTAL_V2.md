# NEMSalon Customer Portal v2

> **Filosofi**: Kunden vil have "min tid" – ikke en ny app at lære.
>
> **Kerneprincip**: Booking-first, ikke menu-first.

---

## Overblik

Denne dokumentation beskriver den nye customer portal struktur, optimeret til den danske salon-kunde. Strukturen er baseret på én simpel sandhed: **kunden vil have kontrol og tryghed uden at lære en ny app**.

### Hvad kunden faktisk vil have (prioritet 1-10)

1. **Mine bookinger** (kernen) - 70% af behovet
2. **Kvitteringer** (meget vigtig i DK)
3. **Profil** (kun det nødvendige)
4. **Notifikationer** (must-have, men simpelt)
5. **Favoritter** (nice, men giver retention)
6. **Settings** (low value, men nødvendig)

---

## Folder Struktur

```
/src/features/customer-portal/
├── index.ts                    # Public exports
├── api.ts                      # API calls (beholdes som den er)
├── portal.css                  # Shared styles
│
├── routes/
│   ├── Portal.tsx              # Main router/container
│   ├── Register.tsx            # Customer registration
│   └── Dashboard.tsx           # Token-baseret booking view (beholdes)
│
├── pages/
│   ├── BookingsPage.tsx        # MUST: Landing page - "min tid"
│   ├── ReceiptsPage.tsx        # MUST: Kvitteringer med PDF
│   ├── ProfilePage.tsx         # MUST: Navn, email, telefon, samtykker
│   ├── NotificationsPage.tsx   # MUST: SMS/email toggles
│   ├── SettingsPage.tsx        # MUST: Sprog, slet konto, logout
│   └── FavoritesPage.tsx       # NICE: Gemte saloner
│
└── later/                      # LATER features (prep only)
    ├── GiftCardsPage.tsx       # Gavekort
    ├── ClipCardsPage.tsx       # Klippekort
    ├── LoyaltyPage.tsx         # Loyalitetsprogram
    └── ReferralsPage.tsx       # Henvisninger
```

---

## Routes

### MUST (Core)

| Route                    | Beskrivelse                                                                                                                                     | Prioritet |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `/account/bookings`      | Landing page. Kommende bookinger øverst, fortid nederst. 1-klik handlinger: flyt, aflys, betal, tilføj til kalender, vis på kort, kontakt salon | 10/10     |
| `/account/receipts`      | Liste over kvitteringer. PDF download, momsinfo, betalingsmetode                                                                                | 9/10      |
| `/account/profile`       | Kun: navn, email, telefon. Plus: samtykker/marketing toggles                                                                                    | 8/10      |
| `/account/notifications` | SMS ja/nej, Email ja/nej, Reminder 24h ja/nej. Vis "seneste beskeder"                                                                           | 8/10      |
| `/account/settings`      | Skift sprog, slet konto (GDPR), logout                                                                                                          | 7/10      |

### NICE (Retention)

| Route                | Beskrivelse                   | Prioritet |
| -------------------- | ----------------------------- | --------- |
| `/account/favorites` | Gemte saloner med "book igen" | 6/10      |

### LATER (Monetization/Ecosystem)

| Route                | Beskrivelse          | Prioritet |
| -------------------- | -------------------- | --------- |
| `/account/giftcards` | Køb/se gavekort      | 3/10      |
| `/account/clipcards` | Klippekort saldo     | 3/10      |
| `/account/loyalty`   | Point og belønninger | 2/10      |
| `/account/referrals` | Henvis venner        | 2/10      |

---

## UX Principper

### 1. Booking-First Design

```
FØR (Fresha-agtig):
┌─────────────────────────────┐
│ Menu | Profile | Settings   │  ← Menu-first
├─────────────────────────────┤
│ Bookings | Receipts | ...   │  ← Tabs
├─────────────────────────────┤
│ [Booking 1]                 │
│ [Booking 2]                 │
└─────────────────────────────┘

EFTER (NEMSalon v2):
┌─────────────────────────────┐
│ Min Tid          ⚙️ 🚪      │  ← Minimalt
├─────────────────────────────┤
│ Næste: Kl 14:30 Frisør Anne│  ← Hero booking
│ Flyt | Aflys | 📍 | 📅      │  ← 1-klik handlinger
├─────────────────────────────┤
│ Tidligere bookinger ▼       │  ← Skjult som standard
└─────────────────────────────┘
```

### 2. 1-Klik Handlinger

Hver booking skal have direkte adgang til:

- **Flyt tid** → Åbn kalender direkte
- **Aflys** → Bekræftelsesdialog
- **Betal** (hvis mangler) → Stripe checkout
- **Tilføj til kalender** (ICS)
- **Åbn i Maps** (Google/Apple)
- **Kontakt salon** (ring/SMS)

### 3. Minimal Navigation

```
Navigation (kun hvis nødvendigt):
┌─────────────────────────────┐
│ ← Min Tid                   │  ← Back alt overskrift
├─────────────────────────────┤
│ Mine tider        (aktiv)   │
│ Kvitteringer                │
│ Min profil                  │
│ Notifikationer              │
│ ───────────────             │
│ Indstillinger               │
└─────────────────────────────┘
```

### 4. Information Hierarchy

**Level 1 (øverst, størst):**

- Næste booking: Salon, tid, service

**Level 2 (1-klik handlinger):**

- Flyt, aflys, betal, kalender, maps

**Level 3 (detaljer):**

- Adresse, telefon, email, pris, status

**Level 4 (skjult/ekstra):**

- Fortidige bookinger (collapsed)
- Kvitteringer (separat side)

---

## Data Struktur

### CustomerBooking (fra api.ts)

```typescript
interface CustomerBooking {
  id: string;
  salonId: string;
  salonName: string;
  salonSlug: string | null;
  salonPhone: string | null;
  salonEmail: string | null;
  salonAddress: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  staffId: string;
  staffName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  totalAmount: number;
  currency: string; // DKK, EUR, etc.
  notes: string | null;
  manageUrl: string | null;
  createdAt: string;
}
```

### Receipt (ny type til kvitteringer)

```typescript
interface Receipt {
  id: string;
  bookingId: string;
  salonName: string;
  serviceName: string;
  amount: number;
  currency: string;
  vatAmount: number; // Moms
  vatRate: number; // 25% i DK
  paymentMethod: 'card' | 'mobilepay' | 'cash' | 'giftcard';
  paymentStatus: 'succeeded' | 'pending' | 'failed';
  paidAt: string | null;
  receiptNumber: string; // Fakturanummer
  pdfUrl: string | null;
  createdAt: string;
}
```

### CustomerProfile (udvidet)

```typescript
interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locale: 'da' | 'en';

  // Samtykker
  consents: {
    marketingEmail: boolean;
    marketingSms: boolean;
    appointmentReminders: boolean; // 24h reminder
    dataProcessing: boolean; // GDPR
  };

  createdAt: string;
  updatedAt: string;
}
```

### FavoriteSalon (ny)

```typescript
interface FavoriteSalon {
  id: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  address: {
    line1: string;
    city: string;
    postalCode: string;
  };
  phone: string | null;
  logoUrl: string | null;
  addedAt: string;
}
```

---

## API Endpoints (Eksisterende + Nye)

### Eksisterende (beholdes)

```typescript
// Profil
GET    /v1/portal/me
PATCH  /v1/portal/me

// Bookinger
GET    /v1/portal/bookings?status=&limit=&offset=
GET    /v1/portal/bookings/:id
POST   /v1/portal/bookings/:id/cancel
POST   /v1/portal/bookings/:id/reschedule

// Offentlig availability
GET    /v1/public/availability?salonSlug=&serviceId=&...
```

### Nye Endpoints (skal implementeres i backend)

```typescript
// Kvitteringer
GET    /v1/portal/receipts                    // Liste
GET    /v1/portal/receipts/:id               // Enkel
GET    /v1/portal/receipts/:id/pdf           // PDF download

// Notifikationsindstillinger
GET    /v1/portal/notifications/settings
PATCH  /v1/portal/notifications/settings

// Favoritter
GET    /v1/portal/favorites
POST   /v1/portal/favorites                  // Tilføj
DELETE /v1/portal/favorites/:salonId        // Fjern
```

---

## Roadmap

### Fase 1: MUST Features (Uge 1-2)

- [x] Omskriv folder struktur
- [ ] BookingsPage (landing page)
- [ ] ReceiptsPage (kvitteringer)
- [ ] ProfilePage (basis + samtykker)
- [ ] NotificationsPage (toggles)
- [ ] SettingsPage (sprog, slet konto)
- [ ] Routing opdatering

### Fase 2: NICE Features (Uge 3)

- [ ] FavoritesPage
- [ ] Forbedret mobil UX
- [ ] Animationer og transitions
- [ ] E2E tests

### Fase 3: LATER Features (Fremtid)

- [ ] GiftCardsPage
- [ ] ClipCardsPage
- [ ] LoyaltyPage
- [ ] ReferralsPage

---

## Teknisk Implementation

### Routing Strategy

```typescript
// index.tsx opdatering
if (path.startsWith('/account')) {
  return <CustomerPortal />;  // Håndterer sub-routes
}
```

### State Management

```typescript
// Portal.tsx (container)
const [currentPage, setCurrentPage] = useState<Page>('bookings');

// Pages modtager data via props, ikke egen fetching
<BookingsPage
  bookings={bookings}
  onReschedule={handleReschedule}
  onCancel={handleCancel}
/>
```

### Mobile-First CSS

```css
/* Booking Card */
.cp-booking-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
}

/* 1-Klik Actions Grid */
.cp-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

@media (min-width: 768px) {
  .cp-actions-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
```

---

## Design Tokens

### Farver

```css
--primary: #0066ff; /* Primær blå */
--primary-hover: #0052cc;
--success: #10b981; /* Grøn - bekræftet */
--warning: #f59e0b; /* Gul - pending */
--error: #ef4444; /* Rød - aflyst */
--neutral: #6b7280; /* Grå - afsluttet */

--surface-primary: #ffffff;
--surface-secondary: #f9fafb;
--surface-tertiary: #f3f4f6;

--text-primary: #111827;
--text-secondary: #6b7280;
--text-tertiary: #9ca3af;
```

### Spacing

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Typography

```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
```

---

## Testing Strategy

### Unit Tests

```typescript
// BookingsPage.test.tsx
describe('BookingsPage', () => {
  it('viser kommende bookinger øverst', () => {});
  it('skjuler fortidige bookinger som standard', () => {});
  it('åbner flyt-dialog ved klik', () => {});
  it('bekræfter aflysning før handling', () => {});
});
```

### E2E Tests

```typescript
// customer-portal.spec.ts
test('kunde kan flytte booking', async () => {});
test('kunde kan downloade kvittering', async () => {});
test('kunde kan opdatere profil', async () => {});
test('kunde kan slette konto (GDPR)', async () => {});
```

---

## Checkliste før Launch

### Funktionalitet

- [ ] BookingsPage viser kommende først
- [ ] 1-klik handlinger virker (flyt, aflys, kalender, maps)
- [ ] ReceiptsPage kan downloade PDF
- [ ] ProfilePage opdaterer samtykker
- [ ] NotificationsPage gemmer præferencer
- [ ] SettingsPage sletter konto korrekt (GDPR)
- [ ] Mobil UX er testet på iOS og Android

### Teknisk

- [ ] Alle nye API endpoints virker
- [ ] Ingen console errors
- [ ] Ingen type errors
- [ ] Lighthouse score > 90
- [ ] E2E tests passerer

### Compliance

- [ ] GDPR: Kunde kan slette konto
- [ ] GDPR: Samtykker kan ændres
- [ ] Moms: Kvitteringer viser moms
- [ ] Tilgængelighed: WCAG 2.1 AA

---

## Noter

### Hvorfor IKKE disse features nu?

**Loyalitet, gavekort, klippekort, henvisninger:**

- Meget arbejde at bygge godt
- Mange edge cases
- Meget support
- Kun relevant når der er volume/flere saloner

**Salonfotos:**

- Kunder finder fotos på Instagram/Google/hjemmeside
- Ikke nødvendigt i kundeportalen
- Kan ligge på public booking page

### Hvornår LATER features?

- **Når I har:** >1000 aktive kunder
- **Når I har:** >10 saloner i systemet
- **Når I har:** Dediceret support-team
- **Når I har:** Ecosystem strategi

---

## Kontakt

Ved spørgsmål til denne dokumentation, kontakt udviklingsteamet.

**Sidst opdateret:** 2026-02-11
**Version:** 2.0.0
**Forfatter:** NEMSalon Dev Team
