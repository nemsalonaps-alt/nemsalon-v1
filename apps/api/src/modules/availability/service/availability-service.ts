import { httpError } from '../../../server/http-error.js';
import type { AvailabilityResponse, AvailabilitySlot } from '../domain/availability-domain.js';
import { getSalonBusinessHours } from '../../content/repo/business-hours-repo.js';
import { getBookingsForStaffInRange } from '../../content/repo/booking-repo.js';
import { getSalonById } from '../../content/repo/salon-repo.js';
import { getServiceById } from '../../content/repo/service-repo.js';
import { getStaffById } from '../../content/repo/staff-repo.js';
import {
  getStaffIdsForService,
  getStaffServiceIds
} from '../../content/repo/staff-services-repo.js';
import { createTimeZoneHelpers, parseTime, type LocalDate } from '../../../shared/timezone.js';
import { listStaffTimeOff } from '../../content/repo/staff-time-off-repo.js';

type AvailabilityQuery = {
  salonId: string;
  serviceId: string;
  fromUtc?: string;
  days?: number;
  limit?: number;
  staffId?: string;
  intervalMinutes?: number;
};

type BookingWindow = {
  staffId: string;
  start: Date;
  end: Date;
};

const MAX_DAYS = 30;
const MAX_LIMIT = 200;
const MIN_INTERVAL = 5;
const MAX_INTERVAL = 60;

export const availabilityService = {
  async getSlots(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    const fromDate = query.fromUtc ? new Date(query.fromUtc) : new Date();
    if (Number.isNaN(fromDate.valueOf())) {
      throw httpError(400, 'AVAILABILITY_INVALID_QUERY', 'error.availability.invalid_query');
    }

    const days = clamp(query.days ?? 7, 1, MAX_DAYS);
    const limit = clamp(query.limit ?? 20, 1, MAX_LIMIT);
    const intervalMinutes = clamp(query.intervalMinutes ?? 15, MIN_INTERVAL, MAX_INTERVAL);

    const service = await getServiceById(query.serviceId);
    if (!service) {
      throw httpError(404, 'AVAILABILITY_SERVICE_NOT_FOUND', 'error.availability.service_not_found');
    }
    if (service.salonId !== query.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'error.salon_forbidden');
    }

    const salon = await getSalonById(query.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'error.salon_not_found');
    }

    const totalDurationMinutes = service.durationMinutes + (service.bufferMinutes ?? 0);
    if (totalDurationMinutes <= 0) {
      throw httpError(400, 'AVAILABILITY_INVALID_QUERY', 'error.availability.invalid_query');
    }

    let staffIds: string[] = [];
    if (query.staffId) {
      const staff = await getStaffById(query.staffId);
      if (!staff) {
        throw httpError(404, 'STAFF_NOT_FOUND', 'error.staff_not_found');
      }
      if (staff.salonId !== query.salonId) {
        throw httpError(403, 'SALON_FORBIDDEN', 'error.salon_forbidden');
      }
      const staffServices = await getStaffServiceIds(query.staffId);
      if (!staffServices.includes(query.serviceId)) {
        throw httpError(
          400,
          'AVAILABILITY_NO_STAFF_FOR_SERVICE',
          'error.availability.no_staff_for_service'
        );
      }
      staffIds = [query.staffId];
    } else {
      staffIds = await getStaffIdsForService(query.serviceId, query.salonId);
      if (staffIds.length === 0) {
        throw httpError(
          400,
          'AVAILABILITY_NO_STAFF_FOR_SERVICE',
          'error.availability.no_staff_for_service'
        );
      }
    }

    const weekly = await getSalonBusinessHours(query.salonId);
    const weeklyMap = buildWeeklyMap(weekly);
    for (const entry of Object.values(weeklyMap)) {
      if (entry.enabled && entry.startMinutes >= entry.endMinutes) {
        throw httpError(
          400,
          'AVAILABILITY_INVALID_QUERY',
          'error.availability.invalid_query'
        );
      }
    }

    const endDate = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
    const [bookings, timeOff] = await Promise.all([
      getBookingsForStaffInRange(staffIds, fromDate.toISOString(), endDate.toISOString()),
      listStaffTimeOff({ staffIds, fromUtc: fromDate.toISOString(), toUtc: endDate.toISOString() })
    ]);
    const bookingsByStaff = mapBookingsByStaff(bookings);
    const timeOffByStaff = mapTimeOffByStaff(timeOff);

    const helpers = createTimeZoneHelpers(salon.timezone);
    const startLocalDate = helpers.getLocalDateParts(fromDate);

    const slots: AvailabilitySlot[] = [];
    for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
      const localDate = helpers.addLocalDays(startLocalDate, dayOffset);
      const weekday = helpers.getWeekdayId(localDate);
      const hours = weeklyMap[weekday];
      if (!hours || !hours.enabled) continue;

      for (
        let startMinutes = hours.startMinutes;
        startMinutes + totalDurationMinutes <= hours.endMinutes;
        startMinutes += intervalMinutes
      ) {
        const slotStart = helpers.zonedTimeToUtc(localDate, startMinutes);
        if (slotStart < fromDate) continue;
        const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60_000);

        for (const staffId of staffIds) {
          const bookingWindows = bookingsByStaff.get(staffId) ?? [];
          const timeOffWindows = timeOffByStaff.get(staffId) ?? [];
          if (hasOverlap(slotStart, slotEnd, bookingWindows)) continue;
          if (hasOverlap(slotStart, slotEnd, timeOffWindows)) continue;
          slots.push({
            startUtc: slotStart.toISOString(),
            endUtc: slotEnd.toISOString(),
            staffId
          });
          if (slots.length >= limit) {
            return {
              slots,
              meta: {
                fromUtc: fromDate.toISOString(),
                days,
                intervalMinutes,
                serviceId: query.serviceId,
                staffId: query.staffId,
                timezone: salon.timezone
              }
            };
          }
        }
      }
    }

    return {
      slots,
      meta: {
        fromUtc: fromDate.toISOString(),
        days,
        intervalMinutes,
        serviceId: query.serviceId,
        staffId: query.staffId,
        timezone: salon.timezone
      }
    };
  }
};

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

type WeeklyEntry = {
  enabled: boolean;
  startMinutes: number;
  endMinutes: number;
};

type WeeklyMap = Record<string, WeeklyEntry>;

function buildWeeklyMap(weekly: { day: string; startTime: string; endTime: string; enabled: boolean }[]): WeeklyMap {
  const map: WeeklyMap = {};
  for (const entry of weekly) {
    const startMinutes = parseTime(entry.startTime);
    const endMinutes = parseTime(entry.endTime);
    if (startMinutes === null || endMinutes === null) {
      throw httpError(400, 'AVAILABILITY_INVALID_QUERY', 'error.availability.invalid_query');
    }
    map[entry.day] = {
      enabled: entry.enabled,
      startMinutes,
      endMinutes
    };
  }
  return map;
}

function mapBookingsByStaff(rows: { staffId: string; startTime: string; endTime: string }[]): Map<string, BookingWindow[]> {
  const map = new Map<string, BookingWindow[]>();
  for (const row of rows) {
    const start = new Date(row.startTime);
    const end = new Date(row.endTime);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) continue;
    const list = map.get(row.staffId) ?? [];
    list.push({ staffId: row.staffId, start, end });
    map.set(row.staffId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return map;
}

function mapTimeOffByStaff(
  rows: { staffId: string; startTime: string; endTime: string }[]
): Map<string, BookingWindow[]> {
  const map = new Map<string, BookingWindow[]>();
  for (const row of rows) {
    const start = new Date(row.startTime);
    const end = new Date(row.endTime);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) continue;
    const list = map.get(row.staffId) ?? [];
    list.push({ staffId: row.staffId, start, end });
    map.set(row.staffId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return map;
}

function hasOverlap(start: Date, end: Date, bookings: BookingWindow[]): boolean {
  for (const booking of bookings) {
    if (start < booking.end && end > booking.start) {
      return true;
    }
  }
  return false;
}
