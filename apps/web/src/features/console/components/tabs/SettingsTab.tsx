import type {
  StaffProfile,
  Service,
  Customer,
  BusinessHoursEntry,
  StaffTimeOff,
} from '../../types';
import { getStoredLocale, resolveLocale, type CopyType } from '../../../../i18n';
import { Button, Card, Stack, Input, TextArea, Badge } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import '../../console.css';

interface SettingsTabProps {
  // Staff
  staff: StaffProfile[];
  staffLoading?: boolean;
  staffError?: string | null;
  onCreateStaff: () => void;
  onInviteStaff: (staff: StaffProfile) => void;
  onUpdateStaff: (staffId: string, key: keyof StaffProfile, value: string | boolean) => void;
  // Services
  services: Service[];
  servicesLoading?: boolean;
  servicesError?: string | null;
  onCreateService: () => void;
  onUpdateService: (
    serviceId: string,
    key: keyof Service,
    value: string | number | boolean,
  ) => void;
  // Business Hours
  businessHours: BusinessHoursEntry[];
  businessHoursLoading?: boolean;
  businessHoursError?: string | null;
  setBusinessHours: (hours: BusinessHoursEntry[]) => void;
  onSaveBusinessHours: () => void;
  // Staff Services
  staffServicesTarget: string;
  setStaffServicesTarget: (id: string) => void;
  staffServicesSelection: string[];
  onStaffServiceToggle: (serviceId: string) => void;
  // Staff Working Hours
  staffHoursTarget: string;
  setStaffHoursTarget: (id: string) => void;
  staffHoursWeekly: BusinessHoursEntry[];
  setStaffHoursWeekly: (hours: BusinessHoursEntry[]) => void;
  staffHoursStatus: string;
  setStaffHoursStatus: (status: string) => void;
  staffHoursLoading?: boolean;
  staffHoursError?: string | null;
  onLoadStaffWorkingHours: (staffId: string) => void;
  onSaveStaffWorkingHours: () => void;
  // Customers
  customers: Customer[];
  customersLoading?: boolean;
  customersError?: string | null;
  customerForm: { name: string; email: string; phone: string; notes: string };
  setCustomerForm: (form: { name: string; email: string; phone: string; notes: string }) => void;
  customerEditId: string;
  customerEdit: { name: string; email: string; phone: string; notes: string };
  setCustomerEdit: (form: { name: string; email: string; phone: string; notes: string }) => void;
  customerBusy: boolean;
  customerStatus: string;
  onCreateCustomer: () => void;
  onUpdateCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onResetCustomerForm: () => void;
  // Time Off
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  timeOffEntries: StaffTimeOff[];
  timeOffLoading?: boolean;
  timeOffError?: string | null;
  timeOffStart: string;
  setTimeOffStart: (date: string) => void;
  timeOffEnd: string;
  setTimeOffEnd: (date: string) => void;
  timeOffReason: string;
  setTimeOffReason: (reason: string) => void;
  onLoadTimeOff: (staffId: string) => void;
  onCreateTimeOff: () => void;
  onDeleteTimeOff: (timeOffId: string) => void;
  // Payments
  stripeStatus: {
    connected: boolean;
    stripeAccountId: string | null;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingCompletedAt: string | null;
  } | null;
  stripeStatusLoading: boolean;
  stripeActionLoading: boolean;
  stripeStatusError: string;
  onStartStripeConnect: () => void;
  onRetry?: () => void;
  // Copy
  copy: CopyType;
}

export function SettingsTab(props: SettingsTabProps) {
  const hasData =
    props.staff.length > 0 ||
    props.services.length > 0 ||
    props.customers.length > 0 ||
    props.businessHours.length > 0;
  const isLoading =
    props.staffLoading ||
    props.servicesLoading ||
    props.customersLoading ||
    props.businessHoursLoading;
  const error =
    props.staffError ||
    props.servicesError ||
    props.customersError ||
    props.businessHoursError ||
    null;

  if ((isLoading && !hasData) || (error && !hasData)) {
    return (
      <FeatureState
        status={isLoading ? 'loading' : 'error'}
        title={
          isLoading
            ? props.copy.console.settings.loadingTitle
            : props.copy.console.settings.errorTitle
        }
        description={isLoading ? props.copy.console.settings.loadingBody : undefined}
        error={error ?? undefined}
        onRetry={isLoading ? undefined : props.onRetry}
        testId="settings-fallback"
      />
    );
  }

  return (
    <Card>
      <Stack gap="lg">
        <BusinessHoursSection {...props} />
        <StaffSection {...props} />
        <ServicesSection {...props} />
        <PaymentsSection {...props} />
        <CustomersSection {...props} />
        <StaffServicesSection {...props} />
        <StaffHoursSection {...props} />
        <TimeOffSection {...props} />
      </Stack>
    </Card>
  );
}

function PaymentsSection({
  stripeStatus,
  stripeStatusLoading,
  stripeActionLoading,
  stripeStatusError,
  onStartStripeConnect,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  const statusLabel = stripeStatus?.connected
    ? stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted
      ? c.paymentsStatus.connected
      : c.paymentsStatus.pending
    : c.paymentsStatus.notConnected;

  return (
    <Card variant="outlined">
      <Stack direction="row" gap="md" align="center" justify="between">
        <div>
          <h3>{c.paymentsTitle}</h3>
          <div className="settings-muted">{c.paymentsSubtitle}</div>
        </div>
        <Badge variant={stripeStatus?.connected ? 'success' : 'warning'}>{statusLabel}</Badge>
      </Stack>

      <Stack gap="sm" className="settings-row">
        <div className="settings-meta">
          {stripeStatus?.stripeAccountId
            ? c.paymentsAccount.replace('{account}', stripeStatus.stripeAccountId)
            : c.paymentsAccountMissing}
        </div>
        <div className="settings-meta">
          {stripeStatus?.chargesEnabled ? c.paymentsChargesEnabled : c.paymentsChargesDisabled}
        </div>
        <div className="settings-meta">
          {stripeStatus?.payoutsEnabled ? c.paymentsPayoutsEnabled : c.paymentsPayoutsDisabled}
        </div>
        {stripeStatusError ? (
          <div data-testid="settings-error" className="settings-error">
            {stripeStatusError}
          </div>
        ) : null}
      </Stack>

      <Stack direction="row" gap="md" className="settings-actions">
        <Button
          variant="primary"
          size="md"
          onClick={onStartStripeConnect}
          disabled={stripeStatusLoading || stripeActionLoading}
        >
          {stripeStatus?.connected ? c.paymentsUpdate : c.paymentsConnect}
        </Button>
      </Stack>
    </Card>
  );
}

function BusinessHoursSection({
  businessHours,
  setBusinessHours,
  onSaveBusinessHours,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  const dayNames: Record<string, string> = {
    mon: c.days.mon,
    tue: c.days.tue,
    wed: c.days.wed,
    thu: c.days.thu,
    fri: c.days.fri,
    sat: c.days.sat,
    sun: c.days.sun,
  };

  const updateHours = (index: number, field: keyof BusinessHoursEntry, value: string | boolean) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value } as BusinessHoursEntry;
    setBusinessHours(updated);
  };

  return (
    <Card variant="outlined">
      <h3>{c.businessHoursTitle}</h3>
      <Stack gap="sm" className="settings-row">
        {businessHours.map((entry, idx) => (
          <Stack key={entry.day} direction="row" gap="md" align="center" justify="between">
            <label className="settings-hours-row">
              <input
                type="checkbox"
                checked={entry.enabled}
                onChange={(e) => updateHours(idx, 'enabled', e.target.checked)}
              />
              <span className="settings-hour-label">{dayNames[entry.day]}</span>
            </label>
            <Stack direction="row" gap="sm" align="center">
              <Input
                type="time"
                size="sm"
                className="settings-time-input"
                value={entry.startTime}
                disabled={!entry.enabled}
                onChange={(e) => updateHours(idx, 'startTime', e.target.value)}
              />
              <span>{copy.rangeSeparator.trim()}</span>
              <Input
                type="time"
                size="sm"
                className="settings-time-input"
                value={entry.endTime}
                disabled={!entry.enabled}
                onChange={(e) => updateHours(idx, 'endTime', e.target.value)}
              />
            </Stack>
          </Stack>
        ))}
      </Stack>
      <Button variant="primary" size="md" onClick={onSaveBusinessHours} className="settings-save">
        {c.saveHours}
      </Button>
    </Card>
  );
}

function StaffSection({
  staff,
  staffLoading,
  staffError,
  onCreateStaff,
  onInviteStaff,
  onUpdateStaff,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  if ((staffLoading && staff.length === 0) || (staffError && staff.length === 0)) {
    return (
      <FeatureState
        status={staffLoading ? 'loading' : 'error'}
        title={staffLoading ? c.staffLoadingTitle : c.staffErrorTitle}
        description={staffLoading ? c.staffLoadingBody : undefined}
        error={staffError ?? undefined}
        testId="settings-staff-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      <h3>{c.staffTitle}</h3>
      <Button variant="secondary" size="md" onClick={onCreateStaff}>
        {c.addStaff}
      </Button>
      <Stack gap="sm" className="settings-row">
        {staff.map((s) => (
          <Stack key={s.id} direction="row" gap="md" align="center" justify="between">
            <Input
              type="text"
              className="settings-field"
              value={s.name}
              onChange={(e) => onUpdateStaff(s.id, 'name', e.target.value)}
            />
            <select
              className="settings-input"
              value={s.role}
              onChange={(e) => onUpdateStaff(s.id, 'role', e.target.value)}
            >
              <option value="owner">{copy.roles.owner}</option>
              <option value="admin">{copy.roles.admin}</option>
              <option value="staff">{copy.roles.staff}</option>
            </select>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => onUpdateStaff(s.id, 'active', e.target.checked)}
              />
              <span>{c.active}</span>
            </label>
            <Button variant="ghost" size="sm" onClick={() => onInviteStaff(s)}>
              {c.invite}
            </Button>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

function ServicesSection({
  services,
  servicesLoading,
  servicesError,
  onCreateService,
  onUpdateService,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  if ((servicesLoading && services.length === 0) || (servicesError && services.length === 0)) {
    return (
      <FeatureState
        status={servicesLoading ? 'loading' : 'error'}
        title={servicesLoading ? c.servicesLoadingTitle : c.servicesErrorTitle}
        description={servicesLoading ? c.servicesLoadingBody : undefined}
        error={servicesError ?? undefined}
        testId="settings-services-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      <h3>{c.servicesTitle}</h3>
      <Button variant="secondary" size="md" onClick={onCreateService}>
        {c.addService}
      </Button>
      <Stack gap="sm" className="settings-row">
        {services.map((s) => (
          <Stack key={s.id} direction="row" gap="md" align="center">
            <Input
              type="text"
              className="settings-field"
              value={s.name}
              onChange={(e) => onUpdateService(s.id, 'name', e.target.value)}
            />
            <Input
              type="number"
              className="settings-field"
              value={s.durationMinutes}
              onChange={(e) => onUpdateService(s.id, 'durationMinutes', parseInt(e.target.value))}
              min={15}
              max={480}
              step={15}
            />
            <span>{c.durationUnit}</span>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => onUpdateService(s.id, 'active', e.target.checked)}
              />
              <span>{c.active}</span>
            </label>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

function CustomersSection({
  customers,
  customersLoading,
  customersError,
  customerForm,
  setCustomerForm,
  customerEditId,
  customerEdit,
  setCustomerEdit,
  customerBusy,
  customerStatus,
  onCreateCustomer,
  onUpdateCustomer,
  onSelectCustomer,
  onResetCustomerForm,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  if ((customersLoading && customers.length === 0) || (customersError && customers.length === 0)) {
    return (
      <FeatureState
        status={customersLoading ? 'loading' : 'error'}
        title={customersLoading ? c.customersLoadingTitle : c.customersErrorTitle}
        description={customersLoading ? c.customersLoadingBody : undefined}
        error={customersError ?? undefined}
        testId="settings-customers-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      <h3>{c.customersTitle}</h3>

      {/* Create/Edit Form */}
      <Stack gap="md" className="settings-row">
        <Input
          label={c.customerName}
          type="text"
          fullWidth
          value={customerEditId ? customerEdit.name : customerForm.name}
          onChange={(e) => {
            if (customerEditId) {
              setCustomerEdit({ ...customerEdit, name: e.target.value });
            } else {
              setCustomerForm({ ...customerForm, name: e.target.value });
            }
          }}
          placeholder={c.customerNamePlaceholder}
        />
        <Input
          label={c.customerEmail}
          type="email"
          fullWidth
          value={customerEditId ? customerEdit.email : customerForm.email}
          onChange={(e) => {
            if (customerEditId) {
              setCustomerEdit({ ...customerEdit, email: e.target.value });
            } else {
              setCustomerForm({ ...customerForm, email: e.target.value });
            }
          }}
          placeholder={c.customerEmailPlaceholder}
        />
        <Input
          label={c.customerPhone}
          type="tel"
          fullWidth
          value={customerEditId ? customerEdit.phone : customerForm.phone}
          onChange={(e) => {
            if (customerEditId) {
              setCustomerEdit({ ...customerEdit, phone: e.target.value });
            } else {
              setCustomerForm({ ...customerForm, phone: e.target.value });
            }
          }}
          placeholder={c.customerPhonePlaceholder}
        />
        <TextArea
          label={c.customerNotes}
          fullWidth
          value={customerEditId ? customerEdit.notes : customerForm.notes}
          onChange={(e) => {
            if (customerEditId) {
              setCustomerEdit({ ...customerEdit, notes: e.target.value });
            } else {
              setCustomerForm({ ...customerForm, notes: e.target.value });
            }
          }}
          placeholder={c.customerNotesPlaceholder}
          rows={3}
        />

        <Stack direction="row" gap="md">
          {customerEditId ? (
            <>
              <Button
                variant="primary"
                size="md"
                onClick={onUpdateCustomer}
                disabled={customerBusy}
              >
                {c.updateCustomer}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  onResetCustomerForm();
                }}
              >
                {c.cancelEdit}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="md" onClick={onCreateCustomer} disabled={customerBusy}>
              {c.createCustomer}
            </Button>
          )}
        </Stack>

        {customerStatus && <p className="settings-customer-status">{customerStatus}</p>}
      </Stack>

      {/* Customer List */}
      <Stack gap="sm" className="settings-list">
        <h4>{c.customerList}</h4>
        {customers.slice(0, 20).map((cust) => (
          <div
            key={cust.id}
            onClick={() => onSelectCustomer(cust)}
            className={[
              'details-list-card',
              customerEditId === cust.id ? 'details-list-card-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <strong>{cust.name}</strong>
            {cust.email && <span className="settings-list-email">{cust.email}</span>}
          </div>
        ))}
        {customers.length > 20 && (
          <p className="settings-more">
            {c.moreLabel.replace('{count}', String(customers.length - 20))}
          </p>
        )}
      </Stack>
    </Card>
  );
}

function StaffServicesSection({
  staff,
  services,
  staffLoading,
  staffError,
  servicesLoading,
  servicesError,
  staffServicesTarget,
  setStaffServicesTarget,
  staffServicesSelection,
  onStaffServiceToggle,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  const hasData = staff.length > 0 && services.length > 0;
  const isLoading = staffLoading || servicesLoading;
  const error = staffError || servicesError;
  if ((isLoading && !hasData) || (error && !hasData)) {
    return (
      <FeatureState
        status={isLoading ? 'loading' : 'error'}
        title={isLoading ? c.staffServicesLoadingTitle : c.staffServicesErrorTitle}
        description={isLoading ? c.staffServicesLoadingBody : undefined}
        error={error ?? undefined}
        testId="settings-staff-services-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      <h3>{c.staffServicesTitle}</h3>

      <Stack gap="xs" className="settings-row">
        <label className="settings-label">{c.selectStaff}</label>
        <select
          className="settings-input"
          value={staffServicesTarget}
          onChange={(e) => setStaffServicesTarget(e.target.value)}
        >
          <option value="">{c.selectStaffPlaceholder}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Stack>

      {staffServicesTarget && (
        <Stack gap="sm" className="settings-row">
          {services
            .filter((s) => s.active)
            .map((service) => (
              <label key={service.id} className="settings-list-item">
                <input
                  type="checkbox"
                  checked={staffServicesSelection.includes(service.id)}
                  onChange={() => onStaffServiceToggle(service.id)}
                />
                <span>{service.name}</span>
              </label>
            ))}
        </Stack>
      )}
    </Card>
  );
}

function StaffHoursSection({
  staff,
  staffLoading,
  staffError,
  staffHoursTarget,
  setStaffHoursTarget,
  staffHoursWeekly,
  setStaffHoursWeekly,
  staffHoursStatus,
  staffHoursLoading,
  staffHoursError,
  onLoadStaffWorkingHours,
  onSaveStaffWorkingHours,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  if ((staffLoading && staff.length === 0) || (staffError && staff.length === 0)) {
    return (
      <FeatureState
        status={staffLoading ? 'loading' : 'error'}
        title={staffLoading ? c.staffLoadingTitle : c.staffErrorTitle}
        description={staffLoading ? c.staffLoadingBody : undefined}
        error={staffError ?? undefined}
        testId="settings-staff-hours-fallback"
      />
    );
  }
  const dayNames: Record<string, string> = {
    mon: c.days.mon,
    tue: c.days.tue,
    wed: c.days.wed,
    thu: c.days.thu,
    fri: c.days.fri,
    sat: c.days.sat,
    sun: c.days.sun,
  };

  const updateHours = (index: number, field: keyof BusinessHoursEntry, value: string | boolean) => {
    const updated = [...staffHoursWeekly];
    updated[index] = { ...updated[index], [field]: value } as BusinessHoursEntry;
    setStaffHoursWeekly(updated);
  };

  return (
    <Card variant="outlined">
      <h3>{c.staffHoursTitle}</h3>

      <Stack gap="xs" className="settings-row">
        <label className="settings-label">{c.selectStaff}</label>
        <select
          className="settings-input"
          value={staffHoursTarget}
          onChange={(e) => {
            setStaffHoursTarget(e.target.value);
            if (e.target.value) {
              onLoadStaffWorkingHours(e.target.value);
            }
          }}
        >
          <option value="">{c.selectStaffPlaceholder}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Stack>

      {staffHoursTarget && (
        <>
          {staffHoursLoading && (
            <FeatureState
              status="loading"
              title={c.staffHoursLoadingTitle}
              description={c.staffHoursLoadingBody}
              testId="staff-hours-fallback"
            />
          )}
          {!staffHoursLoading && staffHoursError && (
            <FeatureState
              status="error"
              title={c.staffHoursErrorTitle}
              error={staffHoursError}
              testId="staff-hours-fallback"
            />
          )}
          <Stack gap="sm" className="settings-row">
            {staffHoursWeekly.map((entry, idx) => (
              <Stack key={entry.day} direction="row" gap="md" align="center" justify="between">
                <label className="settings-hours-row">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) => updateHours(idx, 'enabled', e.target.checked)}
                  />
                  <span className="settings-hour-label">{dayNames[entry.day]}</span>
                </label>
                <Stack direction="row" gap="sm" align="center">
                  <Input
                    type="time"
                    size="sm"
                    className="settings-time-input"
                    value={entry.startTime}
                    disabled={!entry.enabled}
                    onChange={(e) => updateHours(idx, 'startTime', e.target.value)}
                  />
                  <span>{copy.rangeSeparator.trim()}</span>
                  <Input
                    type="time"
                    size="sm"
                    className="settings-time-input"
                    value={entry.endTime}
                    disabled={!entry.enabled}
                    onChange={(e) => updateHours(idx, 'endTime', e.target.value)}
                  />
                </Stack>
              </Stack>
            ))}
          </Stack>
          <Button
            variant="primary"
            size="md"
            onClick={onSaveStaffWorkingHours}
            className="settings-save"
          >
            {c.saveHours}
          </Button>
          {staffHoursStatus && <p className="settings-customer-status">{staffHoursStatus}</p>}
        </>
      )}
    </Card>
  );
}

function TimeOffSection({
  staff,
  staffLoading,
  staffError,
  selectedStaffId,
  setSelectedStaffId,
  timeOffEntries,
  timeOffLoading,
  timeOffError,
  timeOffStart,
  setTimeOffStart,
  timeOffEnd,
  setTimeOffEnd,
  timeOffReason,
  setTimeOffReason,
  onLoadTimeOff,
  onCreateTimeOff,
  onDeleteTimeOff,
  copy,
}: SettingsTabProps) {
  const c = copy.console.settings;
  const locale = resolveLocale(getStoredLocale());
  const dateLocale = locale === 'da' ? 'da-DK' : 'en-US';
  if ((staffLoading && staff.length === 0) || (staffError && staff.length === 0)) {
    return (
      <FeatureState
        status={staffLoading ? 'loading' : 'error'}
        title={staffLoading ? c.staffLoadingTitle : c.staffErrorTitle}
        description={staffLoading ? c.staffLoadingBody : undefined}
        error={staffError ?? undefined}
        testId="settings-timeoff-fallback"
      />
    );
  }

  return (
    <Card variant="outlined">
      <h3>{c.timeOffTitle}</h3>

      <Stack gap="xs" className="settings-row">
        <label className="settings-label">{c.selectStaff}</label>
        <select
          className="settings-input"
          value={selectedStaffId}
          onChange={(e) => {
            setSelectedStaffId(e.target.value);
            if (e.target.value) {
              onLoadTimeOff(e.target.value);
            }
          }}
        >
          <option value="">{c.selectStaffPlaceholder}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Stack>

      {selectedStaffId && (
        <>
          {timeOffLoading && (
            <FeatureState
              status="loading"
              title={c.timeOffLoadingTitle}
              description={c.timeOffLoadingBody}
              testId="timeoff-fallback"
            />
          )}
          {!timeOffLoading && timeOffError && (
            <FeatureState
              status="error"
              title={c.timeOffErrorTitle}
              error={timeOffError}
              testId="timeoff-fallback"
            />
          )}
          <Stack gap="md" className="settings-row">
            <Input
              label={c.timeOffStart}
              type="datetime-local"
              fullWidth
              value={timeOffStart}
              onChange={(e) => setTimeOffStart(e.target.value)}
            />
            <Input
              label={c.timeOffEnd}
              type="datetime-local"
              fullWidth
              value={timeOffEnd}
              onChange={(e) => setTimeOffEnd(e.target.value)}
            />
            <Input
              label={c.timeOffReason}
              type="text"
              fullWidth
              value={timeOffReason}
              onChange={(e) => setTimeOffReason(e.target.value)}
              placeholder={c.timeOffReasonPlaceholder}
            />
            <Button variant="secondary" size="md" onClick={onCreateTimeOff}>
              {c.addTimeOff}
            </Button>
          </Stack>

          <Stack gap="sm" className="settings-list">
            <h4>{c.timeOffList}</h4>
            {timeOffEntries.length === 0 ? (
              <p className="settings-more">{c.noTimeOff}</p>
            ) : (
              timeOffEntries.map((entry) => (
                <Stack key={entry.id} direction="row" gap="md" align="center" justify="between">
                  <div>
                    <div className="dash-booking-name">
                      {new Date(entry.startUtc ?? entry.startTime).toLocaleDateString(dateLocale)}
                      {copy.rangeSeparator}
                      {new Date(entry.endUtc ?? entry.endTime).toLocaleDateString(dateLocale)}
                    </div>
                    {entry.reason && <div className="settings-meta">{entry.reason}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteTimeOff(entry.id)}>
                    {c.deleteTimeOff}
                  </Button>
                </Stack>
              ))
            )}
          </Stack>
        </>
      )}
    </Card>
  );
}
