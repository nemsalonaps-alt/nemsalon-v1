import { useState } from 'react';
import { formatTime, formatDateTime } from '@nemsalon/shared';
import { Button, Card, Stack, Input } from '@nemsalon/ui';
import type { BookingSummary, Customer } from '../../console/types';

interface BookingsSectionProps {
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
    title: string;
    searchPlaceholder: string;
    filterAll: string;
    filterToday: string;
    filterUpcoming: string;
    filterCompleted: string;
    noBookings: string;
    customerLabel: string;
    serviceLabel: string;
    timeLabel: string;
    phoneLabel: string;
    emailLabel: string;
    paymentLabel: string;
    notesLabel: string;
    historyLabel: string;
    startCta: string;
    doneCta: string;
    noShowCta: string;
    callCta: string;
    unknownCustomer: string;
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

export function BookingsSection({
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
}: BookingsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      (booking.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.serviceName || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const bookingDate = new Date(booking.startTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today': {
        const bookingDay = new Date(bookingDate);
        bookingDay.setHours(0, 0, 0, 0);
        return bookingDay.getTime() === today.getTime();
      }
      case 'upcoming':
        return (
          bookingDate >= today && booking.status !== 'completed' && booking.status !== 'no_show'
        );
      case 'completed':
        return booking.status === 'completed' || booking.status === 'no_show';
      default:
        return true;
    }
  });

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
      {/* Search and Filter */}
      <Card>
        <Stack gap="md">
          <Input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
          <Stack direction="row" gap="sm" className="sc-filter-buttons">
            {(['all', 'today', 'upcoming', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`sc-filter-btn ${filter === f ? 'sc-filter-btn--active' : ''}`}
              >
                {f === 'all' && copy.filterAll}
                {f === 'today' && copy.filterToday}
                {f === 'upcoming' && copy.filterUpcoming}
                {f === 'completed' && copy.filterCompleted}
              </button>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Bookings List */}
      <section className="sc-section">
        {filteredBookings.length === 0 ? (
          <Card variant="muted">
            <p className="sc-empty-title">{copy.noBookings}</p>
          </Card>
        ) : (
          <Stack gap="sm">
            {filteredBookings.map((booking) => {
              const isSelected = selectedBookingId === booking.id;

              return (
                <div
                  key={booking.id}
                  onClick={() => onSelectBooking(isSelected ? '' : booking.id)}
                  className={`sc-booking-detail-item ${isSelected ? 'sc-booking-detail-item--selected' : ''}`}
                >
                  <div className="sc-booking-detail-header">
                    <div className={`sc-status-dot ${getStatusColor(booking.status)}`} />
                    <span className="sc-booking-detail-date">
                      {formatDateTime(booking.startTime, { timeZone, locale })}
                    </span>
                    <span className={`sc-status-badge ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="sc-booking-detail-content">
                    <div className="sc-detail-row">
                      <span className="sc-detail-label">{copy.customerLabel}:</span>
                      <strong>{booking.customerName || copy.unknownCustomer}</strong>
                    </div>
                    <div className="sc-detail-row">
                      <span className="sc-detail-label">{copy.serviceLabel}:</span>
                      <span>{booking.serviceName}</span>
                    </div>
                    <div className="sc-detail-row">
                      <span className="sc-detail-label">{copy.timeLabel}:</span>
                      <span>
                        {formatTime(booking.startTime, { timeZone, locale })} -{' '}
                        {formatTime(booking.endTime, { timeZone, locale })}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="sc-booking-expanded">
                      {customerDetails?.phone && (
                        <div className="sc-detail-row">
                          <span className="sc-detail-label">{copy.phoneLabel}:</span>
                          <a href={`tel:${customerDetails.phone}`} className="sc-phone-link">
                            {customerDetails.phone}
                          </a>
                        </div>
                      )}
                      {customerDetails?.email && (
                        <div className="sc-detail-row">
                          <span className="sc-detail-label">{copy.emailLabel}:</span>
                          <span>{customerDetails.email}</span>
                        </div>
                      )}
                      {booking.paymentStatus && (
                        <div className="sc-detail-row">
                          <span className="sc-detail-label">{copy.paymentLabel}:</span>
                          <span>{booking.paymentStatus}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <Stack direction="row" gap="sm" className="sc-detail-actions">
                        {customerDetails?.phone && (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${customerDetails.phone}`;
                            }}
                            fullWidth
                          >
                            📞 {copy.callCta}
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartBooking();
                          }}
                          disabled={
                            booking.status === 'in_progress' || booking.status === 'completed'
                          }
                          fullWidth
                        >
                          ▶ {copy.startCta}
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteBooking();
                          }}
                          disabled={booking.status === 'completed'}
                          fullWidth
                        >
                          ✓ {copy.doneCta}
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoShowBooking();
                          }}
                          disabled={booking.status === 'no_show' || booking.status === 'completed'}
                          fullWidth
                        >
                          ✕ {copy.noShowCta}
                        </Button>
                      </Stack>
                    </div>
                  )}
                </div>
              );
            })}
          </Stack>
        )}
      </section>
    </Stack>
  );
}
