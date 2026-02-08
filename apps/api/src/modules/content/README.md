# Content Module (Legacy)

> **BEMÆRK:** Dette modul er ved at blive nedlagt. Funktionaliteten er flyttet til dedikerede domæne-moduler:
> 
> - `salons/` - Salon administration, åbningstider, indstillinger
> - `services/` - Service katalog
> - `staff/` - Medarbejdere, arbejdstider, fri/ferie
> - `bookings/` - Booking management
> - `customers/` - Kunde administration
> 
> Se de respektive moduler for dokumentation.

## Resterende komponenter

Dette modul beholder følgende indtil videre:

- `api/routes.ts` - REST endpoints (vil blive flyttet til respektive moduler)
- `service/content-service.ts` - Service orchestration (vil blive opdelt)

## Migration Guide

| Gammel import | Ny import |
|--------------|-----------|
| `content/domain/content-domain` | `salons/domain`, `services/domain`, `staff/domain`, `bookings/domain`, `customers/domain` |
| `content/repo/salon-repo` | `salons/repo/salons-repo` |
| `content/repo/service-repo` | `services/repo/services-repo` |
| `content/repo/staff-repo` | `staff/repo/staff-repo` |
| `content/repo/booking-repo` | `bookings/repo/bookings-repo` |
| `content/repo/customer-repo` | `customers/repo/customers-repo` |
| `content/repo/business-hours-repo` | `salons/repo/business-hours-repo` |
| `content/repo/staff-*-repo` | `staff/repo/staff-*-repo` |
