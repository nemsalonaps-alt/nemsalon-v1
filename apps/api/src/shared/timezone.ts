export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function createTimeZoneHelpers(timeZone: string) {
  const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short'
  });

  const getParts = (date: Date) => {
    const parts = dateTimeFormatter.formatToParts(date);
    const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second')
    };
  };

  const getWeekdayId = (date: Date) => {
    const short = weekdayFormatter.format(date);
    return (
      {
        Mon: 'mon',
        Tue: 'tue',
        Wed: 'wed',
        Thu: 'thu',
        Fri: 'fri',
        Sat: 'sat',
        Sun: 'sun'
      }[short] ?? 'mon'
    );
  };

  const getOffset = (date: Date) => {
    const parts = getParts(date);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    return asUtc - date.getTime();
  };

  const zonedTimeToUtc = (localDate: LocalDate, minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const guess = Date.UTC(localDate.year, localDate.month - 1, localDate.day, hour, minute, 0);
    const offset = getOffset(new Date(guess));
    let utc = guess - offset;
    const nextOffset = getOffset(new Date(utc));
    if (nextOffset !== offset) {
      utc = guess - nextOffset;
    }
    return new Date(utc);
  };

  const getLocalDateParts = (date: Date): LocalDate => {
    const parts = getParts(date);
    return { year: parts.year, month: parts.month, day: parts.day };
  };

  const addLocalDays = (date: LocalDate, days: number): LocalDate => {
    const noonUtc = zonedTimeToUtc(date, 12 * 60);
    const next = new Date(noonUtc.getTime() + days * 24 * 60 * 60 * 1000);
    return getLocalDateParts(next);
  };

  const getWeekdayIdForLocalDate = (date: LocalDate) => {
    const noonUtc = zonedTimeToUtc(date, 12 * 60);
    return getWeekdayId(noonUtc);
  };

  return {
    zonedTimeToUtc,
    getLocalDateParts,
    addLocalDays,
    getWeekdayId: getWeekdayIdForLocalDate
  };
}
