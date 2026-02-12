import { useEffect, useState } from 'react';
import { BookingFlow } from './routes/BookingFlow';
import { PublicBookingConfirmation as Confirmation } from './routes/Confirmation';
import { PublicBookingManage as ManageBooking } from './routes/ManageBooking';
import { getSalonSlugFromHostname, getSalonSlugFromPath } from '../../lib/public-url';
import { Card, Stack } from '@nemsalon/ui';
import { getCopy } from '../../i18n';
import './public-booking.css';

export function PublicBookingApp() {
  const copy = getCopy();
  const c = copy.publicBooking;
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [view, setView] = useState<'booking' | 'confirmation' | 'manage'>('booking');
  const [bookingId, setBookingId] = useState<string | null>(null);

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
    const confirmationMatch = path.match(/^\/book\/[^/]+\/confirmation\/([^/]+)/);
    if (confirmationMatch) {
      const bid = confirmationMatch[1] ?? search.get('bookingId');
      if (bid) {
        setBookingId(bid);
        setView('confirmation');
        return;
      }
    }

    // Check for manage view
    const manageMatch = path.match(/^\/book\/[^/]+\/manage\/([^/]+)/);
    if (manageMatch) {
      const bid = manageMatch[1] ?? search.get('bookingId');
      if (bid) {
        setBookingId(bid);
        setView('manage');
        return;
      }
    }

    setView('booking');
  }, []);

  if (!salonSlug) {
    return (
      <Stack align="center" className="pb-center-sm">
        <Card>
          <h1>{c.salonNotFoundTitle}</h1>
          <p className="pb-muted">{c.salonNotFoundBody}</p>
        </Card>
      </Stack>
    );
  }

  if (view === 'confirmation' && bookingId) {
    return <Confirmation salonSlug={salonSlug} bookingId={bookingId} />;
  }

  if (view === 'manage' && bookingId) {
    return <ManageBooking salonSlug={salonSlug} bookingId={bookingId} />;
  }

  return <BookingFlow salonSlug={salonSlug} />;
}
