import { useState } from 'react';
import type { BookingForm } from '../types';
import { getCopy } from '../copy';
import { ConfirmDialog, Button, Card, Badge, Input, TextArea, Stack } from '@nemsalon/ui';
import { FeatureState } from '../../../components/FeatureState';

type SlotOption = {
  startUtc: string;
  endUtc: string;
  staffId: string;
  label: string;
};

type FirstBookingCTAProps = {
  salonName: string;
  staffName: string;
  serviceName: string;
  assignService: boolean;
  booking: BookingForm;
  computedEndTime: string;
  errors: Record<string, string>;
  bookingError?: string;
  bookingSuccess?: string;
  manageError?: string;
  manageSuccess?: string;
  manageBusy: boolean;
  lastBookingId?: string | null;
  bookingSaving: boolean;
  checkoutUrl?: string | null;
  smsAvailable: boolean;
  slots: SlotOption[];
  slotsLoading: boolean;
  slotsError?: string;
  onReloadSlots: () => void;
  onPickSlot: (slot: SlotOption) => void;
  onCancelBooking: () => void;
  onReschedule: (slot: SlotOption) => void;
  onBookingChange: (patch: Partial<BookingForm>) => void;
  onCreateBooking: () => void;
  onBack: () => void;
  onFixAssignments: () => void;
  onFinishOnboarding: () => void;
  finishingOnboarding?: boolean;
};

export function FirstBookingCTA({
  salonName,
  staffName,
  serviceName,
  assignService,
  booking,
  computedEndTime,
  errors,
  bookingError,
  bookingSuccess,
  manageError,
  manageSuccess,
  manageBusy,
  lastBookingId,
  bookingSaving,
  checkoutUrl,
  smsAvailable,
  slots,
  slotsLoading,
  slotsError,
  onReloadSlots,
  onPickSlot,
  onCancelBooking,
  onReschedule,
  onBookingChange,
  onCreateBooking,
  onBack,
  onFixAssignments,
  onFinishOnboarding,
  finishingOnboarding
}: FirstBookingCTAProps) {
  const copy = getCopy();
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const heroSalon = salonName || copy.cta.fallback.salon;
  const heroStaff = staffName || copy.cta.fallback.staff;
  const heroService = serviceName || copy.cta.fallback.service;
  const heroSummary = copy.format.heroSummary(heroSalon, heroStaff, heroService);

  function closeConfirm() {
    setConfirmState(null);
  }

  function confirmAction(
    state: Omit<NonNullable<typeof confirmState>, 'onConfirm'>,
    action: () => void
  ) {
    setConfirmState({
      ...state,
      onConfirm: () => {
        closeConfirm();
        action();
      }
    });
  }

  return (
    <Card>
      <Badge>{copy.cta.badge}</Badge>
      <h1>{copy.cta.title}</h1>
      <p>{copy.cta.body}</p>

      {!assignService && (
        <Card variant="outlined" className="onb-cta-card">
          <Stack direction="row" gap="md" align="center">
            <span>{copy.cta.assignBanner}</span>
            <Button variant="subtle" size="sm" onClick={onFixAssignments}>
              {copy.cta.fixAssignments}
            </Button>
          </Stack>
        </Card>
      )}

      <Card variant="muted" className="onb-cta-hero">
        <Stack gap="sm">
          <h3>{copy.cta.heroTitle}</h3>
          <p>{heroSummary}</p>
          <p className="onb-cta-note">{copy.cta.heroNote}</p>
        </Stack>
      </Card>

      <Card variant="outlined" className="onb-cta-slots">
        <Badge>{copy.cta.slots.badge}</Badge>
        <h3>{copy.cta.slots.title}</h3>
        <p>{copy.cta.slots.body}</p>
        {slotsLoading ? (
          <p className="onb-cta-note">{copy.cta.slots.loading}</p>
        ) : slotsError && slots.length === 0 ? (
          <FeatureState
            status="error"
            title={copy.cta.slots.errorTitle}
            description={copy.cta.slots.body}
            error={slotsError}
            onRetry={onReloadSlots}
            retryLabel={copy.cta.actions.reloadSlots}
            testId="onboarding-availability-fallback"
          />
        ) : slots.length === 0 ? (
          <p className="onb-cta-note">{copy.cta.slots.empty}</p>
        ) : (
          <Stack direction="row" gap="sm" className="onb-wrap onb-cta-slot-list">
            {slots.slice(0, 10).map((slot) => (
              <Button
                key={`${slot.staffId}-${slot.startUtc}`}
                variant="ghost"
                size="sm"
                onClick={() => onPickSlot(slot)}
              >
                {slot.label}
              </Button>
            ))}
          </Stack>
        )}
        {slotsError && slots.length > 0 && (
          <Card variant="outlined" className="onb-error-card onb-card-top-sm">
            <Stack gap="sm">
              <p className="onb-error">{slotsError}</p>
              <Button variant="subtle" size="sm" onClick={onReloadSlots}>
                {copy.cta.actions.reloadSlots}
              </Button>
            </Stack>
          </Card>
        )}
      </Card>

      <Stack direction="row" gap="md" className="onb-wrap onb-cta-form">
        <Input
          label={copy.cta.fields.customerNameLabel}
          value={booking.customerName}
          onChange={(event) => onBookingChange({ customerName: event.target.value })}
          placeholder={copy.cta.fields.customerNamePlaceholder}
          error={errors.customerName}
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.customerEmailLabel}
          value={booking.customerEmail}
          onChange={(event) => onBookingChange({ customerEmail: event.target.value })}
          placeholder={copy.cta.fields.customerEmailPlaceholder}
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.customerPhoneLabel}
          value={booking.customerPhone}
          onChange={(event) => onBookingChange({ customerPhone: event.target.value })}
          placeholder={copy.cta.fields.customerPhonePlaceholder}
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.serviceLabel}
          value={heroService}
          readOnly
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.staffLabel}
          value={heroStaff}
          readOnly
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.dateLabel}
          type="date"
          value={booking.date}
          onChange={(event) => onBookingChange({ date: event.target.value })}
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.startTimeLabel}
          type="time"
          value={booking.time}
          onChange={(event) => onBookingChange({ time: event.target.value })}
          error={errors.bookingTime}
          className="onb-field-250"
        />
        <Input
          label={copy.cta.fields.endTimeLabel}
          value={computedEndTime || copy.cta.fields.endTimePlaceholder}
          readOnly
          className="onb-field-250"
        />
      </Stack>

      <TextArea
        label={copy.cta.fields.notesLabel}
        value={booking.notes}
        onChange={(event) => onBookingChange({ notes: event.target.value })}
        placeholder={copy.cta.fields.notesPlaceholder}
        rows={3}
        className="onb-cta-textarea"
      />

      <Stack direction="row" gap="lg" className="onb-cta-toggles">
        <label className="onb-label-inline">
          <input
            type="checkbox"
            checked={booking.sendEmail}
            onChange={(event) => onBookingChange({ sendEmail: event.target.checked })}
          />
          {copy.cta.toggles.sendEmail}
        </label>
        <label className="onb-label-inline">
          <input
            type="checkbox"
            checked={booking.sendSms}
            onChange={(event) => onBookingChange({ sendSms: event.target.checked })}
            disabled={!smsAvailable}
          />
          {copy.cta.toggles.sendSms}
        </label>
      </Stack>

      {!smsAvailable && (
        <p className="onb-note">
          {copy.cta.toggles.smsNote}
        </p>
      )}

      {errors.assignService && <p className="onb-cta-error">{errors.assignService}</p>}
      {errors.salonId && <p className="onb-cta-error">{errors.salonId}</p>}

      <Stack direction="row" gap="md" className="onb-cta-actions">
        <Button variant="ghost" size="md" onClick={onBack}>
          {copy.cta.actions.back}
        </Button>
        <Button variant="primary" size="md" onClick={onCreateBooking} disabled={bookingSaving}>
          {bookingSaving ? copy.cta.actions.creating : copy.cta.actions.create}
        </Button>
      </Stack>

      {bookingError && (
        <Card variant="outlined" className="onb-error-card onb-card-top-sm">
          {bookingError.includes('time_not_available') || bookingError.includes('ikke længere tilgængelig') ? (
            <Stack gap="sm">
              <strong>{bookingError}</strong>
              <p className="onb-note onb-note-tight">
                {copy.cta.errors.slotUnavailable}
              </p>
              <Button variant="subtle" size="md" onClick={() => window.location.reload()}>
                {copy.cta.actions.reloadSlots}
              </Button>
            </Stack>
          ) : (
            bookingError
          )}
        </Card>
      )}
      {bookingSuccess && (
        <Card variant="outlined" className="onb-cta-success onb-card-top-sm">
          <Stack gap="sm" align="start">
            <span>{bookingSuccess}</span>
            {checkoutUrl ? (
              <Button
                variant="subtle"
                size="md"
                onClick={() => {
                  if (checkoutUrl) {
                    window.open(checkoutUrl, '_blank', 'noopener');
                  }
                }}
              >
                {copy.cta.actions.openCheckout}
              </Button>
            ) : (
              <Button variant="subtle" size="md">
                {copy.cta.actions.viewCalendar}
              </Button>
            )}
          </Stack>
        </Card>
      )}

      {lastBookingId && (
        <Card variant="outlined" className="onb-card-top-sm">
          <h4>{copy.cta.manage.title}</h4>
          <p>{copy.cta.manage.body}</p>
          <Stack direction="row" gap="md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  confirmAction(
                    { title: copy.cta.manage.confirmCancelTitle, body: copy.cta.manage.confirmCancelBody },
                    onCancelBooking
                  )
                }
                disabled={manageBusy}
              >
              {manageBusy ? copy.cta.actions.cancelling : copy.cta.actions.cancel}
            </Button>
          </Stack>
          <p className="onb-note">
            {copy.cta.manage.rescheduleHint}
          </p>
          <Stack direction="row" gap="sm" className="onb-wrap">
            {slots.slice(0, 10).map((slot) => (
              <Button
                key={`reschedule-${slot.staffId}-${slot.startUtc}`}
                variant="ghost"
                size="sm"
                onClick={() =>
                  confirmAction(
                    {
                      title: copy.cta.manage.confirmRescheduleTitle,
                      body: copy.cta.manage.confirmRescheduleBody.replace('{slot}', slot.label)
                    },
                    () => onReschedule(slot)
                  )
                }
                disabled={manageBusy}
              >
                {copy.cta.actions.reschedule}: {slot.label}
              </Button>
            ))}
          </Stack>
          {manageError && (
            <Card variant="outlined" className="onb-error-card onb-card-top-xs">
              <p className="onb-error">{manageError}</p>
            </Card>
          )}
          {manageSuccess && <p className="onb-note onb-card-top-xs">{manageSuccess}</p>}
        </Card>
      )}

      <Card variant="outlined" className="onb-cta-success onb-card-top-lg">
        <h4>{copy.cta.finish.title}</h4>
        <p>{copy.cta.finish.body}</p>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            console.log('[FirstBookingCTA] Finish onboarding button clicked');
            onFinishOnboarding();
          }}
          isLoading={finishingOnboarding}
        >
          {finishingOnboarding ? copy.cta.actions.finishingOnboarding : copy.cta.actions.finishOnboarding}
        </Button>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={closeConfirm}
      />
    </Card>
  );
}
