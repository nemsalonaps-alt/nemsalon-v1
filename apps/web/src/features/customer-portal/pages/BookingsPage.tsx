import { useState, useMemo } from 'react';
import { formatDate, formatTime, formatPrice } from '@nemsalon/shared';
import { Card, Button, Badge, Stack } from '@nemsalon/ui';
import { ConfirmDialog } from '@nemsalon/ui';
import type { CustomerBooking } from '../api';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import { buildIcsDataUrl } from '../../../lib/ics';
import { buildIcsInvite } from '../../../lib/calendar';
import '../portal.css';

const t = getCopy();

interface BookingsPageProps {
  bookings: CustomerBooking[];
  loading?: boolean;
  onReschedule: (booking: CustomerBooking, startUtc: string) => Promise<void>;
  onCancel: (booking: CustomerBooking) => Promise<void>;
  onPay?: (booking: CustomerBooking) => void;
  actionError?: string | null;
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'no_show':
      return 'error';
    default:
      return 'default';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t.customerPortal.status.pending,
    confirmed: t.customerPortal.status.confirmed,
    in_progress: t.customerPortal.status.in_progress,
    completed: t.customerPortal.status.completed,
    cancelled: t.customerPortal.status.cancelled,
    no_show: t.customerPortal.status.no_show,
  };
  return labels[status] ?? status;
}

function buildAddressLine(booking: CustomerBooking): string | null {
  const parts = [
    booking.salonAddress?.line1,
    booking.salonAddress?.city,
    booking.salonAddress?.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildMapsUrl(booking: CustomerBooking): string | null {
  const address = buildAddressLine(booking);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function BookingsPage({
  bookings,
  loading = false,
  onReschedule: _onReschedule,
  onCancel,
  onPay,
  actionError,
}: BookingsPageProps) {
  // TODO: Use _onReschedule when implementing full reschedule flow
  void _onReschedule;
  const resolvedLocale = resolveLocale(getStoredLocale());
  const locale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';

  const [expandedPast, setExpandedPast] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    onConfirm: () => void;
  } | null>(null);

  // Split bookings into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const now = new Date().toISOString();
    return {
      upcoming: bookings
        .filter((b) => b.startTime > now && b.status !== 'cancelled')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      past: bookings
        .filter((b) => b.startTime <= now || b.status === 'cancelled')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    };
  }, [bookings]);

  const nextBooking = upcoming[0] ?? null;
  const otherUpcoming = upcoming.slice(1);

  const handleCancelClick = (booking: CustomerBooking) => {
    setConfirmDialog({
      title: t.customerPortal.cancelConfirmTitle,
      body: t.customerPortal.cancelConfirmBody,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onCancel(booking);
      },
    });
  };

  const handleAddToCalendar = (booking: CustomerBooking) => {
    const invite = buildIcsInvite({
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      summary: `${booking.serviceName} - ${booking.salonName}`,
      location: buildAddressLine(booking) || undefined,
      description: [
        booking.staffName && `${t.customerDashboard.labels.staff}: ${booking.staffName}`,
        booking.salonPhone && `${t.customerPortal.phoneLabel}: ${booking.salonPhone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    const url = buildIcsDataUrl(invite);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${booking.id.slice(0, 8)}.ics`;
    a.click();
  };

  const handleOpenMaps = (booking: CustomerBooking) => {
    const url = buildMapsUrl(booking);
    if (url) window.open(url, '_blank');
  };

  const handleContact = (booking: CustomerBooking) => {
    if (booking.salonPhone) {
      window.location.href = `tel:${booking.salonPhone}`;
    }
  };

  if (loading) {
    return (
      <div className="cp-page-container">
        <div className="cp-loading-state">
          <div className="cp-spinner" />
          <p className="cp-muted">{t.customerPortal.loading}</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="cp-page-container">
        <Card className="cp-empty-state">
          <div className="cp-empty-icon">📅</div>
          <h2 className="cp-empty-title">{t.customerPortal.emptyUpcoming}</h2>
          <p className="cp-muted">{t.customerPortal.emptyStateSubtitle}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Hero: Next Booking */}
      {nextBooking && (
        <section className="cp-hero-section">
          <div className="cp-section-label">{t.customerPortal.nextBookingLabel}</div>

          <Card className="cp-hero-card">
            <Stack gap="md">
              {/* Header */}
              <Stack direction="row" justify="between" align="center">
                <div>
                  <h2 className="cp-hero-salon">{nextBooking.salonName}</h2>
                  <p className="cp-muted">{nextBooking.serviceName}</p>
                </div>
                <Badge variant={getStatusVariant(nextBooking.status)}>
                  {getStatusLabel(nextBooking.status)}
                </Badge>
              </Stack>

              {/* Time Block */}
              <div className="cp-time-block">
                <div className="cp-date-display">
                  <span className="cp-date-day">{new Date(nextBooking.startTime).getDate()}</span>
                  <span className="cp-date-month">
                    {new Date(nextBooking.startTime).toLocaleDateString(locale, {
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="cp-time-display">
                  <span className="cp-time-main">
                    {formatTime(nextBooking.startTime, { locale })}
                  </span>
                  <span className="cp-muted">
                    {new Date(nextBooking.startTime).toLocaleDateString(locale, {
                      weekday: 'long',
                    })}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="cp-booking-details">
                {nextBooking.staffName && (
                  <div className="cp-detail-row">
                    <span className="cp-detail-label">{t.customerDashboard.labels.staff}</span>
                    <span className="cp-detail-value">{nextBooking.staffName}</span>
                  </div>
                )}
                {buildAddressLine(nextBooking) && (
                  <div className="cp-detail-row">
                    <span className="cp-detail-label">{t.customerDashboard.labels.address}</span>
                    <span className="cp-detail-value">{buildAddressLine(nextBooking)}</span>
                  </div>
                )}
                <div className="cp-detail-row">
                  <span className="cp-detail-label">{t.customerDashboard.labels.price}</span>
                  <span className="cp-detail-value cp-price">
                    {formatPrice(nextBooking.totalAmount, nextBooking.currency, locale)}
                  </span>
                </div>
              </div>

              {/* Payment Warning */}
              {nextBooking.paymentStatus === 'pending' && nextBooking.totalAmount > 0 && (
                <Card variant="outlined" className="cp-payment-warning">
                  <Stack direction="row" justify="between" align="center">
                    <span className="cp-price">
                      {formatPrice(nextBooking.totalAmount, nextBooking.currency, locale)}
                    </span>
                    <span className="cp-muted">{t.customerDashboard.paymentStatus.pending}</span>
                    {onPay && (
                      <Button variant="primary" size="sm" onClick={() => onPay(nextBooking)}>
                        {t.customerDashboard.actions.payNow}
                      </Button>
                    )}
                  </Stack>
                </Card>
              )}

              {/* 1-Click Actions */}
              <div className="cp-actions-grid">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedBooking(nextBooking)}
                  className="cp-action-btn"
                >
                  📅 {t.customerPortal.actions.reschedule}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelClick(nextBooking)}
                  className="cp-action-btn"
                >
                  ✕ {t.customerPortal.actions.cancel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddToCalendar(nextBooking)}
                  className="cp-action-btn"
                >
                  🗓 {t.customerPortal.actions.calendar}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenMaps(nextBooking)}
                  disabled={!buildMapsUrl(nextBooking)}
                  className="cp-action-btn"
                >
                  📍 {t.customerPortal.actions.maps}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleContact(nextBooking)}
                  disabled={!nextBooking.salonPhone}
                  className="cp-action-btn"
                >
                  📞 {t.customerPortal.actions.contact}
                </Button>
              </div>
            </Stack>
          </Card>
        </section>
      )}

      {/* Other Upcoming */}
      {otherUpcoming.length > 0 && (
        <section className="cp-section">
          <div className="cp-section-label">{t.customerPortal.upcomingLabel}</div>
          <Stack gap="sm">
            {otherUpcoming.map((booking) => (
              <Card key={booking.id} className="cp-booking-mini">
                <Stack direction="row" justify="between" align="center">
                  <div>
                    <div className="cp-mini-salon">{booking.salonName}</div>
                    <div className="cp-muted cp-mini-service">{booking.serviceName}</div>
                    <div className="cp-muted cp-mini-time">
                      {formatDate(booking.startTime, { locale })} ·{' '}
                      {formatTime(booking.startTime, { locale })}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(booking.status)} size="sm">
                    {getStatusLabel(booking.status)}
                  </Badge>
                </Stack>
              </Card>
            ))}
          </Stack>
        </section>
      )}

      {/* Past Bookings */}
      {past.length > 0 && (
        <section className="cp-section">
          <button className="cp-expand-btn" onClick={() => setExpandedPast(!expandedPast)}>
            <span>{expandedPast ? '▼' : '▶'}</span>
            <span>
              {expandedPast
                ? t.customerPortal.hidePast
                : t.customerPortal.showPast.replace('{count}', String(past.length))}
            </span>
          </button>

          {expandedPast && (
            <Stack gap="sm" className="cp-past-list">
              {past.map((booking) => (
                <Card key={booking.id} className="cp-booking-mini cp-booking-past">
                  <Stack direction="row" justify="between" align="center">
                    <div>
                      <div className="cp-mini-salon">{booking.salonName}</div>
                      <div className="cp-muted cp-mini-service">{booking.serviceName}</div>
                      <div className="cp-muted cp-mini-time">
                        {formatDate(booking.startTime, { locale })} ·{' '}
                        {formatTime(booking.startTime, { locale })}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(booking.status)} size="sm">
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </section>
      )}

      {/* Error */}
      {actionError && (
        <Card variant="outlined" className="cp-error-card">
          <p className="cp-error-text">{actionError}</p>
        </Card>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        body={confirmDialog?.body ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Reschedule Modal (simplified) */}
      {selectedBooking && (
        <div className="cp-modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="cp-modal">
              <h3>{t.customerPortal.rescheduleTitle}</h3>
              <p className="cp-muted">
                {selectedBooking.salonName} - {selectedBooking.serviceName}
              </p>
              <p className="cp-muted">{t.customerPortal.rescheduleComingSoon}</p>
              <Button variant="secondary" onClick={() => setSelectedBooking(null)}>
                {t.customerPortal.close}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
