import { useEffect, useState } from 'react';
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
  updateBookingStatus
} from '../console/api';
import type { AuthMeResponse, BookingSummary, Customer, StaffProfile } from '../console/types';
import type { GateState } from '../onboarding/types';
import { ConfirmDialog } from '@nemsalon/ui';
import { LogoutButton } from '../auth/components/UnifiedLogin';

type StaffGateState = GateState | 'ready';

type StaffConsoleProps = {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const fallbackWorkingHours = [
  { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
  { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
  { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false }
];

export function StaffConsole({ initialMe = null, skipGate = false }: StaffConsoleProps = {}) {
  const [gateState, setGateState] = useState<StaffGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [bookingDetails, setBookingDetails] = useState<BookingSummary | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [workingHours, setWorkingHours] = useState<Array<{ day: string; startTime: string; endTime: string; enabled: boolean }>>([]);
  const [workingHoursBusy, setWorkingHoursBusy] = useState(false);
  const [workingHoursStatus, setWorkingHoursStatus] = useState('');
  const [timeOffEntries, setTimeOffEntries] = useState<Array<{ id: string; startTime: string; endTime: string; reason?: string | null }>>([]);
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');
  const [timeOffBusy, setTimeOffBusy] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusMessage, setStatusMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);

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

  async function hydrate(meData: AuthMeResponse) {
    setMe(meData);
    setGateState('ready');
    const staffResult = await getStaffMe();
    if (staffResult.ok) {
      setStaffProfile(staffResult.data);
      const hoursResult = await getStaffWorkingHours(staffResult.data.id);
      if (hoursResult.ok) {
        setWorkingHours(hoursResult.data.weekly.length > 0 ? hoursResult.data.weekly : fallbackWorkingHours);
      }
      const timeOffResult = await listStaffTimeOff(staffResult.data.id);
      if (timeOffResult.ok) {
        setTimeOffEntries(timeOffResult.data.data);
      }
    } else {
      setStatusMessage('Kunne ikke finde staff-profil.');
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

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingDetails(null);
      setCustomerDetails(null);
      return;
    }
    let active = true;
    async function loadDetails() {
      const bookingResult = await getBooking(selectedBookingId);
      if (!active) return;
      if (!bookingResult.ok) {
        setStatusMessage(bookingResult.error);
        return;
      }
      setBookingDetails(bookingResult.data);
      if (!bookingResult.data.customerId) {
        setCustomerDetails(null);
        return;
      }
      const customerResult = await getCustomer(bookingResult.data.customerId);
      if (!active) return;
      if (customerResult.ok) {
        setCustomerDetails(customerResult.data);
      }
    }
    loadDetails();
    return () => {
      active = false;
    };
  }, [selectedBookingId]);

  async function refreshBookings(date: string) {
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);
    const result = await listBookings({
      from: from.toISOString(),
      to: to.toISOString()
    });
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
    setStatusMessage(`Status opdateret til ${status}.`);
    refreshBookings(calendarDate);
  }

  async function handleCreateTimeOff() {
    if (!staffProfile?.id || !timeOffStart || !timeOffEnd) return;
    setTimeOffBusy(true);
    const result = await createStaffTimeOff(staffProfile.id, {
      startUtc: new Date(timeOffStart).toISOString(),
      endUtc: new Date(timeOffEnd).toISOString(),
      reason: timeOffReason || undefined
    });
    setTimeOffBusy(false);
    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }
    setTimeOffEntries((prev) => [...prev, result.data]);
    setTimeOffStart('');
    setTimeOffEnd('');
    setTimeOffReason('');
    setStatusMessage('Tid er blokeret.');
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
    setStatusMessage('Override fjernet.');
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
    setWorkingHours(result.data.weekly);
    setWorkingHoursStatus('Arbejdstider opdateret.');
  }

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
          <p className="eyebrow">Staff Dashboard v1</p>
          <h1>{staffProfile?.name ?? me?.user?.email ?? 'Staff'}</h1>
          <p className="muted">My day overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="status-pill">
            <span>Bookings</span>
            <strong>{bookings.length} today</strong>
          </div>
          <LogoutButton />
        </div>
      </header>

      {statusMessage && <div className="console-banner">{statusMessage}</div>}

      <section className="panel">
        <div className="grid two">
          <label className="field">
            <span className="label">Dato</span>
            <input
              className="input"
              type="date"
              value={calendarDate}
              onChange={(event) => setCalendarDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Booking</span>
            <select
              className="select"
              value={selectedBookingId}
              onChange={(event) => setSelectedBookingId(event.target.value)}
            >
              <option value="">Vælg booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.customerName || booking.customerId} • {formatTime(booking.startTime)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {bookingDetails && (
          <div className="panel subtle" style={{ marginTop: 16 }}>
            <h3>Booking detaljer</h3>
            <div className="grid two">
              <div>
                <p className="muted">Tid</p>
                <strong>
                  {formatTime(bookingDetails.startTime)}–{formatTime(bookingDetails.endTime)}
                </strong>
              </div>
              <div>
                <p className="muted">Status</p>
                <strong>{bookingDetails.status}</strong>
              </div>
              <div>
                <p className="muted">Service</p>
                <strong>{bookingDetails.serviceName || bookingDetails.serviceId}</strong>
              </div>
              <div>
                <p className="muted">Betaling</p>
                <strong>{bookingDetails.paymentStatus || 'ingen'}</strong>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <p className="muted">Kunde</p>
              <strong>{customerDetails?.name || bookingDetails.customerName || bookingDetails.customerId}</strong>
              <div className="list-meta" style={{ marginTop: 6 }}>
                <span>{customerDetails?.email || '—'}</span>
                <span>{customerDetails?.phone || '—'}</span>
              </div>
              {customerDetails?.notes && <p className="muted" style={{ marginTop: 6 }}>{customerDetails.notes}</p>}
            </div>
          </div>
        )}

        <div className="list">
          {bookings.map((booking) => (
            <div key={booking.id} className="list-card">
              <div>
                <strong>{formatTime(booking.startTime)}–{formatTime(booking.endTime)}</strong>
                <p className="muted">{booking.customerName || booking.customerId} · {booking.serviceName || booking.serviceId}</p>
              </div>
              <div className="list-meta">
                <span>{booking.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="panel subtle" style={{ marginTop: 16 }}>
          <h3>Actions</h3>
          <div className="grid three">
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                confirmAction(
                  { title: 'Start booking', body: 'Markér denne booking som startet?' },
                  () => handleStatusUpdate('in_progress')
                )
              }
            >
              Mark started
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                confirmAction(
                  { title: 'Afslut booking', body: 'Markér denne booking som færdig?' },
                  () => handleStatusUpdate('completed')
                )
              }
            >
              Mark done
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                confirmAction(
                  { title: 'No-show', body: 'Markér denne booking som no-show?' },
                  () => handleStatusUpdate('no_show')
                )
              }
            >
              Mark no-show
            </button>
          </div>
        </div>

        {workingHours.length > 0 && (
          <div className="panel subtle" style={{ marginTop: 16 }}>
            <h3>Mine arbejdstider</h3>
            <div className="hours-grid">
              {workingHours.map((entry, index) => (
                <div key={`${entry.day}-${index}`} className="hours-row">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(event) => {
                        const next = [...workingHours];
                        next[index] = { ...entry, enabled: event.target.checked };
                        setWorkingHours(next);
                      }}
                    />
                    <span>{entry.day}</span>
                  </label>
                  <input
                    className="input"
                    type="time"
                    value={entry.startTime}
                    onChange={(event) => {
                      const next = [...workingHours];
                      next[index] = { ...entry, startTime: event.target.value };
                      setWorkingHours(next);
                    }}
                  />
                  <input
                    className="input"
                    type="time"
                    value={entry.endTime}
                    onChange={(event) => {
                      const next = [...workingHours];
                      next[index] = { ...entry, endTime: event.target.value };
                      setWorkingHours(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button className="btn primary" type="button" onClick={handleSaveWorkingHours} disabled={workingHoursBusy}>
                Gem arbejdstider
              </button>
            </div>
            {workingHoursStatus && <div className="note">{workingHoursStatus}</div>}
          </div>
        )}

        <div className="panel subtle" style={{ marginTop: 16 }}>
          <h3>Fravær / tid blokering</h3>
          <div className="grid two">
            <label className="field">
              <span className="label">Start</span>
              <input
                className="input"
                type="datetime-local"
                value={timeOffStart}
                onChange={(event) => setTimeOffStart(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">End</span>
              <input
                className="input"
                type="datetime-local"
                value={timeOffEnd}
                onChange={(event) => setTimeOffEnd(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Reason</span>
              <input
                className="input"
                value={timeOffReason}
                onChange={(event) => setTimeOffReason(event.target.value)}
              />
            </label>
          </div>
          <button className="btn primary" type="button" onClick={handleCreateTimeOff} disabled={timeOffBusy}>
            Tilføj blokering
          </button>
          <div className="list">
            {timeOffEntries.map((entry) => (
              <div key={entry.id} className="list-card">
                <div>
                  <strong>{formatDateTime(entry.startTime)}–{formatDateTime(entry.endTime)}</strong>
                  <p className="muted">{entry.reason || 'override'}</p>
                </div>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    confirmAction(
                      { title: 'Fjern blokering', body: 'Vil du fjerne denne blokering?' },
                      () => handleDeleteTimeOff(entry.id)
                    )
                  }
                  disabled={timeOffBusy}
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        body={confirmState?.body ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={closeConfirm}
      />
    </div>
  );
}
