import { useEffect, useRef } from 'react';
import type { BookingSummary, StaffProfile, BusinessHoursEntry } from '../../types';
import { Button, Stack, Card } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import { getStoredLocale, type CopyType } from '../../../../i18n';
import {
  addDaysToDateKey,
  formatDateKey,
  getDateKeyInTimeZone,
  getMinutesInTimeZone,
  getMonthEndDateKey,
  getMonthStartDateKey,
  getTodayDateKey,
  getWeekStartDateKey,
  getWeekdayIndex,
} from '../../../../lib/timezone';
import '../../console.css';

// Utility to conditionally join classNames
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type CalendarView = 'day' | 'week' | 'month';

interface CalendarTabProps {
  calendarDate: string;
  setCalendarDate: (date: string) => void;
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  calendarStaffId: string;
  setCalendarStaffId: (id: string) => void;
  staff: StaffProfile[];
  bookings: BookingSummary[];
  businessHours: BusinessHoursEntry[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreateBooking: () => void;
  onSelectBooking: (bookingId: string) => void;
  copy: CopyType;
  timeZone: string;
}

const minutesFromTime = (value: string) => {
  const [h, m] = value.split(':').map((part) => Number(part));
  return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = Math.floor(minutes % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
};

const clampMinutes = (value: number) => Math.min(24 * 60, Math.max(0, value));

const roundDown = (value: number, step: number) => Math.floor(value / step) * step;

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

export function CalendarTab({
  calendarDate,
  setCalendarDate,
  calendarView,
  setCalendarView,
  calendarStaffId,
  setCalendarStaffId,
  staff,
  bookings,
  businessHours,
  loading = false,
  error = null,
  onRetry,
  onCreateBooking,
  onSelectBooking,
  copy,
  timeZone,
}: CalendarTabProps) {
  const c = copy.console.calendar;
  const dayNames: readonly string[] = c.weekdaysShort ?? [
    'man',
    'tir',
    'ons',
    'tor',
    'fre',
    'lør',
    'søn',
  ];
  const calendarDateKey = calendarDate;
  const locale = getStoredLocale() === 'da' ? 'da-DK' : 'en-US';

  const staffById = new Map(staff.map((entry) => [entry.id, entry]));
  const missingStaff = Array.from(
    new Map(
      bookings
        .filter((booking) => booking.staffId && !staffById.has(booking.staffId))
        .map((booking) => [booking.staffId, booking]),
    ).values(),
  ).map((booking) => ({
    id: booking.staffId,
    salonId: staff[0]?.salonId ?? 'unknown',
    name: booking.staffName || c.unknownStaff,
    role: 'staff' as const,
    active: false,
  }));
  const displayStaff = [...staff, ...missingStaff];
  const filteredStaff = calendarStaffId
    ? displayStaff.filter((s) => s.id === calendarStaffId)
    : displayStaff;

  // Navigation functions
  const goToPrevious = () => {
    if (calendarView === 'day') {
      setCalendarDate(addDaysToDateKey(calendarDateKey, -1));
      return;
    }
    if (calendarView === 'week') {
      setCalendarDate(addDaysToDateKey(calendarDateKey, -7));
      return;
    }
    const monthStart = getMonthStartDateKey(calendarDateKey);
    const previousMonthEnd = addDaysToDateKey(monthStart, -1);
    setCalendarDate(getMonthStartDateKey(previousMonthEnd));
  };

  const goToNext = () => {
    if (calendarView === 'day') {
      setCalendarDate(addDaysToDateKey(calendarDateKey, 1));
      return;
    }
    if (calendarView === 'week') {
      setCalendarDate(addDaysToDateKey(calendarDateKey, 7));
      return;
    }
    const monthEnd = getMonthEndDateKey(calendarDateKey);
    const nextMonthStart = addDaysToDateKey(monthEnd, 1);
    setCalendarDate(nextMonthStart);
  };

  const goToToday = () => {
    setCalendarDate(getTodayDateKey(timeZone));
  };

  // Format date for display
  const formatDateDisplay = () => {
    if (calendarView === 'day') {
      return formatDateKey(calendarDateKey, timeZone, locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (calendarView === 'week') {
      const weekStart = getWeekStartDateKey(calendarDateKey);
      const weekEnd = addDaysToDateKey(weekStart, 6);
      return `${formatDateKey(weekStart, timeZone, locale, { day: 'numeric' })}${copy.rangeSeparator}${formatDateKey(
        weekEnd,
        timeZone,
        locale,
        { day: 'numeric', month: 'long' },
      )}`;
    }
    return formatDateKey(calendarDateKey, timeZone, locale, { month: 'long', year: 'numeric' });
  };

  // Get week days
  const getWeekDays = () => {
    const weekStart = getWeekStartDateKey(calendarDateKey);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDaysToDateKey(weekStart, i));
    }
    return days;
  };

  // Get month days
  const getMonthDays = () => {
    const monthStart = getMonthStartDateKey(calendarDateKey);
    const monthEnd = getMonthEndDateKey(calendarDateKey);
    const startDayOfWeek = (getWeekdayIndex(monthStart) + 6) % 7;
    const daysInMonth = (() => {
      const endParts = monthEnd.split('-');
      return Number(endParts[2] ?? 0);
    })();

    const days: (string | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const monthKey = monthStart.slice(0, 8);
      days.push(`${monthKey}${String(i).padStart(2, '0')}`);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  // Filter bookings helpers
  const getDayBookings = (dateStr: string) =>
    bookings.filter((b) => getDateKeyInTimeZone(b.startTime, timeZone) === dateStr);

  const getBusinessHoursForDay = (dateKey: string) => {
    const dayNamesEn = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNamesEn[getWeekdayIndex(dateKey)];
    return businessHours.find((h) => h.day.toLowerCase() === dayName);
  };

  const buildDaySlots = () => {
    const dayBookings = getDayBookings(calendarDateKey);
    const dayHours = getBusinessHoursForDay(calendarDateKey);
    const hasBusinessHours = dayHours?.enabled;
    let minMinutes = hasBusinessHours ? minutesFromTime(dayHours!.startTime) : 8 * 60;
    let maxMinutes = hasBusinessHours ? minutesFromTime(dayHours!.endTime) : 18 * 60;

    for (const booking of dayBookings) {
      const start = getMinutesInTimeZone(new Date(booking.startTime), timeZone);
      const end = getMinutesInTimeZone(new Date(booking.endTime), timeZone);
      minMinutes = Math.min(minMinutes, start);
      maxMinutes = Math.max(maxMinutes, end);
    }

    if (!hasBusinessHours && dayBookings.length === 0) {
      minMinutes = 8 * 60;
      maxMinutes = 18 * 60;
    }

    minMinutes = clampMinutes(roundDown(minMinutes - 30, 15));
    maxMinutes = clampMinutes(roundUp(maxMinutes + 30, 15));

    if (maxMinutes <= minMinutes) {
      maxMinutes = Math.min(24 * 60, minMinutes + 60);
    }

    const slots: string[] = [];
    for (let m = minMinutes; m <= maxMinutes; m += 15) {
      slots.push(minutesToTime(m));
    }
    return slots;
  };

  const buildWeekHours = (weekDays: string[]) => {
    let minMinutes = Number.POSITIVE_INFINITY;
    let maxMinutes = Number.NEGATIVE_INFINITY;

    for (const day of weekDays) {
      const dayHours = getBusinessHoursForDay(day);
      if (dayHours?.enabled) {
        minMinutes = Math.min(minMinutes, minutesFromTime(dayHours.startTime));
        maxMinutes = Math.max(maxMinutes, minutesFromTime(dayHours.endTime));
      }

      const dateKey = day;
      const dayBookings = getDayBookings(dateKey);
      for (const booking of dayBookings) {
        const start = getMinutesInTimeZone(new Date(booking.startTime), timeZone);
        const end = getMinutesInTimeZone(new Date(booking.endTime), timeZone);
        minMinutes = Math.min(minMinutes, start);
        maxMinutes = Math.max(maxMinutes, end);
      }
    }

    if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes)) {
      minMinutes = 8 * 60;
      maxMinutes = 18 * 60;
    }

    minMinutes = clampMinutes(Math.floor((minMinutes - 60) / 60) * 60);
    maxMinutes = clampMinutes(Math.ceil((maxMinutes + 60) / 60) * 60);

    if (maxMinutes <= minMinutes) {
      maxMinutes = Math.min(24 * 60, minMinutes + 60);
    }

    const hours: string[] = [];
    for (let m = minMinutes; m <= maxMinutes; m += 60) {
      hours.push(minutesToTime(m));
    }
    return hours;
  };

  const weekDays = getWeekDays();
  const daySlots = buildDaySlots();
  const weekHours = buildWeekHours(weekDays);

  const hasData = staff.length > 0 || bookings.length > 0;

  if ((loading && !hasData) || (error && !hasData)) {
    return (
      <FeatureState
        status={loading ? 'loading' : 'error'}
        title={loading ? c.loadingTitle : c.errorTitle}
        description={loading ? c.loadingBody : undefined}
        error={error ?? undefined}
        onRetry={onRetry}
        retryLabel={copy.console.dashboard.retry}
        testId="calendar-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      {/* Topbar */}
      <Stack direction="row" gap="md" align="center" justify="between" className="calendar-header">
        <Stack direction="row" gap="sm" align="center">
          <Button variant="ghost" size="sm" onClick={goToPrevious}>
            {c.prevLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            {c.today}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNext}>
            {c.nextLabel}
          </Button>
          <span className="calendar-range">{formatDateDisplay()}</span>
          <input
            type="date"
            className="calendar-select"
            value={calendarDate}
            onChange={(e) => setCalendarDate(e.target.value)}
            data-testid="calendar-date-input"
          />
        </Stack>
        <Stack direction="row" gap="sm" align="center">
          <Button
            variant={calendarView === 'day' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('day')}
            data-testid="calendar-view-day"
          >
            {c.dayView}
          </Button>
          <Button
            variant={calendarView === 'week' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('week')}
            data-testid="calendar-view-week"
          >
            {c.weekView}
          </Button>
          <Button
            variant={calendarView === 'month' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('month')}
            data-testid="calendar-view-month"
          >
            {c.monthView}
          </Button>
          <Button variant="primary" size="sm" onClick={onCreateBooking}>
            {c.createBooking}
          </Button>
        </Stack>
      </Stack>

      {/* Staff Filter */}
      <Stack direction="row" gap="sm" align="center" className="calendar-staff-row">
        <div
          onClick={() => setCalendarStaffId('')}
          className={['calendar-pill', calendarStaffId === '' ? 'calendar-pill-active' : '']
            .filter(Boolean)
            .join(' ')}
        >
          <span className="calendar-pill-dot calendar-dot-primary" />
          <span className="calendar-pill-name">{c.allStaff}</span>
        </div>
        {displayStaff.map((s, idx) => (
          <div
            key={s.id}
            onClick={() => setCalendarStaffId(s.id)}
            className={['calendar-pill', calendarStaffId === s.id ? 'calendar-pill-active' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <span className={['calendar-pill-dot', `calendar-dot-${idx % 6}`].join(' ')} />
            <span className="calendar-pill-name">{s.name}</span>
          </div>
        ))}
      </Stack>

      {/* Views */}
      {calendarView === 'day' && (
        <DayView
          calendarDate={calendarDate}
          hours={daySlots}
          filteredStaff={filteredStaff}
          bookings={bookings}
          businessHours={businessHours}
          onSelectBooking={onSelectBooking}
          copy={copy}
          onCreateBooking={onCreateBooking}
          goToToday={goToToday}
          timeZone={timeZone}
        />
      )}

      {calendarView === 'week' && (
        <WeekView
          weekDays={weekDays}
          dayLabels={dayNames}
          hours={weekHours}
          onSelectBooking={onSelectBooking}
          getDayBookings={getDayBookings}
          getBusinessHoursForDay={getBusinessHoursForDay}
          timeZone={timeZone}
          locale={locale}
          bookingsLabel={c.bookingsLabel}
        />
      )}

      {calendarView === 'month' && (
        <MonthView
          monthDays={getMonthDays()}
          getDayBookings={getDayBookings}
          onDateClick={setCalendarDate}
          setView={setCalendarView}
          timeZone={timeZone}
          locale={locale}
          moreLabel={c.moreLabel}
          dayLabels={dayNames}
        />
      )}
    </Card>
  );
}

// Day View Component
function DayView({
  calendarDate,
  hours,
  filteredStaff,
  bookings,
  businessHours,
  onSelectBooking,
  copy,
  onCreateBooking,
  goToToday,
  timeZone,
}: {
  calendarDate: string;
  hours: string[];
  filteredStaff: StaffProfile[];
  bookings: BookingSummary[];
  businessHours: BusinessHoursEntry[];
  onSelectBooking: (id: string) => void;
  copy: CopyType;
  onCreateBooking: () => void;
  goToToday: () => void;
  timeZone: string;
}) {
  const c = copy.console.calendar;
  const dayNamesEn = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayOfWeek = getWeekdayIndex(calendarDate);
  const dayName = dayNamesEn[dayOfWeek];
  const todayHours = businessHours.find((h) => h.day.toLowerCase() === dayName);

  const isWithinBusinessHours = (time: string) => {
    if (!todayHours?.enabled) return false;
    return time >= todayHours.startTime && time < todayHours.endTime;
  };

  const dayBookings = bookings.filter((b) => {
    return getDateKeyInTimeZone(b.startTime, timeZone) === calendarDate;
  });

  return (
    <div className="calendar-wrap calendar-wrap-hidden">
      <div className="calendar-scroll">
        {dayBookings.length === 0 && filteredStaff.length === 0 ? (
          <div className="calendar-empty">
            <h3>{c.noBookings}</h3>
            <p>{copy.console.dashboard.bookings.emptyBody}</p>
            <div className="calendar-empty-actions">
              <Button variant="primary" size="md" onClick={onCreateBooking}>
                {c.createBooking}
              </Button>
              <Button variant="ghost" size="md" onClick={goToToday}>
                {c.goToToday}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="calendar-day-header">
              <div className="calendar-day-gutter" />
              {filteredStaff.map((s) => (
                <div key={s.id} className="calendar-day-label">
                  {s.name}
                </div>
              ))}
            </div>
            <div>
              {hours.map((time, idx) => {
                const inBusinessHours = isWithinBusinessHours(time);
                const rowBookings = dayBookings.filter((b) => {
                  const bookingMinutes = roundDown(
                    getMinutesInTimeZone(new Date(b.startTime), timeZone),
                    15,
                  );
                  const slotMinutes = roundDown(minutesFromTime(time), 15);
                  return bookingMinutes === slotMinutes;
                });

                return (
                  <div
                    key={time}
                    className={cn(
                      'calendar-day-row',
                      !inBusinessHours && 'calendar-day-row-closed',
                    )}
                  >
                    {idx % 4 === 0 ? (
                      <div className="calendar-hour-label">{time}</div>
                    ) : (
                      <div className="calendar-day-gutter" />
                    )}
                    {filteredStaff.map((s) => {
                      const staffBooking = rowBookings.find((b) => b.staffId === s.id);
                      return (
                        <div key={s.id} className="calendar-day-cell">
                          {staffBooking && (
                            <CalendarBookingCard
                              booking={staffBooking}
                              onClick={() => onSelectBooking(staffBooking.id)}
                              copy={copy}
                              timeZone={timeZone}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  weekDays,
  dayLabels,
  hours,
  onSelectBooking,
  getDayBookings,
  getBusinessHoursForDay,
  timeZone,
  locale,
  bookingsLabel,
}: {
  weekDays: string[];
  dayLabels: readonly string[];
  hours: string[];
  onSelectBooking: (id: string) => void;
  getDayBookings: (date: string) => BookingSummary[];
  getBusinessHoursForDay: (date: string) => BusinessHoursEntry | undefined;
  timeZone: string;
  locale: string;
  bookingsLabel: string;
}) {
  const isWithinBusinessHours = (dateKey: string, time: string) => {
    const hours = getBusinessHoursForDay(dateKey);
    if (!hours?.enabled) return false;
    return time >= hours.startTime && time < hours.endTime;
  };

  return (
    <div className="calendar-wrap">
      <div className="calendar-week-header">
        <div className="calendar-day-gutter" />
        {weekDays.map((day, idx) => {
          const dateKey = day;
          const isToday = dateKey === getTodayDateKey(timeZone);
          const dayBookings = getDayBookings(dateKey);
          return (
            <div
              key={idx}
              className={cn('calendar-week-day', isToday && 'calendar-week-day-today')}
            >
              <div className="calendar-week-day-title">
                {dayLabels[(getWeekdayIndex(dateKey) + 6) % 7]}
              </div>
              <div className="calendar-week-day-num">
                {formatDateKey(dateKey, timeZone, locale, { day: 'numeric' })}
              </div>
              <div className="calendar-week-day-count">
                {dayBookings.length} {bookingsLabel}
              </div>
            </div>
          );
        })}
      </div>
      <div className="calendar-scroll">
        {hours.map((hour) => (
          <div key={hour} className="calendar-week-grid">
            <div className="calendar-hour-label">{hour}</div>
            {weekDays.map((day, idx) => {
              const dateKey = day;
              const dayBookings = getDayBookings(dateKey);
              const slotBookings = dayBookings.filter((b) => {
                const startMinutes = getMinutesInTimeZone(new Date(b.startTime), timeZone);
                const startHour = Math.floor(startMinutes / 60);
                return `${startHour.toString().padStart(2, '0')}:00` === hour;
              });
              const inHours = isWithinBusinessHours(dateKey, hour);

              return (
                <div
                  key={idx}
                  className={cn('calendar-week-cell', !inHours && 'calendar-week-cell-closed')}
                >
                  {slotBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={cn(
                        'calendar-booking',
                        booking.status !== 'confirmed' && 'calendar-booking-muted',
                      )}
                      onClick={() => onSelectBooking(booking.id)}
                    >
                      <div className="calendar-booking-title">
                        {new Date(booking.startTime).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone,
                        })}
                      </div>
                      <div>{booking.customerName}</div>
                      <div className="calendar-booking-sub">{booking.serviceName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  monthDays,
  getDayBookings,
  onDateClick,
  setView,
  timeZone,
  locale,
  moreLabel,
  dayLabels,
}: {
  monthDays: (string | null)[];
  getDayBookings: (date: string) => BookingSummary[];
  onDateClick: (date: string) => void;
  setView: (view: CalendarView) => void;
  timeZone: string;
  locale: string;
  moreLabel: string;
  dayLabels: readonly string[];
}) {
  return (
    <div className="calendar-wrap">
      <div className="calendar-month-header">
        {dayLabels.map((day) => (
          <div key={day} className="calendar-month-day">
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid">
        {monthDays.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="calendar-month-empty" />;
          }

          const dateStr = day;
          const isToday = dateStr === getTodayDateKey(timeZone);
          const dayBookings = getDayBookings(dateStr);

          return (
            <div
              key={idx}
              onClick={() => {
                onDateClick(dateStr);
                setView('day');
              }}
              className={cn(
                'calendar-month-cell',
                isToday && 'calendar-month-cell-today',
                dayBookings.length > 0 && 'calendar-month-cell-has-bookings',
              )}
            >
              <span className="calendar-month-date">
                {formatDateKey(dateStr, timeZone, locale, { day: 'numeric' })}
              </span>
              <div className="calendar-month-bookings">
                {dayBookings.slice(0, 4).map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'calendar-month-booking-item',
                      booking.status !== 'confirmed' && 'calendar-month-booking-muted',
                    )}
                  >
                    <span className="calendar-month-booking-time">
                      {new Date(booking.startTime).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone,
                      })}
                    </span>
                    <span className="calendar-month-booking-name">{booking.customerName}</span>
                  </div>
                ))}
                {dayBookings.length > 4 && (
                  <div className="calendar-more">
                    {moreLabel.replace('{count}', String(dayBookings.length - 4))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarBookingCardProps {
  booking: BookingSummary;
  onClick: () => void;
  copy: CopyType;
  timeZone: string;
}

function CalendarBookingCard({ booking, onClick, copy, timeZone }: CalendarBookingCardProps) {
  const statusCopy = copy.console.dashboard.bookings.status;
  const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
  const height = (duration / (15 * 60 * 1000)) * 40 - 2;
  const locale = getStoredLocale() === 'da' ? 'da-DK' : 'en-US';
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--calendar-card-height', `${height}px`);
  }, [height]);

  return (
    <div
      ref={cardRef}
      className={cn('calendar-card', booking.status !== 'confirmed' && 'calendar-card-muted')}
      onClick={onClick}
    >
      <div className="calendar-card-time">
        {new Date(booking.startTime).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        })}
        {copy.rangeSeparator}
        {new Date(booking.endTime).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        })}
      </div>
      <div className="calendar-card-name">
        {booking.customerName || copy.console.dashboard.bookings.unknownCustomer}
      </div>
      <div className="calendar-card-service">{booking.serviceName || booking.serviceId}</div>
      <span
        className={cn(
          'calendar-card-status',
          booking.status !== 'confirmed' && 'calendar-card-status-muted',
        )}
      >
        {statusCopy[booking.status as keyof typeof statusCopy] || booking.status}
      </span>
    </div>
  );
}
