import { useEffect, useMemo, useState } from 'react';
import {
  fetchMe,
  updateSalon,
  setBusinessHours,
  createStaff,
  createService,
  assignStaffServices,
  createBooking,
  createCheckout
} from './api';
import { Gate } from './pages/Gate';
import { SalonStep } from './pages/SalonStep';
import { SetupStep } from './pages/SetupStep';
import { FirstBookingCTA } from './components/FirstBookingCTA';
import { Progress } from './components/Progress';
import { StepLayout } from './components/StepLayout';
import type { BookingForm, GateState, SalonForm, ServiceForm, StaffForm, StepId, WeeklyHours, DayId } from './types';
import { copy } from './copy';
import {
  addMinutes,
  defaultCurrencyForLocale,
  defaultWeeklyHours,
  getBrowserLocale,
  getBrowserTimezone,
  normalizeLocale,
  toMinorUnits,
  validateBooking,
  validateSalon,
  validateStaffAndService
} from './schema';

export function OnboardingFlow() {
  const [gateState, setGateState] = useState<GateState>('checking');
  const [step, setStep] = useState<StepId>('salon');
  const [salonId, setSalonId] = useState<string | null>(null);

  const initialLocale = normalizeLocale(getBrowserLocale());
  const [salon, setSalon] = useState<SalonForm>({
    name: '',
    timezone: getBrowserTimezone(),
    locale: initialLocale,
    currency: defaultCurrencyForLocale(initialLocale)
  });
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours[]>(defaultWeeklyHours);
  const [salonErrors, setSalonErrors] = useState<Record<string, string>>({});
  const [salonApiError, setSalonApiError] = useState('');
  const [salonSaving, setSalonSaving] = useState(false);

  const [staff, setStaff] = useState<StaffForm>({
    name: '',
    role: 'owner',
    sameHours: true
  });
  const [staffHours, setStaffHours] = useState<WeeklyHours[]>(defaultWeeklyHours);
  const [service, setService] = useState<ServiceForm>({
    name: '',
    durationMinutes: '30',
    priceDisplay: '499',
    bufferMinutes: 0
  });
  const [assignService, setAssignService] = useState(true);
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});
  const [staffApiError, setStaffApiError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);

  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paymentsReady, setPaymentsReady] = useState(false);

  const [booking, setBooking] = useState<BookingForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    notes: '',
    sendEmail: true,
    sendSms: false
  });
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const smsAvailable = false;

  const steps = useMemo(
    () => [
      {
        id: 'salon',
        title: copy.stepper.steps.salon.title,
        hint: copy.stepper.steps.salon.hint
      },
      {
        id: 'staff',
        title: copy.stepper.steps.staff.title,
        hint: copy.stepper.steps.staff.hint
      },
      {
        id: 'payments',
        title: copy.stepper.steps.payments.title,
        hint: copy.stepper.steps.payments.hint
      },
      {
        id: 'cta',
        title: copy.stepper.steps.cta.title,
        hint: copy.stepper.steps.cta.hint
      }
    ],
    []
  );

  useEffect(() => {
    let active = true;
    const loadMe = async () => {
      const result = await fetchMe();
      if (!active) return;
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          setGateState('needs-login');
        } else {
          setGateState('needs-onboarding');
        }
        return;
      }

      const nextSalonId = result.data.primarySalonId ?? result.data.user?.primarySalonId ?? null;
      setSalonId(nextSalonId);
      if (result.data.salon) {
        setSalon((prev) => ({
          name: result.data.salon?.name ?? prev.name,
          timezone: result.data.salon?.timezone ?? prev.timezone,
          locale: result.data.salon?.locale ?? prev.locale,
          currency: result.data.salon?.currency ?? prev.currency
        }));
      }
      if (result.data.salon?.status === 'active') {
        setGateState('has-salon');
      } else {
        setGateState('needs-onboarding');
      }
    };
    loadMe();
    return () => {
      active = false;
    };
  }, []);

  const computedEndTime = useMemo(() => {
    const durationValue = Number(service.durationMinutes);
    if (Number.isNaN(durationValue)) return '';
    return addMinutes(booking.time, durationValue + service.bufferMinutes);
  }, [booking.time, service.durationMinutes, service.bufferMinutes]);

  const updateHours = (
    setter: (value: WeeklyHours[]) => void,
    targetDay: DayId,
    patch: Partial<WeeklyHours>
  ) => {
    setter((prev) =>
      prev.map((entry) => (entry.day === targetDay ? { ...entry, ...patch } : entry))
    );
  };

  const handleSalonChange = (patch: Partial<SalonForm>) => {
    setSalon((prev) => {
      const next = { ...prev, ...patch };
      if (patch.locale && !currencyTouched) {
        next.currency = defaultCurrencyForLocale(patch.locale);
      }
      return next;
    });
    if (patch.currency) {
      setCurrencyTouched(true);
    }
  };

  const handleContinueSalon = async () => {
    const errors = validateSalon(salon, weeklyHours);
    setSalonErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!salonId) {
      setSalonApiError(copy.salon.missingSalonId);
      return;
    }
    setSalonSaving(true);
    setSalonApiError('');

    const updateResult = await updateSalon(salonId, salon);
    if (!updateResult.ok) {
      setSalonSaving(false);
      setSalonApiError(updateResult.error);
      return;
    }
    const hoursResult = await setBusinessHours(salonId, weeklyHours);
    setSalonSaving(false);
    if (!hoursResult.ok) {
      setSalonApiError(hoursResult.error);
      return;
    }
    setStep('staff');
  };

  const handleContinueStaff = async () => {
    const errors = validateStaffAndService(staff, staffHours, service, assignService);
    setStaffErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStaffSaving(true);
    setStaffApiError('');

    const staffResult = await createStaff({ name: staff.name.trim(), role: staff.role });
    if (!staffResult.ok) {
      setStaffSaving(false);
      setStaffApiError(staffResult.error);
      return;
    }

    const price = toMinorUnits(service.priceDisplay);
    const serviceResult = await createService({
      name: service.name.trim(),
      durationMinutes: Number(service.durationMinutes),
      bufferMinutes: service.bufferMinutes,
      price,
      currency: salon.currency
    });
    if (!serviceResult.ok) {
      setStaffSaving(false);
      setStaffApiError(serviceResult.error);
      return;
    }

    if (assignService) {
      const assignResult = await assignStaffServices(staffResult.data.id, [serviceResult.data.id]);
      if (!assignResult.ok) {
        setStaffSaving(false);
        setStaffApiError(assignResult.error);
        return;
      }
    }

    setStaffSaving(false);
    setStaffId(staffResult.data.id);
    setServiceId(serviceResult.data.id);
    setStep('payments');
  };

  const handleCreateBooking = async () => {
    const errors = validateBooking(booking, salonId, assignService);
    setBookingErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!staffId || !serviceId || !salonId) {
      setBookingError(copy.errors.bookingMissingIds);
      return;
    }
    if (!computedEndTime) {
      setBookingError(copy.errors.bookingEndTime);
      return;
    }
    setBookingSaving(true);
    setBookingError('');
    setBookingSuccess('');

    const startTime = new Date(`${booking.date}T${booking.time}`).toISOString();
    const endTime = new Date(`${booking.date}T${computedEndTime}`).toISOString();
    const bookingResult = await createBooking({
      salonId,
      staffId,
      serviceId,
      startTime,
      endTime,
      notes: booking.notes || undefined,
      customer: {
        name: booking.customerName.trim(),
        email: booking.customerEmail || undefined,
        phone: booking.customerPhone || undefined
      }
    });
    if (!bookingResult.ok) {
      setBookingSaving(false);
      setBookingError(bookingResult.error);
      return;
    }

    if (paymentsEnabled && paymentsReady) {
      const checkoutResult = await createCheckout(bookingResult.data.id);
      setBookingSaving(false);
      if (!checkoutResult.ok) {
        setBookingSuccess(copy.cta.success.bookingPending);
        setBookingError(checkoutResult.error);
        return;
      }
      setCheckoutUrl(checkoutResult.data.checkoutUrl);
      setBookingSuccess(copy.cta.success.checkoutReady);
      return;
    }

    setBookingSaving(false);
    setBookingSuccess(
      paymentsEnabled ? copy.cta.success.bookingPending : copy.cta.success.bookingQueued
    );
  };

  if (gateState === 'checking' || gateState === 'has-salon' || gateState === 'needs-login') {
    return (
      <div className="app">
        <Gate state={gateState} onRetry={() => setGateState('checking')} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="top-bar">
        <div className="brand">
          <div className="brand-mark" />
          {copy.topBar.brand}
        </div>
        <span className="badge">{copy.topBar.badge}</span>
      </div>

      <div className="shell">
        <Progress steps={steps} activeStep={step} />

        <main>
          {step === 'salon' && (
            <SalonStep
              salon={salon}
              weeklyHours={weeklyHours}
              errors={salonErrors}
              saving={salonSaving}
              apiError={salonApiError}
              onSalonChange={handleSalonChange}
              onHoursChange={(day, patch) => updateHours(setWeeklyHours, day, patch)}
              onContinue={handleContinueSalon}
            />
          )}

          {step === 'staff' && (
            <SetupStep
              staff={staff}
              staffHours={staffHours}
              service={service}
              currency={salon.currency}
              assignService={assignService}
              errors={staffErrors}
              saving={staffSaving}
              apiError={staffApiError}
              onStaffChange={(patch) => setStaff((prev) => ({ ...prev, ...patch }))}
              onStaffHoursChange={(day, patch) => updateHours(setStaffHours, day, patch)}
              onServiceChange={(patch) => setService((prev) => ({ ...prev, ...patch }))}
              onAssignChange={setAssignService}
              onBack={() => setStep('salon')}
              onContinue={handleContinueStaff}
            />
          )}

          {step === 'payments' && (
            <StepLayout
              badge={copy.payments.badge}
              title={copy.payments.title}
              subtitle={copy.payments.body}
            >
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={paymentsEnabled}
                  onChange={(event) => setPaymentsEnabled(event.target.checked)}
                />
                {copy.payments.toggle}
              </label>

              {paymentsEnabled && (
                <div className="panel" style={{ marginTop: 16 }}>
                  <div className="banner">
                    <div>
                      <strong>{copy.payments.stripe.title}</strong>
                      <div>{copy.payments.stripe.body}</div>
                    </div>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={() => setPaymentsReady(true)}
                    >
                      {paymentsReady ? copy.payments.stripe.connected : copy.payments.stripe.connect}
                    </button>
                  </div>
                  {!paymentsReady && (
                    <div className="note" style={{ marginTop: 12 }}>
                      {copy.payments.stripe.note}
                    </div>
                  )}
                </div>
              )}

              <div className="btn-row">
                <button className="btn ghost" type="button" onClick={() => setStep('staff')}>
                  {copy.payments.actions.back}
                </button>
                <button className="btn primary" type="button" onClick={() => setStep('cta')}>
                  {copy.payments.actions.continue}
                </button>
              </div>
            </StepLayout>
          )}

          {step === 'cta' && (
            <FirstBookingCTA
              salonName={salon.name}
              staffName={staff.name}
              serviceName={service.name}
              assignService={assignService}
              booking={booking}
              computedEndTime={computedEndTime}
              errors={bookingErrors}
              bookingError={bookingError}
              bookingSuccess={bookingSuccess}
              bookingSaving={bookingSaving}
              checkoutUrl={checkoutUrl}
              smsAvailable={smsAvailable}
              onBookingChange={(patch) => setBooking((prev) => ({ ...prev, ...patch }))}
              onCreateBooking={handleCreateBooking}
              onBack={() => setStep('payments')}
              onFixAssignments={() => setStep('staff')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
