import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getStoredLocale, setStoredLocale, getCopy } from '../../../i18n';
import { onAuthStateChange } from '../../../lib/auth';
import { buildBookingConfirmationUrl, buildBookingManageUrl } from '../../../lib/public-url';
import { toLocalDateInputValue } from '../../../lib/dates';
import {
  addDaysToDateKey,
  getMonthEndDateKey,
  getMonthStartDateKey,
  getTodayDateKey,
  getWeekStartDateKey,
  toUtcIsoInTimeZone,
} from '../../../lib/timezone';
import type {
  AuthMeResponse,
  BookingSummary,
  BusinessHoursEntry,
  Customer,
  DashboardData,
  Service,
  StaffProfile,
  StaffTimeOff,
  AvailabilitySlot,
} from '../types';
import * as api from '../api';

export type TabKey = 'overview' | 'calendar' | 'customers' | 'services-team' | 'money';
export type ConsoleGateState = 'checking' | 'recovering' | 'needs-login' | 'error' | 'ready';
type CalendarView = 'day' | 'week' | 'month';

export type ConfirmState = {
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

export type LiveEvent = {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
};

export type PromptState = {
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  type?: 'create-staff' | 'invite-staff' | 'create-service';
  staffEntry?: StaffProfile;
};

export function useConsole(initialMe?: AuthMeResponse | null, skipGate = false) {
  // === Gate & Auth ===
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [gateState, setGateState] = useState<ConsoleGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe ?? null);
  const [notificationTest, setNotificationTest] = useState<LiveEvent | null>(null);
  const hydratedRef = useRef(false);

  // === Data ===
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [businessHours, setBusinessHoursState] = useState<BusinessHoursEntry[]>([]);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [businessHoursLoading, setBusinessHoursLoading] = useState(false);
  const [businessHoursError, setBusinessHoursError] = useState<string | null>(null);

  // === Dashboard ===
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // === Calendar ===
  const [calendarDate, setCalendarDate] = useState(() => toLocalDateInputValue());
  const [calendarView, setCalendarView] = useState<CalendarView>('day');
  const [calendarStaffId, setCalendarStaffId] = useState<string>('');

  // === Booking Creation ===
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(() => toLocalDateInputValue());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(() => toLocalDateInputValue());
  const [customTime, setCustomTime] = useState('09:00');
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);

  // === Booking Details ===
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [bookingLookupId, setBookingLookupId] = useState('');
  const [bookingPayment, setBookingPayment] = useState('');

  // === Customer Management ===
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [customerEditId, setCustomerEditId] = useState('');
  const [customerEdit, setCustomerEdit] = useState({ name: '', email: '', phone: '', notes: '' });
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerStatus, setCustomerStatus] = useState('');

  // === Staff Settings ===
  const [staffHoursTarget, setStaffHoursTarget] = useState('');
  const [staffHoursWeekly, setStaffHoursWeekly] = useState<BusinessHoursEntry[]>(businessHours);
  const [staffHoursStatus, setStaffHoursStatus] = useState('');
  const [staffHoursLoading, setStaffHoursLoading] = useState(false);
  const [staffHoursError, setStaffHoursError] = useState<string | null>(null);
  const [staffServicesSelection, setStaffServicesSelection] = useState<string[]>([]);
  const [staffServicesTarget, setStaffServicesTarget] = useState('');

  // === Time Off ===
  const [timeOffEntries, setTimeOffEntries] = useState<StaffTimeOff[]>([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [timeOffError, setTimeOffError] = useState<string | null>(null);
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');

  // === UI State ===
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [stripeStatus, setStripeStatus] = useState<api.StripeConnectStatus | null>(null);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeActionLoading, setStripeActionLoading] = useState(false);
  const [stripeStatusError, setStripeStatusError] = useState('');

  // === Derived Values ===
  const salonId = me?.primarySalonId ?? me?.salon?.id ?? '';
  const timeZone = me?.salon?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const copy = getCopy(me?.salon?.locale);
  const messages = copy.console.messages;
  const prompts = copy.console.prompts;

  const setupCompleteness = {
    staff: staff.length,
    services: services.length,
    hours: businessHours.filter((e) => e.enabled).length,
  };

  const initialDateRef = useRef(toLocalDateInputValue());
  const calendarHydratedRef = useRef(false);

  useEffect(() => {
    if (calendarHydratedRef.current || !me?.salon?.timezone) return;
    if (calendarDate !== initialDateRef.current) return;
    const today = getTodayDateKey(timeZone);
    setCalendarDate(today);
    setAvailabilityDate(today);
    setCustomDate(today);
    calendarHydratedRef.current = true;
  }, [me?.salon?.timezone, timeZone, calendarDate]);

  // === Helper Functions ===
  const resolveAlertMessage = useCallback(
    (message: string) => {
      if (message.startsWith('__PENDING_PAYMENTS__:')) {
        const count = Number(message.split(':')[1] ?? 0);
        const plural = count === 1 ? '' : 's';
        return messages.pendingPayments
          .replace('{count}', String(count))
          .replace('{plural}', plural);
      }
      return message;
    },
    [messages.pendingPayments],
  );

  const setNotificationTestBanner = useCallback(
    (label: string, detail?: string) => {
      setNotificationTest({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: resolveAlertMessage(label),
        detail: detail ? resolveAlertMessage(detail) : detail,
        timestamp: new Date().toISOString(),
      });
    },
    [resolveAlertMessage],
  );

  const openConfirm = useCallback((state: ConfirmState) => {
    setConfirmState(state);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const confirmAction = useCallback(
    (state: Omit<ConfirmState, 'onConfirm'>, action: () => void | Promise<void>) => {
      openConfirm({
        ...state,
        onConfirm: () => {
          closeConfirm();
          void action();
        },
      });
    },
    [openConfirm, closeConfirm],
  );

  const confirmActionWithReason = useCallback(
    (
      state: Omit<ConfirmState, 'onConfirm' | 'onConfirmWithReason'>,
      action: (reason: string) => void | Promise<void>,
    ) => {
      openConfirm({
        ...state,
        showReason: true,
        onConfirm: closeConfirm,
        onConfirmWithReason: (reason) => {
          closeConfirm();
          void action(reason);
        },
      });
    },
    [openConfirm, closeConfirm],
  );

  const openPrompt = useCallback((state: PromptState) => {
    setPromptState(state);
  }, []);

  const closePrompt = useCallback(() => {
    setPromptState(null);
  }, []);

  // === Data Loading Functions ===
  const refreshCustomers = useCallback(async (limit = 200) => {
    setCustomersLoading(true);
    setCustomersError(null);
    const res = await api.listCustomers(limit);
    setCustomersLoading(false);
    if (res.ok) {
      setCustomers(res.data.data);
    } else {
      setCustomersError(res.error);
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    const res = await api.listStaff();
    setStaffLoading(false);
    if (res.ok) {
      setStaff(res.data.data);
    } else {
      setStaffError(res.error);
    }
  }, []);

  const refreshServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    const res = await api.listServices();
    setServicesLoading(false);
    if (res.ok) {
      setServices(res.data.data);
    } else {
      setServicesError(res.error);
    }
  }, []);

  const refreshBusinessHours = useCallback(async () => {
    if (!salonId) return;
    setBusinessHoursLoading(true);
    setBusinessHoursError(null);
    const res = await api.getBusinessHours(salonId);
    setBusinessHoursLoading(false);
    if (res.ok) {
      setBusinessHoursState(res.data.weekly);
    } else {
      setBusinessHoursError(res.error);
    }
  }, [salonId]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    const today = getTodayDateKey(timeZone);
    const res = await api.fetchDashboardData(today);
    setDashboardLoading(false);
    if (!res.ok) {
      setDashboardError(res.error);
      return;
    }
    if (res.data?.kpis?.alerts?.length) {
      setDashboardData({
        ...res.data,
        kpis: {
          ...res.data.kpis,
          alerts: res.data.kpis.alerts.map((alert) => ({
            ...alert,
            message: resolveAlertMessage(alert.message),
          })),
        },
      });
      return;
    }
    setDashboardData(res.data);
  }, [timeZone]);

  const hydrateConsole = useCallback(
    async (meData: AuthMeResponse) => {
      setMe(meData);
      setGateState('ready');
      if (meData.salon?.locale) {
        setStoredLocale(meData.salon.locale);
      }
      setNotificationTestBanner(copy.console.labels.consoleLive, meData.salon?.name ?? undefined);

      await Promise.all([refreshStaff(), refreshServices()]);
      await refreshCustomers();

      if (meData.primarySalonId) {
        await refreshBusinessHours();
      }
    },
    [
      refreshCustomers,
      refreshStaff,
      refreshServices,
      refreshBusinessHours,
      setNotificationTestBanner,
    ],
  );

  const refreshBookings = useCallback(
    async (date: string, staffId?: string) => {
      if (!date || !salonId) return;
      setBookingsLoading(true);
      setBookingsError(null);
      let fromUtc: string;
      let toUtc: string;

      if (calendarView === 'week') {
        const weekStart = getWeekStartDateKey(date);
        const weekEnd = addDaysToDateKey(weekStart, 6);
        fromUtc = toUtcIsoInTimeZone(weekStart, timeZone, { hours: 0, minutes: 0, seconds: 0 });
        toUtc = toUtcIsoInTimeZone(weekEnd, timeZone, {
          hours: 23,
          minutes: 59,
          seconds: 59,
          ms: 999,
        });
      } else if (calendarView === 'month') {
        const monthStart = getMonthStartDateKey(date);
        const monthEnd = getMonthEndDateKey(date);
        fromUtc = toUtcIsoInTimeZone(monthStart, timeZone, { hours: 0, minutes: 0, seconds: 0 });
        toUtc = toUtcIsoInTimeZone(monthEnd, timeZone, {
          hours: 23,
          minutes: 59,
          seconds: 59,
          ms: 999,
        });
      } else {
        fromUtc = toUtcIsoInTimeZone(date, timeZone, { hours: 0, minutes: 0, seconds: 0 });
        toUtc = toUtcIsoInTimeZone(date, timeZone, {
          hours: 23,
          minutes: 59,
          seconds: 59,
          ms: 999,
        });
      }
      const limit = calendarView === 'month' ? 500 : calendarView === 'week' ? 250 : 100;
      const res = await api.listBookings({
        from: fromUtc,
        to: toUtc,
        staffId,
        limit,
      });
      setBookingsLoading(false);
      if (res.ok) {
        setBookings(res.data.data);
      } else {
        setBookingsError(res.error);
      }
    },
    [salonId, calendarView, timeZone],
  );

  const loadAvailability = useCallback(
    async (serviceId: string, staffId?: string) => {
      if (!availabilityDate) return;
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      const res = await api.fetchAvailability({
        serviceId,
        staffId,
        fromUtc: toUtcIsoInTimeZone(availabilityDate, timeZone, {
          hours: 0,
          minutes: 0,
          seconds: 0,
        }),
        days: 1,
        limit: 64,
        intervalMinutes: 15,
      });
      if (res.ok) {
        setAvailabilitySlots(res.data.slots);
      } else {
        setAvailabilityError(res.error);
        setAvailabilitySlots([]);
        setStatusMessage(messages.availabilityError.replace('{error}', res.error));
      }
      setAvailabilityLoading(false);
    },
    [availabilityDate, timeZone],
  );

  const refreshStaffServices = useCallback(async () => {
    if (!staffServicesTarget) return;
    const res = await api.listStaffServices(staffServicesTarget);
    if (res.ok) setStaffServicesSelection(res.data.serviceIds);
  }, [staffServicesTarget]);

  // === Action Handlers ===
  const handleCreateBooking = useCallback(
    async (slotStart: string, _slotEnd: string, staffId: string) => {
      if (!selectedServiceId) return;
      if (!selectedCustomerId && !customerName.trim()) {
        setStatusMessage(messages.addCustomerOrSelect);
        return;
      }

      const resolvedCustomerId =
        selectedCustomerId && selectedCustomerId !== '__new__' ? selectedCustomerId : undefined;

      const res = await api.createBooking({
        staffId,
        serviceId: selectedServiceId,
        startUtc: slotStart,
        customerId: resolvedCustomerId,
        customer: resolvedCustomerId
          ? undefined
          : { name: customerName, email: customerEmail, phone: customerPhone },
      });

      if (!res.ok) {
        setStatusMessage(messages.bookingFailed.replace('{error}', res.error));
        setCheckoutLink(null);
        return;
      }

      const slug = me?.salon?.slug ?? '';
      if (!slug) {
        setStatusMessage(messages.missingSalonSlug);
        setCheckoutLink(null);
        return;
      }

      const tokenRes = await api.createBookingAccessToken(res.data.id);
      if (!tokenRes.ok) {
        setStatusMessage(messages.bookingTokenFailed.replace('{error}', tokenRes.error));
        setCheckoutLink(null);
        return;
      }

      const successUrl = buildBookingConfirmationUrl({
        salonSlug: slug,
        bookingId: res.data.id,
        token: tokenRes.data.bookingToken,
      });
      const cancelUrl = buildBookingManageUrl({
        salonSlug: slug,
        bookingId: res.data.id,
        token: tokenRes.data.bookingToken,
      });

      const checkout = await api.createCheckout({
        bookingId: res.data.id,
        successUrl,
        cancelUrl,
      });

      if (!checkout.ok) {
        const hint =
          checkout.error.includes('config') || checkout.error.includes('CONFIG')
            ? messages.checkoutMissingConfigHint
            : '';
        setStatusMessage(
          messages.checkoutFailed.replace('{error}', checkout.error).replace('{hint}', hint),
        );
        setCheckoutLink(null);
        return;
      }

      setStatusMessage(messages.bookingCreatedReady);
      setCheckoutLink(checkout.data.checkoutUrl);
    },
    [
      selectedServiceId,
      selectedCustomerId,
      customerName,
      customerEmail,
      customerPhone,
      me?.salon?.slug,
    ],
  );

  const handleCustomBooking = useCallback(async () => {
    if (!selectedServiceId) {
      setStatusMessage(messages.selectServiceFirst);
      return;
    }
    if (!selectedStaffId) {
      setStatusMessage(messages.selectStaffForCustom);
      return;
    }
    if (!customDate || !customTime) {
      setStatusMessage(messages.selectDateTime);
      return;
    }
    const [hours = 0, minutes = 0] = customTime.split(':').map((part) => Number(part));
    const startUtc = toUtcIsoInTimeZone(customDate, timeZone, {
      hours,
      minutes,
      seconds: 0,
    });
    await handleCreateBooking(startUtc, startUtc, selectedStaffId);
  }, [selectedServiceId, selectedStaffId, customDate, customTime, handleCreateBooking, timeZone]);

  const handleLookupBooking = useCallback(async () => {
    if (!bookingLookupId.trim()) return;
    const res = await api.getBooking(bookingLookupId.trim());
    if (!res.ok) {
      setStatusMessage(messages.fetchBookingFailed.replace('{error}', res.error));
      return;
    }
    setBookings((prev) => {
      const exists = prev.some((b) => b.id === res.data.id);
      return exists ? prev : [res.data, ...prev];
    });
    setSelectedBookingId(res.data.id);
    setActiveTab('calendar');
  }, [bookingLookupId]);

  const handleCancelBooking = useCallback(
    async (reason?: string) => {
      if (!selectedBookingId) return;
      const res = await api.cancelBooking(selectedBookingId, {
        reasonKey: 'owner.cancel',
        note: reason || undefined,
      });
      if (res.ok) {
        setStatusMessage(messages.bookingCancelled);
        refreshBookings(calendarDate, calendarStaffId || undefined);
      } else {
        setStatusMessage(res.error);
      }
    },
    [selectedBookingId, calendarDate, calendarStaffId, calendarView, refreshBookings],
  );

  const handleReschedule = useCallback(
    async (slotStart: string, staffId: string) => {
      if (!selectedBookingId) return;
      const res = await api.rescheduleBooking(selectedBookingId, { staffId, startUtc: slotStart });
      if (res.ok) {
        setStatusMessage(messages.bookingRescheduled);
        refreshBookings(calendarDate, calendarStaffId || undefined);
      } else {
        setStatusMessage(res.error);
      }
    },
    [selectedBookingId, calendarDate, calendarStaffId, calendarView, refreshBookings],
  );

  const handleForceConfirm = useCallback(async () => {
    if (!selectedBookingId) return;
    const res = await api.updateBookingStatus(selectedBookingId, 'confirmed');
    if (res.ok) {
      setStatusMessage(messages.bookingConfirmed);
      refreshBookings(calendarDate, calendarStaffId || undefined);
    } else {
      setStatusMessage(res.error);
    }
  }, [selectedBookingId, calendarDate, calendarStaffId, calendarView, refreshBookings]);

  const handleRefundPayment = useCallback(
    async (reason?: string) => {
      const booking = bookings.find((b) => b.id === selectedBookingId);
      const paymentId = booking?.paymentId;
      if (!paymentId) {
        setStatusMessage(copy.console.paymentMissing);
        return;
      }
      const res = await api.refundPayment(paymentId, {
        idempotencyKey: `refund:${paymentId}`,
        reason,
      });
      if (!res.ok) {
        setStatusMessage(copy.console.refundFailed);
        return;
      }
      setStatusMessage(
        res.data.idempotent ? copy.console.refundIdempotent : copy.console.refundSuccess,
      );
      refreshBookings(calendarDate, calendarStaffId || undefined);
    },
    [
      bookings,
      selectedBookingId,
      copy,
      calendarDate,
      calendarStaffId,
      calendarView,
      refreshBookings,
    ],
  );

  const handleReconcilePayment = useCallback(async () => {
    const booking = bookings.find((b) => b.id === selectedBookingId);
    const paymentId = booking?.paymentId;
    if (!paymentId) {
      setStatusMessage(copy.console.paymentMissing);
      return;
    }
    const res = await api.reconcilePayment(paymentId);
    if (!res.ok) {
      setStatusMessage(copy.console.reconcileFailed);
      return;
    }
    setStatusMessage(
      res.data.action === 'updated' ? copy.console.reconcileUpdated : copy.console.reconcileNoop,
    );
    refreshBookings(calendarDate, calendarStaffId || undefined);
  }, [
    bookings,
    selectedBookingId,
    copy,
    calendarDate,
    calendarStaffId,
    calendarView,
    refreshBookings,
  ]);

  const handleSaveBusinessHours = useCallback(async () => {
    if (!salonId) return;
    const res = await api.setBusinessHours(salonId, businessHours);
    if (res.ok) {
      setStatusMessage(messages.businessHoursSaved);
    } else {
      setStatusMessage(res.error);
    }
  }, [salonId, businessHours]);

  const handleCreateStaff = useCallback(() => {
    openPrompt({
      title: prompts.createStaffTitle,
      label: prompts.staffName,
      submitLabel: prompts.create,
      onSubmit: async (name) => {
        const res = await api.createStaff({ name, role: 'staff', active: true });
        if (res.ok) {
          setStaff((prev) => [...prev, res.data]);
        }
      },
      type: 'create-staff',
    });
  }, [prompts.createStaffTitle, prompts.staffName, prompts.create]);

  const handleInviteStaff = useCallback(
    (entry: StaffProfile) => {
      openPrompt({
        title: prompts.inviteStaffTitle,
        label: prompts.inviteEmail,
        defaultValue: entry.email ?? '',
        submitLabel: prompts.sendInvite,
        onSubmit: async (email) => {
          const role = entry.role === 'admin' ? 'admin' : 'staff';
          const res = await api.inviteStaff(entry.id, { email, role });
          if (!res.ok) {
            setStatusMessage(messages.inviteFailed.replace('{error}', res.error));
            return;
          }
          setStaff((prev) => prev.map((s) => (s.id === entry.id ? res.data.staff : s)));
          const linkHint = res.data.actionLink
            ? messages.inviteLinkHint.replace('{link}', res.data.actionLink)
            : '';
          setStatusMessage(
            messages.inviteSent.replace('{email}', res.data.email).replace('{linkHint}', linkHint),
          );
        },
        type: 'invite-staff',
        staffEntry: entry,
      });
    },
    [prompts.inviteStaffTitle, prompts.inviteEmail, prompts.sendInvite, messages],
  );

  const handleCreateService = useCallback(() => {
    openPrompt({
      title: prompts.createServiceTitle,
      label: prompts.serviceName,
      submitLabel: prompts.create,
      onSubmit: async (name) => {
        const res = await api.createService({
          name,
          durationMinutes: 60,
          bufferMinutes: 0,
          price: 45000,
          currency: me?.salon?.currency ?? 'DKK',
          active: true,
        });
        if (res.ok) {
          setServices((prev) => [...prev, res.data]);
        }
      },
      type: 'create-service',
    });
  }, [prompts.createServiceTitle, prompts.serviceName, prompts.create, me?.salon?.currency]);

  const handleUpdateStaff = useCallback(
    async (staffId: string, key: keyof StaffProfile, value: string | boolean) => {
      const payload = { [key]: value } as Partial<StaffProfile>;
      const res = await api.updateStaff(staffId, payload);
      if (res.ok) {
        setStaff((prev) => prev.map((s) => (s.id === staffId ? res.data : s)));
      }
    },
    [],
  );

  const handleUpdateService = useCallback(
    async (serviceId: string, key: keyof Service, value: string | number | boolean) => {
      const payload = { [key]: value } as Partial<Service>;
      const res = await api.updateService(serviceId, payload);
      if (res.ok) {
        setServices((prev) => prev.map((s) => (s.id === serviceId ? res.data : s)));
      }
    },
    [],
  );

  const handleStaffServiceToggle = useCallback(
    async (serviceId: string) => {
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
        const res = await api.assignStaffServices(staffServicesTarget, next);
        if (!res.ok) {
          setStatusMessage(messages.saveServicesFailed.replace('{error}', res.error));
          setStaffServicesSelection(current);
          await refreshStaffServices();
        }
      }
    },
    [
      staffServicesSelection,
      staffServicesTarget,
      copy.console.validation.staff.serviceRequired,
      refreshStaffServices,
    ],
  );

  const resetCustomerForm = useCallback(() => {
    setCustomerForm({ name: '', email: '', phone: '', notes: '' });
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setCustomerEditId(customer.id);
    setCustomerEdit({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      notes: customer.notes ?? '',
    });
  }, []);

  const handleCreateCustomer = useCallback(async () => {
    if (!customerForm.name.trim()) {
      setCustomerStatus(messages.customerNameRequired);
      return;
    }
    setCustomerBusy(true);
    setCustomerStatus('');
    const res = await api.createCustomer({
      name: customerForm.name.trim(),
      email: customerForm.email || undefined,
      phone: customerForm.phone || undefined,
      notes: customerForm.notes || undefined,
    });
    setCustomerBusy(false);
    if (!res.ok) {
      setCustomerStatus(res.error);
      return;
    }
    resetCustomerForm();
    await refreshCustomers();
    setCustomerStatus(messages.customerCreated);
  }, [customerForm, refreshCustomers, resetCustomerForm]);

  const handleUpdateCustomer = useCallback(async () => {
    if (!customerEditId) return;
    if (!customerEdit.name.trim()) {
      setCustomerStatus(messages.customerNameRequired);
      return;
    }
    setCustomerBusy(true);
    setCustomerStatus('');
    const res = await api.updateCustomer(customerEditId, {
      name: customerEdit.name.trim(),
      email: customerEdit.email || undefined,
      phone: customerEdit.phone || undefined,
      notes: customerEdit.notes || undefined,
    });
    setCustomerBusy(false);
    if (!res.ok) {
      setCustomerStatus(res.error);
      return;
    }
    await refreshCustomers();
    setCustomerStatus(messages.customerUpdated);
  }, [customerEditId, customerEdit, refreshCustomers]);

  const handleLoadTimeOff = useCallback(async (staffId: string) => {
    setTimeOffLoading(true);
    setTimeOffError(null);
    const res = await api.listStaffTimeOff(staffId);
    setTimeOffLoading(false);
    if (res.ok) {
      setTimeOffEntries(res.data.data);
    } else {
      setTimeOffError(res.error);
    }
  }, []);

  const handleLoadStaffWorkingHours = useCallback(async (staffId: string) => {
    setStaffHoursStatus('');
    setStaffHoursLoading(true);
    setStaffHoursError(null);
    const res = await api.getStaffWorkingHours(staffId);
    if (res.ok && res.data.weekly.length > 0) {
      setStaffHoursWeekly(res.data.weekly);
      setStaffHoursLoading(false);
      return;
    }
    // If no staff hours defined, use default hours (will be set by parent)
    if (!res.ok) {
      setStaffHoursError(res.error);
    }
    setStaffHoursLoading(false);
  }, []);

  const handleSaveStaffWorkingHours = useCallback(async () => {
    if (!staffHoursTarget) {
      setStaffHoursStatus(messages.staffRequiredFirst);
      return;
    }
    const res = await api.setStaffWorkingHours(staffHoursTarget, staffHoursWeekly);
    if (res.ok) {
      setStaffHoursStatus(messages.staffHoursSaved);
    } else {
      setStaffHoursStatus(res.error);
    }
  }, [staffHoursTarget, staffHoursWeekly]);

  const handleCreateTimeOff = useCallback(async () => {
    if (!selectedStaffId || !timeOffStart || !timeOffEnd) return;
    const res = await api.createStaffTimeOff(selectedStaffId, {
      startUtc: new Date(timeOffStart).toISOString(),
      endUtc: new Date(timeOffEnd).toISOString(),
      reason: timeOffReason || undefined,
    });
    if (res.ok) {
      setTimeOffEntries((prev) => [...prev, res.data]);
      setTimeOffError(null);
    } else {
      setStatusMessage(res.error);
      setTimeOffError(res.error);
    }
  }, [selectedStaffId, timeOffStart, timeOffEnd, timeOffReason]);

  const handleDeleteTimeOff = useCallback(
    async (timeOffId: string) => {
      if (!selectedStaffId) return;
      const res = await api.deleteStaffTimeOff(selectedStaffId, timeOffId);
      if (res.ok) {
        setTimeOffEntries((prev) => prev.filter((e) => e.id !== timeOffId));
        setTimeOffError(null);
      }
    },
    [selectedStaffId],
  );

  const handleStartStripeConnect = useCallback(async () => {
    setStripeStatusError('');
    setStripeActionLoading(true);
    const res = await api.startStripeConnect();
    setStripeActionLoading(false);
    if (!res.ok) {
      setStripeStatusError(res.error);
      return;
    }
    window.location.href = res.data.url;
  }, []);

  // === Effects ===
  useEffect(() => {
    if (gateState !== 'checking') return;
    let active = true;
    async function load() {
      const res = await api.fetchMe();
      if (!active) return;
      if (!res.ok) {
        setGateState(res.status === 401 || res.status === 403 ? 'needs-login' : 'error');
        return;
      }
      if (hydratedRef.current) return;
      hydratedRef.current = true;
      await hydrateConsole(res.data);
    }
    load();
    return () => {
      active = false;
    };
  }, [gateState, hydrateConsole]);

  useEffect(() => {
    if (!skipGate || !initialMe || hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateConsole(initialMe);
  }, [skipGate, initialMe, hydrateConsole]);

  useEffect(() => {
    if (gateState !== 'ready' || !salonId) return;
    let active = true;
    setStripeStatusLoading(true);
    setStripeStatusError('');
    api.getStripeConnectStatus().then((res) => {
      if (!active) return;
      setStripeStatusLoading(false);
      if (!res.ok) {
        setStripeStatusError(res.error);
        return;
      }
      setStripeStatus(res.data);
    });
    return () => {
      active = false;
    };
  }, [gateState, salonId]);

  useEffect(() => {
    const sub = onAuthStateChange(() => {
      hydratedRef.current = false;
      setGateState('checking');
    });
    return () => {
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'overview' && gateState === 'ready') {
      void loadDashboard();
    }
  }, [activeTab, gateState, loadDashboard]);

  useEffect(() => {
    if (!calendarDate || !salonId) return;
    refreshBookings(calendarDate, calendarStaffId || undefined);
  }, [calendarDate, calendarStaffId, calendarView, salonId, refreshBookings]);

  useEffect(() => {
    if (!staffServicesTarget) return;
    api.listStaffServices(staffServicesTarget).then((res) => {
      if (res.ok) setStaffServicesSelection(res.data.serviceIds);
    });
  }, [staffServicesTarget]);

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingPayment('');
      return;
    }
    const booking = bookings.find((b) => b.id === selectedBookingId);
    if (!booking?.paymentId) {
      setBookingPayment('');
      return;
    }
    api.getPayment(booking.paymentId).then((res) => {
      if (res.ok) {
        setBookingPayment(`${res.data.status} (${res.data.provider})`);
      }
    });
  }, [selectedBookingId, bookings]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;
    setCustomerName(customer.name ?? '');
    setCustomerEmail(customer.email ?? '');
    setCustomerPhone(customer.phone ?? '');
  }, [selectedCustomerId, customers]);

  // === Return Everything ===
  return {
    // Auth & Navigation
    activeTab,
    setActiveTab,
    gateState,
    setGateState,
    me,
    salonId,
    timeZone,
    notificationTest,

    // Data
    staff,
    staffLoading,
    staffError,
    refreshStaff,
    services,
    servicesLoading,
    servicesError,
    refreshServices,
    customers,
    customersLoading,
    customersError,
    bookings,
    bookingsLoading,
    bookingsError,
    businessHours,
    setBusinessHoursState,
    businessHoursLoading,
    businessHoursError,
    refreshBusinessHours,

    // Dashboard
    dashboardData,
    dashboardLoading,
    dashboardError,
    loadDashboard,

    // Calendar
    calendarDate,
    setCalendarDate,
    calendarView,
    setCalendarView,
    calendarStaffId,
    setCalendarStaffId,
    refreshBookings,

    // Booking Creation
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
    setAvailabilitySlots,
    availabilityLoading,
    availabilityError,
    customDate,
    setCustomDate,
    customTime,
    setCustomTime,
    checkoutLink,
    setCheckoutLink,
    loadAvailability,
    handleCreateBooking,
    handleCustomBooking,

    // Booking Details
    selectedBookingId,
    setSelectedBookingId,
    bookingLookupId,
    setBookingLookupId,
    bookingPayment,
    handleLookupBooking,
    handleCancelBooking,
    handleReschedule,
    handleForceConfirm,
    handleRefundPayment,
    handleReconcilePayment,

    // Customer Management
    customerForm,
    setCustomerForm,
    customerEditId,
    setCustomerEditId,
    customerEdit,
    setCustomerEdit,
    customerBusy,
    customerStatus,
    setCustomerStatus,
    resetCustomerForm,
    handleSelectCustomer,
    handleCreateCustomer,
    handleUpdateCustomer,
    refreshCustomers,

    // Staff Settings
    staffHoursTarget,
    setStaffHoursTarget,
    staffHoursWeekly,
    setStaffHoursWeekly,
    staffHoursStatus,
    setStaffHoursStatus,
    staffHoursLoading,
    staffHoursError,
    staffServicesSelection,
    setStaffServicesSelection,
    staffServicesTarget,
    setStaffServicesTarget,
    handleLoadStaffWorkingHours,
    handleSaveStaffWorkingHours,
    refreshStaffServices,
    handleStaffServiceToggle,
    handleCreateStaff,
    handleInviteStaff,
    handleUpdateStaff,
    handleCreateService,
    handleUpdateService,
    handleSaveBusinessHours,

    // Time Off
    timeOffEntries,
    setTimeOffEntries,
    timeOffLoading,
    timeOffError,
    timeOffStart,
    setTimeOffStart,
    timeOffEnd,
    setTimeOffEnd,
    timeOffReason,
    setTimeOffReason,
    handleLoadTimeOff,
    handleCreateTimeOff,
    handleDeleteTimeOff,

    // Payments
    stripeStatus,
    stripeStatusLoading,
    stripeActionLoading,
    stripeStatusError,
    handleStartStripeConnect,

    // UI
    statusMessage,
    setStatusMessage,
    confirmState,
    setConfirmState,
    closeConfirm,
    confirmAction,
    confirmActionWithReason,
    promptState,
    closePrompt,

    // Derived
    staffById,
    copy,
    setupCompleteness,
    hydrateConsole,
  };
}

// === Helper Functions ===
export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(getLocaleTag(), {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

function getLocaleTag() {
  return getStoredLocale() === 'da' ? 'da-DK' : 'en-US';
}
