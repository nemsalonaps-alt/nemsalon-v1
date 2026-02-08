import { useEffect, useMemo, useState } from 'react';
import {
  createPublicBooking,
  createPublicCheckout,
  fetchPublicAvailability,
  fetchPublicSalon,
  listPublicServices,
  listPublicStaff,
  type AvailabilitySlot,
  type PublicSalon,
  type PublicService,
  type PublicStaff
} from '../api';
import { buildBookingConfirmationUrl, buildBookingManageUrl } from '../../../lib/public-url';

const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

function formatDate(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString('da-DK', { timeZone, day: '2-digit', month: 'short' });
}

function formatTime(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleTimeString('da-DK', { timeZone, hour: '2-digit', minute: '2-digit' });
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

interface BookingFlowProps {
  salonSlug: string;
}

export function BookingFlow({ salonSlug }: BookingFlowProps) {
  const [salon, setSalon] = useState<PublicSalon | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const salonResult = await fetchPublicSalon(salonSlug);
      if (!active) return;
      if (salonResult.ok) setSalon(salonResult.data);
      if (!salonResult.ok) {
        setError(salonResult.error);
        return;
      }
      const servicesResult = await listPublicServices(salonSlug);
      if (!active) return;
      if (servicesResult.ok) setServices(servicesResult.data.data);
      if (!servicesResult.ok) setError(servicesResult.error);
    }
    load();
    return () => { active = false; };
  }, [salonSlug]);

  useEffect(() => {
    if (!selectedServiceId) {
      setStaff([]);
      setSelectedStaffId('');
      return;
    }
    let active = true;
    async function loadStaff() {
      setSelectedStaffId('');
      const result = await listPublicStaff(salonSlug, selectedServiceId);
      if (!active) return;
      if (result.ok) setStaff(result.data.data);
      if (!result.ok) setError(result.error);
    }
    loadStaff();
    return () => { active = false; };
  }, [salonSlug, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !salon) return;
    let active = true;
    async function loadSlots() {
      setLoading(true);
      setError('');
      const from = new Date(`${selectedDate}T00:00:00`);
      const result = await fetchPublicAvailability({
        salonSlug,
        serviceId: selectedServiceId,
        staffId: selectedStaffId || undefined,
        from: from.toISOString(),
        days: 1,
        limit: 80,
        intervalMinutes: 15
      });
      if (!active) return;
      setLoading(false);
      if (result.ok) {
        setSlots(result.data.slots);
        setSelectedSlot(null);
      } else {
        setSlots([]);
        setError(result.error);
      }
    }
    loadSlots();
    return () => { active = false; };
  }, [salonSlug, selectedServiceId, selectedStaffId, selectedDate, salon]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  async function handleBooking() {
    if (!salon || !selectedServiceId || !selectedSlot) {
      setError('Vælg service og tidspunkt først.');
      return;
    }
    if (!customerName.trim()) {
      setError('Skriv dit navn.');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Opretter booking...');

    const bookingResult = await createPublicBooking({
      salonSlug,
      serviceId: selectedServiceId,
      staffId: selectedStaffId || undefined,
      startUtc: selectedSlot.startUtc,
      notes: notes || undefined,
      customer: {
        name: customerName.trim(),
        email: customerEmail || undefined,
        phone: customerPhone || undefined
      }
    });

    if (!bookingResult.ok) {
      setLoading(false);
      setStatus('');
      setError(bookingResult.error);
      return;
    }

    const booking = bookingResult.data.booking;
    const token = bookingResult.data.bookingToken;
    if (!token) {
      setLoading(false);
      setStatus('');
      setError('Kunne ikke oprette booking-token.');
      return;
    }
    localStorage.setItem(tokenStorageKey(booking.id), token);

    const successUrl = buildBookingConfirmationUrl({
      salonSlug,
      bookingId: booking.id,
      token
    });
    const cancelUrl = buildBookingManageUrl({
      salonSlug,
      bookingId: booking.id,
      token
    });

    const checkout = await createPublicCheckout({
      bookingId: booking.id,
      token,
      successUrl,
      cancelUrl
    });

    if (!checkout.ok) {
      setLoading(false);
      setStatus('');
      setError(checkout.error);
      return;
    }

    window.location.assign(checkout.data.checkoutUrl);
  }

  if (!salon) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Indlæser salon...</h1>
          {error && <div className="banner">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="panel">
        <p className="eyebrow">{salon.name}</p>
        <h1>Book din tid</h1>
        <p className="muted">Vælg service, tidspunkt og udfyld dine oplysninger.</p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="grid two">
          <label className="field">
            <span className="label">Service</span>
            <select
              className="select"
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
            >
              <option value="">Vælg service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({formatPrice(service.price, service.currency)})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Medarbejder</span>
            <select
              className="select"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
            >
              <option value="">Første ledige</option>
              {staff.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Dato</span>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Ledige tider</h3>
        {loading && <p className="muted">Henter tider...</p>}
        {!loading && slots.length === 0 && <p className="muted">Ingen tider fundet.</p>}
        <div className="list">
          {slots.map((slot) => (
            <button
              key={slot.startUtc}
              className={`list-card ${selectedSlot?.startUtc === slot.startUtc ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedSlot(slot)}
            >
              <div>
                <strong>{formatDate(slot.startUtc, salon.timezone)} · {formatTime(slot.startUtc, salon.timezone)}</strong>
                <p className="muted">Varighed: {selectedService?.durationMinutes ?? ''} min</p>
              </div>
              <div className="list-meta">
                <span>Vælg</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Dine oplysninger</h3>
        <div className="grid two">
          <label className="field">
            <span className="label">Navn</span>
            <input
              className="input"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="label">Telefon</span>
          <input
            className="input"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">Note (valgfrit)</span>
          <textarea
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {error && <div className="banner">{error}</div>}
        {status && <div className="note">{status}</div>}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" type="button" onClick={handleBooking} disabled={loading}>
            Gå til betaling
          </button>
        </div>
      </div>
    </div>
  );
}
