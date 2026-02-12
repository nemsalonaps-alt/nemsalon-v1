import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatTime, formatPrice } from '@nemsalon/shared';
import { getCopy, getStoredLocale, resolveLocale, type CopyType } from '../../../i18n';
import { resolveBookingToken } from '../../public-booking/booking-token';
import { downloadIcsInvite } from '../../../lib/calendar';
import { buildLocation } from '../../../lib/ics';
import {
  cancelPublicBooking,
  createPublicCheckout,
  fetchPublicAvailability,
  fetchPublicBooking,
  reschedulePublicBooking,
  type AvailabilitySlot,
  type PublicBooking
} from '../../public-booking/api';
import { Card, Stack, Button, Badge, Input } from '@nemsalon/ui';
import { FeatureState } from '../../../components/FeatureState';
import { toLocalDateInputValue } from '../../../lib/dates';
import '../portal.css';

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
  if (!status) return t.customerDashboard.paymentUnknown;
  const labels: Record<string, string> = {
    pending: t.customerDashboard.paymentStatus.pending,
    paid: t.customerDashboard.paymentStatus.paid,
    failed: t.customerDashboard.paymentStatus.failed,
    refunded: t.customerDashboard.paymentStatus.refunded
  };
  return labels[status] ?? status;
}

function buildAddressString(booking: PublicBooking): string | null {
  const cityPart = [booking.salonPostalCode, booking.salonCity].filter(Boolean).join(' ');
  const address = buildLocation([
    booking.salonAddressLine1,
    booking.salonAddressLine2,
    cityPart || undefined,
    booking.salonCountry && booking.salonCountry !== 'DK' ? booking.salonCountry : undefined
  ]);
  return address || null;
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

function mapApiError(error: string, t: CopyType): string {
  const key = error as keyof typeof t.apiErrors;
  if (key in t.apiErrors && typeof t.apiErrors[key] === 'string') {
    return t.apiErrors[key] as string;
  }
  if (error.includes('BOOKING_CANCEL_WINDOW_PASSED') || error.includes('cancellation_window')) {
    const cancelError = t.apiErrors['error.booking.cancellation_window'];
    return typeof cancelError === 'string' ? cancelError : t.apiErrors.generic;
  }
  return t.apiErrors.generic;
}

function downloadICS(booking: PublicBooking, locale: string) {
  const address = buildAddressString(booking) ?? '';
  const t = getCopy(locale);
  const description = t.customerDashboard.ics.description
    .replace('{title}', t.customerDashboard.title)
    .replace('{salon}', booking.salonName ?? '')
    .replace('{service}', booking.serviceName ?? '')
    .replace('{staff}', booking.staffName ?? '');
  const summary = t.customerDashboard.ics.summary
    .replace('{service}', booking.serviceName ?? t.customerDashboard.ics.title)
    .replace('{salon}', booking.salonName ?? '');
  downloadIcsInvite(
    {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      summary,
      description,
      location: address || undefined
    },
    `booking-${booking.id.slice(0, 8)}.ics`,
  );
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
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue());
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'cancelling' | 'rescheduling' | 'paying'>('idle');
  const token = useMemo(() => resolveBookingToken(bookingId), [bookingId]);
  const resolvedLocale = resolveLocale(booking?.salonLocale ?? getStoredLocale());
  const locale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';
  const t = useMemo(() => getCopy(locale), [locale]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      const result = await fetchPublicBooking(bookingId, token!);
      if (!active) return;
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(mapApiError(result.error, t));
      }
      setLoading(false);
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
      setSlotsLoading(true);
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
      setSlotsLoading(false);
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
    setStatus(t.customerDashboard.states.cancelled);
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
    setStatus(t.customerDashboard.states.rescheduled);
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

  const handleRecover = async () => {
    if (!token) return;
    setIsRecovering(true);
    setError('');
    try {
      const result = await fetchPublicBooking(bookingId, token);
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(mapApiError(result.error, t));
      }
    } finally {
      setIsRecovering(false);
    }
  };

  if (!token) {
    return (
      <Stack align="center" className="cp-pad-48">
        <Card className="cp-text-center">
          <h1>{t.customerDashboard.inactiveLinkTitle}</h1>
          <p className="cp-muted">{t.customerDashboard.inactiveLinkBody}</p>
        </Card>
      </Stack>
    );
  }

  if (!booking) {
    return (
      <Stack align="center" className="cp-pad-24">
        <FeatureState
          status={loading ? 'loading' : isRecovering ? 'recovery' : 'error'}
          title={loading ? t.customerDashboard.loadingTitle : t.customerDashboard.errorTitle}
          description={loading ? t.customerDashboard.loadingBody : undefined}
          error={error || undefined}
          onRetry={!loading ? handleRecover : undefined}
          retryLabel={t.customerDashboard.retry}
          testId="customer-dashboard-fallback"
        />
      </Stack>
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
      <Stack gap="lg" className="cp-pad-24">
        <Card className="cp-text-center">
          <p className="cp-salon-uptitle">{booking.salonName ?? salonSlug}</p>
          <h1>{t.customerDashboard.completed.title}</h1>
          <p className="cp-muted">{t.customerDashboard.completed.message}</p>
        </Card>
        <Card>
          <Stack direction="row" gap="md" className="cp-wrap">
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.date}</p>
              <strong>{formatDate(booking.startTime, { locale: locale })}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.time}</p>
              <strong>{formatTime(booking.startTime, { locale: locale })}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.service}</p>
              <strong>{booking.serviceName ?? t.customerDashboard.paymentUnknown}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.staff}</p>
              <strong>{booking.staffName ?? t.customerDashboard.paymentUnknown}</strong>
            </div>
          </Stack>
        </Card>
      </Stack>
    );
  }

  if (isCancelled) {
    return (
      <Stack gap="lg" className="cp-pad-24">
        <Card className="cp-text-center">
          <p className="cp-salon-uptitle">{booking.salonName ?? salonSlug}</p>
          <h1>{t.customerDashboard.cancelled.title}</h1>
          <p className="cp-muted">{t.customerDashboard.cancelled.message}</p>
        </Card>
        <Card>
          <Stack direction="row" gap="md" className="cp-wrap">
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.date}</p>
              <strong>{formatDate(booking.startTime, { locale: locale })}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.time}</p>
              <strong>{formatTime(booking.startTime, { locale: locale })}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.service}</p>
              <strong>{booking.serviceName ?? t.customerDashboard.paymentUnknown}</strong>
            </div>
            <div className="cp-col">
              <p className="cp-label-text">{t.customerDashboard.labels.staff}</p>
              <strong>{booking.staffName ?? t.customerDashboard.paymentUnknown}</strong>
            </div>
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className="cp-pad-24">
      {/* Hero Booking Card */}
      <Card>
        <Stack direction="row" gap="md" align="center" justify="between">
          <p className="cp-salon-uptitle">{booking.salonName ?? salonSlug}</p>
          <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'}>
            {getStatusLabel(booking.status, t)}
          </Badge>
        </Stack>

        <Stack direction="row" gap="lg" align="center" className="cp-top-lg">
          <div className="cp-date-badge">
            <span className="cp-date-day">{new Date(booking.startTime).getDate()}</span>
            <span className="cp-date-month">
              {new Date(booking.startTime).toLocaleDateString(locale, { month: 'short' })}
            </span>
          </div>
          <div>
            <strong className="cp-time-strong">{formatTime(booking.startTime, { locale })}</strong>
            <p className="cp-muted">
              {new Date(booking.startTime).toLocaleDateString(locale, { weekday: 'long' })}
            </p>
          </div>
        </Stack>

        <Stack gap="sm" className="cp-top-lg">
          <Stack direction="row" gap="md" justify="between">
            <span className="cp-muted">{t.customerDashboard.labels.service}</span>
            <strong>{booking.serviceName ?? t.customerDashboard.paymentUnknown}</strong>
          </Stack>
          <Stack direction="row" gap="md" justify="between">
            <span className="cp-muted">{t.customerDashboard.labels.staff}</span>
            <strong>{booking.staffName ?? t.customerDashboard.paymentUnknown}</strong>
          </Stack>
          {address && (
            <Stack gap="xs">
              <span className="cp-muted">{t.customerDashboard.labels.address}</span>
              <Stack direction="row" gap="sm" align="center">
                <strong>{address}</strong>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="cp-link">
                    {t.customerDashboard.actions.showOnMap}
                  </a>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>

        {booking.paymentStatus === 'pending' && booking.totalAmount > 0 && (
          <Card variant="outlined" className="cp-warning-card">
            <Stack direction="row" gap="md" align="center" justify="between">
              <span className="cp-price">{formatPrice(booking.totalAmount, booking.currency ?? 'DKK', locale)}</span>
              <span className="cp-muted">{getPaymentStatusLabel(booking.paymentStatus, t)}</span>
              <Button variant="primary" onClick={handlePayNow} isLoading={actionState !== 'idle'}>
                {t.customerDashboard.actions.payNow}
              </Button>
            </Stack>
          </Card>
        )}
      </Card>

      {/* Action Section */}
      {canModify && (
        <Card>
          <h3>{t.customerDashboard.actions.changeBooking}</h3>

          {windowClosed ? (
            <Card variant="outlined" className="cp-warning-card">
              <p>{t.customerDashboard.windowClosed}</p>
            </Card>
          ) : !isRescheduling ? (
            <Stack direction="row" gap="md">
              <Button
                variant="secondary"
                onClick={() => setIsRescheduling(true)}
                disabled={actionState !== 'idle'}
              >
                📅 {t.customerDashboard.actions.reschedule}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={actionState !== 'idle'}
              >
                ✕ {t.customerDashboard.actions.cancel}
              </Button>
            </Stack>
          ) : (
            <Stack gap="md">
              <Input
                label={t.customerDashboard.actions.selectNewTime}
                type="date"
                fullWidth
                value={selectedDate}
                min={toLocalDateInputValue()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Stack direction="row" gap="sm" className="cp-wrap">
                {slots.map((slot) => (
                  <Button
                    key={slot.startUtc}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReschedule(slot)}
                    disabled={actionState !== 'idle'}
                  >
                    {formatTime(slot.startUtc, { locale })}
                  </Button>
                ))}
              </Stack>
              {slotsLoading && <p className="cp-muted">{t.customerDashboard.loadingSlots}</p>}
              {!slotsLoading && slots.length === 0 && (
                <p className="cp-muted">{t.customerDashboard.noSlots}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRescheduling(false)}
                disabled={actionState !== 'idle'}
              >
                {t.customerDashboard.actions.cancelReschedule}
              </Button>
            </Stack>
          )}
        </Card>
      )}

      {/* Practical Info */}
      <Card>
        <h3>{t.customerDashboard.practicalInfo.title}</h3>
        <Stack direction="row" gap="md" className="cp-wrap">
          {booking.salonPhone && (
            <a href={`tel:${booking.salonPhone}`} className="cp-info-card">
              <span>📞</span>
              <Stack gap="xs">
                <span className="cp-info-label">{t.customerDashboard.labels.phone}</span>
                <strong>{booking.salonPhone}</strong>
              </Stack>
            </a>
          )}
          {booking.salonEmail && (
            <a href={`mailto:${booking.salonEmail}`} className="cp-info-card">
              <span>✉️</span>
              <Stack gap="xs">
                <span className="cp-info-label">{t.customerDashboard.labels.email}</span>
                <strong>{booking.salonEmail}</strong>
              </Stack>
            </a>
          )}
          <button onClick={() => downloadICS(booking, locale)} className="cp-info-card cp-info-button">
            <span>📅</span>
            <Stack gap="xs" className="cp-text-left">
              <span className="cp-info-label">{t.customerDashboard.actions.addToCalendar}</span>
              <strong>{t.customerDashboard.calendarProvider}</strong>
            </Stack>
          </button>
        </Stack>
      </Card>

      {status && (
        <Card variant="outlined" className="cp-status-card">
          <p className="cp-status-text">{status}</p>
        </Card>
      )}
      {error && (
        <Card variant="outlined" className="cp-error-card cp-error-card-alt">
          <p className="cp-error-text">{error}</p>
        </Card>
      )}
    </Stack>
  );
}
