import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatTime, formatPrice } from '@nemsalon/shared';
import { Button, Card, Stack, Input, TextArea, Stepper, Toast } from '@nemsalon/ui';
import {
  createPublicBooking,
  createPublicCheckout,
  fetchPublicAvailability,
  fetchPublicSalon,
  listPublicServices,
  listPublicStaff,
  type AvailabilitySlot,
  type PublicBooking,
  type PublicSalon,
  type PublicService,
  type PublicStaff,
} from '../api';
import { buildBookingConfirmationUrl, buildBookingManageUrl } from '../../../lib/public-url';
import { toLocalDateInputValue } from '../../../lib/dates';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import '../public-booking.css';
import { FeatureState } from '../../../components/FeatureState';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

type Step = 'service' | 'datetime' | 'details' | 'confirm';

interface BookingFlowProps {
  salonSlug: string;
}

interface StepIndicatorProps {
  current: Step;
  steps: { key: Step; label: string; number: number }[];
}

function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <Stepper
      steps={steps.map((step) => ({
        key: step.key,
        label: step.label,
        number: step.number,
      }))}
      currentStep={current}
    />
  );
}

function SlotGrid({
  slots,
  selectedSlot,
  onSelect,
  timezone,
  locale,
  loading,
  emptyTitle,
  emptyBody,
}: {
  slots: AvailabilitySlot[];
  selectedSlot: AvailabilitySlot | null;
  onSelect: (slot: AvailabilitySlot) => void;
  timezone: string;
  locale: string;
  loading: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (loading) {
    return (
      <Stack direction="row" gap="sm" className="pb-wrap">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="pb-skeleton-slot" />
        ))}
      </Stack>
    );
  }

  if (slots.length === 0) {
    return (
      <Card variant="muted">
        <p>{emptyTitle}</p>
        <p className="pb-muted">{emptyBody}</p>
      </Card>
    );
  }

  return (
    <Stack direction="row" gap="sm" className="pb-wrap">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.startUtc === slot.startUtc;
        const time = formatTime(slot.startUtc, { locale, timeZone: timezone });

        return (
          <button
            key={slot.startUtc}
            type="button"
            className={['pb-slot-button', isSelected ? 'pb-selected' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(slot)}
          >
            <span>{time}</span>
          </button>
        );
      })}
    </Stack>
  );
}

function ServiceCard({
  service,
  isSelected,
  onSelect,
  minutesLabel,
  locale,
  currency,
}: {
  service: PublicService;
  isSelected: boolean;
  onSelect: () => void;
  minutesLabel: string;
  locale: string;
  currency: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={['pb-service-card', isSelected ? 'pb-selected' : ''].filter(Boolean).join(' ')}
    >
      <Stack direction="row" gap="md" justify="between" align="center">
        <span className="pb-service-title">{service.name}</span>
        <span className="pb-service-price">{formatPrice(service.price, currency, locale)}</span>
      </Stack>
      <span className="pb-service-duration">
        {service.durationMinutes} {minutesLabel}
      </span>
    </button>
  );
}

function StaffPill({
  staff,
  isSelected,
  onSelect,
  colorClass,
}: {
  staff: PublicStaff;
  isSelected: boolean;
  onSelect: () => void;
  colorClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={['pb-staff-pill', isSelected ? 'pb-selected' : ''].filter(Boolean).join(' ')}
    >
      <span className={['pb-staff-dot', colorClass].join(' ')} />
      <span>{staff.name}</span>
    </button>
  );
}

export function BookingFlow({ salonSlug }: BookingFlowProps) {
  const [salon, setSalon] = useState<PublicSalon | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [createdBooking, setCreatedBooking] = useState<{
    booking: PublicBooking;
    token: string;
    manageUrl: string;
    confirmationUrl: string;
  } | null>(null);
  const resolvedLocale = resolveLocale(salon?.locale ?? getStoredLocale());
  const locale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';
  const currency = salon?.currency ?? 'DKK';
  const copy = getCopy(salon?.locale);
  const c = copy.publicBooking;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadError('');
      setServicesLoading(true);
      const salonResult = await fetchPublicSalon(salonSlug);
      if (!active) return;
      if (salonResult.ok) {
        setSalon(salonResult.data);
      } else {
        setLoadError(salonResult.error);
        setServicesLoading(false);
        return;
      }
      const servicesResult = await listPublicServices(salonSlug);
      if (!active) return;
      if (servicesResult.ok) {
        setServices(servicesResult.data.data);
      } else {
        setError(servicesResult.error);
      }
      setServicesLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [salonSlug]);

  const handleRecover = async () => {
    setIsRecovering(true);
    setLoadError('');
    try {
      const salonResult = await fetchPublicSalon(salonSlug);
      if (salonResult.ok) {
        setSalon(salonResult.data);
        const servicesResult = await listPublicServices(salonSlug);
        if (servicesResult.ok) {
          setServices(servicesResult.data.data);
        } else {
          setLoadError(servicesResult.error);
        }
      } else {
        setLoadError(salonResult.error);
      }
    } finally {
      setServicesLoading(false);
      setIsRecovering(false);
    }
  };

  useEffect(() => {
    if (!selectedServiceId) {
      setStaff([]);
      setSelectedStaffId('');
      return;
    }
    let active = true;
    async function loadStaff() {
      setStaffLoading(true);
      setSelectedStaffId('');
      const result = await listPublicStaff(salonSlug, selectedServiceId);
      if (!active) return;
      if (result.ok) {
        setStaff(result.data.data);
      } else {
        setError(result.error);
      }
      setStaffLoading(false);
    }
    loadStaff();
    return () => {
      active = false;
    };
  }, [salonSlug, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !salon) return;
    let active = true;
    async function loadSlots() {
      setSlotsLoading(true);
      setError('');
      const from = new Date(`${selectedDate}T00:00:00`);
      const result = await fetchPublicAvailability({
        salonSlug,
        serviceId: selectedServiceId,
        staffId: selectedStaffId || undefined,
        from: from.toISOString(),
        days: 1,
        limit: 80,
        intervalMinutes: 15,
      });
      if (!active) return;
      setSlotsLoading(false);
      if (result.ok) {
        setSlots(result.data.slots);
        setSelectedSlot(null);
      } else {
        setSlots([]);
        setError(result.error);
      }
    }
    loadSlots();
    return () => {
      active = false;
    };
  }, [salonSlug, selectedServiceId, selectedStaffId, selectedDate, salon]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const hasContact = Boolean(customerEmail.trim() || customerPhone.trim());

  const currentStep: Step = useMemo(() => {
    if (!selectedServiceId) return 'service';
    if (!selectedSlot) return 'datetime';
    if (!customerName.trim() || !hasContact) return 'details';
    return 'confirm';
  }, [selectedServiceId, selectedSlot, customerName, hasContact]);

  const canProceed =
    selectedServiceId && selectedSlot && customerName.trim() && hasContact && policyAccepted;

  function goToStep(step: Step) {
    if (step === 'service') {
      setSelectedServiceId('');
      setSelectedStaffId('');
      setSelectedSlot(null);
      setError('');
      return;
    }
    if (step === 'datetime' && selectedServiceId) {
      setSelectedSlot(null);
      setError('');
      return;
    }
    if (step === 'details' && selectedSlot) {
      setError('');
      return;
    }
  }

  async function handleBooking() {
    if (!salon || !selectedServiceId || !selectedSlot) {
      setError(c.errors.pickServiceTime);
      setToast({ message: c.errors.pickServiceTime, type: 'warning' });
      return;
    }
    if (!customerName.trim()) {
      setError(c.errors.nameRequired);
      setToast({ message: c.errors.nameRequired, type: 'warning' });
      return;
    }
    if (!hasContact) {
      setError(c.errors.contactRequired);
      setToast({ message: c.errors.contactRequired, type: 'warning' });
      return;
    }
    if (!policyAccepted) {
      setError(c.errors.policyRequired);
      setToast({ message: c.errors.policyRequired, type: 'warning' });
      return;
    }
    setLoading(true);
    setError('');
    setStatus(c.creatingBooking);

    const bookingResult = await createPublicBooking({
      salonSlug,
      serviceId: selectedServiceId,
      staffId: selectedStaffId || undefined,
      startUtc: selectedSlot.startUtc,
      notes: notes || undefined,
      customer: {
        name: customerName.trim(),
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
      },
    });

    if (!bookingResult.ok) {
      setLoading(false);
      setStatus('');
      setError(bookingResult.error);
      setToast({ message: bookingResult.error, type: 'error' });
      return;
    }

    const booking = bookingResult.data.booking;
    const token = bookingResult.data.bookingToken;
    if (!token) {
      setLoading(false);
      setStatus('');
      setError(c.errors.missingToken);
      setToast({ message: c.errors.missingToken, type: 'error' });
      return;
    }
    localStorage.setItem(tokenStorageKey(booking.id), token);

    const successUrl = buildBookingConfirmationUrl({ salonSlug, bookingId: booking.id, token });
    const cancelUrl = buildBookingManageUrl({ salonSlug, bookingId: booking.id, token });

    const checkout = await createPublicCheckout({
      bookingId: booking.id,
      token,
      successUrl,
      cancelUrl,
    });

    if (!checkout.ok) {
      setLoading(false);
      setStatus('');
      setError(checkout.error);
      setToast({ message: checkout.error, type: 'error' });
      setCreatedBooking({
        booking,
        token,
        manageUrl: cancelUrl,
        confirmationUrl: successUrl,
      });
      return;
    }

    window.location.assign(checkout.data.checkoutUrl);
  }

  if (!salon) {
    return (
      <Stack align="center" className="pb-center">
        <div className="pb-center-inner">
          <FeatureState
            status={
              servicesLoading
                ? 'loading'
                : isRecovering
                  ? 'recovery'
                  : loadError
                    ? 'error'
                    : 'loading'
            }
            title={
              servicesLoading ? c.loadingTitle : loadError ? c.loadingErrorTitle : c.loadingTitle
            }
            description={servicesLoading ? c.loadingDescription : undefined}
            error={loadError}
            onRetry={loadError ? handleRecover : undefined}
            retryLabel={c.retry}
            testId="public-booking-fallback"
          />
        </div>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className="pb-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <StepIndicator
        current={currentStep}
        steps={[
          { key: 'service', label: c.steps.service, number: 1 },
          { key: 'datetime', label: c.steps.datetime, number: 2 },
          { key: 'details', label: c.steps.details, number: 3 },
          { key: 'confirm', label: c.steps.confirm, number: 4 },
        ]}
      />
      <Stack direction="row" gap="sm" className="pb-wrap">
        <Button variant="ghost" size="sm" onClick={() => goToStep('service')}>
          {c.nav.step1}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToStep('datetime')}
          disabled={!selectedServiceId}
        >
          {c.nav.step2}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToStep('details')}
          disabled={!selectedSlot}
        >
          {c.nav.step3}
        </Button>
      </Stack>

      <div>
        <p className="pb-uppercase">{salon.name}</p>
        <h1 data-testid="public-booking-title">{c.title}</h1>
        <p className="pb-muted">
          {c.timezoneLabel}: {salon.timezone}
          {c.inlineSeparator}
          {c.cancellationLabel} {Math.max(0, salon.cancellationWindowMinutes)} {c.minutesShort}{' '}
          {c.beforeLabel}
        </p>
      </div>
      {error && currentStep !== 'datetime' && (
        <Card variant="outlined" className="pb-error-card" data-testid="public-booking-error">
          <Stack direction="row" gap="md" align="center" justify="between">
            <p className="pb-error-text">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              {c.retry}
            </Button>
          </Stack>
        </Card>
      )}

      {/* Step 1: Service */}
      <Card>
        <h2>{c.serviceTitle}</h2>
        {servicesLoading ? (
          <Stack direction="row" gap="md" className="pb-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="pb-skeleton-service" />
            ))}
          </Stack>
        ) : services.length === 0 ? (
          <Card variant="muted">
            <p>{c.noServicesTitle}</p>
            <p className="pb-muted">{c.noServicesBody}</p>
            {(salon.phone || salon.email) && (
              <p className="pb-muted">
                {salon.phone ? `${c.contactPhone}: ${salon.phone}` : ''}
                {salon.phone && salon.email ? c.contactSeparator : ''}
                {salon.email ? `${c.contactEmail}: ${salon.email}` : ''}
              </p>
            )}
          </Card>
        ) : (
          <Stack direction="row" gap="md" className="pb-wrap">
            {services.map((service) => (
              <div key={service.id} className="pb-service-col">
                <ServiceCard
                  service={service}
                  isSelected={selectedServiceId === service.id}
                  onSelect={() => setSelectedServiceId(service.id)}
                  minutesLabel={c.minutesShort}
                  locale={locale}
                  currency={service.currency ?? currency}
                />
              </div>
            ))}
          </Stack>
        )}
      </Card>

      {/* Step 2: Date & Time */}
      {selectedService && (
        <Card>
          <h2>{c.steps.datetime}</h2>

          <Stack gap="md">
            <div>
              <span className="pb-uppercase">{c.staffTitle}</span>
              <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-sm">
                <button
                  type="button"
                  onClick={() => setSelectedStaffId('')}
                  className={['pb-staff-pill', selectedStaffId === '' ? 'pb-selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="pb-staff-dot pb-staff-dot-primary" />
                  <span>{c.firstAvailable}</span>
                </button>
                {staffLoading ? (
                  <div className="pb-skeleton-pill" />
                ) : (
                  staff.map((s, idx) => (
                    <StaffPill
                      key={s.id}
                      staff={s}
                      isSelected={selectedStaffId === s.id}
                      onSelect={() => setSelectedStaffId(s.id)}
                      colorClass={`pb-staff-dot-${idx % 6}`}
                    />
                  ))
                )}
              </Stack>
              {!staffLoading && staff.length === 0 && (
                <Card variant="muted" className="pb-card-top-sm">
                  <p>{c.noStaffTitle}</p>
                  <p className="pb-muted">{c.noStaffBody}</p>
                </Card>
              )}
            </div>

            <label>
              <span className="pb-uppercase">{c.dateLabel}</span>
              <input
                type="date"
                className="pb-date-input"
                value={selectedDate}
                min={toLocalDateInputValue()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
          </Stack>

          <SlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            timezone={salon.timezone}
            locale={locale}
            loading={slotsLoading}
            emptyTitle={c.availabilityEmptyTitle}
            emptyBody={c.availabilityEmptyBody}
          />
          {error && currentStep === 'datetime' && (
            <Card variant="outlined" className="pb-error-card pb-card-top-sm">
              <p className="pb-error-text">{error}</p>
            </Card>
          )}
        </Card>
      )}

      {/* Step 3: Customer Details */}
      {selectedSlot && (
        <Card>
          <h2>{c.detailsTitle}</h2>
          <Stack direction="row" gap="sm" className="pb-wrap pb-card-top-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSlot(null);
                setError('');
              }}
            >
              {c.changeSlot}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedServiceId('');
                setSelectedStaffId('');
                setSelectedSlot(null);
                setError('');
              }}
            >
              {c.changeService}
            </Button>
          </Stack>

          <Card variant="outlined" className="pb-summary-card">
            <Stack gap="sm">
              <Stack direction="row" gap="md" justify="between">
                <span className="pb-muted">{c.summaryService}</span>
                <strong>{selectedService?.name}</strong>
              </Stack>
              <Stack direction="row" gap="md" justify="between">
                <span className="pb-muted">{c.summaryTime}</span>
                <strong>
                  {formatDate(selectedSlot.startUtc, { locale, timeZone: salon.timezone })}
                  {c.inlineSeparator}
                  {formatTime(selectedSlot.startUtc, { locale, timeZone: salon.timezone })}
                </strong>
              </Stack>
              <Stack direction="row" gap="md" justify="between">
                <span className="pb-muted">{c.summaryPrice}</span>
                <strong>
                  {selectedService
                    ? formatPrice(
                        selectedService.price,
                        selectedService.currency ?? currency,
                        locale,
                      )
                    : ''}
                </strong>
              </Stack>
            </Stack>
          </Card>

          <Stack gap="md" className="pb-card-top-lg">
            <Input
              label={c.nameLabel}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={c.namePlaceholder}
              fullWidth
            />

            <Stack direction="row" gap="md" className="pb-wrap">
              <Input
                label={c.emailLabel}
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder={c.emailPlaceholder}
                className="pb-input-flex"
              />
              <Input
                label={c.phoneLabel}
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={c.phonePlaceholder}
                className="pb-input-flex"
              />
            </Stack>
            <p className="pb-muted pb-note">{c.contactNote}</p>

            <TextArea
              label={c.notesLabel}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={c.notesPlaceholder}
              rows={3}
              fullWidth
            />
          </Stack>
          <Card variant="outlined" className="pb-card-top-md">
            <Stack gap="sm">
              <strong>{c.policyTitle}</strong>
              <p className="pb-muted pb-note">
                {c.policyBody.replace(
                  '{minutes}',
                  String(Math.max(0, salon.cancellationWindowMinutes)),
                )}
              </p>
              <label className="pb-policy-label">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                />
                <span>{c.policyConsent}</span>
              </label>
              <p className="pb-muted pb-note">{c.policyConsentExtra}</p>
            </Stack>
          </Card>

          {error && (
            <Card variant="outlined" className="pb-error-card pb-card-top-md">
              <p className="pb-error-text">{error}</p>
            </Card>
          )}
          {selectedService && selectedSlot && (
            <Card variant="outlined" className="pb-card-top-sm">
              <Stack direction="row" gap="md" justify="between" align="center">
                <div>
                  <strong>{c.paymentTitle}</strong>
                  <p className="pb-muted pb-note">{c.paymentBody}</p>
                </div>
                <div className="pb-price">{formatPrice(selectedService.price)}</div>
              </Stack>
            </Card>
          )}
          {status && (
            <Card variant="outlined" className="pb-success-card pb-card-top-md">
              <p className="pb-success-text">{status}</p>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleBooking}
            isLoading={loading}
            disabled={!canProceed}
            fullWidth
            className="pb-card-top-lg"
          >
            {loading
              ? c.processing
              : `${c.checkout} ${selectedService ? formatPrice(selectedService.price, selectedService.currency ?? currency, locale) : ''}`}
          </Button>
        </Card>
      )}

      {createdBooking && (
        <Card variant="outlined" className="pb-warning-card">
          <Stack gap="sm">
            <strong>{c.paymentFallbackTitle}</strong>
            <p className="pb-muted pb-note">{c.paymentFallbackBody}</p>
            <p className="pb-note">
              {formatDate(createdBooking.booking.startTime, { locale, timeZone: salon.timezone })}
              {c.inlineSeparator}
              {formatTime(createdBooking.booking.startTime, { locale, timeZone: salon.timezone })}
            </p>
            <Stack direction="row" gap="sm" className="pb-actions">
              <Button
                variant="primary"
                onClick={() => {
                  setCreatedBooking(null);
                  handleBooking();
                }}
              >
                {c.paymentRetry}
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.assign(createdBooking.manageUrl)}
              >
                {c.manageBooking}
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.assign(createdBooking.confirmationUrl)}
              >
                {c.viewConfirmation}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
