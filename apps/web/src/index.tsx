import { useEffect, useMemo, useState } from 'react';
import { copy } from './i18n';

type GateState = 'checking' | 'needs-onboarding' | 'has-salon' | 'needs-login';
type StepId = 'salon' | 'staff' | 'payments' | 'cta';
type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type WeeklyHours = {
  day: DayId;
  enabled: boolean;
  start: string;
  end: string;
};

const dayLabels: Record<DayId, string> = copy.dayLabels;

const defaultWeeklyHours: WeeklyHours[] = [
  { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
  { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
  { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
  { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
  { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
  { day: 'sat', enabled: false, start: '10:00', end: '14:00' },
  { day: 'sun', enabled: false, start: '10:00', end: '14:00' }
];

const roleOptions = ['owner', 'admin', 'staff'] as const;
const roleLabels: Record<(typeof roleOptions)[number], string> = {
  owner: copy.roles.owner,
  admin: copy.roles.admin,
  staff: copy.roles.staff
};
const localeOptions = [
  { value: 'da', label: copy.locales.da },
  { value: 'en', label: copy.locales.en }
] as const;
const bufferOptions = [0, 5, 10, 15];

const getBrowserTimezone = () =>
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : copy.salon.fields.timezonePlaceholder;

const getBrowserLocale = () =>
  typeof navigator !== 'undefined' ? navigator.language : 'en';

const normalizeLocale = (locale: string) => (locale.startsWith('da') ? 'da' : 'en');

const defaultCurrencyForLocale = (locale: string) => (locale === 'da' ? 'DKK' : 'EUR');

const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const addMinutes = (time: string, minutes: number) => {
  if (!time) return '';
  const [h, m] = time.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const nextH = Math.floor(total / 60) % 24;
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
};

const parsePrice = (value: string) => {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return Number.NaN;
  return Number(normalized);
};

const toMinorUnits = (value: string) => {
  const parsed = parsePrice(value);
  if (Number.isNaN(parsed)) return Number.NaN;
  return Math.round(parsed * 100);
};

const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

const isErrorKey = (value: string) => /^[a-z][a-z0-9_.-]*$/.test(value);

const formatApiError = (message: string) =>
  isErrorKey(message) ? copy.apiErrors[message] ?? copy.apiErrors.generic : message;

const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> => {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    },
    credentials: 'include'
  });
  if (!response.ok) {
    let message = copy.errors.requestFailed(response.status);
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = formatApiError(body.message);
    } catch {
      // ignore parse errors
    }
    return { ok: false, error: message, status: response.status };
  }
  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }
  const data = (await response.json()) as T;
  return { ok: true, data };
};

export function WebApp() {
  const [gateState, setGateState] = useState<GateState>('checking');
  const [step, setStep] = useState<StepId>('salon');

  const initialLocale = normalizeLocale(getBrowserLocale());
  const [salonName, setSalonName] = useState('');
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [locale, setLocale] = useState(initialLocale);
  const [currency, setCurrency] = useState(defaultCurrencyForLocale(initialLocale));
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours[]>(defaultWeeklyHours);
  const [salonErrors, setSalonErrors] = useState<Record<string, string>>({});
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonApiError, setSalonApiError] = useState('');
  const [salonSaving, setSalonSaving] = useState(false);

  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<(typeof roleOptions)[number]>('owner');
  const [staffSameHours, setStaffSameHours] = useState(true);
  const [staffHours, setStaffHours] = useState<WeeklyHours[]>(defaultWeeklyHours);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [servicePrice, setServicePrice] = useState('499');
  const [serviceBuffer, setServiceBuffer] = useState(0);
  const [assignService, setAssignService] = useState(true);
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});
  const [staffApiError, setStaffApiError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);

  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paymentsReady, setPaymentsReady] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [notes, setNotes] = useState('');
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const smsAvailable = false;

  useEffect(() => {
    let active = true;
    const checkMembership = async () => {
      try {
        const response = await fetch(`${apiBase}/v1/auth/me`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          if (active) setGateState('needs-login');
          return;
        }
        if (!response.ok) {
          if (active) setGateState('needs-onboarding');
          return;
        }
        const data = (await response.json()) as { salonId?: string };
        if (active) {
          setSalonId(data?.salonId ?? null);
          setGateState(data?.salonId ? 'has-salon' : 'needs-onboarding');
        }
      } catch {
        if (active) setGateState('needs-onboarding');
      }
    };
    checkMembership();
    return () => {
      active = false;
    };
  }, []);

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

  const stepIndex = steps.findIndex((item) => item.id === step);

  const updateHours = (
    setter: (value: WeeklyHours[]) => void,
    targetDay: DayId,
    patch: Partial<WeeklyHours>
  ) => {
    setter((prev) =>
      prev.map((entry) => (entry.day === targetDay ? { ...entry, ...patch } : entry))
    );
  };

  const validateWeeklyHours = (hours: WeeklyHours[]) => {
    const enabledDays = hours.filter((item) => item.enabled);
    if (enabledDays.length === 0) return copy.validation.hours.noDays;
    const invalid = enabledDays.find((item) => timeToMinutes(item.start) >= timeToMinutes(item.end));
    if (invalid) return copy.validation.hours.timeRange;
    return '';
  };

  const validateSalon = () => {
    const errors: Record<string, string> = {};
    if (salonName.trim().length < 2 || salonName.trim().length > 60) {
      errors.name = copy.validation.salon.name;
    }
    if (!timezone.trim()) {
      errors.timezone = copy.validation.salon.timezone;
    }
    if (!locale.trim()) {
      errors.locale = copy.validation.salon.locale;
    }
    if (!currency.trim()) {
      errors.currency = copy.validation.salon.currency;
    }
    const hoursError = validateWeeklyHours(weeklyHours);
    if (hoursError) errors.hours = hoursError;
    setSalonErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStaffAndService = () => {
    const errors: Record<string, string> = {};
    if (staffName.trim().length < 2 || staffName.trim().length > 60) {
      errors.staffName = copy.validation.staff.name;
    }
    if (!roleOptions.includes(staffRole)) {
      errors.staffRole = copy.validation.staff.role;
    }
    if (!staffSameHours) {
      const hoursError = validateWeeklyHours(staffHours);
      if (hoursError) errors.staffHours = hoursError;
    }
    if (serviceName.trim().length < 2 || serviceName.trim().length > 60) {
      errors.serviceName = copy.validation.staff.serviceName;
    }
    const durationValue = Number(serviceDuration);
    if (Number.isNaN(durationValue) || durationValue < 5 || durationValue > 480) {
      errors.serviceDuration = copy.validation.staff.serviceDuration;
    }
    const priceValue = toMinorUnits(servicePrice);
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      errors.servicePrice = copy.validation.staff.servicePrice;
    }
    if (!bufferOptions.includes(serviceBuffer)) {
      errors.serviceBuffer = copy.validation.staff.serviceBuffer;
    }
    if (!assignService) {
      errors.assignService = copy.validation.staff.assignService;
    }
    setStaffErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBooking = () => {
    const errors: Record<string, string> = {};
    if (customerName.trim().length < 2) {
      errors.customerName = copy.validation.booking.customerName;
    }
    if (!bookingDate || !bookingTime) {
      errors.bookingTime = copy.validation.booking.time;
    }
    if (!salonId) {
      errors.salonId = copy.validation.booking.salonId;
    }
    if (!assignService) {
      errors.assignService = copy.validation.booking.assignService;
    }
    setBookingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueSalon = async () => {
    if (!validateSalon()) return;
    setSalonSaving(true);
    setSalonApiError('');
    const payload = {
      name: salonName.trim(),
      timezone,
      locale,
      currency
    };
    const updateResult = salonId
      ? await apiRequest<{ id: string }>(`/v1/salons/${salonId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      : await apiRequest<{ id: string }>('/v1/salons', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
    setSalonSaving(false);
    if (!updateResult.ok) {
      setSalonApiError(updateResult.error);
      return;
    }
    if (!salonId) {
      setSalonId(updateResult.data.id);
    }
    setStep('staff');
  };

  const handleContinueStaff = async () => {
    if (!validateStaffAndService()) return;
    if (!salonId) {
      setStaffApiError(copy.errors.staffMissingSalonId);
      return;
    }
    setStaffSaving(true);
    setStaffApiError('');
    const staffResult = await apiRequest<{ id: string }>('/v1/staff', {
      method: 'POST',
      body: JSON.stringify({
        salonId,
        name: staffName.trim(),
        role: staffRole,
        active: true
      })
    });
    if (!staffResult.ok) {
      setStaffSaving(false);
      setStaffApiError(staffResult.error);
      return;
    }
    const serviceResult = await apiRequest<{ id: string }>('/v1/services', {
      method: 'POST',
      body: JSON.stringify({
        salonId,
        name: serviceName.trim(),
        priceAmount: toMinorUnits(servicePrice),
        currency,
        durationMinutes: Number(serviceDuration),
        active: true
      })
    });
    setStaffSaving(false);
    if (!serviceResult.ok) {
      setStaffApiError(serviceResult.error);
      return;
    }
    setStaffId(staffResult.data.id);
    setServiceId(serviceResult.data.id);
    setStep('payments');
  };

  const handleContinuePayments = () => {
    setStep('cta');
  };

  const handleCreateBooking = async () => {
    if (!validateBooking()) return;
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
    const startTime = new Date(`${bookingDate}T${bookingTime}`).toISOString();
    const endTime = new Date(`${bookingDate}T${computedEndTime}`).toISOString();
    const bookingResult = await apiRequest<{ id: string }>('/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        salonId,
        staffId,
        serviceId,
        startTime,
        endTime,
        notes: notes || undefined,
        customer: {
          name: customerName.trim(),
          email: customerEmail || undefined,
          phone: customerPhone || undefined
        }
      })
    });
    if (!bookingResult.ok) {
      setBookingSaving(false);
      setBookingError(bookingResult.error);
      return;
    }
    if (paymentsEnabled) {
      const checkoutResult = await apiRequest<{ checkoutUrl: string; paymentId: string }>(
        `/v1/bookings/${bookingResult.data.id}/checkout`,
        {
          method: 'POST',
          body: JSON.stringify({
            provider: 'stripe',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
          })
        }
      );
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
    setBookingSuccess(copy.cta.success.bookingQueued);
  };

  const computedEndTime = useMemo(() => {
    const durationValue = Number(serviceDuration);
    if (Number.isNaN(durationValue)) return '';
    return addMinutes(bookingTime, durationValue + serviceBuffer);
  }, [bookingTime, serviceDuration, serviceBuffer]);

  const heroSalon = salonName || copy.cta.fallback.salon;
  const heroStaff = staffName || copy.cta.fallback.staff;
  const heroService = serviceName || copy.cta.fallback.service;
  const heroSummary = copy.format.heroSummary(heroSalon, heroStaff, heroService);

  if (gateState === 'checking') {
    return (
      <div className="app">
        <div className="panel">
          <span className="badge">{copy.gate.checking.badge}</span>
          <h1>{copy.gate.checking.title}</h1>
          <p>{copy.gate.checking.body}</p>
          <div className="note">{copy.gate.checking.note}</div>
        </div>
      </div>
    );
  }

  if (gateState === 'has-salon') {
    return (
      <div className="app">
        <div className="panel">
          <span className="badge">{copy.gate.hasSalon.badge}</span>
          <h1>{copy.gate.hasSalon.title}</h1>
          <p>{copy.gate.hasSalon.body}</p>
          <div className="btn-row">
            <button className="btn primary" type="button">
              {copy.gate.hasSalon.primaryAction}
            </button>
            <button className="btn ghost" type="button">
              {copy.gate.hasSalon.secondaryAction}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gateState === 'needs-login') {
    return (
      <div className="app">
        <div className="panel">
          <span className="badge">{copy.gate.needsLogin.badge}</span>
          <h1>{copy.gate.needsLogin.title}</h1>
          <p>{copy.gate.needsLogin.body}</p>
          <div className="btn-row">
            <button className="btn primary" type="button">
              {copy.gate.needsLogin.primaryAction}
            </button>
            <button className="btn ghost" type="button" onClick={() => setGateState('checking')}>
              {copy.gate.needsLogin.secondaryAction}
            </button>
          </div>
        </div>
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
        <aside className="stepper">
          <h2>{copy.stepper.title}</h2>
          {steps.map((item, index) => {
            const status =
              index < stepIndex ? 'complete' : index === stepIndex ? 'active' : 'upcoming';
            return (
              <div key={item.id} className={`step ${status}`}>
                <div className="step-indicator">{index + 1}</div>
                <div className="step-label">
                  <strong>{item.title}</strong>
                  <span>{item.hint}</span>
                </div>
              </div>
            );
          })}
        </aside>

        <main>
          {step === 'salon' && (
            <section className="panel">
              <span className="badge">{copy.salon.badge}</span>
              <h1>{copy.salon.title}</h1>
              <p>{copy.salon.body}</p>
              {!salonId && (
                <div className="banner" style={{ marginBottom: 16 }}>
                  {copy.salon.missingSalonId}
                </div>
              )}
              <div className="grid two">
                <label className="field">
                  <span className="label">{copy.salon.fields.nameLabel}</span>
                  <input
                    className="input"
                    value={salonName}
                    onChange={(event) => setSalonName(event.target.value)}
                    placeholder={copy.salon.fields.namePlaceholder}
                  />
                  {salonErrors.name && <span className="error">{salonErrors.name}</span>}
                </label>
                <label className="field">
                  <span className="label">{copy.salon.fields.timezoneLabel}</span>
                  <input
                    className="input"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder={copy.salon.fields.timezonePlaceholder}
                  />
                  {salonErrors.timezone && <span className="error">{salonErrors.timezone}</span>}
                </label>
                <label className="field">
                  <span className="label">{copy.salon.fields.localeLabel}</span>
                  <select
                    className="select"
                    value={locale}
                    onChange={(event) => {
                      const nextLocale = event.target.value;
                      setLocale(nextLocale);
                      if (!currencyTouched) {
                        setCurrency(defaultCurrencyForLocale(nextLocale));
                      }
                    }}
                  >
                    {localeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {salonErrors.locale && <span className="error">{salonErrors.locale}</span>}
                </label>
                <label className="field">
                  <span className="label">{copy.salon.fields.currencyLabel}</span>
                  <input
                    className="input"
                    value={currency}
                    onChange={(event) => {
                      setCurrencyTouched(true);
                      setCurrency(event.target.value.toUpperCase());
                    }}
                    placeholder={copy.salon.fields.currencyPlaceholder}
                  />
                  {salonErrors.currency && <span className="error">{salonErrors.currency}</span>}
                </label>
              </div>

              <div className="panel" style={{ marginTop: 18 }}>
                <h2>{copy.salon.hours.title}</h2>
                <p>{copy.salon.hours.body}</p>
                {weeklyHours.map((day) => (
                  <div key={day.day} className="hours-row">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(event) =>
                          updateHours(setWeeklyHours, day.day, { enabled: event.target.checked })
                        }
                      />
                      {dayLabels[day.day]}
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={day.start}
                      onChange={(event) =>
                        updateHours(setWeeklyHours, day.day, { start: event.target.value })
                      }
                      disabled={!day.enabled}
                    />
                    <input
                      className="input"
                      type="time"
                      value={day.end}
                      onChange={(event) =>
                        updateHours(setWeeklyHours, day.day, { end: event.target.value })
                      }
                      disabled={!day.enabled}
                    />
                  </div>
                ))}
                {salonErrors.hours && <span className="error">{salonErrors.hours}</span>}
                <div className="note" style={{ marginTop: 12 }}>
                  {copy.salon.hours.note}
                </div>
              </div>

              <div className="btn-row">
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleContinueSalon}
                  disabled={salonSaving}
                >
                  {salonSaving ? copy.salon.actions.saving : copy.salon.actions.continue}
                </button>
              </div>
              {salonApiError && (
                <div className="banner" style={{ marginTop: 16 }}>
                  {salonApiError}
                </div>
              )}
            </section>
          )}

          {step === 'staff' && (
            <>
              <section className="panel">
                <span className="badge">{copy.staff.badge}</span>
                <h1>{copy.staff.title}</h1>
                <p>{copy.staff.body}</p>
                <div className="grid two">
                  <label className="field">
                    <span className="label">{copy.staff.fields.nameLabel}</span>
                    <input
                      className="input"
                      value={staffName}
                      onChange={(event) => setStaffName(event.target.value)}
                      placeholder={copy.staff.fields.namePlaceholder}
                    />
                    {staffErrors.staffName && <span className="error">{staffErrors.staffName}</span>}
                  </label>
                  <label className="field">
                    <span className="label">{copy.staff.fields.roleLabel}</span>
                    <select
                      className="select"
                      value={staffRole}
                      onChange={(event) =>
                        setStaffRole(event.target.value as (typeof roleOptions)[number])
                      }
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    {staffErrors.staffRole && <span className="error">{staffErrors.staffRole}</span>}
                  </label>
                </div>

                <label className="toggle" style={{ marginTop: 16 }}>
                  <input
                    type="checkbox"
                    checked={staffSameHours}
                    onChange={(event) => setStaffSameHours(event.target.checked)}
                  />
                  {copy.staff.fields.useSalonHours}
                </label>

                {!staffSameHours && (
                  <div className="panel" style={{ marginTop: 16 }}>
                    <h2>{copy.staff.fields.workingHoursTitle}</h2>
                    {staffHours.map((day) => (
                      <div key={day.day} className="hours-row">
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(event) =>
                              updateHours(setStaffHours, day.day, {
                                enabled: event.target.checked
                              })
                            }
                          />
                          {dayLabels[day.day]}
                        </label>
                        <input
                          className="input"
                          type="time"
                          value={day.start}
                          onChange={(event) =>
                            updateHours(setStaffHours, day.day, { start: event.target.value })
                          }
                          disabled={!day.enabled}
                        />
                        <input
                          className="input"
                          type="time"
                          value={day.end}
                          onChange={(event) =>
                            updateHours(setStaffHours, day.day, { end: event.target.value })
                          }
                          disabled={!day.enabled}
                        />
                      </div>
                    ))}
                    {staffErrors.staffHours && <span className="error">{staffErrors.staffHours}</span>}
                  </div>
                )}
              </section>

              <section className="panel">
                <h2>{copy.staff.service.title}</h2>
                <p>{copy.staff.service.body}</p>
                <div className="grid three">
                  <label className="field">
                    <span className="label">{copy.staff.service.nameLabel}</span>
                    <input
                      className="input"
                      value={serviceName}
                      onChange={(event) => setServiceName(event.target.value)}
                      placeholder={copy.staff.service.namePlaceholder}
                    />
                    {staffErrors.serviceName && (
                      <span className="error">{staffErrors.serviceName}</span>
                    )}
                  </label>
                  <label className="field">
                    <span className="label">{copy.staff.service.durationLabel}</span>
                    <input
                      className="input"
                      type="number"
                      value={serviceDuration}
                      onChange={(event) => setServiceDuration(event.target.value)}
                      min={5}
                      max={480}
                    />
                    {staffErrors.serviceDuration && (
                      <span className="error">{staffErrors.serviceDuration}</span>
                    )}
                  </label>
                  <label className="field">
                    <span className="label">{copy.format.priceLabel(currency)}</span>
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      value={servicePrice}
                      onChange={(event) => setServicePrice(event.target.value)}
                      placeholder={copy.staff.service.pricePlaceholder}
                    />
                    {staffErrors.servicePrice && (
                      <span className="error">{staffErrors.servicePrice}</span>
                    )}
                  </label>
                </div>

                <div className="field" style={{ marginTop: 16 }}>
                  <span className="label">{copy.staff.service.bufferLabel}</span>
                  <div className="pill-row">
                    {bufferOptions.map((option) => (
                      <button
                        key={option}
                        className={`pill ${serviceBuffer === option ? 'active' : ''}`}
                        type="button"
                        onClick={() => setServiceBuffer(option)}
                      >
                        {copy.format.bufferMinutes(option)}
                      </button>
                    ))}
                  </div>
                  {staffErrors.serviceBuffer && (
                    <span className="error">{staffErrors.serviceBuffer}</span>
                  )}
                </div>

                <label className="toggle" style={{ marginTop: 18 }}>
                  <input
                    type="checkbox"
                    checked={assignService}
                    onChange={(event) => setAssignService(event.target.checked)}
                  />
                  {copy.staff.service.assignLabel}
                </label>
                {staffErrors.assignService && (
                  <span className="error">{staffErrors.assignService}</span>
                )}
                <div className="note" style={{ marginTop: 12 }}>
                  {copy.staff.service.assignNote}
                </div>
              </section>

              <div className="btn-row">
                <button className="btn ghost" type="button" onClick={() => setStep('salon')}>
                  {copy.staff.actions.back}
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleContinueStaff}
                  disabled={staffSaving}
                >
                  {staffSaving ? copy.staff.actions.saving : copy.staff.actions.continue}
                </button>
              </div>
              {staffApiError && (
                <div className="banner" style={{ marginTop: 16 }}>
                  {staffApiError}
                </div>
              )}
            </>
          )}

          {step === 'payments' && (
            <section className="panel">
              <span className="badge">{copy.payments.badge}</span>
              <h1>{copy.payments.title}</h1>
              <p>{copy.payments.body}</p>

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
                <button className="btn primary" type="button" onClick={handleContinuePayments}>
                  {copy.payments.actions.continue}
                </button>
              </div>
            </section>
          )}

          {step === 'cta' && (
            <>
              <section className="panel">
                <span className="badge">{copy.cta.badge}</span>
                <h1>{copy.cta.title}</h1>
                <p>{copy.cta.body}</p>

                {!assignService && (
                  <div className="banner" style={{ marginBottom: 16 }}>
                    {copy.cta.assignBanner}
                    <button className="btn subtle" type="button" onClick={() => setStep('staff')}>
                      {copy.cta.fixAssignments}
                    </button>
                  </div>
                )}

                <div className="cta-hero">
                  <div>
                    <h3>{copy.cta.heroTitle}</h3>
                    <p>{heroSummary}</p>
                  </div>
                  <div className="note">
                    {copy.cta.heroNote}
                  </div>
                </div>

                <div className="grid two" style={{ marginTop: 18 }}>
                  <label className="field">
                    <span className="label">{copy.cta.fields.customerNameLabel}</span>
                    <input
                      className="input"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder={copy.cta.fields.customerNamePlaceholder}
                    />
                    {bookingErrors.customerName && (
                      <span className="error">{bookingErrors.customerName}</span>
                    )}
                  </label>
                  <label className="field">
                    <span className="label">{copy.cta.fields.customerEmailLabel}</span>
                    <input
                      className="input"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder={copy.cta.fields.customerEmailPlaceholder}
                    />
                  </label>
                  <label className="field">
                    <span className="label">{copy.cta.fields.customerPhoneLabel}</span>
                    <input
                      className="input"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
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
                      value={bookingDate}
                      onChange={(event) => setBookingDate(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="label">{copy.cta.fields.startTimeLabel}</span>
                    <input
                      className="input"
                      type="time"
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                    />
                    {bookingErrors.bookingTime && (
                      <span className="error">{bookingErrors.bookingTime}</span>
                    )}
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
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={copy.cta.fields.notesPlaceholder}
                  />
                </label>

                <div className="grid two" style={{ marginTop: 16 }}>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(event) => setSendEmail(event.target.checked)}
                    />
                    {copy.cta.toggles.sendEmail}
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={sendSms}
                      onChange={(event) => setSendSms(event.target.checked)}
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

                {bookingErrors.assignService && (
                  <span className="error">{bookingErrors.assignService}</span>
                )}
                {bookingErrors.salonId && <span className="error">{bookingErrors.salonId}</span>}

                <div className="btn-row">
                  <button className="btn ghost" type="button" onClick={() => setStep('payments')}>
                    {copy.cta.actions.back}
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={bookingSaving}
                  >
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
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
