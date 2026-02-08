import { useState } from 'react';
import type { BookingForm } from '../types';
import { getCopy } from '../copy';
import { ConfirmDialog } from '@nemsalon/ui';

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
    <section className="panel">
      <span className="badge">{copy.cta.badge}</span>
      <h1>{copy.cta.title}</h1>
      <p>{copy.cta.body}</p>

      {!assignService && (
        <div className="banner" style={{ marginBottom: 16 }}>
          {copy.cta.assignBanner}
          <button className="btn subtle" type="button" onClick={onFixAssignments}>
            {copy.cta.fixAssignments}
          </button>
        </div>
      )}

      <div className="cta-hero">
        <div>
          <h3>{copy.cta.heroTitle}</h3>
          <p>{heroSummary}</p>
        </div>
        <div className="note">{copy.cta.heroNote}</div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="badge">{copy.cta.slots.badge}</div>
        <h3>{copy.cta.slots.title}</h3>
        <p>{copy.cta.slots.body}</p>
        {slotsLoading ? (
          <div className="note">{copy.cta.slots.loading}</div>
        ) : slots.length === 0 ? (
          <div className="note">{copy.cta.slots.empty}</div>
        ) : (
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {slots.slice(0, 10).map((slot) => (
              <button
                key={`${slot.staffId}-${slot.startUtc}`}
                className="btn ghost"
                type="button"
                onClick={() => onPickSlot(slot)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
        {slotsError && <div className="banner">{slotsError}</div>}
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <label className="field">
          <span className="label">{copy.cta.fields.customerNameLabel}</span>
          <input
            className="input"
            value={booking.customerName}
            onChange={(event) => onBookingChange({ customerName: event.target.value })}
            placeholder={copy.cta.fields.customerNamePlaceholder}
          />
          {errors.customerName && <span className="error">{errors.customerName}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.customerEmailLabel}</span>
          <input
            className="input"
            value={booking.customerEmail}
            onChange={(event) => onBookingChange({ customerEmail: event.target.value })}
            placeholder={copy.cta.fields.customerEmailPlaceholder}
          />
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.customerPhoneLabel}</span>
          <input
            className="input"
            value={booking.customerPhone}
            onChange={(event) => onBookingChange({ customerPhone: event.target.value })}
            placeholder={copy.cta.fields.customerPhonePlaceholder}
          />
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.serviceLabel}</span>
          <input className="input" value={heroService} readOnly />
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.staffLabel}</span>
          <input className="input" value={heroStaff} readOnly />
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.dateLabel}</span>
          <input
            className="input"
            type="date"
            value={booking.date}
            onChange={(event) => onBookingChange({ date: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="label">{copy.cta.fields.startTimeLabel}</span>
          <input
            className="input"
            type="time"
            value={booking.time}
            onChange={(event) => onBookingChange({ time: event.target.value })}
          />
          {errors.bookingTime && <span className="error">{errors.bookingTime}</span>}
        </label>
        <div className="field">
          <span className="label">{copy.cta.fields.endTimeLabel}</span>
          <input
            className="input"
            value={computedEndTime || copy.cta.fields.endTimePlaceholder}
            readOnly
          />
        </div>
      </div>

      <label className="field" style={{ marginTop: 16 }}>
        <span className="label">{copy.cta.fields.notesLabel}</span>
        <textarea
          className="textarea"
          rows={3}
          value={booking.notes}
          onChange={(event) => onBookingChange({ notes: event.target.value })}
          placeholder={copy.cta.fields.notesPlaceholder}
        />
      </label>

      <div className="grid two" style={{ marginTop: 16 }}>
        <label className="toggle">
          <input
            type="checkbox"
            checked={booking.sendEmail}
            onChange={(event) => onBookingChange({ sendEmail: event.target.checked })}
          />
          {copy.cta.toggles.sendEmail}
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={booking.sendSms}
            onChange={(event) => onBookingChange({ sendSms: event.target.checked })}
            disabled={!smsAvailable}
          />
          {copy.cta.toggles.sendSms}
        </label>
      </div>

      {!smsAvailable && (
        <div className="note" style={{ marginTop: 12 }}>
          {copy.cta.toggles.smsNote}
        </div>
      )}

      {errors.assignService && <span className="error">{errors.assignService}</span>}
      {errors.salonId && <span className="error">{errors.salonId}</span>}

      <div className="btn-row">
        <button className="btn ghost" type="button" onClick={onBack}>
          {copy.cta.actions.back}
        </button>
        <button className="btn primary" type="button" onClick={onCreateBooking} disabled={bookingSaving}>
          {bookingSaving ? copy.cta.actions.creating : copy.cta.actions.create}
        </button>
      </div>

      {bookingError && (
        <div className="banner" style={{ marginTop: 16 }}>
          {bookingError}
        </div>
      )}
      {bookingSuccess && (
        <div className="banner success" style={{ marginTop: 16 }}>
          {bookingSuccess}
          {checkoutUrl ? (
            <button
              className="btn subtle"
              type="button"
              onClick={() => {
                if (checkoutUrl) {
                  window.open(checkoutUrl, '_blank', 'noopener');
                }
              }}
            >
              {copy.cta.actions.openCheckout}
            </button>
          ) : (
            <button className="btn subtle" type="button">
              {copy.cta.actions.viewCalendar}
            </button>
          )}
        </div>
      )}

      {lastBookingId && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h4>{copy.cta.manage.title}</h4>
          <p>{copy.cta.manage.body}</p>
          <div className="btn-row">
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                confirmAction(
                  { title: 'Annuller booking', body: 'Er du sikker på, at du vil annullere denne booking?' },
                  onCancelBooking
                )
              }
              disabled={manageBusy}
            >
              {manageBusy ? copy.cta.actions.cancelling : copy.cta.actions.cancel}
            </button>
          </div>
          <div className="note" style={{ marginTop: 12 }}>
            {copy.cta.manage.rescheduleHint}
          </div>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {slots.slice(0, 10).map((slot) => (
              <button
                key={`reschedule-${slot.staffId}-${slot.startUtc}`}
                className="btn subtle"
                type="button"
                onClick={() =>
                  confirmAction(
                    {
                      title: 'Reschedule booking',
                      body: `Flyt til ${slot.label}?`
                    },
                    () => onReschedule(slot)
                  )
                }
                disabled={manageBusy}
              >
                {copy.cta.actions.reschedule}: {slot.label}
              </button>
            ))}
          </div>
          {manageError && <div className="banner" style={{ marginTop: 12 }}>{manageError}</div>}
          {manageSuccess && <div className="banner success" style={{ marginTop: 12 }}>{manageSuccess}</div>}
        </div>
      )}

      <div className="panel" style={{ marginTop: 24, borderColor: 'var(--accent)' }}>
        <h4>Gå til Owner Console</h4>
        <p>Du er klar til at bruge Owner Console. Afslut onboarding for at fortsætte.</p>
        <button
          className="btn primary"
          type="button"
          onClick={onFinishOnboarding}
          disabled={finishingOnboarding}
        >
          {finishingOnboarding ? 'Afslutter...' : 'Afslut onboarding'}
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={closeConfirm}
      />
    </section>
  );
}
