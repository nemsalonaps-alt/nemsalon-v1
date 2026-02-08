import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicBooking,
  type PublicBooking
} from '../api';
import { buildBookingManageUrl } from '../../../lib/public-url';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function PublicBookingConfirmation({
  salonSlug,
  bookingId
}: {
  salonSlug: string;
  bookingId: string;
}) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState('');
  const token = useMemo(() => resolveToken(bookingId), [bookingId]);

  useEffect(() => {
    if (!token) {
      setError('Mangler booking-token.');
      return;
    }
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

  if (!token) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Vi mangler adgang</h1>
          <p className="muted">Åbn linket fra din bookingmail eller kontakt salonen.</p>
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
        <h1>Tak for din booking</h1>
        <p className="muted">Din booking er registreret og betalt.</p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Booking detaljer</h3>
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
          <div>
            <p className="muted">Betaling</p>
            <strong>{booking.paymentStatus ?? '—'}</strong>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <a className="btn ghost" href={buildBookingManageUrl({ salonSlug, bookingId, token })}>
            Administrer booking
          </a>
        </div>
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
