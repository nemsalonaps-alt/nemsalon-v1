# Availability Module

**Ansvar:** Beregne ledige tidsrum (slots) for booking baseret på åbningstider, eksisterende bookinger, og medarbejder fravær.

## Scope (v1)

**Gør:**
- Liste ledige slots for en given dato + medarbejder
- Tjekke om et specifikt tidsrum er ledigt
- Respektere åbningstider, ferie, og eksisterende bookinger
- Håndtere "any staff" valg (finder første ledige)

**Gør IKKE:**
- Real-time availability updates (polling i stedet)
- Kompleks recurrence rules
- Waitlist funktionalitet
- Cross-salon availability

## Arkitektur

```
api/           → GET /v1/availability endpoints
domain/        → Slot beregning, time validation
service/       → Availability queries, slot generation
```

## Nøgle-filer

| Fil | Formål |
|-----|--------|
| `service/availability-service.ts` | Slot beregning, overlap detection |
| `domain/availability-domain.ts` | Slot typer, time range logic |
| `api/routes.ts` | Public & admin availability endpoints |

## Slot Beregning Algoritme

```
Input: salonId, staffId, date
Output: Array af ledige tidsrum

1. Hent business hours for dagen
2. Hent staff working hours (eller fallback til salon)
3. Hent eksisterende bookinger (pending + confirmed)
4. Hent staff time-off / ferie
5. Generer slots med interval (default 15 min)
6. Filtrer bookede slots fra
7. Returner sorteret liste
```

## Performance Considerations

- **Ingen caching i v1** - direkte DB queries
- **Query per staff per day** - kan optimeres til batch
- **Timezone håndtering** - alt i UTC, konverter ved visning

## Cross-Module Dependencies

Læser fra `content` modulet:
- `salon-repo` - timezone, business hours
- `staff-repo` - working hours, time-off
- `booking-repo` - eksisterende bookinger

Dette er godkendt - se `docs/architecture/DEPENDENCIES.md`

## API Endpoints

```
GET /v1/salons/:salonId/availability
  ?date=2026-02-04&staffId=xxx
  
Response: {
  date: string,
  staffId: string,
  slots: [
    { startTime: string, endTime: string, available: boolean }
  ]
}
```

## Kritiske regler

1. **Overlap detection:** Tjek eksisterende bookinger først
2. **Buffer time:** Service buffer_minutes medregnes i beregning
3. **Timezone aware:** Alt konverteres til salonens timezone
4. **Staff assignment:** Kun staff med service kan tilbydes

## Quick Links

- [Content module](../content/) - Underliggende data
- [Public booking](../../web/src/features/public/) - Forbruger af API
- [Dependency map](../../docs/architecture/DEPENDENCIES.md)
