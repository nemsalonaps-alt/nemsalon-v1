import { useMemo } from 'react';
import { formatTime } from '@nemsalon/shared';
import { Button, Card, Stack } from '@nemsalon/ui';
import type { BookingSummary, Customer } from '../../console/types';

interface HomeSectionProps {
  bookings: BookingSummary[];
  selectedBookingId: string;
  onSelectBooking: (id: string) => void;
  onStartBooking: () => void;
  onCompleteBooking: () => void;
  onNoShowBooking: () => void;
  customerDetails: Customer | null;
  timeZone: string;
  locale: string;
  copy: {
    nextBooking: string;
    noNextBooking: string;
    startCta: string;
    doneCta: string;
    noShowCta: string;
    unknownCustomer: string;
    todayTitle: string;
    emptyTitle: string;
    emptyBody: string;
    phoneLabel: string;
    emailLabel: string;
    statusLabels: {
      pending: string;
      confirmed: string;
      in_progress: string;
      completed: string;
      cancelled: string;
      no_show: string;
    };
  };
}

export function HomeSection({
  bookings,
  selectedBookingId,
  onSelectBooking,
  onStartBooking,
  onCompleteBooking,
  onNoShowBooking,
  customerDetails,
  timeZone,
  locale,
  copy,
}: HomeSectionProps) {
  const now = new Date();

  // Find next upcoming booking
  const nextBooking = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => new Date(b.startTime) > now && b.status !== 'completed' && b.status !== 'no_show',
    );
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [bookings, now]);

  // Sort bookings chronologically
  const sortedBookings = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [bookings]);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'sc-status--active';
      case 'completed':
        return 'sc-status--done';
      case 'no_show':
        return 'sc-status--noshow';
      case 'confirmed':
        return 'sc-status--confirmed';
      default:
        return 'sc-status--pending';
    }
  };

  const getStatusLabel = (status: string) => {
    return copy.statusLabels[status as keyof typeof copy.statusLabels] || status;
  };

  return (
    <Stack gap="lg">
      {/* Next Booking - Prominent */}
      <section className="sc-next-booking">
        <h2 className="sc-section-title">{copy.nextBooking}</h2>
        {nextBooking ? (
          <Card className="sc-next-card">
            <Stack gap="md">
              <div className="sc-next-time">
                {formatTime(nextBooking.startTime, { timeZone, locale })}
              </div>
              <div className="sc-next-info">
                <strong className="sc-next-name">
                  {nextBooking.customerName || copy.unknownCustomer}
                </strong>
                <span className="sc-next-service">{nextBooking.serviceName}</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  onSelectBooking(nextBooking.id);
                  onStartBooking();
                }}
                disabled={nextBooking.status === 'in_progress'}
                fullWidth
                className="sc-start-btn"
              >
                ▶ {copy.startCta}
              </Button>
            </Stack>
          </Card>
        ) : (
          <Card variant="muted" className="sc-empty-card">
            <p className="sc-empty-text">{copy.noNextBooking}</p>
          </Card>
        )}
      </section>

      {/* Today's List */}
      <section className="sc-today-list">
        <h2 className="sc-section-title">{copy.todayTitle}</h2>

        {sortedBookings.length === 0 ? (
          <Card variant="muted">
            <p className="sc-empty-title">{copy.emptyTitle}</p>
            <p className="sc-muted">{copy.emptyBody}</p>
          </Card>
        ) : (
          <Stack gap="sm">
            {sortedBookings.map((booking) => {
              const isSelected = selectedBookingId === booking.id;
              const isNext = nextBooking?.id === booking.id;

              return (
                <div
                  key={booking.id}
                  onClick={() => onSelectBooking(isSelected ? '' : booking.id)}
                  className={`sc-booking-item ${isSelected ? 'sc-booking-item--selected' : ''} ${isNext ? 'sc-booking-item--next' : ''}`}
                >
                  <div className={`sc-status-indicator ${getStatusColor(booking.status)}`} />

                  <div className="sc-booking-time">
                    <span className="sc-time-start">
                      {formatTime(booking.startTime, { timeZone, locale })}
                    </span>
                    <span className="sc-time-end">
                      {formatTime(booking.endTime, { timeZone, locale })}
                    </span>
                  </div>

                  <div className="sc-booking-info">
                    <strong className="sc-booking-name">
                      {booking.customerName || copy.unknownCustomer}
                    </strong>
                    <span className="sc-booking-service">{booking.serviceName}</span>
                  </div>

                  <div className={`sc-status-badge ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </section>

      {/* Selected Booking Actions */}
      {selectedBooking && (
        <Card className="sc-actions-card">
          <Stack gap="sm">
            <div className="sc-selected-header">
              <strong>{selectedBooking.customerName || copy.unknownCustomer}</strong>
              <span className="sc-selected-service">{selectedBooking.serviceName}</span>
            </div>

            {customerDetails?.phone && (
              <p className="sc-detail-line">
                {copy.phoneLabel}: {customerDetails.phone}
              </p>
            )}
            {customerDetails?.email && (
              <p className="sc-detail-line">
                {copy.emailLabel}: {customerDetails.email}
              </p>
            )}

            <Stack direction="row" gap="sm" className="sc-action-buttons">
              <Button
                variant="primary"
                size="md"
                onClick={onStartBooking}
                disabled={
                  selectedBooking.status === 'in_progress' || selectedBooking.status === 'completed'
                }
                fullWidth
              >
                ▶ {copy.startCta}
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={onCompleteBooking}
                disabled={selectedBooking.status === 'completed'}
                fullWidth
              >
                ✓ {copy.doneCta}
              </Button>

              <Button
                variant="ghost"
                size="md"
                onClick={onNoShowBooking}
                disabled={
                  selectedBooking.status === 'no_show' || selectedBooking.status === 'completed'
                }
                fullWidth
              >
                ✕ {copy.noShowCta}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
