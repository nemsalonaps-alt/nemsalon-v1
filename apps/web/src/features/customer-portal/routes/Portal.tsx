import { useEffect, useState } from 'react';
import {
  getCustomerProfile,
  listMyBookings,
  cancelMyBooking,
  updateCustomerProfile,
  type CustomerProfile,
  type CustomerBooking,
} from '../api';
import { ImpersonationBanner, useImpersonation } from '../../impersonation/ImpersonationBanner';
import { FeatureState } from '../../../components/FeatureState';
import { Toast } from '@nemsalon/ui';
import { BookingsPage } from '../pages/BookingsPage';
import { ReceiptsPage } from '../pages/ReceiptsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../portal.css';

type Page = 'bookings' | 'receipts' | 'profile' | 'notifications' | 'settings' | 'favorites';

export function CustomerPortal() {
  const [currentPage, setCurrentPage] = useState<Page>('bookings');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  const { isImpersonating, impersonatedUser, checkStatus, stopImpersonation } = useImpersonation();

  useEffect(() => {
    loadData();
    checkStatus();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    setAuthRequired(false);

    const [profileRes, bookingsRes] = await Promise.all([
      getCustomerProfile(),
      listMyBookings({ status: 'all', limit: 50 }),
    ]);

    if (!profileRes.ok) {
      if (profileRes.status === 401 || profileRes.status === 403) {
        setAuthRequired(true);
      } else {
        setError(profileRes.error);
      }
      setLoading(false);
      return;
    }

    setProfile(profileRes.data);
    if (bookingsRes.ok) {
      setBookings(bookingsRes.data.data);
    } else {
      setActionError(bookingsRes.error);
    }
    setLoading(false);
  }

  async function handleCancelBooking(booking: CustomerBooking) {
    setActionError(null);
    const result = await cancelMyBooking(booking.id);
    if (!result.ok) {
      setActionError(result.error);
      setToast({ message: result.error, type: 'error' });
      return;
    }
    await loadData();
    setToast({ message: 'Booking annulleret', type: 'success' });
  }

  async function handleUpdateProfile(data: {
    name: string;
    phone: string;
    consents: {
      marketingEmail: boolean;
      marketingSms: boolean;
      appointmentReminders: boolean;
      dataProcessing: boolean;
    };
  }) {
    const result = await updateCustomerProfile({
      name: data.name,
      phone: data.phone,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    setProfile(result.data);
  }

  const handleSwitchToRole = async (role: 'owner' | 'staff' | 'customer') => {
    if (role === 'customer') {
      window.location.href = '/portal';
      return;
    }
    window.location.href = '/';
  };

  const handleReturnToAdmin = async () => {
    await stopImpersonation();
  };

  if (loading || error) {
    return (
      <div className="cp-center">
        <div className="cp-center-inner">
          {authRequired && error && !loading ? (
            <>
              <h1 className="cp-hero-title">Ikke logget ind</h1>
              <p className="cp-hero-subtitle">Log ind for at se dine bookinger</p>
              <a href="/login?role=customer" className="cp-primary-link">
                Gå til login
              </a>
            </>
          ) : (
            <FeatureState
              status={loading ? 'loading' : 'error'}
              title={loading ? 'Indlæser...' : 'Der opstod en fejl'}
              description={loading ? 'Indlæser din konto...' : undefined}
              error={error}
              onRetry={loadData}
              retryLabel="Prøv igen"
              testId="customer-portal-fallback"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {isImpersonating && impersonatedUser && (
        <div className="cp-banner">
          <ImpersonationBanner
            impersonatedUser={impersonatedUser}
            onSwitchToRole={handleSwitchToRole}
            onReturnToAdmin={handleReturnToAdmin}
            isLoading={false}
            isSticky
          />
        </div>
      )}

      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-header-title">
            <h1 className="cp-title">Min Konto</h1>
            <span className="cp-muted">{profile?.name}</span>
          </div>
        </div>
      </header>

      <div className="cp-layout">
        {/* Navigation */}
        <nav className="cp-nav">
          <button
            className={`cp-nav-item ${currentPage === 'bookings' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('bookings')}
          >
            <span className="cp-nav-icon">📅</span>
            <span className="cp-nav-label">Mine tider</span>
          </button>
          <button
            className={`cp-nav-item ${currentPage === 'receipts' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('receipts')}
          >
            <span className="cp-nav-icon">🧾</span>
            <span className="cp-nav-label">Kvitteringer</span>
          </button>
          <button
            className={`cp-nav-item ${currentPage === 'profile' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('profile')}
          >
            <span className="cp-nav-icon">👤</span>
            <span className="cp-nav-label">Profil</span>
          </button>
          <button
            className={`cp-nav-item ${currentPage === 'notifications' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('notifications')}
          >
            <span className="cp-nav-icon">🔔</span>
            <span className="cp-nav-label">Notifikationer</span>
          </button>
          <button
            className={`cp-nav-item ${currentPage === 'favorites' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('favorites')}
          >
            <span className="cp-nav-icon">⭐</span>
            <span className="cp-nav-label">Favoritter</span>
          </button>
          <div className="cp-nav-divider" />
          <button
            className={`cp-nav-item ${currentPage === 'settings' ? 'cp-nav-active' : ''}`}
            onClick={() => setCurrentPage('settings')}
          >
            <span className="cp-nav-icon">⚙️</span>
            <span className="cp-nav-label">Indstillinger</span>
          </button>
        </nav>

        {/* Main Content */}
        <main className="cp-main">
          <ErrorBoundary
            fallback={
              <div className="cp-page-container">
                <FeatureState
                  status="error"
                  title="Der opstod en fejl"
                  description="Noget gik galt. Prøv at genindlæse siden."
                  onRetry={() => window.location.reload()}
                  retryLabel="Genindlæs"
                />
              </div>
            }
          >
            {currentPage === 'bookings' && (
              <BookingsPage
                bookings={bookings}
                loading={loading}
                onReschedule={async () => {}}
                onCancel={handleCancelBooking}
                actionError={actionError}
              />
            )}
            {currentPage === 'receipts' && <ReceiptsPage />}
            {currentPage === 'profile' && (
              <ProfilePage profile={profile} loading={loading} onUpdate={handleUpdateProfile} />
            )}
            {currentPage === 'notifications' && <NotificationsPage />}
            {currentPage === 'settings' && <SettingsPage />}
            {currentPage === 'favorites' && <FavoritesPage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
