import { useEffect, useState } from 'react';
import { getCustomerProfile, logoutCustomer, listMyBookings, type CustomerProfile, type CustomerBooking } from '../api';
import { getCopy } from '../../../i18n';

const t = getCopy('da');

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t.customerPortal.status.pending,
    confirmed: t.customerPortal.status.confirmed,
    in_progress: t.customerPortal.status.in_progress,
    completed: t.customerPortal.status.completed,
    cancelled: t.customerPortal.status.cancelled,
    no_show: t.customerPortal.status.no_show
  };
  return labels[status] ?? status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-red-100 text-red-800'
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

export function CustomerPortal() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming');

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    const [profileRes, bookingsRes] = await Promise.all([
      getCustomerProfile(),
      listMyBookings({ status: filter, limit: 50 })
    ]);
    
    if (!profileRes.ok) {
      setError(profileRes.error);
      setLoading(false);
      return;
    }
    
    setProfile(profileRes.data);
    if (bookingsRes.ok) {
      setBookings(bookingsRes.data.data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await logoutCustomer();
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.customerPortal.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.customerPortal.notLoggedIn.title}</h1>
          <p className="text-gray-600 mb-4">{t.customerPortal.notLoggedIn.message}</p>
          <a href="/login?role=customer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {t.customerPortal.notLoggedIn.loginButton}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.customerPortal.title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{profile?.name}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
              {t.customerPortal.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex gap-2">
          {(['upcoming', 'past', 'cancelled', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
            >
              {f === 'upcoming' ? t.customerPortal.filters.upcoming : f === 'past' ? t.customerPortal.filters.past : f === 'cancelled' ? t.customerPortal.filters.cancelled : t.customerPortal.filters.all}
            </button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t.customerPortal.emptyState}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{booking.salonName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <p className="text-gray-600">{booking.serviceName}</p>
                    <p className="text-gray-500 text-sm">{booking.staffName}</p>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">{formatDate(booking.startTime)}</span>
                      {' kl. '}
                      <span>{formatTime(booking.startTime)}</span>
                      {' - '}
                      <span>{formatTime(booking.endTime)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{booking.totalAmount} {booking.currency}</p>
                    <a
                      href={`/book/${booking.salonSlug}?manage=${booking.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                    >
                      {t.customerPortal.viewDetails}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
