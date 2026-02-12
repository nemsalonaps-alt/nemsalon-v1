import { formatPrice } from '@nemsalon/shared';
import type { BookingSummary } from '../../types';
import { Button, Card, Stack, Input, Badge } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import { getStoredLocale, resolveLocale, type CopyType } from '../../../../i18n';
import '../../console.css';

interface BookingDetailsTabProps {
  bookings: BookingSummary[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedBookingId: string;
  setSelectedBookingId: (id: string) => void;
  bookingLookupId: string;
  setBookingLookupId: (id: string) => void;
  bookingPayment: string;
  staffById: Map<string, { name: string }>;
  onLookup: () => void;
  onCancel: () => void;
  onForceConfirm: () => void;
  onRefund: () => void;
  onReconcile: () => void;
  copy: CopyType;
}

export function BookingDetailsTab({
  bookings,
  loading = false,
  error = null,
  onRetry,
  selectedBookingId,
  setSelectedBookingId,
  bookingLookupId,
  setBookingLookupId,
  bookingPayment,
  staffById,
  onLookup,
  onCancel,
  onForceConfirm,
  onRefund,
  onReconcile,
  copy
}: BookingDetailsTabProps) {
  const c = copy.console.details;
  const locale = resolveLocale(getStoredLocale());
  const dateLocale = locale === 'da' ? 'da-DK' : 'en-US';
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  if ((loading && bookings.length === 0) || (error && bookings.length === 0)) {
    return (
      <FeatureState
        status={loading ? 'loading' : 'error'}
        title={loading ? c.loadingTitle : c.errorTitle}
        description={loading ? c.loadingBody : undefined}
        error={error ?? undefined}
        onRetry={onRetry}
        retryLabel={c.retry}
        testId="booking-details-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      {/* Lookup Section */}
      <Stack gap="md">
        <h2>{c.lookupTitle}</h2>
        <Stack direction="row" gap="md" align="center" className="details-lookup-row">
          <Input
            type="text"
            placeholder={c.lookupPlaceholder}
            value={bookingLookupId}
            onChange={(e) => setBookingLookupId(e.target.value)}
            className="details-lookup-input"
          />
          <Button variant="primary" size="md" onClick={onLookup}>
            {c.lookupButton}
          </Button>
        </Stack>

        {/* Bookings List */}
        <Stack gap="sm">
          <h3>{c.bookingsList}</h3>
          {bookings.length === 0 ? (
            <p className="details-muted">{c.noBookings}</p>
          ) : (
            <Stack gap="sm">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                  className={[
                    'details-list-card',
                    selectedBookingId === booking.id ? 'details-list-card-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Stack direction="row" gap="md" align="center" justify="between">
                    <span className="details-muted">{booking.id.slice(0, 8)}...</span>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'default'}>
                      {c.status[booking.status as keyof typeof c.status] || booking.status}
                    </Badge>
                  </Stack>
                  <Stack direction="row" gap="md" align="center" className="details-list-row">
                    <span>{new Date(booking.startTime).toLocaleDateString(dateLocale)}</span>
                    <span className="details-muted">{booking.customerName || c.unknownCustomer}</span>
                  </Stack>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Selected Booking Details */}
      {selectedBooking && (
        <Card variant="outlined" className="details-card-top">
          <h2>{c.detailsTitle}</h2>
          
          <Stack gap="md" className="details-section">
            <Stack direction="row" gap="md" align="center" justify="between">
              <h3>{selectedBooking.serviceName || selectedBooking.serviceId}</h3>
              <Badge variant={selectedBooking.status === 'confirmed' ? 'success' : selectedBooking.status === 'cancelled' ? 'error' : 'default'}>
                {c.status[selectedBooking.status as keyof typeof c.status] || selectedBooking.status}
              </Badge>
            </Stack>

            <Stack gap="sm">
              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.dateLabel}</span>
                <span>
                  {new Date(selectedBooking.startTime).toLocaleDateString(dateLocale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </Stack>
              
              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.timeLabel}</span>
                <span>
                  {new Date(selectedBooking.startTime).toLocaleTimeString(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {copy.rangeSeparator}
                  {new Date(selectedBooking.endTime).toLocaleTimeString(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </Stack>

              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.customerLabel}</span>
                <span>{selectedBooking.customerName || c.unknownCustomer}</span>
              </Stack>

              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.staffLabel}</span>
                <span>
                  {selectedBooking.staffName || 
                   staffById.get(selectedBooking.staffId)?.name || 
                   selectedBooking.staffId}
                </span>
              </Stack>

              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.totalLabel}</span>
                <span>{formatPrice(selectedBooking.totalAmount, selectedBooking.currency, dateLocale)}</span>
              </Stack>

              <Stack direction="row" gap="md" align="center" justify="between">
                <span className="details-muted">{c.paymentStatusLabel}</span>
                <span>
                  {c.paymentStatus[selectedBooking.paymentStatus as keyof typeof c.paymentStatus] || 
                   selectedBooking.paymentStatus}
                </span>
              </Stack>

              {bookingPayment && (
                <Stack direction="row" gap="md" align="center" justify="between">
                  <span className="details-muted">{c.paymentDetailsLabel}</span>
                  <span>{bookingPayment}</span>
                </Stack>
              )}
            </Stack>

            {/* Actions */}
            <Stack direction="row" gap="sm" className="details-actions">
              {['confirmed', 'pending', 'in_progress'].includes(selectedBooking.status) && (
                <Button variant="danger" size="md" onClick={onCancel}>
                  {c.cancelBooking}
                </Button>
              )}

              {selectedBooking.status === 'pending' && (
                <Button variant="primary" size="md" onClick={onForceConfirm}>
                  {c.forceConfirm}
                </Button>
              )}

              {(selectedBooking.paymentStatus === 'succeeded' ||
                selectedBooking.paymentStatus === 'paid') && (
                <Button variant="secondary" size="md" onClick={onRefund}>
                  {c.refundPayment}
                </Button>
              )}

              {['pending', 'processing', 'requires_action', 'failed'].includes(
                selectedBooking.paymentStatus ?? ''
              ) && (
                <Button variant="secondary" size="md" onClick={onReconcile}>
                  {c.reconcilePayment}
                </Button>
              )}
            </Stack>
          </Stack>
        </Card>
      )}

      {!selectedBooking && bookings.length > 0 && (
        <Card variant="muted" className="details-empty-card">
          <p className="details-muted">{c.selectBooking}</p>
        </Card>
      )}
    </Card>
  );
}
