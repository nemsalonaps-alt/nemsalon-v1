import { useEffect, useMemo, useRef, useState } from 'react';
import {
  assignStaffServices,
  cancelBooking,
  createBooking,
  createBookingAccessToken,
  createCheckout,
  createCustomer,
  createService,
  createStaff,
  createStaffTimeOff,
  deleteStaffTimeOff,
  fetchAvailability,
  fetchDashboardData,
  fetchMe,
  getBooking,
  getBusinessHours,
  getPayment,
  getStaffWorkingHours,
  inviteStaff,
  listBookings,
  listCustomers,
  listServices,
  listStaff,
  listStaffServices,
  listStaffTimeOff,
  reconcilePayment,
  refundPayment,
  rescheduleBooking,
  setStaffWorkingHours,
  setBusinessHours,
  updateBookingStatus,
  updateCustomer,
  updateService,
  updateStaff
} from './api';
import { Gate } from '../onboarding/pages/Gate';
import type { GateState } from '../onboarding/types';
import { onAuthStateChange } from '../../lib/auth';
import { getCopy, getStoredLocale, setStoredLocale } from '../../i18n';
import { ConfirmDialog } from '@nemsalon/ui';
import { buildBookingConfirmationUrl, buildBookingManageUrl } from '../../lib/public-url';
import { LogoutButton } from '../auth/components/UnifiedLogin';
import type {
  AuthMeResponse,
  BookingSummary,
  BusinessHoursEntry,
  Customer,
  DashboardData,
  Service,
  StaffProfile,
  StaffTimeOff
} from './types';

type TabKey = 'home' | 'calendar' | 'create' | 'details' | 'settings';
type ConsoleGateState = GateState | 'ready';
type LiveEvent = {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
};

type ConfirmState = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  onConfirm: () => void;
  onConfirmWithReason?: (reason: string) => void;
};

type OwnerConsoleProps = {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
};

const initialHours: BusinessHoursEntry[] = [
  { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
  { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false }
];

function getLocaleTag() {
  return getStoredLocale() === 'da' ? 'da-DK' : 'en-US';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(getLocaleTag(), {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  });
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(getLocaleTag(), { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function toUtcIso(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return value.toISOString();
}

export function OwnerConsole({ initialMe = null, skipGate = false }: OwnerConsoleProps = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [gateState, setGateState] = useState<ConsoleGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe);
  const [notificationTest, setNotificationTest] = useState<LiveEvent | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [customerEditId, setCustomerEditId] = useState('');
  const [customerEdit, setCustomerEdit] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerStatus, setCustomerStatus] = useState('');
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
  const [staffHoursTarget, setStaffHoursTarget] = useState('');
  const [staffHoursWeekly, setStaffHoursWeekly] = useState<BusinessHoursEntry[]>(initialHours);
  const [staffHoursStatus, setStaffHoursStatus] = useState('');
  const [staffServicesSelection, setStaffServicesSelection] = useState<string[]>([]);
  const [staffServicesTarget, setStaffServicesTarget] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const copy = getCopy(me?.salon?.locale);

  const salonId = me?.primarySalonId ?? me?.salon?.id ?? '';

  const staffById = useMemo(() => new Map(staff.map((entry) => [entry.id, entry])), [staff]);
  const hydratedRef = useRef(false);

  function setNotificationTestBanner(label: string, detail?: string) {
    setNotificationTest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      detail,
      timestamp: new Date().toISOString()
    });
  }

  function openConfirm(state: ConfirmState) {
    setConfirmState(state);
  }

  function closeConfirm() {
    setConfirmState(null);
  }

  function confirmAction(
    state: Omit<ConfirmState, 'onConfirm'>,
    action: () => void | Promise<void>
  ) {
    openConfirm({
      ...state,
      onConfirm: () => {
        closeConfirm();
        void action();
      }
    });
  }

  function confirmActionWithReason(
    state: Omit<ConfirmState, 'onConfirm' | 'onConfirmWithReason'>,
    action: (reason: string) => void | Promise<void>
  ) {
    openConfirm({
      ...state,
      showReason: true,
      onConfirm: closeConfirm,
      onConfirmWithReason: (reason) => {
        closeConfirm();
        void action(reason);
      }
    });
  }

  async function refreshCustomers(limit = 200) {
    const customerResult = await listCustomers(limit);
    if (customerResult.ok) setCustomers(customerResult.data.data);
  }

  async function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError(null);
    const today = new Date().toISOString().slice(0, 10);
    const result = await fetchDashboardData(today);
    setDashboardLoading(false);
    if (!result.ok) {
      setDashboardError(result.error);
      return;
    }
    setDashboardData(result.data);
  }

  async function hydrateConsole(meData: AuthMeResponse) {
    setMe(meData);
    setGateState('ready');
    if (meData.salon?.locale) {
      setStoredLocale(meData.salon.locale);
    }
    setNotificationTestBanner('Console live', meData.salon?.name ?? undefined);
    const staffResult = await listStaff();
    if (staffResult.ok) setStaff(staffResult.data.data);
    const serviceResult = await listServices();
    if (serviceResult.ok) setServices(serviceResult.data.data);
    await refreshCustomers();
    if (meData.primarySalonId) {
      const hoursResult = await getBusinessHours(meData.primarySalonId);
      if (hoursResult.ok) setBusinessHoursState(hoursResult.data.weekly);
    }
  }

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
      if (hydratedRef.current) return;
      hydratedRef.current = true;
      await hydrateConsole(meResult.data);
    }
    load();
    return () => {
      active = false;
    };
  }, [gateState]);

  useEffect(() => {
    if (!skipGate || !initialMe || hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateConsole(initialMe);
  }, [skipGate, initialMe]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      hydratedRef.current = false;
      setGateState('checking');
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'home' && gateState === 'ready') {
      void loadDashboard();
    }
  }, [activeTab, gateState]);

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
      setStatusMessage(copy.console.validation.staff.serviceRequired);
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

  async function handleCreateBooking(slotStart: string, _slotEnd: string, staffId: string) {
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
      setCheckoutLink(null);
      return;
    }
    const slug = me?.salon?.slug ?? '';
    if (!slug) {
      setStatusMessage('Salon slug mangler. Gem salon-oplysninger først.');
      setCheckoutLink(null);
      return;
    }
    const tokenResult = await createBookingAccessToken(result.data.id);
    if (!tokenResult.ok) {
      setStatusMessage(`Kunne ikke skabe booking-token: ${tokenResult.error}`);
      setCheckoutLink(null);
      return;
    }
    const successUrl = buildBookingConfirmationUrl({
      salonSlug: slug,
      bookingId: result.data.id,
      token: tokenResult.data.bookingToken
    });
    const cancelUrl = buildBookingManageUrl({
      salonSlug: slug,
      bookingId: result.data.id,
      token: tokenResult.data.bookingToken
    });
    const checkout = await createCheckout({
      bookingId: result.data.id,
      successUrl,
      cancelUrl
    });
    if (!checkout.ok) {
      const hint =
        checkout.error.includes('config') || checkout.error.includes('CONFIG')
          ? ' (mangler betalings-setup eller mock mode)'
          : '';
      setStatusMessage(`Checkout fejlede: ${checkout.error}${hint}`);
      setCheckoutLink(null);
      return;
    }
    setStatusMessage('Booking oprettet. Klar til betaling.');
    setCheckoutLink(checkout.data.checkoutUrl);
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

  async function handleCancelBooking(reason?: string) {
    if (!selectedBookingId) return;
    const result = await cancelBooking(selectedBookingId, {
      reasonKey: 'owner.cancel',
      note: reason || undefined
    });
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

  async function handleRefundPayment(reason?: string) {
    const booking = bookings.find((entry) => entry.id === selectedBookingId);
    const paymentId = booking?.paymentId;
    if (!paymentId) {
      setStatusMessage(copy.console.paymentMissing);
      return;
    }
    const result = await refundPayment(paymentId, {
      idempotencyKey: `refund:${paymentId}`,
      reason
    });
    if (!result.ok) {
      setStatusMessage(copy.console.refundFailed);
      return;
    }
    setStatusMessage(result.data.idempotent ? copy.console.refundIdempotent : copy.console.refundSuccess);
    refreshBookings(calendarDate, calendarStaffId || undefined);
  }

  async function handleReconcilePayment() {
    const booking = bookings.find((entry) => entry.id === selectedBookingId);
    const paymentId = booking?.paymentId;
    if (!paymentId) {
      setStatusMessage(copy.console.paymentMissing);
      return;
    }
    const result = await reconcilePayment(paymentId);
    if (!result.ok) {
      setStatusMessage(copy.console.reconcileFailed);
      return;
    }
    setStatusMessage(
      result.data.action === 'updated' ? copy.console.reconcileUpdated : copy.console.reconcileNoop
    );
    refreshBookings(calendarDate, calendarStaffId || undefined);
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

  async function handleInviteStaff(entry: StaffProfile) {
    const email = prompt('Invite email?', entry.email ?? '');
    if (!email) return;
    const role = entry.role === 'admin' ? 'admin' : 'staff';
    const result = await inviteStaff(entry.id, { email, role });
    if (!result.ok) {
      setStatusMessage(`Invite fejlede: ${result.error}`);
      return;
    }
    setStaff((prev) => prev.map((item) => (item.id === entry.id ? result.data.staff : item)));
    const linkHint = result.data.actionLink ? ` (link: ${result.data.actionLink})` : '';
    setStatusMessage(`Invite sendt til ${result.data.email}.${linkHint}`);
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

  function resetCustomerForm() {
    setCustomerForm({ name: '', email: '', phone: '', notes: '' });
  }

  function handleSelectCustomer(customer: Customer) {
    setCustomerEditId(customer.id);
    setCustomerEdit({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      notes: customer.notes ?? ''
    });
  }

  async function handleCreateCustomer() {
    if (!customerForm.name.trim()) {
      setCustomerStatus('Navn er påkrævet.');
      return;
    }
    setCustomerBusy(true);
    setCustomerStatus('');
    const result = await createCustomer({
      name: customerForm.name.trim(),
      email: customerForm.email || undefined,
      phone: customerForm.phone || undefined,
      notes: customerForm.notes || undefined
    });
    setCustomerBusy(false);
    if (!result.ok) {
      setCustomerStatus(result.error);
      return;
    }
    resetCustomerForm();
    await refreshCustomers();
    setCustomerStatus('Kunde oprettet.');
  }

  async function handleUpdateCustomer() {
    if (!customerEditId) return;
    if (!customerEdit.name.trim()) {
      setCustomerStatus('Navn er påkrævet.');
      return;
    }
    setCustomerBusy(true);
    setCustomerStatus('');
    const result = await updateCustomer(customerEditId, {
      name: customerEdit.name.trim(),
      email: customerEdit.email || undefined,
      phone: customerEdit.phone || undefined,
      notes: customerEdit.notes || undefined
    });
    setCustomerBusy(false);
    if (!result.ok) {
      setCustomerStatus(result.error);
      return;
    }
    await refreshCustomers();
    setCustomerStatus('Kunde opdateret.');
  }

  async function handleLoadTimeOff(staffId: string) {
    const result = await listStaffTimeOff(staffId);
    if (result.ok) {
      setTimeOffEntries(result.data.data);
    }
  }

  async function handleLoadStaffWorkingHours(staffId: string) {
    setStaffHoursStatus('');
    const result = await getStaffWorkingHours(staffId);
    if (result.ok && result.data.weekly.length > 0) {
      setStaffHoursWeekly(result.data.weekly);
      return;
    }
    setStaffHoursWeekly(businessHours);
  }

  async function handleSaveStaffWorkingHours() {
    if (!staffHoursTarget) {
      setStaffHoursStatus('Vælg en medarbejder først.');
      return;
    }
    const result = await setStaffWorkingHours(staffHoursTarget, staffHoursWeekly);
    if (result.ok) {
      setStaffHoursStatus('Arbejdstider gemt.');
    } else {
      setStaffHoursStatus(result.error);
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
      <div className="live-bar">
        <div className="live-pill">LIVE</div>
        <div className="live-items">
          {notificationTest ? (
            <span key={notificationTest.id} className="live-item">
              <strong>{notificationTest.label}</strong>
              {notificationTest.detail ? ` — ${notificationTest.detail}` : ''}
              <em>
                {new Date(notificationTest.timestamp).toLocaleTimeString('da-DK', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </em>
            </span>
          ) : (
            <span className="live-empty">Notifikationstest ikke kørt endnu</span>
          )}
        </div>
      </div>
      <header className="console-header">
        <div>
          <p className="eyebrow">Owner Console v0</p>
          <h1>{me?.salon?.name ?? 'Salon'}</h1>
          <p className="muted">Status: {me?.salon?.status ?? 'draft'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="status-pill">
            <span>Setup</span>
            <strong>{setupCompleteness.staff} staff / {setupCompleteness.services} services / {setupCompleteness.hours} days</strong>
          </div>
          <LogoutButton />
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

      {statusMessage && (
        <div className="console-banner">
          <span>{statusMessage}</span>
          {checkoutLink && statusMessage.startsWith('Booking oprettet') && (
            <a className="btn primary" href={checkoutLink} target="_blank" rel="noreferrer">
              Åbn checkout
            </a>
          )}
        </div>
      )}

      {activeTab === 'home' && (
        <section className="panel dashboard">
          {/* KPI Boxes */}
          <div className="kpi-grid">
            {dashboardLoading ? (
              <>
                <div className="skeleton skeleton-box" />
                <div className="skeleton skeleton-box" />
                <div className="skeleton skeleton-box" />
                <div className="skeleton skeleton-box" />
              </>
            ) : dashboardData ? (
              <>
                <div className="kpi-box" onClick={() => setActiveTab('calendar')}>
                  <p className="kpi-box-title">{copy.console.dashboard.kpis.todayBookings}</p>
                  <p className="kpi-primary">{dashboardData.kpis.todayBookings.total}</p>
                  <p className="kpi-secondary">
                    {dashboardData.kpis.todayBookings.completed} {copy.console.dashboard.kpis.completed} · {dashboardData.kpis.todayBookings.remaining} {copy.console.dashboard.kpis.remaining}
                  </p>
                </div>
                <div className="kpi-box">
                  <p className="kpi-box-title">{copy.console.dashboard.kpis.todayRevenue}</p>
                  <p className="kpi-primary">
                    {dashboardData.kpis.todayRevenue.amount > 0
                      ? formatCurrency(dashboardData.kpis.todayRevenue.amount / 100, dashboardData.kpis.todayRevenue.currency)
                      : '0'}
                  </p>
                  <p className="kpi-secondary">
                    {dashboardData.kpis.todayRevenue.confirmedAmount > 0
                      ? `${formatCurrency(dashboardData.kpis.todayRevenue.confirmedAmount / 100, dashboardData.kpis.todayRevenue.currency)} ${copy.console.dashboard.kpis.confirmedAmount}`
                      : copy.console.dashboard.kpis.noRevenueYet}
                  </p>
                </div>
                <div className="kpi-box">
                  <p className="kpi-box-title">{copy.console.dashboard.kpis.upcomingBookings}</p>
                  <p className="kpi-primary">{dashboardData.kpis.upcoming.total}</p>
                  <p className="kpi-secondary">
                    {dashboardData.kpis.upcoming.nextBooking
                      ? `${copy.console.dashboard.kpis.nextBookingAt} ${new Date(dashboardData.kpis.upcoming.nextBooking.startTime).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </p>
                </div>
                <div
                  className={`kpi-box ${dashboardData.kpis.systemStatus === 'action-required' ? 'alert' : ''}`}
                  onClick={() => {
                    if (dashboardData.kpis.alerts[0]) setActiveTab('calendar');
                  }}
                >
                  <p className="kpi-box-title">{copy.console.dashboard.kpis.systemStatus}</p>
                  <p className="kpi-primary">
                    {dashboardData.kpis.systemStatus === 'healthy' ? copy.console.dashboard.kpis.allGood : copy.console.dashboard.kpis.actionRequired}
                  </p>
                  <p className="kpi-secondary">
                    {dashboardData.kpis.alerts[0]?.message ?? copy.console.dashboard.kpis.noIssues}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* Error State */}
          {dashboardError && (
            <div className="dashboard-error">
              <p>{copy.console.dashboard.error}</p>
              <button className="btn ghost" onClick={loadDashboard}>{copy.console.dashboard.retry}</button>
            </div>
          )}

          {/* Today's Bookings */}
          <div className="dashboard-section">
            <h2>{copy.console.dashboard.bookings.title}</h2>
            {dashboardLoading ? (
              <div className="booking-list">
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
              </div>
            ) : dashboardData && dashboardData.todayBookings.length > 0 ? (
              <div className="booking-list">
                {dashboardData.todayBookings
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((booking) => (
                    <div
                      key={booking.id}
                      className={`booking-row ${booking.status}`}
                      onClick={() => {
                        setSelectedBookingId(booking.id);
                        setActiveTab('details');
                      }}
                    >
                      <span className="booking-time">
                        {new Date(booking.startTime).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })} – {' '}
                        {new Date(booking.endTime).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="booking-customer">{booking.customerName || copy.console.dashboard.bookings.unknownCustomer}</span>
                      <span className="booking-service">{booking.serviceName || booking.serviceId}</span>
                      <span className="booking-staff">{booking.staffName || booking.staffId}</span>
                      <span className={`status-badge ${booking.status}`}>
                        {booking.status === 'confirmed' && copy.console.dashboard.bookings.status.confirmed}
                        {booking.status === 'in_progress' && copy.console.dashboard.bookings.status.in_progress}
                        {booking.status === 'completed' && copy.console.dashboard.bookings.status.completed}
                        {booking.status === 'no_show' && copy.console.dashboard.bookings.status.no_show}
                        {booking.status === 'cancelled' && copy.console.dashboard.bookings.status.cancelled}
                        {booking.status === 'pending' && copy.console.dashboard.bookings.status.pending}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>{copy.console.dashboard.bookings.emptyTitle}</h3>
                <p>{copy.console.dashboard.bookings.emptyBody}</p>
                <div className="empty-state-actions">
                  <button className="btn primary" onClick={() => setActiveTab('create')}>{copy.console.dashboard.bookings.createBooking}</button>
                  <button className="btn ghost" onClick={() => setActiveTab('calendar')}>{copy.console.dashboard.bookings.viewCalendar}</button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="quick-actions-primary">
              <button className="btn primary" onClick={() => setActiveTab('create')}>{copy.console.dashboard.quickActions.createManual}</button>
              <button className="btn ghost" onClick={() => setActiveTab('calendar')}>{copy.console.dashboard.quickActions.goToCalendar}</button>
              <button className="btn ghost" onClick={() => setActiveTab('settings')}>{copy.console.dashboard.quickActions.viewStaff}</button>
            </div>
            <div className="quick-actions-secondary">
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}>{copy.console.dashboard.quickActions.settings}</a>
              <a href="mailto:support@nemsalon.dk">{copy.console.dashboard.quickActions.support}</a>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className="panel calendar">
          {/* Topbar */}
          <div className="calendar-topbar">
            <div className="calendar-nav">
              <button className="btn ghost" onClick={() => {
                const d = new Date(calendarDate);
                d.setDate(d.getDate() - 1);
                setCalendarDate(d.toISOString().slice(0, 10));
              }}>←</button>
              <button className="btn ghost" onClick={() => setCalendarDate(new Date().toISOString().slice(0, 10))}>
                {copy.console.calendar.today}
              </button>
              <button className="btn ghost" onClick={() => {
                const d = new Date(calendarDate);
                d.setDate(d.getDate() + 1);
                setCalendarDate(d.toISOString().slice(0, 10));
              }}>→</button>
              <input
                type="date"
                className="calendar-date-input"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
              />
            </div>
            <div className="calendar-view-switch">
              <button className="active">{copy.console.calendar.dayView}</button>
              <button disabled>{copy.console.calendar.weekView}</button>
            </div>
            <button className="btn primary" onClick={() => setActiveTab('create')}>
              {copy.console.calendar.createBooking}
            </button>
          </div>

          {/* Main Calendar */}
          <div className="calendar-main">
            {/* Staff Column */}
            <div className="calendar-staff-column">
              <p className="calendar-staff-header">{copy.console.calendar.selectStaff}</p>
              <div className="calendar-staff-list">
                <div
                  className={`calendar-staff-item ${!calendarStaffId ? 'active' : ''}`}
                  onClick={() => setCalendarStaffId('')}
                >
                  <span className="calendar-staff-color" style={{ background: 'var(--accent)' }} />
                  <span className="calendar-staff-name calendar-staff-all">{copy.console.calendar.allStaff}</span>
                </div>
                {staff.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`calendar-staff-item ${calendarStaffId === s.id ? 'active' : ''}`}
                    onClick={() => setCalendarStaffId(s.id)}
                  >
                    <span
                      className="calendar-staff-color"
                      style={{ background: `hsl(${(idx * 60) % 360}, 60%, 45%)` }}
                    />
                    <span className="calendar-staff-name">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Grid */}
            <div className="calendar-grid-container">
              {(() => {
                // Generate time slots (7:00 - 20:00, 15 min intervals)
                const hours = [];
                for (let h = 7; h <= 20; h++) {
                  for (let m = 0; m < 60; m += 15) {
                    hours.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                  }
                }

                const filteredStaff = calendarStaffId
                  ? staff.filter((s) => s.id === calendarStaffId)
                  : staff;

                // Get business hours for the day
                const dayOfWeek = new Date(calendarDate).getDay();
                const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const dayName = dayNames[dayOfWeek];
                const todayHours = businessHours.find((h) => h.day.toLowerCase() === dayName);
                const isWithinBusinessHours = (time: string) => {
                  if (!todayHours?.enabled) return false;
                  return time >= todayHours.startTime && time < todayHours.endTime;
                };

                // Filter bookings for the day
                const dayBookings = bookings.filter((b) => {
                  const bookingDate = new Date(b.startTime).toISOString().slice(0, 10);
                  return bookingDate === calendarDate;
                });

                if (dayBookings.length === 0 && filteredStaff.length === 0) {
                  return (
                    <div className="calendar-empty">
                      <h3>{copy.console.calendar.noBookings}</h3>
                      <p>{copy.console.dashboard.bookings.emptyBody}</p>
                      <div className="calendar-empty-actions">
                        <button className="btn primary" onClick={() => setActiveTab('create')}>
                          {copy.console.calendar.createBooking}
                        </button>
                        <button className="btn ghost" onClick={() => setCalendarDate(new Date().toISOString().slice(0, 10))}>
                          {copy.console.calendar.goToToday}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="calendar-grid-header">
                      <div className="calendar-grid-time-label" />
                      {filteredStaff.map((s) => (
                        <div key={s.id} className="calendar-grid-staff-header">
                          {s.name}
                        </div>
                      ))}
                    </div>
                    <div className="calendar-grid-body">
                      <div className="calendar-grid-rows">
                        {hours.map((time, idx) => {
                          const inBusinessHours = isWithinBusinessHours(time);
                          const rowBookings = dayBookings.filter((b) => {
                            const bookingHour = Math.floor(new Date(b.startTime).getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
                            const slotHour = Math.floor(new Date(`${calendarDate}T${time}`).getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
                            return bookingHour === slotHour;
                          });

                          return (
                            <div
                              key={time}
                              className={`calendar-grid-row ${!inBusinessHours ? 'outside-hours' : ''}`}
                            >
                              {idx % 4 === 0 ? (
                                <div className="calendar-grid-time">{time}</div>
                              ) : (
                                <div className="calendar-grid-time" />
                              )}
                              {filteredStaff.map((s) => {
                                const staffBooking = rowBookings.find((b) => b.staffId === s.id);
                                return (
                                  <div key={s.id} className="calendar-grid-cell">
                                    {staffBooking && (
                                      <div
                                        className={`calendar-booking ${staffBooking.status}`}
                                        style={{
                                          height: `${(new Date(staffBooking.endTime).getTime() - new Date(staffBooking.startTime).getTime()) / (15 * 60 * 1000) * 40 - 2}px`,
                                          zIndex: 10
                                        }}
                                        onClick={() => {
                                          setSelectedBookingId(staffBooking.id);
                                          setActiveTab('details');
                                        }}
                                      >
                                        <div className="calendar-booking-time">
                                          {new Date(staffBooking.startTime).toLocaleTimeString('da-DK', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })} - {new Date(staffBooking.endTime).toLocaleTimeString('da-DK', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                        <div className="calendar-booking-customer">
                                          {staffBooking.customerName || copy.console.dashboard.bookings.unknownCustomer}
                                        </div>
                                        <div className="calendar-booking-service">
                                          {staffBooking.serviceName || staffBooking.serviceId}
                                        </div>
                                        <span className={`calendar-booking-status ${staffBooking.status}`}>
                                          {copy.console.dashboard.bookings.status[staffBooking.status as keyof typeof copy.console.dashboard.bookings.status] || staffBooking.status}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
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
                  <button
                    className="btn ghost"
                    onClick={() =>
                      confirmActionWithReason(
                        {
                          title: 'Annuller booking',
                          body: 'Skriv evt. en kort årsag til annulleringen (sendes med i booking-noten).',
                          reasonLabel: 'Årsag',
                          reasonPlaceholder: 'Fx kunden aflyste',
                          confirmLabel: 'Annuller booking'
                        },
                        handleCancelBooking
                      )
                    }
                  >
                    Cancel booking
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      confirmAction(
                        {
                          title: 'Bekræft booking',
                          body: 'Dette markerer bookingen som bekræftet.'
                        },
                        handleForceConfirm
                      )
                    }
                  >
                    Mark confirmed
                  </button>
                </div>
                <div className="grid two" style={{ marginTop: 12 }}>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      confirmActionWithReason(
                        {
                          title: 'Refundér betaling',
                          body: 'Angiv evt. en kort årsag til refunderingen (logges i audit).',
                          reasonLabel: 'Årsag',
                          reasonPlaceholder: 'Fx fejlbooking',
                          confirmLabel: 'Refundér'
                        },
                        handleRefundPayment
                      )
                    }
                  >
                    {copy.console.refundAction}
                  </button>
                  <button className="btn ghost" onClick={handleReconcilePayment}>
                    {copy.console.reconcileAction}
                  </button>
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
                      <button
                        key={`${slot.staffId}-${slot.startUtc}-res`}
                        className="slot"
                        onClick={() =>
                          confirmAction(
                            {
                              title: 'Flyt booking',
                              body: `Flyt bookingen til ${new Date(slot.startUtc).toLocaleTimeString('da-DK', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}?`
                            },
                            () => handleReschedule(slot.startUtc, slot.staffId)
                          )
                        }
                      >
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
                      {entry.email && <p className="muted">{entry.email}</p>}
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
                      <button className="btn ghost" type="button" onClick={() => handleInviteStaff(entry)}>
                        Invite login
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel subtle">
              <h3>Staff arbejdstider</h3>
              <label className="field">
                <span className="label">Vælg medarbejder</span>
                <select
                  className="select"
                  value={staffHoursTarget}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStaffHoursTarget(value);
                    if (value) {
                      handleLoadStaffWorkingHours(value);
                    }
                  }}
                >
                  <option value="">Vælg medarbejder</option>
                  {staff.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </label>
              <div className="hours-grid">
                {staffHoursWeekly.map((entry, index) => (
                  <div key={`${entry.day}-${index}`} className="hours-row">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(event) => {
                          const next = [...staffHoursWeekly];
                          next[index] = { ...entry, enabled: event.target.checked };
                          setStaffHoursWeekly(next);
                        }}
                      />
                      <span>{entry.day}</span>
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={entry.startTime}
                      onChange={(event) => {
                        const next = [...staffHoursWeekly];
                        next[index] = { ...entry, startTime: event.target.value };
                        setStaffHoursWeekly(next);
                      }}
                    />
                    <input
                      className="input"
                      type="time"
                      value={entry.endTime}
                      onChange={(event) => {
                        const next = [...staffHoursWeekly];
                        next[index] = { ...entry, endTime: event.target.value };
                        setStaffHoursWeekly(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn primary" onClick={handleSaveStaffWorkingHours} disabled={!staffHoursTarget}>
                  Gem arbejdstider
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setStaffHoursWeekly(businessHours)}
                  disabled={!staffHoursTarget}
                >
                  Brug salon timer
                </button>
              </div>
              {staffHoursStatus && <div className="note">{staffHoursStatus}</div>}
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
              <h3>Kunder</h3>
              <div className="grid two">
                <label className="field">
                  <span className="label">Navn</span>
                  <input
                    className="input"
                    value={customerForm.name}
                    onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="label">Email</span>
                  <input
                    className="input"
                    value={customerForm.email}
                    onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="label">Telefon</span>
                  <input
                    className="input"
                    value={customerForm.phone}
                    onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </label>
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span className="label">Noter</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={customerForm.notes}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
              <div className="btn-row">
                <button className="btn primary" onClick={handleCreateCustomer} disabled={customerBusy}>
                  Opret kunde
                </button>
                <button className="btn ghost" onClick={resetCustomerForm} disabled={customerBusy}>
                  Nulstil
                </button>
              </div>
              {customerStatus && <div className="note">{customerStatus}</div>}
              <div className="list">
                {customers.map((customer) => (
                  <div key={customer.id} className="list-card">
                    <div>
                      <strong>{customer.name}</strong>
                      <p className="muted">
                        {customer.email || '—'}{customer.phone ? ` · ${customer.phone}` : ''}
                      </p>
                      {customer.notes && <p className="muted">{customer.notes}</p>}
                    </div>
                    <div className="list-meta">
                      <button className="btn ghost" type="button" onClick={() => handleSelectCustomer(customer)}>
                        Redigér
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {customerEditId && (
                <div className="panel" style={{ marginTop: 16 }}>
                  <h4>Redigér kunde</h4>
                  <div className="grid two">
                    <label className="field">
                      <span className="label">Navn</span>
                      <input
                        className="input"
                        value={customerEdit.name}
                        onChange={(event) => setCustomerEdit((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Email</span>
                      <input
                        className="input"
                        value={customerEdit.email}
                        onChange={(event) => setCustomerEdit((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Telefon</span>
                      <input
                        className="input"
                        value={customerEdit.phone}
                        onChange={(event) => setCustomerEdit((prev) => ({ ...prev, phone: event.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span className="label">Noter</span>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={customerEdit.notes}
                      onChange={(event) => setCustomerEdit((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </label>
                  <div className="btn-row">
                    <button className="btn primary" onClick={handleUpdateCustomer} disabled={customerBusy}>
                      Gem ændringer
                    </button>
                    <button className="btn ghost" onClick={() => setCustomerEditId('')} disabled={customerBusy}>
                      Luk
                    </button>
                  </div>
                </div>
              )}
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
                    <button
                      className="btn ghost"
                      onClick={() =>
                        confirmAction(
                          {
                            title: 'Fjern override',
                            body: 'Er du sikker på, at du vil fjerne denne override?'
                          },
                          () => handleDeleteTimeOff(entry.id)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        showReason={confirmState?.showReason}
        reasonLabel={confirmState?.reasonLabel}
        reasonPlaceholder={confirmState?.reasonPlaceholder}
        reasonRequired={confirmState?.reasonRequired}
        onConfirm={() => confirmState?.onConfirm()}
        onConfirmWithReason={confirmState?.onConfirmWithReason}
        onCancel={closeConfirm}
      />
    </div>
  );
}
