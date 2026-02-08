import { useEffect, useMemo, useState } from 'react';
import {
  cancelPublicBooking,
  fetchPublicAvailability,
  fetchPublicBooking,
  reschedulePublicBooking,
  type AvailabilitySlot,
  type PublicBooking
} from '../api';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function PublicBookingManage({
  salonSlug,
  bookingId
}: {
  salonSlug: string;
  bookingId: string;
}) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const token = useMemo(() => resolveToken(bookingId), [bookingId]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function load() {
      const result = await fetchPublicBooking(bookingId, token!);
      if (!active) return;
      if (result.ok) {
        setBooking(result.data);
      } else {
        setError(result.error);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [bookingId, token]);

  useEffect(() => {
    if (!booking) return;
    const date = booking.startTime.slice(0, 10);
    if (date) setSelectedDate(date);
  }, [booking]);

  useEffect(() => {
    if (!token || !booking) return;
    let active = true;
    async function loadSlots() {
      const from = new Date(`${selectedDate}T00:00:00`);
      const result = await fetchPublicAvailability({
        salonSlug,
        serviceId: booking!.serviceId,
        staffId: booking!.staffId,
        from: from.toISOString(),
        days: 1,
        limit: 80,
        intervalMinutes: 15
      });
      if (!active) return;
      if (result.ok) {
        setSlots(result.data.slots);
      } else {
        setError(result.error);
      }
    }
    loadSlots();
    return () => {
      active = false;
    };
  }, [salonSlug, selectedDate, booking, token]);

  async function handleCancel() {
    if (!token || !booking) return;
    setStatus('Annullerer...');
    setError('');
    const result = await cancelPublicBooking({
      bookingId: booking.id,
      token,
      reasonKey: 'customer.cancelled'
    });
    if (!result.ok) {
      setStatus('');
      setError(result.error);
      return;
    }
    setBooking(result.data);
    setStatus('Booking annulleret.');
  }

  async function handleReschedule(slot: AvailabilitySlot) {
    if (!token || !booking) return;
    setStatus('Flytter booking...');
    setError('');
    const result = await reschedulePublicBooking({
      bookingId: booking.id,
      token,
      staffId: booking.staffId,
      startUtc: slot.startUtc
    });
    if (!result.ok) {
      setStatus('');
      setError(result.error);
      return;
    }
    setBooking(result.data);
    setStatus('Booking flyttet.');
  }

  if (!token) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Mangler booking-token</h1>
          <p className="muted">Åbn linket fra din bookingmail.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Indlæser booking...</h1>
          {error && <div className="banner">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="panel">
        <p className="eyebrow">{booking.salonName ?? salonSlug}</p>
        <h1>Administrer booking</h1>
        <p className="muted">Booking #{booking.id.slice(0, 8)}</p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="grid two">
          <div>
            <p className="muted">Tid</p>
            <strong>{formatDateTime(booking.startTime)}</strong>
          </div>
          <div>
            <p className="muted">Status</p>
            <strong>{booking.status}</strong>
          </div>
          <div>
            <p className="muted">Service</p>
            <strong>{booking.serviceName ?? booking.serviceId}</strong>
          </div>
          <div>
            <p className="muted">Medarbejder</p>
            <strong>{booking.staffName ?? booking.staffId}</strong>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn ghost" type="button" onClick={handleCancel}>
            Annuller booking
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Vælg nyt tidspunkt</h3>
        <label className="field">
          <span className="label">Dato</span>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        <div className="list">
          {slots.map((slot) => (
            <button
              key={slot.startUtc}
              className="list-card"
              type="button"
              onClick={() => handleReschedule(slot)}
            >
              <div>
                <strong>{formatDateTime(slot.startUtc)}</strong>
                <p className="muted">Vælg tid</p>
              </div>
              <div className="list-meta">
                <span>Flyt</span>
              </div>
            </button>
          ))}
        </div>
        {slots.length === 0 && <p className="muted">Ingen ledige tider fundet.</p>}
        {status && <div className="note">{status}</div>}
        {error && <div className="banner">{error}</div>}
      </div>
    </div>
  );
}

function resolveToken(bookingId: string) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tokenFromQuery = params.get('token');
  if (tokenFromQuery) {
    localStorage.setItem(tokenStorageKey(bookingId), tokenFromQuery);
    params.delete('token');
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
    return tokenFromQuery;
  }
  return localStorage.getItem(tokenStorageKey(bookingId));
}
