import { useEffect, useState, useRef } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange } from '../../lib/auth';
import {
  createStaffTimeOff,
  deleteStaffTimeOff,
  fetchMe,
  getBooking,
  getCustomer,
  getStaffMe,
  getStaffWorkingHours,
  setStaffWorkingHours,
  listBookings,
  listStaffTimeOff,
  updateBookingStatus,
} from '../console/api';
import type {
  AuthMeResponse,
  BookingSummary,
  Customer,
  StaffProfile,
  BusinessHoursEntry,
  DayId,
} from '../console/types';
import type { GateState } from '../onboarding/types';
import { ConfirmDialog, Button, Card, Stack } from '@nemsalon/ui';
import { ImpersonationBanner, useImpersonation } from '../impersonation/ImpersonationBanner';
import { toLocalDateInputValue } from '../../lib/dates';
import { getTodayDateKey, toUtcIsoInTimeZone } from '../../lib/timezone';
import { FeatureState } from '../../components/FeatureState';
import { getCopy, getStoredLocale, resolveLocale } from '../../i18n';
import './staff-console.css';
import {
  ModeNavigation,
  HomeSection,
  ScheduleSection,
  BookingsSection,
  EarningsSection,
  ProfileSection,
  SkeletonHome,
  SkeletonSchedule,
  SkeletonBookings,
  SkeletonEarnings,
  SkeletonProfile,
} from './components';
import type { StaffMode } from './components';

type StaffGateState = GateState | 'ready';

type StaffConsoleProps = {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
};

const fallbackWorkingHours: BusinessHoursEntry[] = [
  { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
  { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false },
];

const normalizeWorkingHours = (weekly: BusinessHoursEntry[]): BusinessHoursEntry[] =>
  weekly.map((entry) => ({
    ...entry,
    day: entry.day as DayId,
  }));

export function StaffConsole({ initialMe = null, skipGate = false }: StaffConsoleProps = {}) {
  const copy = getCopy();
  const locale = resolveLocale(getStoredLocale());
  const dateLocale = locale === 'da' ? 'da-DK' : 'en-US';
  const staffCopy = copy.staffConsole;
  const [gateState, setGateState] = useState<StaffGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [, setBookingDetails] = useState<BookingSummary | null>(null);
  const [, setBookingDetailsLoading] = useState(false);
  const [, setBookingDetailsError] = useState<string | null>(null);
  const [, setBookingDetailsRecovering] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [workingHours, setWorkingHours] = useState<BusinessHoursEntry[]>([]);
  const [, setWorkingHoursLoading] = useState(false);
  const [, setWorkingHoursError] = useState<string | null>(null);
  const [, setWorkingHoursRecovering] = useState(false);
  const [workingHoursBusy, setWorkingHoursBusy] = useState(false);
  const [workingHoursStatus, setWorkingHoursStatus] = useState('');
  const [timeOffEntries, setTimeOffEntries] = useState<
    Array<{ id: string; startTime: string; endTime: string; reason?: string | null }>
  >([]);
  const [, setTimeOffLoading] = useState(false);
  const [, setTimeOffError] = useState<string | null>(null);
  const [, setTimeOffRecovering] = useState(false);
  const [timeOffReason, setTimeOffReason] = useState('');
  const [timeOffStartValue, setTimeOffStartValue] = useState('');
  const [timeOffEndValue, setTimeOffEndValue] = useState('');
  const [timeOffBusy, setTimeOffBusy] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => toLocalDateInputValue());
  const [statusMessage, setStatusMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [currentMode, setCurrentMode] = useState<StaffMode>('home');
  const timeZone = me?.salon?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const initialDateRef = useRef(toLocalDateInputValue());
  const calendarHydratedRef = useRef(false);

  const { isImpersonating, impersonatedUser, isLoading, checkStatus, stopImpersonation } =
    useImpersonation();

  const handleGateRetry = () => {
    setGateState('recovering');
  };

  useEffect(() => {
    if (gateState !== 'recovering') return;
    const timer = setTimeout(() => setGateState('checking'), 100);
    return () => clearTimeout(timer);
  }, [gateState]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (calendarHydratedRef.current || !me?.salon?.timezone) return;
    if (calendarDate !== initialDateRef.current) return;
    setCalendarDate(getTodayDateKey(timeZone));
    calendarHydratedRef.current = true;
  }, [me?.salon?.timezone, timeZone, calendarDate]);

  function openConfirm(state: {
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) {
    setConfirmState(state);
  }

  function closeConfirm() {
    setConfirmState(null);
  }

  function confirmAction(
    state: Omit<NonNullable<typeof confirmState>, 'onConfirm'>,
    action: () => void | Promise<void>,
  ) {
    openConfirm({
      ...state,
      onConfirm: () => {
        closeConfirm();
        void action();
      },
    });
  }

  async function fetchStaffProfileWithRetry() {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const staffResult = await getStaffMe();
      if (staffResult.ok) {
        return staffResult;
      }
      if (![0, 401, 403].includes(staffResult.status)) {
        return staffResult;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
    return getStaffMe();
  }

  async function hydrate(meData: AuthMeResponse) {
    setMe(meData);
    const staffResult = await fetchStaffProfileWithRetry();
    if (staffResult.ok) {
      setStaffProfile(staffResult.data);
      setLoadError(null);
      setStatusMessage('');
      setGateState('ready');
      await Promise.all([loadWorkingHours(staffResult.data.id), loadTimeOff(staffResult.data.id)]);
    } else {
      setStatusMessage(staffCopy.errors.staffProfileMissing);
      setLoadError(staffCopy.errors.staffProfileMissing);
      setGateState('error');
    }
  }

  useEffect(() => {
    if (gateState !== 'checking' || hydrated) return;
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
      setHydrated(true);
      await hydrate(meResult.data);
    }
    load();
    return () => {
      active = false;
    };
  }, [gateState, hydrated]);

  const handleRecover = async () => {
    setIsRecovering(true);
    setLoadError(null);
    try {
      const meResult = await fetchMe();
      if (!meResult.ok) {
        setLoadError(meResult.error);
        setGateState(meResult.status === 401 || meResult.status === 403 ? 'needs-login' : 'error');
        return;
      }
      await hydrate(meResult.data);
    } finally {
      setIsRecovering(false);
    }
  };

  useEffect(() => {
    if (!skipGate || !initialMe || hydrated) return;
    setHydrated(true);
    hydrate(initialMe);
  }, [skipGate, initialMe, hydrated]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setGateState('checking');
      setHydrated(false);
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!calendarDate || gateState !== 'ready') return;
    refreshBookings(calendarDate);
  }, [calendarDate, gateState]);

  async function loadWorkingHours(staffId: string, recovering = false) {
    if (recovering) {
      setWorkingHoursRecovering(true);
    } else {
      setWorkingHoursLoading(true);
    }
    setWorkingHoursError(null);
    const hoursResult = await getStaffWorkingHours(staffId);
    if (hoursResult.ok) {
      const weekly =
        hoursResult.data.weekly.length > 0 ? hoursResult.data.weekly : fallbackWorkingHours;
      setWorkingHours(normalizeWorkingHours(weekly));
    } else {
      setWorkingHoursError(hoursResult.error);
    }
    setWorkingHoursLoading(false);
    setWorkingHoursRecovering(false);
  }

  async function loadTimeOff(staffId: string, recovering = false) {
    if (recovering) {
      setTimeOffRecovering(true);
    } else {
      setTimeOffLoading(true);
    }
    setTimeOffError(null);
    const timeOffResult = await listStaffTimeOff(staffId);
    if (timeOffResult.ok) {
      setTimeOffEntries(timeOffResult.data.data);
    } else {
      setTimeOffError(timeOffResult.error);
    }
    setTimeOffLoading(false);
    setTimeOffRecovering(false);
  }

  const loadBookingDetails = async (bookingId: string, recovering = false) => {
    if (recovering) {
      setBookingDetailsRecovering(true);
    } else {
      setBookingDetailsLoading(true);
    }
    setBookingDetailsError(null);
    setCustomerDetails(null);
    const bookingResult = await getBooking(bookingId);
    if (!bookingResult.ok) {
      setStatusMessage(bookingResult.error);
      setBookingDetailsError(bookingResult.error);
      setBookingDetailsLoading(false);
      setBookingDetailsRecovering(false);
      return;
    }
    setBookingDetails(bookingResult.data);
    if (!bookingResult.data.customerId) {
      setBookingDetailsLoading(false);
      setBookingDetailsRecovering(false);
      return;
    }
    const customerResult = await getCustomer(bookingResult.data.customerId);
    if (customerResult.ok) {
      setCustomerDetails(customerResult.data);
    } else {
      setBookingDetailsError(customerResult.error);
    }
    setBookingDetailsLoading(false);
    setBookingDetailsRecovering(false);
  };

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingDetails(null);
      setCustomerDetails(null);
      setBookingDetailsError(null);
      return;
    }
    setBookingDetails(null);
    setCustomerDetails(null);
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadBookingDetails(selectedBookingId);
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedBookingId]);

  async function refreshBookings(date: string) {
    setBookingsLoading(true);
    const from = toUtcIsoInTimeZone(date, timeZone, { hours: 0, minutes: 0, seconds: 0 });
    const to = toUtcIsoInTimeZone(date, timeZone, { hours: 23, minutes: 59, seconds: 59, ms: 999 });
    const result = await listBookings({
      from,
      to,
    });
    setBookingsLoading(false);
    if (result.ok) {
      setBookings(result.data.data);
      return;
    }
    setStatusMessage(result.error);
  }

  async function handleStatusUpdate(status: string) {
    if (!selectedBookingId) return;
    const result = await updateBookingStatus(selectedBookingId, status);
    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }
    setStatusMessage(staffCopy.booking.statusUpdated.replace('{status}', status));
    refreshBookings(calendarDate);
  }

  async function handleCreateTimeOff(form?: HTMLFormElement | null) {
    setStatusMessage(staffCopy.settings.timeOffCreateStarting);
    let startValue = timeOffStartValue;
    let endValue = timeOffEndValue;

    if (form) {
      const startInput = form.elements.namedItem('timeOffStart') as HTMLInputElement | null;
      const endInput = form.elements.namedItem('timeOffEnd') as HTMLInputElement | null;
      startValue = startInput?.value ?? '';
      endValue = endInput?.value ?? '';
    }

    startValue = startValue || '';
    endValue = endValue || '';

    if (!staffProfile?.id) {
      setStatusMessage(staffCopy.settings.timeOffCreateMissingProfile);
      return;
    }
    if (!startValue || !endValue) {
      setStatusMessage(staffCopy.settings.timeOffMissingTimes);
      return;
    }
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      setStatusMessage(staffCopy.settings.timeOffInvalidRange);
      return;
    }
    if (endDate <= startDate) {
      setStatusMessage(staffCopy.settings.timeOffEndBeforeStart);
      return;
    }
    setStatusMessage(staffCopy.settings.timeOffCreating);
    setTimeOffBusy(true);
    const result = await createStaffTimeOff(staffProfile.id, {
      startUtc: startDate.toISOString(),
      endUtc: endDate.toISOString(),
      reason: timeOffReason || undefined,
    });
    setTimeOffBusy(false);
    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }
    const refresh = await listStaffTimeOff(staffProfile.id);
    if (refresh.ok) {
      setTimeOffEntries(refresh.data.data);
    } else {
      setTimeOffEntries((prev) => [...prev, result.data]);
    }
    if (form) {
      form.reset();
    }
    setTimeOffReason('');
    setTimeOffStartValue('');
    setTimeOffEndValue('');
    setStatusMessage(staffCopy.settings.timeOffCreated);
  }

  async function handleDeleteTimeOff(timeOffId: string) {
    if (!staffProfile?.id) return;
    setTimeOffBusy(true);
    const result = await deleteStaffTimeOff(staffProfile.id, timeOffId);
    setTimeOffBusy(false);
    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }
    setTimeOffEntries((prev) => prev.filter((entry) => entry.id !== timeOffId));
    setStatusMessage(staffCopy.settings.timeOffRemoved);
  }

  async function handleSaveWorkingHours() {
    if (!staffProfile?.id) return;
    setWorkingHoursBusy(true);
    setWorkingHoursStatus('');
    const result = await setStaffWorkingHours(staffProfile.id, workingHours);
    setWorkingHoursBusy(false);
    if (!result.ok) {
      setWorkingHoursStatus(result.error);
      return;
    }
    setWorkingHours(normalizeWorkingHours(result.data.weekly));
    setWorkingHoursStatus(staffCopy.settings.workingHoursUpdated);
  }

  const handleSwitchToRole = async (role: 'owner' | 'staff' | 'customer') => {
    if (role === 'owner') {
      window.location.href = '/';
    } else if (role === 'customer') {
      window.location.href = '/portal';
    }
  };

  const handleReturnToAdmin = async () => {
    await stopImpersonation();
  };

  if (gateState !== 'ready') {
    return (
      <Stack align="center" className="sc-center">
        <Gate state={gateState} onRetry={handleGateRetry} />
      </Stack>
    );
  }

  if (!staffProfile && loadError) {
    return (
      <Stack align="center" className="sc-center">
        <FeatureState
          status={isRecovering ? 'recovery' : 'error'}
          title={staffCopy.errors.loadStaffTitle}
          error={loadError}
          onRetry={handleRecover}
          retryLabel={staffCopy.errors.retry}
          testId="staff-console-fallback"
        />
      </Stack>
    );
  }

  // Navigation copy
  const navCopy = {
    home: 'Min dag',
    schedule: 'Vagter',
    bookings: 'Bookinger',
    earnings: 'Indtjening',
    profile: 'Profil',
  };

  return (
    <Stack gap="md" className="sc-page">
      {isImpersonating && impersonatedUser && (
        <ImpersonationBanner
          impersonatedUser={impersonatedUser}
          onSwitchToRole={handleSwitchToRole}
          onReturnToAdmin={handleReturnToAdmin}
          isLoading={isLoading}
          isSticky
        />
      )}

      {/* Header */}
      <Stack direction="row" align="center" justify="between" className="sc-header">
        <Stack>
          <p className="sc-date-label">
            {new Date().toLocaleDateString(dateLocale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1 data-testid="staff-greeting">
            {staffCopy.header.greeting},{' '}
            {staffProfile?.name?.split(' ')[0] ?? staffCopy.header.fallbackName}
          </h1>
        </Stack>
        <Stack direction="row" gap="md" align="center">
          <div data-testid="staff-bookings-today">
            <Card variant="muted" className="sc-count-card">
              <span className="sc-count">{bookings.length}</span>
              <span className="sc-count-label">{staffCopy.header.bookingsTodayLabel}</span>
            </Card>
          </div>
          {isImpersonating && (
            <Button variant="secondary" size="sm" onClick={handleReturnToAdmin}>
              {staffCopy.header.backToAdmin}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Status Message */}
      {statusMessage && (
        <Card variant="outlined" className="sc-status-card">
          <p className="sc-status-text" data-testid="staff-status-message">
            {statusMessage}
          </p>
        </Card>
      )}

      {/* Mode Navigation */}
      <ModeNavigation currentMode={currentMode} onModeChange={setCurrentMode} copy={navCopy} />

      {/* Content based on current mode */}
      <div className="sc-mode-content">
        {currentMode === 'home' && bookingsLoading && bookings.length === 0 ? (
          <SkeletonHome />
        ) : currentMode === 'home' ? (
          <HomeSection
            bookings={bookings}
            selectedBookingId={selectedBookingId}
            onSelectBooking={setSelectedBookingId}
            onStartBooking={() => handleStatusUpdate('in_progress')}
            onCompleteBooking={() => handleStatusUpdate('completed')}
            onNoShowBooking={() => handleStatusUpdate('no_show')}
            customerDetails={customerDetails}
            timeZone={timeZone}
            locale={locale}
            copy={{
              nextBooking: 'Næste kunde',
              noNextBooking: 'Ingen kommende bookinger i dag',
              startCta: staffCopy.booking.startCta,
              doneCta: staffCopy.booking.doneCta,
              noShowCta: staffCopy.booking.noShowCta,
              unknownCustomer: staffCopy.booking.unknownCustomer,
              todayTitle: 'Dagens bookinger',
              emptyTitle: staffCopy.day.emptyTitle,
              emptyBody: staffCopy.day.emptyBody,
              phoneLabel: staffCopy.booking.phoneLabel,
              emailLabel: staffCopy.booking.emailLabel,
              statusLabels: copy.console.dashboard.bookings.status || {
                pending: 'Afventer',
                confirmed: 'Bekræftet',
                in_progress: 'I gang',
                completed: 'Færdig',
                cancelled: 'Aflyst',
                no_show: 'No-show',
              },
            }}
          />
        ) : null}

        {currentMode === 'schedule' && workingHours.length === 0 ? (
          <SkeletonSchedule />
        ) : currentMode === 'schedule' ? (
          <ScheduleSection
            workingHours={workingHours}
            timeOffEntries={timeOffEntries}
            onSaveWorkingHours={handleSaveWorkingHours}
            onCreateTimeOff={handleCreateTimeOff}
            onDeleteTimeOff={(id) =>
              confirmAction(
                {
                  title: staffCopy.settings.timeOffRemoveTitle,
                  body: staffCopy.settings.timeOffRemoveBody,
                },
                () => handleDeleteTimeOff(id),
              )
            }
            workingHoursBusy={workingHoursBusy}
            timeOffBusy={timeOffBusy}
            timeZone={timeZone}
            locale={locale}
            copy={{
              workingHoursTitle: staffCopy.settings.workingHoursTitle,
              timeOffTitle: staffCopy.settings.timeOffTitle,
              saveHours: staffCopy.settings.saveHours,
              timeOffFrom: staffCopy.settings.timeOffFrom,
              timeOffTo: staffCopy.settings.timeOffTo,
              timeOffReason: staffCopy.settings.timeOffReason,
              timeOffReasonPlaceholder: staffCopy.settings.timeOffReasonPlaceholder,
              timeOffAdd: staffCopy.settings.timeOffAdd,
              timeOffRemoveTitle: staffCopy.settings.timeOffRemoveTitle,
              timeOffRemoveBody: staffCopy.settings.timeOffRemoveBody,
              days: copy.console.settings.days,
              rangeSeparator: copy.rangeSeparator,
            }}
            workingHoursStatus={workingHoursStatus}
            timeOffStartValue={timeOffStartValue}
            timeOffEndValue={timeOffEndValue}
            timeOffReason={timeOffReason}
            onTimeOffStartChange={setTimeOffStartValue}
            onTimeOffEndChange={setTimeOffEndValue}
            onTimeOffReasonChange={setTimeOffReason}
          />
        ) : null}

        {currentMode === 'bookings' && bookingsLoading ? (
          <SkeletonBookings />
        ) : currentMode === 'bookings' ? (
          <BookingsSection
            bookings={bookings}
            selectedBookingId={selectedBookingId}
            onSelectBooking={setSelectedBookingId}
            onStartBooking={() =>
              confirmAction(
                {
                  title: staffCopy.booking.startTitle,
                  body: staffCopy.booking.startBody.replace(
                    '{name}',
                    bookings.find((b) => b.id === selectedBookingId)?.customerName ||
                      staffCopy.booking.unknownCustomer,
                  ),
                },
                () => handleStatusUpdate('in_progress'),
              )
            }
            onCompleteBooking={() =>
              confirmAction(
                {
                  title: staffCopy.booking.doneTitle,
                  body: staffCopy.booking.doneBody.replace(
                    '{name}',
                    bookings.find((b) => b.id === selectedBookingId)?.customerName ||
                      staffCopy.booking.unknownCustomer,
                  ),
                },
                () => handleStatusUpdate('completed'),
              )
            }
            onNoShowBooking={() =>
              confirmAction(
                {
                  title: staffCopy.booking.noShowTitle,
                  body: staffCopy.booking.noShowBody.replace(
                    '{name}',
                    bookings.find((b) => b.id === selectedBookingId)?.customerName ||
                      staffCopy.booking.unknownCustomer,
                  ),
                },
                () => handleStatusUpdate('no_show'),
              )
            }
            customerDetails={customerDetails}
            timeZone={timeZone}
            locale={locale}
            copy={{
              title: 'Alle bookinger',
              searchPlaceholder: 'Søg efter kunde eller service...',
              filterAll: 'Alle',
              filterToday: 'I dag',
              filterUpcoming: 'Kommende',
              filterCompleted: 'Færdige',
              noBookings: 'Ingen bookinger fundet',
              customerLabel: 'Kunde',
              serviceLabel: 'Service',
              timeLabel: 'Tid',
              phoneLabel: staffCopy.booking.phoneLabel,
              emailLabel: staffCopy.booking.emailLabel,
              paymentLabel: staffCopy.booking.paymentLabel,
              notesLabel: 'Noter',
              historyLabel: 'Historik',
              startCta: staffCopy.booking.startCta,
              doneCta: staffCopy.booking.doneCta,
              noShowCta: staffCopy.booking.noShowCta,
              callCta: 'Ring',
              unknownCustomer: staffCopy.booking.unknownCustomer,
              statusLabels: copy.console.dashboard.bookings.status || {
                pending: 'Afventer',
                confirmed: 'Bekræftet',
                in_progress: 'I gang',
                completed: 'Færdig',
                cancelled: 'Aflyst',
                no_show: 'No-show',
              },
            }}
          />
        ) : null}

        {currentMode === 'earnings' && !bookingsLoading ? (
          <SkeletonEarnings />
        ) : currentMode === 'earnings' ? (
          <EarningsSection
            bookings={bookings}
            copy={{
              title: 'Min indtjening',
              todayTitle: 'I dag',
              monthTitle: 'Denne måned',
              completedLabel: 'færdige',
              pendingLabel: 'afventer',
              currency: me?.salon?.currency || 'DKK',
            }}
          />
        ) : null}

        {currentMode === 'profile' && <SkeletonProfile />}

        {currentMode === 'profile' && (
          <ProfileSection
            staffProfile={staffProfile}
            copy={{
              title: 'Min profil',
              nameLabel: 'Navn',
              emailLabel: 'Email',
              phoneLabel: 'Telefon',
              roleLabel: 'Rolle',
              salonLabel: 'Salon',
              logoutCta: 'Log ud',
            }}
          />
        )}
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
    </Stack>
  );
}
