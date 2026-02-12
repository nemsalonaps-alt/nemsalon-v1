import { useEffect, useMemo, useState } from 'react';
import { formatDateTime } from '@nemsalon/shared';
import { Card, Stack, Button, Badge, Toast } from '@nemsalon/ui';
import {
  fetchPublicBooking,
  type PublicBooking
} from '../api';
import { buildBookingManageUrl } from '../../../lib/public-url';
import { buildIcsDataUrl, buildIcsDescription, buildLocation } from '../../../lib/ics';
import { FeatureState } from '../../../components/FeatureState';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import { buildIcsInvite } from '../../../lib/calendar';
import '../public-booking.css';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

export function PublicBookingConfirmation({
  salonSlug,
  bookingId
}: {
  salonSlug: string;
  bookingId: string;
}) {
  const resolvedLocale = resolveLocale(getStoredLocale());
  const baseLocale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const token = useMemo(() => resolveToken(bookingId), [bookingId]);
  const copy = getCopy(booking?.salonLocale ?? baseLocale);
  const c = copy.publicConfirmation;
  const locale = resolveLocale(booking?.salonLocale ?? baseLocale) === 'da' ? 'da-DK' : 'en-US';
  const timeZone = booking?.salonTimezone ?? undefined;

  useEffect(() => {
    if (!token) {
      setError(c.missingToken);
      return;
    }
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
      <Stack align="center" className="pb-center-sm">
        <FeatureState
          status="error"
          title={c.missingAccessTitle}
          description={c.missingAccessDescription}
          testId="public-confirmation-fallback"
        />
      </Stack>
    );
  }

  if (!booking) {
    return (
      <Stack align="center" className="pb-center-sm">
        <FeatureState
          status={isLoading ? 'loading' : isRecovering ? 'recovery' : 'error'}
          title={isLoading ? c.loadingTitle : c.errorTitle}
          description={isLoading ? c.loadingDescription : undefined}
          error={error}
          onRetry={handleRecover}
          retryLabel={c.retryLabel}
          testId="public-confirmation-fallback"
        />
      </Stack>
    );
  }

  const location = buildLocation([
    booking.salonAddressLine1,
    booking.salonAddressLine2,
    booking.salonPostalCode,
    booking.salonCity,
    booking.salonCountry
  ]);
  const salonName = booking.salonName ?? salonSlug;
  const description = buildIcsDescription([
    salonName ? `${c.salonLabel}: ${salonName}` : '',
    booking.staffName ? `${c.staffLabel}: ${booking.staffName}` : '',
    booking.salonPhone ? `${c.phoneLabel}: ${booking.salonPhone}` : '',
    booking.salonEmail ? `${c.emailLabel}: ${booking.salonEmail}` : ''
  ]);

  const icsContent = buildIcsInvite({
    id: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime,
    summary: booking.serviceName
      ? c.icsSummaryWithService
          .replace('{service}', booking.serviceName)
          .replace('{salon}', salonName)
      : c.icsSummaryNoService.replace('{salon}', salonName),
    location: location || undefined,
    description: description || undefined
  });
  const icsHref = buildIcsDataUrl(icsContent);

  return (
    <Stack gap="md" className="pb-page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <Card>
        <p className="pb-uppercase">{salonName}</p>
        <h1>{c.title}</h1>
        <p className="pb-muted">
          {booking.paymentStatus === 'succeeded' || booking.paymentStatus === 'paid'
            ? c.paid
            : c.pending}
        </p>
        <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-sm">
          <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'default'}>
            {booking.status}
          </Badge>
          {booking.paymentStatus && (
            <Badge variant={booking.paymentStatus === 'succeeded' || booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
              {c.paymentLabel}: {booking.paymentStatus}
            </Badge>
          )}
        </Stack>
        <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-md">
          <Button
            variant="primary"
            onClick={() => {
              window.location.assign(buildBookingManageUrl({ salonSlug, bookingId, token }));
            }}
          >
            {c.manage}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              window.location.assign(`/book/${salonSlug}`);
            }}
          >
            {c.bookNew}
          </Button>
          <a
            href={icsHref}
            download={`booking-${bookingId}.ics`}
            className="pb-link-button"
          >
            {c.addToCalendar}
          </a>
        </Stack>
      </Card>

      <Card>
        <h3>{c.detailsTitle}</h3>
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
          <div className="pb-col">
            <p className="pb-muted">{c.paymentLabel}</p>
            <strong>{booking.paymentStatus ?? c.emptyValue}</strong>
          </div>
          {(booking.salonAddressLine1 || booking.salonCity) && (
            <div className="pb-col">
              <p className="pb-muted">{c.addressLabel}</p>
              <strong>
                {buildLocation([
                  booking.salonAddressLine1,
                  booking.salonAddressLine2,
                  booking.salonCity,
                  booking.salonPostalCode,
                  booking.salonCountry
                ])}
              </strong>
            </div>
          )}
          {(booking.salonPhone || booking.salonEmail) && (
            <div className="pb-col">
              <p className="pb-muted">{c.contactLabel}</p>
              <strong>
                {booking.salonPhone ?? ''}
                {booking.salonPhone && booking.salonEmail ? c.contactSeparator : ''}
                {booking.salonEmail ?? ''}
              </strong>
            </div>
          )}
        </Stack>
        <Card variant="outlined" className="pb-card-top-md">
          <p className="pb-muted pb-note">
            {c.cancellationNotice.replace('{minutes}', String(booking.salonCancellationWindowMinutes ?? 0))}
          </p>
        </Card>
        <Stack direction="row" gap="md" className="pb-wrap pb-card-top-md">
          <Button
            variant="primary"
            onClick={() => {
              window.location.assign(buildBookingManageUrl({ salonSlug, bookingId, token }));
            }}
          >
            {c.manage}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              navigator.clipboard
                .writeText(window.location.href)
                .then(() => setToast({ message: c.linkCopied, type: 'success' }))
                .catch(() => setToast({ message: c.linkCopyFailed, type: 'error' }));
            }}
          >
            {c.copyLink}
          </Button>
        </Stack>
      </Card>
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
