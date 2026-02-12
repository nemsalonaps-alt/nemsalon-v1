import type { Customer, Service, StaffProfile, AvailabilitySlot } from '../../types';
import { Button, Card, Stack } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import { getStoredLocale, type CopyType } from '../../../../i18n';
import { useState } from 'react';

interface CreateBookingTabProps {
  services: Service[];
  staff: StaffProfile[];
  customers: Customer[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedServiceId: string;
  setSelectedServiceId: (id: string) => void;
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  availabilityDate: string;
  setAvailabilityDate: (date: string) => void;
  availabilitySlots: AvailabilitySlot[];
  availabilityLoading?: boolean;
  availabilityError?: string | null;
  onRetryAvailability?: () => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  customTime: string;
  setCustomTime: (time: string) => void;
  checkoutLink: string | null;
  setCheckoutLink: (link: string | null) => void;
  onLoadAvailability: () => void;
  onCreateBooking: (slotStart: string, slotEnd: string, staffId: string) => void;
  onCustomBooking: () => void;
  onTabChange: (tab: 'calendar' | 'details') => void;
  onSelectBooking: (bookingId: string) => void;
  copy: CopyType;
}

export function CreateBookingTab({
  services,
  staff,
  customers,
  loading = false,
  error = null,
  onRetry,
  selectedServiceId,
  setSelectedServiceId,
  selectedStaffId,
  setSelectedStaffId,
  selectedCustomerId,
  setSelectedCustomerId,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  availabilityDate,
  setAvailabilityDate,
  availabilitySlots,
  availabilityLoading = false,
  availabilityError = null,
  onRetryAvailability,
  customDate,
  setCustomDate,
  customTime,
  setCustomTime,
  checkoutLink,
  setCheckoutLink,
  onLoadAvailability,
  onCreateBooking,
  onCustomBooking,
  onTabChange,
  copy
}: CreateBookingTabProps) {
  const c = copy.console.create;
  const locale = getStoredLocale() === 'da' ? 'da-DK' : 'en-US';
  const [availabilityAttempted, setAvailabilityAttempted] = useState(false);

  const hasSelectedService = !!selectedServiceId;
  const hasSelectedStaff = !!selectedStaffId;
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const hasData = services.length > 0 || staff.length > 0 || customers.length > 0;

  if ((loading && !hasData) || (error && !hasData)) {
    return (
      <FeatureState
        status={loading ? 'loading' : 'error'}
        title={loading ? c.loadingTitle : c.errorTitle}
        description={loading ? c.loadingBody : undefined}
        error={error ?? undefined}
        onRetry={onRetry}
        retryLabel={c.retry}
        testId="create-booking-fallback"
      />
    );
  }

  return (
    <Card>
      {/* Step 1: Service Selection */}
      <Stack gap="md" className="create-section">
        <h2>{c.step1Title}</h2>
        <Stack direction="row" gap="sm" className="create-row">
          <Stack gap="xs" className="create-col">
            <label className="create-label">{c.serviceLabel}</label>
            <select
              className="create-select"
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedStaffId('');
              }}
              data-testid="create-booking-service"
            >
              <option value="">{c.servicePlaceholder}</option>
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
            </select>
            <p className="create-help">{c.serviceHelp}</p>
            {!hasSelectedService && (
              <p className="create-warning">
                {c.serviceRequired}
              </p>
            )}
          </Stack>

          {hasSelectedService && selectedService && (
            <Stack className="create-summary">
              <p className="create-summary-title"><strong>{selectedService.name}</strong></p>
              <p>{c.serviceDurationLabel}: {selectedService.durationMinutes} min</p>
              {selectedService.bufferMinutes && selectedService.bufferMinutes > 0 && (
                <p>{c.serviceBufferLabel}: {selectedService.bufferMinutes} min</p>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Step 2: Staff Selection */}
      <Stack gap="md" className="create-section">
        <h2>{c.step2Title}</h2>
        <Stack direction="row" gap="sm" className="create-row">
          <Stack gap="xs" className="create-col">
            <label className="create-label">{c.staffLabel}</label>
            <select
              className="create-select"
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
              }}
              data-testid="create-booking-staff"
            >
              <option value="">{c.staffPlaceholder}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="create-help">{c.staffHelp}</p>
            {hasSelectedService && !hasSelectedStaff && (
              <p className="create-warning">
                {c.staffRequired}
              </p>
            )}
          </Stack>

          {hasSelectedStaff && selectedStaff && (
            <Stack className="create-summary">
              <p className="create-summary-title"><strong>{selectedStaff.name}</strong></p>
              <p>{copy.roles[selectedStaff.role as keyof typeof copy.roles] || selectedStaff.role}</p>
              {selectedStaff.email && <p>{selectedStaff.email}</p>}
              {selectedStaff.phone && <p>{selectedStaff.phone}</p>}
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Step 3: Customer Selection */}
      {hasSelectedStaff && (
        <Stack gap="md" className="create-section">
          <h2>{c.step3Title}</h2>
          <Stack direction="row" gap="sm" className="create-row">
            <Stack gap="xs" className="create-col">
              <label className="create-label">{c.customerLabel}</label>
              <select
                className="create-select"
                value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
                data-testid="create-booking-customer"
              >
                <option value="">{c.customerPlaceholder}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
                <option value="__new__">{c.newCustomerOption}</option>
              </select>
              <p className="create-help">{c.customerHelp}</p>
            </Stack>

            {/* New Customer Fields */}
            {(selectedCustomerId === '__new__' || selectedCustomerId === '') && (
              <Stack gap="sm" className="create-col">
                <Stack gap="xs">
                  <label className="create-label">{c.customerNameLabel}</label>
                  <input
                    type="text"
                    className="create-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={c.customerNamePlaceholder}
                    data-testid="create-booking-customer-name"
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="create-label">{c.customerEmailLabel}</label>
                  <input
                    type="email"
                    className="create-input"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={c.customerEmailPlaceholder}
                    data-testid="create-booking-customer-email"
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="create-label">{c.customerPhoneLabel}</label>
                  <input
                    type="tel"
                    className="create-input"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={c.customerPhonePlaceholder}
                    data-testid="create-booking-customer-phone"
                  />
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>
      )}

      {/* Step 4: Date and Time Selection */}
      {hasSelectedStaff && (
        <Stack gap="md" className="create-section">
          <h2>{c.step4Title}</h2>
          <Stack direction="row" gap="sm" className="create-row">
            {/* Date Picker */}
            <Stack gap="xs" className="create-col">
              <label className="create-label">{c.dateLabel}</label>
              <input
                type="date"
                className="create-input"
                value={availabilityDate}
                onChange={(e) => {
                  setAvailabilityDate(e.target.value);
                  setCustomDate(e.target.value);
                }}
                data-testid="create-booking-date"
              />
            </Stack>

            {/* Availability Grid */}
            <Stack className="create-col">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setAvailabilityAttempted(true);
                  onLoadAvailability();
                }}
                data-testid="create-booking-check-availability"
                disabled={!hasSelectedService || !hasSelectedStaff}
              >
                {c.checkAvailability}
              </Button>

              {availabilityLoading && (
                <FeatureState
                  status="loading"
                  title={c.loadingSlots}
                  description={c.loadingSlotsBody}
                  testId="availability-fallback"
                />
              )}

              {!availabilityLoading && availabilityError && (
                <FeatureState
                  status="error"
                  title={c.availabilityErrorTitle}
                  error={availabilityError}
                  onRetry={onRetryAvailability}
                  retryLabel={c.retry}
                  testId="availability-fallback"
                />
              )}

              {availabilitySlots.length > 0 && !availabilityLoading && !availabilityError && (
                <Stack>
                  <h3>{c.availableSlots}</h3>
                  <Stack direction="row" gap="sm" className="create-row">
                    {availabilitySlots.map((slot, idx) => {
                      const time = new Date(slot.startUtc).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <button
                          key={idx}
                          className="create-slot"
                          onClick={() => {
                            onCreateBooking(slot.startUtc, slot.endUtc, selectedStaffId);
                          }}
                          data-testid="create-booking-slot"
                        >
                          {time}
                        </button>
                      );
                    })}
                  </Stack>
                </Stack>
              )}

              {availabilitySlots.length === 0 &&
                !availabilityLoading &&
                !availabilityError &&
                hasSelectedService &&
                availabilityAttempted && (
                <p className="create-muted">{c.noSlots}</p>
              )}
            </Stack>

            {/* Custom Time Option */}
            <Stack className="create-col">
              <h3>{c.customTimeTitle}</h3>
              <Stack gap="sm" className="create-custom">
                <Stack gap="xs">
                  <label className="create-label">{c.customDateLabel}</label>
                  <input
                    type="date"
                    className="create-input"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    data-testid="create-booking-custom-date"
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="create-label">{c.customTimeLabel}</label>
                  <input
                    type="time"
                    className="create-input"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    data-testid="create-booking-custom-time"
                  />
                </Stack>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onCustomBooking}
                  data-testid="create-booking-custom"
                >
                  {c.createCustomBooking}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      )}

      {/* Checkout Link */}
      {checkoutLink && (
        <Stack gap="md" className="create-section">
          <h3>{c.checkoutTitle}</h3>
          <p>{c.checkoutReady}</p>
          <a
            href={checkoutLink}
            target="_blank"
            rel="noreferrer"
            className="create-checkout-link"
          >
            {c.openCheckout}
          </a>
          <Stack direction="row" gap="sm" className="create-checkout-actions">
            <Button variant="ghost" size="md" onClick={() => setCheckoutLink(null)}>
              {c.clearCheckout}
            </Button>
            <Button 
              variant="secondary" 
              size="md"
              onClick={() => {
                setCheckoutLink(null);
                onTabChange('calendar');
              }}
              data-testid="create-booking-goto-calendar"
            >
              {c.gotoCalendar}
            </Button>
          </Stack>
        </Stack>
      )}
    </Card>
  );
}
