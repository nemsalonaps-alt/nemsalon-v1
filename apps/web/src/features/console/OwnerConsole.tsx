import { useEffect, useMemo, useState } from 'react';
import {
  assignStaffServices,
  cancelBooking,
  createBooking,
  createCheckout,
  createService,
  createStaff,
  createStaffTimeOff,
  deleteStaffTimeOff,
  fetchAvailability,
  fetchMe,
  getBooking,
  getBusinessHours,
  getPayment,
  listBookings,
  listCustomers,
  listServices,
  listStaff,
  listStaffServices,
  listStaffTimeOff,
  rescheduleBooking,
  setBusinessHours,
  updateBookingStatus,
  updateService,
  updateStaff
} from './api';
import { Gate } from '../onboarding/pages/Gate';
import type { GateState } from '../onboarding/types';
import { onAuthStateChange } from '../../lib/auth';
import { copy } from '../../i18n';
import type {
  AuthMeResponse,
  BookingSummary,
  BusinessHoursEntry,
  Customer,
  Service,
  StaffProfile,
  StaffTimeOff
} from './types';

type TabKey = 'home' | 'calendar' | 'create' | 'details' | 'settings';
type ConsoleGateState = GateState | 'ready';

const initialHours: BusinessHoursEntry[] = [
  { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
  { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false }
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('da-DK', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function toUtcIso(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return value.toISOString();
}

export function OwnerConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [gateState, setGateState] = useState<ConsoleGateState>('checking');
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessHours, setBusinessHoursState] = useState<BusinessHoursEntry[]>(initialHours);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [bookingLookupId, setBookingLookupId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [availabilitySlots, setAvailabilitySlots] = useState<Array<{ startUtc: string; endUtc: string; staffId: string }>>([]);
  const [availabilityDate, setAvailabilityDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTime, setCustomTime] = useState('09:00');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Testkunde');
  const [customerEmail, setCustomerEmail] = useState('kunde@example.com');
  const [customerPhone, setCustomerPhone] = useState('+4512345678');
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calendarStaffId, setCalendarStaffId] = useState<string>('');
  const [bookingPayment, setBookingPayment] = useState<string>('');
  const [timeOffEntries, setTimeOffEntries] = useState<StaffTimeOff[]>([]);
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');
  const [staffServicesSelection, setStaffServicesSelection] = useState<string[]>([]);
  const [staffServicesTarget, setStaffServicesTarget] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const salonId = me?.primarySalonId ?? me?.salon?.id ?? '';

  const staffById = useMemo(() => new Map(staff.map((entry) => [entry.id, entry])), [staff]);
  const serviceById = useMemo(() => new Map(services.map((entry) => [entry.id, entry])), [services]);

  useEffect(() => {
    if (gateState !== 'checking') return;
    let active = true;
    async function load() {
      const meResult = await fetchMe();
      if (!active) return;
      if (!meResult.ok) {
        if (meResult.status === 401 || meResult.status === 403) {
          setGateState('needs-login');
        } else {
          setGateState('error');
        }
        return;
      }
      setMe(meResult.data);
      setGateState('ready');
      const staffResult = await listStaff();
      if (staffResult.ok) setStaff(staffResult.data.data);
      const serviceResult = await listServices();
      if (serviceResult.ok) setServices(serviceResult.data.data);
      const customerResult = await listCustomers();
      if (customerResult.ok) setCustomers(customerResult.data.data);
      if (meResult.data.primarySalonId) {
        const hoursResult = await getBusinessHours(meResult.data.primarySalonId);
        if (hoursResult.ok) setBusinessHoursState(hoursResult.data.weekly);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [gateState]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setGateState('checking');
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!calendarDate || !salonId) return;
    refreshBookings(calendarDate, calendarStaffId || undefined);
  }, [calendarDate, calendarStaffId, salonId]);

  useEffect(() => {
    if (!staffServicesTarget) return;
    listStaffServices(staffServicesTarget).then((result) => {
      if (result.ok) setStaffServicesSelection(result.data.serviceIds);
    });
  }, [staffServicesTarget]);

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingPayment('');
      return;
    }
    const booking = bookings.find((entry) => entry.id === selectedBookingId);
    if (!booking?.paymentId) {
      setBookingPayment('');
      return;
    }
    getPayment(booking.paymentId).then((result) => {
      if (result.ok) {
        setBookingPayment(`${result.data.status} (${result.data.provider})`);
      }
    });
  }, [selectedBookingId, bookings]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find((entry) => entry.id === selectedCustomerId);
    if (!customer) return;
    setCustomerName(customer.name ?? '');
    setCustomerEmail(customer.email ?? '');
    setCustomerPhone(customer.phone ?? '');
  }, [selectedCustomerId, customers]);

  async function refreshStaffServices() {
    if (!staffServicesTarget) return;
    const result = await listStaffServices(staffServicesTarget);
    if (result.ok) setStaffServicesSelection(result.data.serviceIds);
  }

  async function handleStaffServiceToggle(serviceId: string) {
    const current = staffServicesSelection;
    const next = staffServicesSelection.includes(serviceId)
      ? staffServicesSelection.filter((id) => id !== serviceId)
      : [...staffServicesSelection, serviceId];
    if (next.length === 0) {
      setStatusMessage(copy.validation.staff.serviceRequired);
      return;
    }
    setStaffServicesSelection(next);
    if (staffServicesTarget) {
      const result = await assignStaffServices(staffServicesTarget, next);
      if (!result.ok) {
        setStatusMessage(`Kunne ikke gemme services: ${result.error}`);
        setStaffServicesSelection(current);
        await refreshStaffServices();
      }
    }
  }

  async function handleCreateBooking(slotStart: string, slotEnd: string, staffId: string) {
    if (!selectedServiceId) return;
    if (!selectedCustomerId && !customerName.trim()) {
      setStatusMessage('Tilføj kundeoplysninger eller vælg en kunde.');
      return;
    }
    const result = await createBooking({
      staffId,
      serviceId: selectedServiceId,
      startUtc: slotStart,
      customerId: selectedCustomerId || undefined,
      customer: selectedCustomerId
        ? undefined
        : {
            name: customerName,
            email: customerEmail,
            phone: customerPhone
          }
    });
    if (!result.ok) {
      setStatusMessage(`Booking fejlede: ${result.error}`);
      return;
    }
    const checkout = await createCheckout(result.data.id);
    if (!checkout.ok) {
      const hint =
        checkout.error.includes('config') || checkout.error.includes('CONFIG')
          ? ' (mangler betalings-setup eller mock mode)'
          : '';
      setStatusMessage(`Checkout fejlede: ${checkout.error}${hint}`);
      return;
    }
    setStatusMessage(`Booking oprettet. Checkout: ${checkout.data.checkoutUrl}`);
  }

  async function handleCustomBooking() {
    if (!selectedServiceId) {
      setStatusMessage('Vælg en service først.');
      return;
    }
    if (!selectedStaffId) {
      setStatusMessage('Vælg en medarbejder til custom tid.');
      return;
    }
    if (!customDate || !customTime) {
      setStatusMessage('Vælg dato og tidspunkt.');
      return;
    }
    const startUtc = toUtcIso(customDate, customTime);
    await handleCreateBooking(startUtc, startUtc, selectedStaffId);
  }

  async function handleLookupBooking() {
    if (!bookingLookupId.trim()) return;
    const result = await getBooking(bookingLookupId.trim());
    if (!result.ok) {
      setStatusMessage(`Kunne ikke hente booking: ${result.error}`);
      return;
    }
    setBookings((prev) => {
      const exists = prev.some((entry) => entry.id === result.data.id);
      return exists ? prev : [result.data, ...prev];
    });
    setSelectedBookingId(result.data.id);
    setActiveTab('details');
  }

  async function loadAvailability(serviceId: string, staffId?: string) {
    if (!availabilityDate) return;
    const result = await fetchAvailability({
      serviceId,
      staffId,
      fromUtc: toUtcIso(availabilityDate, '00:00'),
      days: 1,
      limit: 64,
      intervalMinutes: 15
    });
    if (result.ok) {
      setAvailabilitySlots(result.data.slots);
    } else {
      setStatusMessage(`Availability fejl: ${result.error}`);
    }
  }

  async function handleCancelBooking() {
    if (!selectedBookingId) return;
    const result = await cancelBooking(selectedBookingId, { reasonKey: 'owner.cancel' });
    if (result.ok) {
      setStatusMessage('Booking annulleret.');
      refreshBookings(calendarDate, calendarStaffId || undefined);
    } else {
      setStatusMessage(result.error);
    }
  }

  async function handleReschedule(slotStart: string, staffId: string) {
    if (!selectedBookingId) return;
    const result = await rescheduleBooking(selectedBookingId, { staffId, startUtc: slotStart });
    if (result.ok) {
      setStatusMessage('Booking ombooket.');
      refreshBookings(calendarDate, calendarStaffId || undefined);
    } else {
      setStatusMessage(result.error);
    }
  }

  async function handleForceConfirm() {
    if (!selectedBookingId) return;
    const result = await updateBookingStatus(selectedBookingId, 'confirmed');
    if (result.ok) {
      setStatusMessage('Booking status = confirmed.');
      refreshBookings(calendarDate, calendarStaffId || undefined);
    } else {
      setStatusMessage(result.error);
    }
  }

  async function refreshBookings(date: string, staffId?: string) {
    if (!date || !salonId) return;
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);
    const result = await listBookings({
      from: from.toISOString(),
      to: to.toISOString(),
      staffId
    });
    if (result.ok) {
      setBookings(result.data.data);
    }
  }

  async function handleSaveBusinessHours() {
    if (!salonId) return;
    const result = await setBusinessHours(salonId, businessHours);
    if (result.ok) {
      setStatusMessage('Åbningstider gemt.');
    } else {
      setStatusMessage(result.error);
    }
  }

  async function handleCreateStaff() {
    const name = prompt('Navn på medarbejder?');
    if (!name) return;
    const result = await createStaff({ name, role: 'staff', active: true });
    if (result.ok) {
      setStaff((prev) => [...prev, result.data]);
    }
  }

  async function handleCreateService() {
    const name = prompt('Service navn?');
    if (!name) return;
    const result = await createService({
      name,
      durationMinutes: 60,
      bufferMinutes: 0,
      price: 45000,
      currency: me?.salon?.currency ?? 'DKK',
      active: true
    });
    if (result.ok) {
      setServices((prev) => [...prev, result.data]);
    }
  }

  async function handleUpdateStaff(staffId: string, key: keyof StaffProfile, value: string | boolean) {
    const payload = { [key]: value } as Partial<StaffProfile>;
    const result = await updateStaff(staffId, payload);
    if (result.ok) {
      setStaff((prev) => prev.map((entry) => (entry.id === staffId ? result.data : entry)));
    }
  }

  async function handleUpdateService(serviceId: string, key: keyof Service, value: string | number | boolean) {
    const payload = { [key]: value } as Partial<Service>;
    const result = await updateService(serviceId, payload);
    if (result.ok) {
      setServices((prev) => prev.map((entry) => (entry.id === serviceId ? result.data : entry)));
    }
  }

  async function handleLoadTimeOff(staffId: string) {
    const result = await listStaffTimeOff(staffId);
    if (result.ok) {
      setTimeOffEntries(result.data.data);
    }
  }

  async function handleCreateTimeOff() {
    if (!selectedStaffId || !timeOffStart || !timeOffEnd) return;
    const result = await createStaffTimeOff(selectedStaffId, {
      startUtc: new Date(timeOffStart).toISOString(),
      endUtc: new Date(timeOffEnd).toISOString(),
      reason: timeOffReason || undefined
    });
    if (result.ok) {
      setTimeOffEntries((prev) => [...prev, result.data]);
    } else {
      setStatusMessage(result.error);
    }
  }

  async function handleDeleteTimeOff(timeOffId: string) {
    if (!selectedStaffId) return;
    const result = await deleteStaffTimeOff(selectedStaffId, timeOffId);
    if (result.ok) {
      setTimeOffEntries((prev) => prev.filter((entry) => entry.id !== timeOffId));
    }
  }

  const setupCompleteness = {
    staff: staff.length,
    services: services.length,
    hours: businessHours.filter((entry) => entry.enabled).length
  };

  if (gateState !== 'ready') {
    return (
      <div className="app">
        <Gate state={gateState} onRetry={() => setGateState('checking')} />
      </div>
    );
  }

  return (
    <div className="app console">
      <header className="console-header">
        <div>
          <p className="eyebrow">Owner Console v0</p>
          <h1>{me?.salon?.name ?? 'Salon'}</h1>
          <p className="muted">Status: {me?.salon?.status ?? 'draft'}</p>
        </div>
        <div className="status-pill">
          <span>Setup</span>
          <strong>{setupCompleteness.staff} staff / {setupCompleteness.services} services / {setupCompleteness.hours} days</strong>
        </div>
      </header>

      <nav className="console-nav">
        {(['home', 'calendar', 'create', 'details', 'settings'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={`console-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'home' && 'Home'}
            {tab === 'calendar' && 'Calendar'}
            {tab === 'create' && 'Create booking'}
            {tab === 'details' && 'Booking details'}
            {tab === 'settings' && 'Settings'}
          </button>
        ))}
      </nav>

      {statusMessage && <div className="console-banner">{statusMessage}</div>}

      {activeTab === 'home' && (
        <section className="panel">
          <h2>Quick actions</h2>
          <div className="grid three">
            <button className="btn primary" onClick={() => setActiveTab('create')}>Create booking</button>
            <button className="btn ghost" onClick={() => setActiveTab('calendar')}>View calendar</button>
            <button className="btn ghost" onClick={() => setActiveTab('settings')}>Settings</button>
          </div>
          <p className="muted">Seneste status: {statusMessage || 'klar til test.'}</p>
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className="panel">
          <h2>Calendar (read-only)</h2>
          <div className="grid three">
            <label className="field">
              <span className="label">Dato</span>
              <input className="input" type="date" value={calendarDate} onChange={(event) => setCalendarDate(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Staff filter</span>
              <select className="select" value={calendarStaffId} onChange={(event) => setCalendarStaffId(event.target.value)}>
                <option value="">Alle</option>
                {staff.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="list">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                className={`list-card ${selectedBookingId === booking.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedBookingId(booking.id);
                  setActiveTab('details');
                }}
              >
                <div>
                  <strong>{formatDateTime(booking.startTime)}</strong>
                  <p className="muted">{booking.customerName || booking.customerId}</p>
                </div>
                <div className="list-meta">
                  <span>{booking.serviceName || booking.serviceId}</span>
                  <span>{booking.staffName || booking.staffId}</span>
                  <span>{booking.status}</span>
                  <span>{booking.paymentStatus || 'no payment'}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'create' && (
        <section className="panel">
          <h2>Create booking (test)</h2>
          <div className="grid three">
            <label className="field">
              <span className="label">Service</span>
              <select className="select" value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                <option value="">Vælg service</option>
                {services.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Staff</span>
              <select className="select" value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
                <option value="">Auto</option>
                {staff.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Eksisterende kunde</span>
              <select
                className="select"
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
              >
                <option value="">Ny kunde</option>
                {customers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}{entry.email ? ` • ${entry.email}` : ''}{entry.phone ? ` • ${entry.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Kunde</span>
              <input className="input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Email</span>
              <input className="input" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Telefon</span>
              <input className="input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Dato (availability)</span>
              <input
                className="input"
                type="date"
                value={availabilityDate}
                onChange={(event) => setAvailabilityDate(event.target.value)}
              />
            </label>
          </div>
          <button
            className="btn primary"
            onClick={() => {
              if (selectedServiceId) {
                loadAvailability(selectedServiceId, selectedStaffId || undefined);
              }
            }}
          >
            Find ledige slots
          </button>
          <div className="slot-grid">
            {availabilitySlots.map((slot) => (
              <button key={`${slot.staffId}-${slot.startUtc}`} className="slot" onClick={() => handleCreateBooking(slot.startUtc, slot.endUtc, slot.staffId)}>
                <strong>{new Date(slot.startUtc).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</strong>
                <span>{staffById.get(slot.staffId)?.name ?? 'Staff'}</span>
              </button>
            ))}
          </div>
          <div className="panel subtle">
            <h3>Custom tid</h3>
            <div className="grid three">
              <label className="field">
                <span className="label">Dato</span>
                <input className="input" type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
              </label>
              <label className="field">
                <span className="label">Tidspunkt</span>
                <input className="input" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
              </label>
              <label className="field">
                <span className="label">Medarbejder</span>
                <select className="select" value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
                  <option value="">Vælg staff</option>
                  {staff.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="btn ghost" onClick={handleCustomBooking}>Opret booking på custom tid</button>
          </div>
        </section>
      )}

      {activeTab === 'details' && (
        <section className="panel">
          <h2>Booking details</h2>
          <div className="grid two">
            <label className="field">
              <span className="label">Find booking by ID</span>
              <input className="input" value={bookingLookupId} onChange={(event) => setBookingLookupId(event.target.value)} />
            </label>
            <button className="btn ghost" onClick={handleLookupBooking}>Hent booking</button>
          </div>
          <label className="field">
            <span className="label">Booking</span>
            <select className="select" value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)}>
              <option value="">Vælg booking</option>
              {bookings.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.customerName || entry.customerId} • {formatDateTime(entry.startTime)}
                </option>
              ))}
            </select>
          </label>
          {selectedBookingId && (
            <div className="grid two">
              <div className="panel subtle">
                <h3>Details</h3>
                {(() => {
                  const booking = bookings.find((entry) => entry.id === selectedBookingId);
                  if (!booking) return null;
                  return (
                    <dl className="meta-grid">
                      <div>
                        <dt>Status</dt>
                        <dd>{booking.status}</dd>
                      </div>
                      <div>
                        <dt>Customer</dt>
                        <dd>{booking.customerName || booking.customerId}</dd>
                      </div>
                      <div>
                        <dt>Service</dt>
                        <dd>{booking.serviceName || booking.serviceId}</dd>
                      </div>
                      <div>
                        <dt>Staff</dt>
                        <dd>{booking.staffName || booking.staffId}</dd>
                      </div>
                      <div>
                        <dt>Payment</dt>
                        <dd>{bookingPayment || booking.paymentStatus || 'none'}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd>{formatCurrency(booking.totalAmount / 100, booking.currency)}</dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>
              <div className="panel subtle">
                <h3>Actions</h3>
                <div className="grid two">
                  <button className="btn ghost" onClick={handleCancelBooking}>Cancel booking</button>
                  <button className="btn ghost" onClick={handleForceConfirm}>Mark confirmed</button>
                </div>
                <div className="section">
                  <button
                    className="btn primary"
                    onClick={() => {
                      const booking = bookings.find((entry) => entry.id === selectedBookingId);
                      if (booking) {
                        loadAvailability(booking.serviceId, booking.staffId);
                      }
                    }}
                  >
                    Load reschedule slots
                  </button>
                  <div className="slot-grid">
                    {availabilitySlots.map((slot) => (
                      <button key={`${slot.staffId}-${slot.startUtc}-res`} className="slot" onClick={() => handleReschedule(slot.startUtc, slot.staffId)}>
                        <strong>{new Date(slot.startUtc).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</strong>
                        <span>{staffById.get(slot.staffId)?.name ?? 'Staff'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="panel">
          <h2>Settings</h2>
          <div className="grid two">
            <div className="panel subtle">
              <h3>Business hours</h3>
              <div className="hours-grid">
                {businessHours.map((entry, index) => (
                  <div key={entry.day} className="hours-row">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(event) => {
                          const next = [...businessHours];
                          next[index] = { ...entry, enabled: event.target.checked };
                          setBusinessHoursState(next);
                        }}
                      />
                      <span>{entry.day}</span>
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={entry.startTime}
                      onChange={(event) => {
                        const next = [...businessHours];
                        next[index] = { ...entry, startTime: event.target.value };
                        setBusinessHoursState(next);
                      }}
                    />
                    <input
                      className="input"
                      type="time"
                      value={entry.endTime}
                      onChange={(event) => {
                        const next = [...businessHours];
                        next[index] = { ...entry, endTime: event.target.value };
                        setBusinessHoursState(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button className="btn primary" onClick={handleSaveBusinessHours}>Gem åbningstider</button>
            </div>
            <div className="panel subtle">
              <h3>Staff</h3>
              <button className="btn ghost" onClick={handleCreateStaff}>+ Add staff</button>
              <div className="list">
                {staff.map((entry) => (
                  <div key={entry.id} className="list-card">
                    <div>
                      <strong>{entry.name}</strong>
                      <p className="muted">{entry.role}</p>
                    </div>
                    <div className="list-meta">
                      <select
                        className="select"
                        value={entry.role}
                        onChange={(event) => handleUpdateStaff(entry.id, 'role', event.target.value)}
                      >
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="staff">staff</option>
                      </select>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={entry.active}
                          onChange={(event) => handleUpdateStaff(entry.id, 'active', event.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel subtle">
              <h3>Services</h3>
              <button className="btn ghost" onClick={handleCreateService}>+ Add service</button>
              <div className="list">
                {services.map((entry) => (
                  <div key={entry.id} className="list-card">
                    <div>
                      <strong>{entry.name}</strong>
                      <p className="muted">{entry.durationMinutes} min</p>
                    </div>
                    <div className="list-meta">
                      <input
                        className="input small"
                        type="number"
                        value={entry.price}
                        onChange={(event) => handleUpdateService(entry.id, 'price', Number(event.target.value))}
                      />
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={entry.active}
                          onChange={(event) => handleUpdateService(entry.id, 'active', event.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel subtle">
              <h3>Staff services</h3>
              <label className="field">
                <span className="label">Choose staff</span>
                <select className="select" value={staffServicesTarget} onChange={(event) => setStaffServicesTarget(event.target.value)}>
                  <option value="">Vælg medarbejder</option>
                  {staff.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </label>
              <div className="pill-grid">
                {services.map((service) => (
                  <button
                    key={service.id}
                    className={`pill ${staffServicesSelection.includes(service.id) ? 'active' : ''}`}
                    onClick={() => handleStaffServiceToggle(service.id)}
                    disabled={!staffServicesTarget}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel subtle">
              <h3>Availability overrides</h3>
              <p className="muted">
                Brug dette til ferie, fridage eller andre blokeringer. Overrides skjuler tider i availability.
              </p>
              <label className="field">
                <span className="label">Staff</span>
                <select
                  className="select"
                  value={selectedStaffId}
                  onChange={(event) => {
                    setSelectedStaffId(event.target.value);
                    if (event.target.value) {
                      handleLoadTimeOff(event.target.value);
                    }
                  }}
                >
                  <option value="">Vælg medarbejder</option>
                  {staff.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid two">
                <label className="field">
                  <span className="label">Start</span>
                  <input className="input" type="datetime-local" value={timeOffStart} onChange={(event) => setTimeOffStart(event.target.value)} />
                </label>
                <label className="field">
                  <span className="label">End</span>
                  <input className="input" type="datetime-local" value={timeOffEnd} onChange={(event) => setTimeOffEnd(event.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Reason</span>
                  <input className="input" value={timeOffReason} onChange={(event) => setTimeOffReason(event.target.value)} />
                </label>
              </div>
              <button className="btn primary" onClick={handleCreateTimeOff} disabled={!selectedStaffId}>Add override</button>
              <div className="list">
                {timeOffEntries.map((entry) => (
                  <div key={entry.id} className="list-card">
                    <div>
                      <strong>{formatDateTime(entry.startTime)} → {formatDateTime(entry.endTime)}</strong>
                      <p className="muted">{entry.reason || 'override'}</p>
                    </div>
                    <button className="btn ghost" onClick={() => handleDeleteTimeOff(entry.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
