import { useEffect, useState } from 'react';
import { BookingFlow } from './routes/BookingFlow';
import { PublicBookingConfirmation as Confirmation } from './routes/Confirmation';
import { PublicBookingManage as ManageBooking } from './routes/ManageBooking';
import { getSalonSlugFromHostname, getSalonSlugFromPath } from '../../lib/public-url';

export function PublicBookingApp() {
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [view, setView] = useState<'booking' | 'confirmation' | 'manage'>('booking');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL to determine view and params
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);

    // Try to get salon slug from various sources
    const slugFromPath = getSalonSlugFromPath(path);
    const slugFromHost = getSalonSlugFromHostname(window.location.hostname);
    const slug = slugFromPath || slugFromHost;

    if (slug) {
      setSalonSlug(slug);
    }

    // Check for confirmation view
    const pathMatch = path.match(/\/book\/(?:[^/]+\/)?confirm/);
    if (pathMatch) {
      const bid = search.get('bookingId');
      const tok = search.get('token');
      if (bid && tok) {
        setBookingId(bid);
        setToken(tok);
        setView('confirmation');
        return;
      }
    }

    // Check for manage view
    const manageMatch = path.match(/\/book\/(?:[^/]+\/)?manage/);
    if (manageMatch) {
      const bid = search.get('bookingId') || path.split('/').pop();
      const tok = search.get('token');
      if (bid) {
        setBookingId(bid);
        setToken(tok);
        setView('manage');
        return;
      }
    }

    setView('booking');
  }, []);

  if (!salonSlug) {
    return (
      <div className="app">
        <div className="panel">
          <h1>Salon ikke fundet</h1>
          <p className="muted">Kunne ikke finde salon. Tjek URL eller kontakt salonen.</p>
        </div>
      </div>
    );
  }

  if (view === 'confirmation' && bookingId && token) {
    return <Confirmation salonSlug={salonSlug} bookingId={bookingId} />;
  }

  if (view === 'manage' && bookingId) {
    return <ManageBooking salonSlug={salonSlug} bookingId={bookingId} />;
  }

  return <BookingFlow salonSlug={salonSlug} />;
}
