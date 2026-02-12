import { useMemo } from 'react';
import { formatPrice } from '@nemsalon/shared';
import { getStoredLocale, resolveLocale, type CopyType } from '../../../../i18n';
import type { DashboardData, BookingSummary } from '../../types';
import { Button, Card, Stack, StatCard } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import '../../console.css';

interface DashboardTabProps {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onTabChange: (tab: 'calendar' | 'customers' | 'services-team' | 'money') => void;
  onSelectBooking: (bookingId: string) => void;
  copy: CopyType;
  timeZone: string;
}

function SkeletonBox() {
  return <div className="dash-skeleton-box" />;
}

function SkeletonRow() {
  return <div className="dash-skeleton-row" />;
}

export function DashboardTab({
  data,
  loading,
  error,
  onRetry,
  onTabChange,
  onSelectBooking,
  copy,
  timeZone,
}: DashboardTabProps) {
  const c = copy.console.dashboard;
  const overview = copy.console.overview;
  const locale = resolveLocale(getStoredLocale());
  const timeLocale = locale === 'da' ? 'da-DK' : 'en-US';

  if (!data && (loading || error)) {
    return (
      <FeatureState
        status={loading ? 'loading' : 'error'}
        title={loading ? c.loadingTitle : c.errorTitle}
        description={loading ? c.loadingBody : undefined}
        error={error}
        onRetry={onRetry}
        retryLabel={c.retry}
        testId="dashboard-fallback"
      />
    );
  }

  // Determine action status with safe access
  const hasAlerts = data?.kpis?.alerts && data.kpis.alerts.length > 0;
  const actionStatus = hasAlerts ? 'action-required' : 'healthy';
  const kpis = data?.kpis;

  // Memoize date formatting
  const formattedDateTime = useMemo(() => {
    return (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleTimeString(timeLocale, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        });
      } catch {
        return '--:--';
      }
    };
  }, [timeLocale, timeZone]);

  return (
    <Card variant="outlined">
      {/* Status Banner - "Kræver handling?" */}
      {!loading && data && (
        <div
          className={`dash-status-banner dash-status-${actionStatus}`}
          role="status"
          aria-live="polite"
        >
          <div className="dash-status-content">
            <span className="dash-status-label">
              {actionStatus === 'healthy' ? overview.statusHealthy : overview.statusActionRequired}
            </span>
            <span className="dash-status-message">
              {hasAlerts ? (kpis?.alerts?.[0]?.message ?? overview.noIssues) : overview.noIssues}
            </span>
          </div>
          {hasAlerts && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onTabChange('calendar')}
              aria-label={overview.seeDetails}
            >
              {overview.seeDetails}
            </Button>
          )}
        </div>
      )}

      {/* KPI Boxes */}
      <Stack direction="row" gap="md" className="dash-kpi-row">
        {loading ? (
          <>
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
          </>
        ) : data ? (
          <>
            <Button
              variant="ghost"
              className="dash-kpi-click"
              onClick={() => onTabChange('calendar')}
              aria-label={`${c.kpis.todayBookings}: ${kpis?.todayBookings?.total} bookinger`}
            >
              <StatCard
                title={c.kpis.todayBookings}
                value={kpis?.todayBookings?.total ?? 0}
                subtitle={`${kpis?.todayBookings?.completed ?? 0} ${c.kpis.completed}${copy.inlineSeparator}${kpis?.todayBookings?.remaining ?? 0} ${c.kpis.remaining}`}
              />
            </Button>
            <StatCard
              title={c.kpis.todayRevenue}
              value={formatPrice(
                kpis?.todayRevenue?.amount ?? 0,
                kpis?.todayRevenue?.currency ?? 'DKK',
                timeLocale,
              )}
              subtitle={
                (kpis?.todayRevenue?.confirmedAmount ?? 0) > 0
                  ? `${formatPrice(kpis?.todayRevenue?.confirmedAmount ?? 0, kpis?.todayRevenue?.currency ?? 'DKK', timeLocale)} ${c.kpis.confirmedAmount}`
                  : c.kpis.noRevenueYet
              }
            />
            <StatCard
              title={c.kpis.upcomingBookings}
              value={kpis?.upcoming?.total ?? 0}
              subtitle={
                kpis?.upcoming?.nextBooking
                  ? `${c.kpis.nextBookingAt} ${formattedDateTime(kpis.upcoming.nextBooking.startTime)}`
                  : ''
              }
            />
            <Button
              variant="ghost"
              className={[
                'dash-kpi-click',
                kpis?.systemStatus === 'action-required' ? 'dash-stat-alert' : '',
                kpis?.alerts?.[0] ? 'dash-stat-click' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => kpis?.alerts?.[0] && onTabChange('calendar')}
              disabled={!kpis?.alerts?.[0]}
              aria-label={kpis?.systemStatus === 'healthy' ? c.kpis.allGood : c.kpis.actionRequired}
            >
              <StatCard
                title={c.kpis.systemStatus}
                value={kpis?.systemStatus === 'healthy' ? c.kpis.allGood : c.kpis.actionRequired}
                subtitle={kpis?.alerts?.[0]?.message ?? c.kpis.noIssues}
              />
            </Button>
          </>
        ) : null}
      </Stack>

      {/* Error State */}
      {error && (
        <Card variant="outlined" className="dash-alert-card" data-testid="dashboard-error">
          <p className="dash-alert-text">{c.error}</p>
          <Button variant="ghost" size="md" onClick={onRetry} data-testid="dashboard-retry">
            {c.retry}
          </Button>
        </Card>
      )}

      {/* Today's Bookings */}
      <div className="dash-section">
        <h2>{c.bookings.title}</h2>
        {loading ? (
          <div className="dash-quick">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : data && data.todayBookings.length > 0 ? (
          <div className="dash-quick">
            {data.todayBookings
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onClick={() => onSelectBooking(booking.id)}
                  timeZone={timeZone}
                  locale={timeLocale}
                  statusLabels={overview.status}
                  unknownCustomer={overview.unknownCustomer}
                  formattedDateTime={formattedDateTime}
                />
              ))}
          </div>
        ) : (
          <div className="dash-empty">
            <h3>{c.bookings.emptyTitle}</h3>
            <p>{c.bookings.emptyBody}</p>
            <div className="dash-empty-actions">
              <Button variant="primary" size="md" onClick={() => onSelectBooking('')}>
                {c.bookings.createBooking}
              </Button>
              <Button variant="ghost" size="md" onClick={() => onTabChange('calendar')}>
                {c.bookings.viewCalendar}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dash-quick">
        <div className="dash-quick-row">
          <Button variant="primary" size="md" onClick={() => onSelectBooking('')}>
            {c.quickActions.createManual}
          </Button>
          <Button variant="ghost" size="md" onClick={() => onTabChange('calendar')}>
            {c.quickActions.goToCalendar}
          </Button>
          <Button variant="ghost" size="md" onClick={() => onTabChange('services-team')}>
            {c.quickActions.viewStaff}
          </Button>
        </div>
        <div className="dash-quick-links">
          <Button variant="ghost" size="sm" onClick={() => onTabChange('services-team')}>
            {c.quickActions.settings}
          </Button>
          <a href={`mailto:${c.quickActions.supportEmail}`}>{c.quickActions.support}</a>
        </div>
      </div>
    </Card>
  );
}

interface BookingRowProps {
  booking: BookingSummary;
  onClick: () => void;
  timeZone: string;
  locale: string;
  statusLabels: Record<string, string>;
  unknownCustomer: string;
  formattedDateTime: (dateStr: string) => string;
}

function BookingRow({
  booking,
  onClick,
  statusLabels,
  unknownCustomer,
  formattedDateTime,
}: BookingRowProps) {
  const statusClass =
    booking.status === 'confirmed'
      ? 'dash-booking-row-confirmed'
      : booking.status === 'cancelled'
        ? 'dash-booking-row-cancelled'
        : 'dash-booking-row-pending';

  const chipClass =
    booking.status === 'confirmed'
      ? 'dash-status-chip-confirmed'
      : booking.status === 'cancelled'
        ? 'dash-status-chip-cancelled'
        : '';

  return (
    <button
      className={`dash-booking-row ${statusClass}`}
      onClick={onClick}
      type="button"
      aria-label={`${booking.customerName || unknownCustomer} - ${booking.serviceName} - ${statusLabels[booking.status] || booking.status}`}
    >
      <span className="dash-booking-time">
        {formattedDateTime(booking.startTime)}
        {' – '}
        {formattedDateTime(booking.endTime)}
      </span>
      <span className="dash-booking-name">{booking.customerName || unknownCustomer}</span>
      <span className="dash-booking-service">{booking.serviceName || booking.serviceId}</span>
      <span className="dash-booking-staff">{booking.staffName || booking.staffId}</span>
      <span className={`dash-status-chip ${chipClass}`}>
        {statusLabels[booking.status] || booking.status}
      </span>
    </button>
  );
}
