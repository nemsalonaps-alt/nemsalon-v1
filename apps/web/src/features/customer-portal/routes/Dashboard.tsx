import { useEffect, useMemo, useState } from 'react';
import { getCopy } from '../../../i18n';
import { resolveBookingToken } from '../../public-booking/booking-token';
import {
  cancelPublicBooking,
  createPublicCheckout,
  fetchPublicAvailability,
  fetchPublicBooking,
  reschedulePublicBooking,
  type AvailabilitySlot,
  type PublicBooking
} from '../../public-booking/api';

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status: string, t: ReturnType<typeof getCopy>): string {
  const labels: Record<string, string> = {
    pending: t.customerDashboard.status.pending,
    confirmed: t.customerDashboard.status.confirmed,
    in_progress: t.customerDashboard.status.in_progress,
    completed: t.customerDashboard.status.completed,
    cancelled: t.customerDashboard.status.cancelled,
    no_show: t.customerDashboard.status.no_show
  };
  return labels[status] ?? status;
}

function getPaymentStatusLabel(status: string | null | undefined, t: ReturnType<typeof getCopy>): string {
  if (!status) return '—';
  const labels: Record<string, string> = {
    pending: t.customerDashboard.paymentStatus.pending,
    paid: t.customerDashboard.paymentStatus.paid,
    failed: t.customerDashboard.paymentStatus.failed,
    refunded: t.customerDashboard.paymentStatus.refunded
  };
  return labels[status] ?? status;
}

function buildAddressString(booking: PublicBooking): string | null {
  const parts: string[] = [];
  if (booking.salonAddressLine1) parts.push(booking.salonAddressLine1);
  if (booking.salonAddressLine2) parts.push(booking.salonAddressLine2);
  const cityPart = [booking.salonPostalCode, booking.salonCity].filter(Boolean).join(' ');
  if (cityPart) parts.push(cityPart);
  if (booking.salonCountry && booking.salonCountry !== 'DK') parts.push(booking.salonCountry);
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildGoogleMapsUrl(booking: PublicBooking): string | null {
  const address = buildAddressString(booking);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function isCancellationWindowClosed(booking: PublicBooking): boolean {
  const windowMinutes = booking.salonCancellationWindowMinutes ?? 0;
  if (!windowMinutes || windowMinutes <= 0) return false;
  const start = new Date(booking.startTime);
  const deadline = new Date(start.getTime() - windowMinutes * 60 * 1000);
  return Date.now() > deadline.getTime();
}

function mapApiError(error: string, t: ReturnType<typeof getCopy>): string {
  const key = error as keyof typeof t.apiErrors;
  if (key in t.apiErrors) {
    const value = t.apiErrors[key];
    return typeof value === 'string' ? value : t.apiErrors.generic;
  }
  if (error.includes('BOOKING_CANCEL_WINDOW_PASSED') || error.includes('cancellation_window')) {
    return t.apiErrors['error.booking.cancellation_window'] ?? t.apiErrors.generic;
  }
  return t.apiErrors.generic;
}

function generateICSContent(booking: PublicBooking, locale: string): string {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const address = buildAddressString(booking) ?? '';
  const t = getCopy(locale);
  const description = `${t.customerDashboard.title} - ${booking.salonName ?? ''}\n${t.customerDashboard.labels.service}: ${booking.serviceName ?? ''}\n${t.customerDashboard.labels.staff}: ${booking.staffName ?? ''}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nemsalon//Booking//DA',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${booking.serviceName ?? 'Booking'} hos ${booking.salonName ?? 'salonen'}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${address}`,
    `UID:${booking.id}@nemsalon.app`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function downloadICS(booking: PublicBooking, locale: string) {
  const content = generateICSContent(booking, locale);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `booking-${booking.id.slice(0, 8)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CustomerDashboard({
  salonSlug,
  bookingId
}: {
  salonSlug: string;
  bookingId: string;
}) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'cancelling' | 'rescheduling' | 'paying'>('idle');
  const token = useMemo(() => resolveBookingToken(bookingId), [bookingId]);
  const locale = booking?.salonLocale ?? 'da-DK';
  const t = useMemo(() => getCopy(locale), [locale]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function load() {
      const result = await fetchPublicBooking(bookingId, token!);
      if (!active) return;
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(mapApiError(result.error, t));
      }
    }
    load();
    return () => { active = false; };
  }, [bookingId, token, t]);

  useEffect(() => {
    if (!booking) return;
    const date = booking.startTime.slice(0, 10);
    if (date) setSelectedDate(date);
  }, [booking]);

  useEffect(() => {
    if (!token || !booking || !isRescheduling) return;
    let active = true;
    async function loadSlots() {
      const from = new Date(`${selectedDate}T00:00:00`);
      const result = await fetchPublicAvailability({
        salonSlug,
        serviceId: booking!.serviceId,
        staffId: booking!.staffId,
        from: from.toISOString(),
        days: 1,
        limit: 80,
        intervalMinutes: 15
      });
      if (!active) return;
      if (result.ok) {
        setSlots(result.data.slots);
      } else {
        setError(mapApiError(result.error, t));
      }
    }
    loadSlots();
    return () => { active = false; };
  }, [salonSlug, selectedDate, booking, token, isRescheduling]);

  async function handleCancel() {
    if (!token || !booking) return;
    const confirmed = window.confirm(t.customerDashboard.actions.cancel + '?');
    if (!confirmed) return;
    setActionState('cancelling');
    setStatus(t.customerDashboard.states.cancelling);
    setError('');
    const result = await cancelPublicBooking({
      bookingId: booking.id,
      token,
      reasonKey: 'customer.cancelled'
    });
    if (!result.ok) {
      setStatus('');
      setError(result.error);
      return;
    }
    setBooking(result.data);
    setStatus('Booking annulleret.');
  }

  async function handleReschedule(slot: AvailabilitySlot) {
    if (!token || !booking) return;
    setActionState('rescheduling');
    setStatus(t.customerDashboard.states.rescheduling);
    setError('');
    const result = await reschedulePublicBooking({
      bookingId: booking.id,
      token,
      staffId: booking.staffId,
      startUtc: slot.startUtc
    });
    if (!result.ok) {
      setStatus('');
      setError(result.error);
      return;
    }
    setBooking(result.data);
    setIsRescheduling(false);
    setStatus('Booking flyttet.');
  }

  async function handlePayNow() {
    if (!token || !booking) return;
    setActionState('paying');
    setStatus(t.customerDashboard.states.preparingPayment);
    setError('');
    const currentUrl = window.location.href;
    const result = await createPublicCheckout({
      bookingId: booking.id,
      token,
      successUrl: currentUrl,
      cancelUrl: currentUrl
    });
    if (!result.ok) {
      setStatus('');
      setError(result.error);
      return;
    }
    window.location.href = result.data.checkoutUrl;
  }

  if (!token) {
    return (
      <div className="app">
        <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h1>Dette link er ikke længere aktivt</h1>
          <p className="muted">Kontakt salonen hvis du har spørgsmål til din booking.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Indlæser din booking...</h1>
          {error && <div className="banner" style={{ marginTop: 16 }}>{error}</div>}
        </div>
      </div>
    );
  }

  const address = buildAddressString(booking);
  const mapsUrl = buildGoogleMapsUrl(booking);
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isNoShow = booking.status === 'no_show';
  const canModify = !isCompleted && !isCancelled && !isNoShow;
  const windowClosed = isCancellationWindowClosed(booking);

  if (isCompleted) {
    return (
      <div className="app">
        <div className="panel" style={{ textAlign: 'center' }}>
          <p className="eyebrow">{booking.salonName ?? salonSlug}</p>
          <h1>{t.customerDashboard.completed.title}</h1>
          <p className="muted">{t.customerDashboard.completed.message}</p>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="grid two">
            <div><p className="muted">{t.customerDashboard.labels.date}</p><strong>{formatDate(booking.startTime, locale)}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.time}</p><strong>{formatTime(booking.startTime, locale)}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.service}</p><strong>{booking.serviceName ?? '—'}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.staff}</p><strong>{booking.staffName ?? '—'}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="app">
        <div className="panel" style={{ textAlign: 'center' }}>
          <p className="eyebrow">{booking.salonName ?? salonSlug}</p>
          <h1>{t.customerDashboard.cancelled.title}</h1>
          <p className="muted">{t.customerDashboard.cancelled.message}</p>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="grid two">
            <div><p className="muted">{t.customerDashboard.labels.date}</p><strong>{formatDate(booking.startTime, locale)}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.time}</p><strong>{formatTime(booking.startTime, locale)}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.service}</p><strong>{booking.serviceName ?? '—'}</strong></div>
            <div><p className="muted">{t.customerDashboard.labels.staff}</p><strong>{booking.staffName ?? '—'}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="panel">
        <p className="eyebrow">{t.customerDashboard.title}</p>
        <h1>{booking.salonName ?? salonSlug}</h1>
        {address && (
          <p className="muted" style={{ marginTop: 8 }}>
            {address}
            {mapsUrl && (
              <>{' '}<a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{t.customerDashboard.actions.showOnMap}</a></>
            )}
          </p>
        )}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="grid two">
          <div><p className="muted">{t.customerDashboard.labels.date}</p><strong>{formatDate(booking.startTime, locale)}</strong></div>
          <div><p className="muted">{t.customerDashboard.labels.time}</p><strong>{formatTime(booking.startTime, locale)}</strong></div>
          <div><p className="muted">{t.customerDashboard.labels.service}</p><strong>{booking.serviceName ?? '—'}</strong></div>
          <div><p className="muted">{t.customerDashboard.labels.staff}</p><strong>{booking.staffName ?? '—'}</strong></div>
          <div><p className="muted">{t.customerDashboard.labels.status}</p><strong>{getStatusLabel(booking.status, t)}</strong></div>
          <div>
            <p className="muted">{t.customerDashboard.labels.payment}</p>
            <strong>{getPaymentStatusLabel(booking.paymentStatus, t)}</strong>
            {booking.paymentStatus === 'pending' && booking.totalAmount > 0 && (
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={handlePayNow} disabled={actionState !== 'idle'}>{t.customerDashboard.actions.payNow}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {canModify && windowClosed && (
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="muted">{t.customerDashboard.windowClosed}</p>
        </div>
      )}

      {canModify && !windowClosed && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 16 }}>{t.customerDashboard.actions.changeBooking}</h3>
          {!isRescheduling ? (
            <div className="btn-row">
              <button className="btn ghost" onClick={() => setIsRescheduling(true)} disabled={actionState !== 'idle'}>{t.customerDashboard.actions.reschedule}</button>
              <button className="btn ghost" onClick={handleCancel} disabled={actionState !== 'idle'}>{t.customerDashboard.actions.cancel}</button>
            </div>
          ) : (
            <>
              <label className="field">
                <span className="label">{t.customerDashboard.actions.selectNewTime}</span>
                <input
                  className="input"
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
              <div className="list" style={{ marginTop: 12 }}>
                {slots.map((slot) => (
                  <button
                    key={slot.startUtc}
                    className="list-card"
                    type="button"
                    onClick={() => handleReschedule(slot)}
                    disabled={actionState !== 'idle'}
                  >
                    <div><strong>{formatTime(slot.startUtc, locale)}</strong></div>
                    <div className="list-meta"><span>{t.customerDashboard.actions.selectNewTime}</span></div>
                  </button>
                ))}
              </div>
              {slots.length === 0 && <p className="muted">{t.customerDashboard.noSlots}</p>}
              <button className="btn ghost" onClick={() => setIsRescheduling(false)} style={{ marginTop: 12 }} disabled={actionState !== 'idle'}>{t.customerDashboard.actions.cancelReschedule}</button>
            </>
          )}
        </div>
      )}

      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 16 }}>{t.customerDashboard.practicalInfo.title}</h3>
        <div className="grid two">
          {booking.salonPhone && (
            <div>
              <p className="muted">{t.customerDashboard.labels.phone}</p>
              <a href={`tel:${booking.salonPhone}`} style={{ color: 'var(--accent)' }}>{booking.salonPhone}</a>
            </div>
          )}
          {booking.salonEmail && (
            <div>
              <p className="muted">{t.customerDashboard.labels.email}</p>
              <a href={`mailto:${booking.salonEmail}`} style={{ color: 'var(--accent)' }}>{booking.salonEmail}</a>
            </div>
          )}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={() => downloadICS(booking, locale)}>{t.customerDashboard.actions.addToCalendar}</button>
        </div>
      </div>

      {status && <div className="note" style={{ marginTop: 16 }}>{status}</div>}
      {error && <div className="banner" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
