import { useEffect, useMemo, useState } from 'react';
import { formatDateTime } from '@nemsalon/shared';
import { Button, Card, Stack, Input, ConfirmDialog, Toast, Badge } from '@nemsalon/ui';
import {
  cancelPublicBooking,
  fetchPublicAvailability,
  fetchPublicBooking,
  reschedulePublicBooking,
  type AvailabilitySlot,
  type PublicBooking
} from '../api';
import { toLocalDateInputValue } from '../../../lib/dates';
import { FeatureState } from '../../../components/FeatureState';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import '../public-booking.css';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

export function PublicBookingManage({
  salonSlug,
  bookingId
}: {
  salonSlug: string;
  bookingId: string;
}) {
  const resolvedLocale = resolveLocale(getStoredLocale());
  const baseLocale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue());
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const token = useMemo(() => resolveToken(bookingId), [bookingId]);
  const copy = getCopy(booking?.salonLocale ?? baseLocale);
  const c = copy.publicManage;
  const locale = resolveLocale(booking?.salonLocale ?? baseLocale) === 'da' ? 'da-DK' : 'en-US';
  const timeZone = booking?.salonTimezone ?? undefined;

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function load() {
      setIsLoading(true);
      const result = await fetchPublicBooking(bookingId, token!);
      if (!active) return;
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [bookingId, token]);

  const handleRecover = async () => {
    if (!token) return;
    setIsRecovering(true);
    setError('');
    try {
      const result = await fetchPublicBooking(bookingId, token);
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setIsRecovering(false);
    }
  };

  if (!token) {
    return (
      <FeatureState
        status="error"
        title={c.missingTokenTitle}
        description={c.missingTokenDescription}
        testId="public-manage-fallback"
      />
    );
  }

  if (!booking && (isLoading || error)) {
    return (
      <FeatureState
        status={isLoading ? 'loading' : isRecovering ? 'recovery' : 'error'}
        title={isLoading ? c.loadingTitle : c.errorTitle}
        description={isLoading ? c.loadingDescription : undefined}
        error={error}
        onRetry={handleRecover}
        retryLabel={c.retryLabel}
        testId="public-manage-fallback"
      />
    );
  }

  useEffect(() => {
    if (!booking) return;
    const date = booking.startTime.slice(0, 10);
    if (date) setSelectedDate(date);
  }, [booking]);

  useEffect(() => {
    if (!token || !booking) return;
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
        setError(result.error);
      }
      setSlotsLoading(false);
    }
    loadSlots();
    return () => {
      active = false;
    };
  }, [salonSlug, selectedDate, booking, token]);

  async function handleCancel() {
    if (!token || !booking) return;
    setConfirmState({
      title: c.confirmCancelTitle,
      body: c.confirmCancelBody,
      confirmLabel: c.confirmCancel,
      cancelLabel: c.cancelLabel,
      onConfirm: async () => {
        setConfirmState(null);
        setStatus(c.canceling);
        setError('');
        const result = await cancelPublicBooking({
          bookingId: booking.id,
          token,
          reasonKey: 'customer.cancelled'
        });
        if (!result.ok) {
          setStatus('');
          setError(result.error);
          setToast({ message: result.error, type: 'error' });
          return;
        }
        setBooking(result.data);
        setStatus(c.cancelSuccess);
        setToast({ message: c.cancelSuccess, type: 'success' });
      }
    });
  }

  async function handleReschedule(slot: AvailabilitySlot) {
    if (!token || !booking) return;
    const formatted = formatDateTime(slot.startUtc, { locale, timeZone });
    setConfirmState({
      title: c.confirmRescheduleTitle,
      body: c.confirmRescheduleBody.replace('{datetime}', formatted),
      confirmLabel: c.confirmReschedule,
      cancelLabel: c.cancelLabel,
      onConfirm: async () => {
        setConfirmState(null);
        setStatus(c.rescheduling);
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
          setToast({ message: result.error, type: 'error' });
          return;
        }
        setBooking(result.data);
        setStatus(c.moveSuccess);
        setToast({ message: c.moveSuccess, type: 'success' });
      }
    });
  }

  if (!token) {
    return (
      <Stack align="center" className="pb-center-sm">
        <Card>
          <h1>{c.missingTokenTitle}</h1>
          <p className="pb-muted">{c.missingTokenDescription}</p>
        </Card>
      </Stack>
    );
  }

  if (!booking) {
    return (
      <Stack align="center" className="pb-center-sm">
        <Card>
          <h1>{c.loadingTitle}</h1>
          {error && (
            <Card variant="outlined" className="pb-error-card pb-card-top-md">
              <p className="pb-error-text">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="pb-card-top-xs"
              >
                {c.retryLabel}
              </Button>
            </Card>
          )}
        </Card>
      </Stack>
    );
  }

  const isEditable = !['cancelled', 'completed', 'no_show'].includes(booking.status);

  return (
    <Stack gap="md" className="pb-page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <Card>
        <p className="pb-uppercase">{booking.salonName ?? salonSlug}</p>
        <h1>{c.title}</h1>
        <p className="pb-muted">{c.bookingLabel} #{booking.id.slice(0, 8)}</p>
        <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-xs">
          <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'default'}>
            {booking.status}
          </Badge>
          {booking.paymentStatus && (
            <Badge variant={booking.paymentStatus === 'succeeded' || booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
              {c.paymentLabel}: {booking.paymentStatus}
            </Badge>
          )}
        </Stack>
        <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-sm">
          <Button
            variant="ghost"
            onClick={() => window.location.assign(`/book/${salonSlug}`)}
          >
            {c.bookNew}
          </Button>
        </Stack>
      </Card>

      <Card>
        <Stack direction="row" gap="md" className="pb-wrap">
          <div className="pb-col">
            <p className="pb-muted">{c.timeLabel}</p>
            <strong>{formatDateTime(booking.startTime, { locale, timeZone })}</strong>
          </div>
          <div className="pb-col">
            <p className="pb-muted">{c.statusLabel}</p>
            <strong>{booking.status}</strong>
          </div>
          <div className="pb-col">
            <p className="pb-muted">{c.serviceLabel}</p>
            <strong>{booking.serviceName ?? booking.serviceId}</strong>
          </div>
          <div className="pb-col">
            <p className="pb-muted">{c.staffLabel}</p>
            <strong>{booking.staffName ?? booking.staffId}</strong>
          </div>
          {booking.salonPhone && (
            <div className="pb-col">
              <p className="pb-muted">{c.contactLabel}</p>
              <strong>{booking.salonPhone}</strong>
            </div>
          )}
          {booking.salonEmail && (
            <div className="pb-col">
              <p className="pb-muted">{c.emailLabel}</p>
              <strong>{booking.salonEmail}</strong>
            </div>
          )}
        </Stack>
        <Stack direction="row" gap="md" className="pb-card-top-md">
          <Button variant="ghost" size="md" onClick={handleCancel} disabled={!isEditable}>
            {c.cancel}
          </Button>
        </Stack>
        {!isEditable && (
          <p className="pb-muted pb-card-top-sm">
            {c.notEditable}
          </p>
        )}
        {booking.salonCancellationWindowMinutes != null && (
          <p className="pb-muted pb-card-top-sm">
            {c.cancelWindow.replace('{minutes}', String(booking.salonCancellationWindowMinutes))}
          </p>
        )}
        {booking.notes && (
          <p className="pb-muted pb-card-top-xs">
            {c.noteLabel}: {booking.notes}
          </p>
        )}
      </Card>

      <Card>
        <h3>{c.rescheduleTitle}</h3>
        <Input
          label={copy.publicBooking.dateLabel}
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          fullWidth
          disabled={!isEditable}
        />
        <Stack gap="sm" className="pb-card-top-md">
          {slotsLoading && (
            <div className="pb-skeleton-line" />
          )}
          {!slotsLoading &&
            slots.map((slot) => (
              <button
                key={slot.startUtc}
                type="button"
                onClick={() => handleReschedule(slot)}
                className="pb-reschedule-button"
                disabled={!isEditable}
              >
                <div>
                  <strong>{formatDateTime(slot.startUtc, { locale, timeZone })}</strong>
                  <p className="pb-reschedule-label">{c.rescheduleLabel}</p>
                </div>
                <span className="pb-reschedule-action">{c.rescheduleButton}</span>
              </button>
            ))}
        </Stack>
        {slots.length === 0 && !slotsLoading && isEditable && (
          <Card variant="muted">
            <p>{c.noSlotsTitle}</p>
            <p className="pb-muted">{c.noSlotsBody}</p>
          </Card>
        )}
        {status && (
          <Card variant="outlined" className="pb-success-card pb-card-top-md">
            <p className="pb-success-text">{status}</p>
          </Card>
        )}
        {error && (
          <Card variant="outlined" className="pb-error-card pb-card-top-md">
            <p className="pb-error-text">{error}</p>
          </Card>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </Stack>
  );
}

function resolveToken(bookingId: string) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tokenFromQuery = params.get('token');
  if (tokenFromQuery) {
    localStorage.setItem(tokenStorageKey(bookingId), tokenFromQuery);
    params.delete('token');
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
    return tokenFromQuery;
  }
  return localStorage.getItem(tokenStorageKey(bookingId));
}
