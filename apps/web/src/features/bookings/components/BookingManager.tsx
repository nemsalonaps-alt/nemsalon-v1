import { useMemo, useState } from 'react';
import { formatDateTime } from '@nemsalon/shared';
import type { AvailabilitySlot, PublicBooking } from '../../public-booking/api';
import { Card, Stack, Button, Input } from '@nemsalon/ui';
import { getCopy } from '../../../i18n';
import '../booking-manager.css';

export interface BookingManagerCopy {
  title?: string;
  subtitle?: string;
  cancelButton?: string;
  rescheduleButton?: string;
  noSlotsMessage?: string;
  loadingMessage?: string;
  errorNoToken?: string;
  errorNoTokenDescription?: string;
  // Status messages for operations
  cancellingStatus?: string;
  reschedulingStatus?: string;
  cancelledStatus?: string;
  rescheduledStatus?: string;
  // Error messages
  cancelError?: string;
  rescheduleError?: string;
  // UI labels
  timeLabel?: string;
  statusLabel?: string;
  serviceLabel?: string;
  staffLabel?: string;
  selectNewTimeTitle?: string;
  dateLabel?: string;
}

export interface BookingManagerProps {
  booking: PublicBooking | null;
  token: string | null;
  slots: AvailabilitySlot[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onCancel: () => Promise<{ success: boolean; error?: string }>;
  onReschedule: (slot: AvailabilitySlot) => Promise<{ success: boolean; error?: string }>;
  copy?: BookingManagerCopy;
  isLoading?: boolean;
  error?: string;
  status?: string;
  canCancel?: boolean;
  cancellationDeadlineMinutes?: number;
}

/**
 * Check if booking can be cancelled based on cancellation window
 * @param bookingStartTime - ISO string of booking start
 * @param windowMinutes - Cancellation window in minutes
 */
export function canCancelBooking(
  bookingStartTime: string, 
  windowMinutes: number = 60
): boolean {
  const now = new Date();
  const start = new Date(bookingStartTime);
  const diffMs = start.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > windowMinutes;
}

/**
 * Hook for booking operations with loading and error states
 */
export function useBookingOperations(
  onCancel: () => Promise<{ success: boolean; error?: string }>,
  onReschedule: (slot: AvailabilitySlot) => Promise<{ success: boolean; error?: string }>,
  copy?: Partial<BookingManagerCopy>
) {
  const effectiveCopy = { ...defaultCopy, ...copy };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    setStatus(effectiveCopy.cancellingStatus);
    
    const result = await onCancel();
    
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? effectiveCopy.cancelError);
      setStatus(null);
      return false;
    }
    
    setStatus(effectiveCopy.cancelledStatus);
    return true;
  };

  const handleReschedule = async (slot: AvailabilitySlot) => {
    setLoading(true);
    setError(null);
    setStatus(effectiveCopy.reschedulingStatus);
    
    const result = await onReschedule(slot);
    
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? effectiveCopy.rescheduleError);
      setStatus(null);
      return false;
    }
    
    setStatus(effectiveCopy.rescheduledStatus);
    return true;
  };

  const clearError = () => setError(null);
  const clearStatus = () => setStatus(null);

  return {
    loading,
    error,
    status,
    handleCancel,
    handleReschedule,
    clearError,
    clearStatus,
  };
}

/**
 * Reusable booking management component
 * Consolidates duplicate cancel/reschedule logic from:
 * - @/public-booking/routes/ManageBooking.tsx
 * - @/customer-portal/routes/Dashboard.tsx
 * - @/onboarding/components/FirstBookingCTA.tsx
 */
export function BookingManager({
  booking,
  token,
  slots,
  selectedDate,
  onDateChange,
  onCancel,
  onReschedule,
  copy: customCopy,
  isLoading = false,
  error: externalError,
  status: externalStatus,
  canCancel = true,
  cancellationDeadlineMinutes = 60,
}: BookingManagerProps) {
  const copy = {
    ...getCopy(booking?.salonLocale).bookingManager,
    ...customCopy
  } as Required<BookingManagerCopy>;
  
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalStatus, setInternalStatus] = useState<string | null>(null);

  const loading = isLoading || internalLoading;
  const error = externalError ?? internalError;
  const status = externalStatus ?? internalStatus;

  const cancelEnabled = useMemo(() => {
    if (!canCancel || !booking) return false;
    return canCancelBooking(booking.startTime, cancellationDeadlineMinutes);
  }, [canCancel, booking, cancellationDeadlineMinutes]);

  const handleCancel = async () => {
    setInternalLoading(true);
    setInternalError(null);
    setInternalStatus(copy.cancellingStatus);
    
    const result = await onCancel();
    
    setInternalLoading(false);
    if (!result.success) {
      setInternalError(result.error ?? copy.cancelError);
      setInternalStatus(null);
      return;
    }
    
    setInternalStatus(copy.cancelledStatus);
  };

  const handleReschedule = async (slot: AvailabilitySlot) => {
    setInternalLoading(true);
    setInternalError(null);
    setInternalStatus(copy.reschedulingStatus);
    
    const result = await onReschedule(slot);
    
    setInternalLoading(false);
    if (!result.success) {
      setInternalError(result.error ?? copy.rescheduleError);
      setInternalStatus(null);
      return;
    }
    
    setInternalStatus(copy.rescheduledStatus);
  };

  if (!token) {
    return (
      <Stack align="center" className="bm-center">
        <Card className="bm-card">
          <h1>{copy.errorNoToken}</h1>
          <p className="bm-muted">{copy.errorNoTokenDescription}</p>
        </Card>
      </Stack>
    );
  }

  if (!booking || loading) {
    return (
      <Stack align="center" className="bm-center">
        <Card className="bm-card">
          <h1>{copy.loadingMessage}</h1>
          {error && (
            <Card variant="outlined" className="bm-error-card">
              <p className="bm-error-text">{error}</p>
            </Card>
          )}
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className="bm-root">
      <Card>
        <p className="bm-salon">{booking.salonName}</p>
        <h1>{copy.title}</h1>
        <p className="bm-muted">{copy.subtitle} #{booking.id.slice(0, 8)}</p>
      </Card>

      <Card>
        <Stack direction="row" gap="md" className="bm-wrap">
          <div className="bm-col">
            <p className="bm-label">{copy.timeLabel}</p>
            <strong>{formatDateTime(booking.startTime)}</strong>
          </div>
          <div className="bm-col">
            <p className="bm-label">{copy.statusLabel}</p>
            <strong>{booking.status}</strong>
          </div>
          <div className="bm-col">
            <p className="bm-label">{copy.serviceLabel}</p>
            <strong>{booking.serviceName ?? booking.serviceId}</strong>
          </div>
          <div className="bm-col">
            <p className="bm-label">{copy.staffLabel}</p>
            <strong>{booking.staffName ?? booking.staffId}</strong>
          </div>
        </Stack>
        
        {cancelEnabled && (
          <Stack direction="row" gap="md" className="bm-actions">
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              disabled={internalLoading}
            >
              {copy.cancelButton}
            </Button>
          </Stack>
        )}
      </Card>

      <Card>
        <h3>{copy.selectNewTimeTitle}</h3>
        <Input
          label={copy.dateLabel}
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          disabled={internalLoading}
          fullWidth
        />
        <Stack gap="sm" className="bm-slots">
          {slots.map((slot) => (
            <button
              key={slot.startUtc}
              type="button"
              onClick={() => handleReschedule(slot)}
              disabled={internalLoading}
              className="bm-slot-button"
            >
              <div>
                <strong>{formatDateTime(slot.startUtc)}</strong>
                <p className="bm-label">{copy.rescheduleButton}</p>
              </div>
              <span className="bm-action">{copy.rescheduleButton}</span>
            </button>
          ))}
        </Stack>
        {slots.length === 0 && <p className="bm-muted">{copy.noSlotsMessage}</p>}
        {status && (
          <Card variant="outlined" className="bm-status-card">
            <p className="bm-status-text">{status}</p>
          </Card>
        )}
        {error && (
          <Card variant="outlined" className="bm-error-card bm-error-card-alt">
            <p className="bm-error-text">{error}</p>
          </Card>
        )}
      </Card>
    </Stack>
  );
}
