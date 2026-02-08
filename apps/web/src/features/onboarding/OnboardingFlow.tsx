import { useEffect, useMemo, useState } from 'react';
import {
  fetchMe,
  trackEvent,
  updateSalon,
  setBusinessHours,
  createStaff,
  createService,
  assignStaffServices,
  setStaffWorkingHours,
  fetchAvailabilitySlots,
  createBooking,
  createCheckout,
  createBookingAccessToken,
  cancelBooking,
  rescheduleBooking,
  activateSalon,
  inviteStaff
} from './api';
import { Gate } from './pages/Gate';
import { SalonStep } from './pages/SalonStep';
import { SetupStep } from './pages/SetupStep';
import { FirstBookingCTA } from './components/FirstBookingCTA';
import { Progress } from './components/Progress';
import { StepLayout } from './components/StepLayout';
import type {
  BookingForm,
  GateState,
  SalonForm,
  ServiceForm,
  StaffForm,
  StepId,
  WeeklyHours,
  DayId,
  AvailabilitySlot
} from './types';
import { getCopy, getStoredLocale, setStoredLocale } from './copy';
import { onAuthStateChange } from '../../lib/auth';
import {
  addMinutes,
  defaultCurrencyForLocale,
  defaultWeeklyHours,
  getBrowserTimezone,
  toMinorUnits,
  validateBooking,
  validateSalon,
  validateStaffAndService
} from './schema';
import { buildBookingConfirmationUrl, buildBookingManageUrl } from '../../lib/public-url';

export function OnboardingFlow() {
  const [gateState, setGateState] = useState<GateState>('checking');
  const [step, setStep] = useState<StepId>('salon');
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const initialLocale = getStoredLocale();
  const [salon, setSalon] = useState<SalonForm>({
    name: '',
    timezone: getBrowserTimezone(),
    locale: initialLocale,
    salonType: '',
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
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageSuccess, setManageSuccess] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [finishingOnboarding, setFinishingOnboarding] = useState(false);
  const smsAvailable = false;
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const copy = getCopy(salon.locale);

  const steps: { id: StepId; title: string; hint: string }[] = useMemo(
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
    [copy]
  );

  useEffect(() => {
    if (salon.locale) {
      setStoredLocale(salon.locale);
    }
  }, [salon.locale]);

  useEffect(() => {
    if (gateState !== 'checking') return;
    let active = true;
    const loadMe = async () => {
      const result = await fetchMe();
      if (!active) return;
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          setGateState('needs-login');
        } else if (result.status === 0 || result.status >= 500) {
          setGateState('error');
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
          salonType: result.data.salon?.salonType ?? prev.salonType,
          currency: result.data.salon?.currency ?? prev.currency
        }));
        setSalonSlug(result.data.salon?.slug ?? null);
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
  }, [gateState]);

  useEffect(() => {
    if (step !== 'cta' || onboardingCompleted) return;
    if (!salonId) return;
    setOnboardingCompleted(true);
    trackEvent('onboarding.completed', { salonId, salonType: salon.salonType || undefined }).catch(
      () => {}
    );
  }, [step, onboardingCompleted, salonId]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setGateState('checking');
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (step !== 'cta' || !serviceId) return;
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError('');
    fetchAvailabilitySlots({
      serviceId,
      staffId: staffId ?? undefined,
      days: 7,
      limit: 20,
      intervalMinutes: 15
    }).then((result) => {
      if (!active) return;
      setAvailabilityLoading(false);
      if (!result.ok) {
        setAvailabilityError(result.error);
        setAvailabilitySlots([]);
        return;
      }
      setAvailabilitySlots(result.data.slots);
    });
    return () => {
      active = false;
    };
  }, [step, serviceId, staffId, salon.timezone]);

  const computedEndTime = useMemo(() => {
    const durationValue = Number(service.durationMinutes);
    if (Number.isNaN(durationValue)) return '';
    return addMinutes(booking.time, durationValue + service.bufferMinutes);
  }, [booking.time, service.durationMinutes, service.bufferMinutes]);

  const slotOptions = useMemo(() => {
    const labelFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: salon.timezone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return availabilitySlots.map((slot) => ({
      ...slot,
      label: labelFormatter.format(new Date(slot.startUtc))
    }));
  }, [availabilitySlots, salon.timezone]);

  const applySlot = (slot: AvailabilitySlot) => {
    const dateValue = new Intl.DateTimeFormat('en-CA', {
      timeZone: salon.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(slot.startUtc));
    const timeValue = new Intl.DateTimeFormat('en-GB', {
      timeZone: salon.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(slot.startUtc));
    setBooking((prev) => ({ ...prev, date: dateValue, time: timeValue }));
    setBookingErrors({});
    setBookingError('');
    if (staffId !== slot.staffId) {
      setStaffId(slot.staffId);
    }
  };

  const updateHours = (
    setter: React.Dispatch<React.SetStateAction<WeeklyHours[]>>,
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
    if (updateResult.data?.slug) {
      setSalonSlug(updateResult.data.slug);
    }
    const hoursResult = await setBusinessHours(salonId, weeklyHours);
    setSalonSaving(false);
    if (!hoursResult.ok) {
      setSalonApiError(hoursResult.error);
      return;
    }
    if (!onboardingStarted) {
      setOnboardingStarted(true);
      trackEvent('onboarding.started', {
        salonId,
        salonType: salon.salonType || undefined
      }).catch(() => {});
    }
    setStep('staff');
  };

  const handleContinueStaff = async () => {
    const errors = validateStaffAndService(staff, staffHours, service, assignService, salon.locale);
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

    if (!staff.sameHours) {
      const hoursResult = await setStaffWorkingHours(staffResult.data.id, staffHours);
      if (!hoursResult.ok) {
        setStaffSaving(false);
        setStaffApiError(hoursResult.error);
        return;
      }
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

    if (staff.email && staff.email.trim()) {
      const inviteResult = await inviteStaff({
        email: staff.email.trim(),
        name: staff.name.trim(),
        role: staff.role === 'owner' ? 'admin' : (staff.role as 'staff' | 'admin')
      });
      if (!inviteResult.ok) {
        console.warn('[Onboarding] Staff created but invitation failed:', inviteResult.error);
      } else {
        console.log('[Onboarding] Staff invitation sent:', inviteResult.data);
      }
    }

    setStaffSaving(false);
    setStaffId(staffResult.data.id);
    setServiceId(serviceResult.data.id);
    setStep('payments');
  };

  const handleCreateBooking = async () => {
    const errors = validateBooking(booking, salonId, assignService, salon.locale);
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

    const startUtc = new Date(`${booking.date}T${booking.time}`).toISOString();
    const bookingResult = await createBooking({
      staffId,
      serviceId,
      startUtc,
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
    setLastBookingId(bookingResult.data.id);
    setManageError('');
    setManageSuccess('');

    if (paymentsEnabled && paymentsReady) {
      if (!salonSlug) {
        setBookingSaving(false);
        setBookingError('Salon slug mangler.');
        return;
      }
      const tokenResult = await createBookingAccessToken(bookingResult.data.id);
      if (!tokenResult.ok) {
        setBookingSaving(false);
        setBookingError(tokenResult.error);
        return;
      }
      const successUrl = buildBookingConfirmationUrl({
        salonSlug,
        bookingId: bookingResult.data.id,
        token: tokenResult.data.bookingToken
      });
      const cancelUrl = buildBookingManageUrl({
        salonSlug,
        bookingId: bookingResult.data.id,
        token: tokenResult.data.bookingToken
      });
      const checkoutResult = await createCheckout({
        bookingId: bookingResult.data.id,
        successUrl,
        cancelUrl
      });
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

  const handleCancelBooking = async () => {
    if (!lastBookingId) return;
    setManageBusy(true);
    setManageError('');
    setManageSuccess('');
    const result = await cancelBooking(lastBookingId, {
      reasonKey: 'user.cancelled',
      note: booking.notes || undefined
    });
    setManageBusy(false);
    if (!result.ok) {
      setManageError(result.error);
      return;
    }
    setManageSuccess(copy.cta.success.bookingCancelled);
  };

  const handleReschedule = async (slot: AvailabilitySlot) => {
    if (!lastBookingId || !staffId) return;
    setManageBusy(true);
    setManageError('');
    setManageSuccess('');
    const result = await rescheduleBooking(lastBookingId, {
      staffId,
      startUtc: slot.startUtc
    });
    setManageBusy(false);
    if (!result.ok) {
      setManageError(result.error);
      return;
    }
    applySlot(slot);
    setManageSuccess(copy.cta.success.bookingRescheduled);
  };

  const handleFinishOnboarding = async () => {
    if (!salonId) return;
    setFinishingOnboarding(true);
    console.log('[Onboarding] Starting salon activation for:', salonId);
    const result = await activateSalon(salonId);
    if (!result.ok) {
      console.error('[Onboarding] Activation failed:', result.error, 'Status:', result.status);
      setBookingError(result.error);
      setFinishingOnboarding(false);
      return;
    }
    console.log('[Onboarding] Salon activated successfully:', result.data);
    window.location.href = '/console';
  };

  if (
    gateState === 'checking' ||
    gateState === 'has-salon' ||
    gateState === 'needs-login' ||
    gateState === 'error'
  ) {
    return (
      <div className="app">
        <Gate
          state={gateState}
          onRetry={() => setGateState('checking')}
          onReviewSettings={() => {
            setStep('salon');
            setGateState('needs-onboarding');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="console-banner">
        Du skal gennemføre onboarding, før du kan bruge Owner Console.
      </div>
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
              salonType={salon.salonType}
              locale={salon.locale}
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
              manageError={manageError}
              manageSuccess={manageSuccess}
              manageBusy={manageBusy}
              lastBookingId={lastBookingId}
              bookingSaving={bookingSaving}
              checkoutUrl={checkoutUrl}
              smsAvailable={smsAvailable}
              slots={slotOptions}
              slotsLoading={availabilityLoading}
              slotsError={availabilityError}
              onPickSlot={applySlot}
              onCancelBooking={handleCancelBooking}
              onReschedule={handleReschedule}
              onBookingChange={(patch) => setBooking((prev) => ({ ...prev, ...patch }))}
              onCreateBooking={handleCreateBooking}
              onBack={() => setStep('payments')}
              onFixAssignments={() => setStep('staff')}
              onFinishOnboarding={handleFinishOnboarding}
              finishingOnboarding={finishingOnboarding}
            />
          )}
        </main>
      </div>
    </div>
  );
}
