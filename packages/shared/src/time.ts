// Time manipulation utilities
// Pure functions with no runtime dependencies

/**
 * Convert time string (HH:MM) to minutes from midnight
 * @example timeToMinutes('14:30') // 870
 * @example timeToMinutes('09:00') // 540
 */
export function timeToMinutes(value: string): number {
  const parts = value.split(':');
  const h = parts[0] ? Number(parts[0]) : Number.NaN;
  const m = parts[1] ? Number(parts[1]) : Number.NaN;
  
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Convert minutes from midnight to time string (HH:MM)
 * @example minutesToTime(870) // "14:30"
 * @example minutesToTime(540) // "09:00"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Add minutes to a time string
 * @example addMinutes('14:30', 30) // "15:00"
 * @example addMinutes('23:30', 45) // "00:15"
 */
export function addMinutes(time: string, minutes: number): string {
  if (!time) return '';
  
  const totalMinutes = timeToMinutes(time) + minutes;
  // Handle overflow/wrap around 24 hours
  const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  return minutesToTime(wrappedMinutes);
}

/**
 * Parse time string into hours and minutes components
 * @example parseTime('14:30') // { hours: 14, minutes: 30 }
 */
export function parseTime(value: string): { hours: number; minutes: number } | null {
  const parts = value.split(':');
  const h = parts[0] ? Number(parts[0]) : Number.NaN;
  const m = parts[1] ? Number(parts[1]) : Number.NaN;
  
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  
  return { hours: h, minutes: m };
}

/**
 * Format time string, ensuring HH:MM format
 * @example normalizeTime('9:5') // "09:05"
 * @example normalizeTime('14:30') // "14:30"
 */
export function normalizeTime(value: string): string | null {
  const parsed = parseTime(value);
  if (!parsed) return null;
  return minutesToTime(parsed.hours * 60 + parsed.minutes);
}

/**
 * Check if a time is within a range (inclusive)
 * @example isTimeInRange('14:30', '09:00', '17:00') // true
 * @example isTimeInRange('08:00', '09:00', '17:00') // false
 */
export function isTimeInRange(time: string, start: string, end: string): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Calculate the difference between two times in minutes
 * @example timeDifference('14:30', '09:00') // 330
 * @example timeDifference('09:00', '14:30') // -330
 */
export function timeDifference(end: string, start: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/**
 * Round time to nearest interval
 * @example roundTime('14:32', 15) // "14:30"
 * @example roundTime('14:38', 15) // "14:45"
 */
export function roundTime(time: string, intervalMinutes: number): string {
  const minutes = timeToMinutes(time);
  const rounded = Math.round(minutes / intervalMinutes) * intervalMinutes;
  return minutesToTime(rounded);
}

/**
 * Generate time slots between start and end time
 * @example generateTimeSlots('09:00', '12:00', 30) // ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
 */
export function generateTimeSlots(
  start: string,
  end: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  
  for (let m = startMinutes; m < endMinutes; m += intervalMinutes) {
    slots.push(minutesToTime(m));
  }
  
  return slots;
}

/**
 * Check if time string is valid HH:MM format
 * @example isValidTime('14:30') // true
 * @example isValidTime('25:00') // false
 * @example isValidTime('abc') // false
 */
export function isValidTime(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 2) return false;
  
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  
  return true;
}

/**
 * Get current time as HH:MM string
 */
export function getCurrentTime(): string {
  const now = new Date();
  return minutesToTime(now.getHours() * 60 + now.getMinutes());
}

/**
 * Format duration in minutes to hours and minutes
 * @example formatDurationParts(90) // { hours: 1, minutes: 30 }
 */
export function formatDurationParts(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}
