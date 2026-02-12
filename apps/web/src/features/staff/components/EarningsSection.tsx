import { useMemo } from 'react';
import { Button, Card, Stack } from '@nemsalon/ui';
import type { BookingSummary } from '../../console/types';

interface EarningsSectionProps {
  bookings: BookingSummary[];
  copy: {
    title: string;
    todayTitle: string;
    monthTitle: string;
    completedLabel: string;
    pendingLabel: string;
    currency: string;
  };
  // Optional UI state controls from parent
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function EarningsSection({ bookings, copy, loading, error, onRetry }: EarningsSectionProps) {
  if (loading) {
    return (
      <Stack gap="lg">
        <section className="sc-section">
          <h2 className="sc-section-title">{copy.title}</h2>
          <Card variant="muted" className="sc-coming-soon">
            <div className="sc-coming-soon-content">
              <span className="sc-coming-soon-icon">💰</span>
              <h3>Loading...</h3>
              <p className="sc-muted">Please wait while earnings data loads.</p>
            </div>
          </Card>
        </section>
      </Stack>
    );
  }
  if (error) {
    return (
      <Stack gap="lg">
        <section className="sc-section">
          <h2 className="sc-section-title">{copy.title}</h2>
          <Card variant="muted" className="sc-coming-soon">
            <div className="sc-coming-soon-content">
              <span className="sc-coming-soon-icon">💸</span>
              <h3>Error loading earnings</h3>
              <p className="sc-muted">{error}</p>
              {onRetry && (
                <Button variant="primary" size="md" onClick={onRetry} style={{ marginTop: 8 }}>
                  Retry
                </Button>
              )}
            </div>
          </Card>
        </section>
      </Stack>
    );
  }
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const { todayEarnings, monthEarnings, completedCount, pendingCount } = useMemo(() => {
    let todaySum = 0;
    let monthSum = 0;
    let completed = 0;
    let pending = 0;

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.startTime);
      const amount = booking.totalAmount || 0;

      // Today
      const bookingDay = new Date(bookingDate);
      bookingDay.setHours(0, 0, 0, 0);
      if (bookingDay.getTime() === today.getTime()) {
        if (booking.status === 'completed' || booking.paymentStatus === 'paid') {
          todaySum += amount;
        }
        if (booking.status === 'completed') {
          completed += 1;
        } else if (booking.status !== 'no_show' && booking.status !== 'cancelled') {
          pending += 1;
        }
      }

      // Month
      if (bookingDate >= monthStart) {
        if (booking.status === 'completed' || booking.paymentStatus === 'paid') {
          monthSum += amount;
        }
      }
    });

    return {
      todayEarnings: todaySum,
      monthEarnings: monthSum,
      completedCount: completed,
      pendingCount: pending,
    };
  }, [bookings, today, monthStart]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: copy.currency || 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Stack gap="lg">
      <section className="sc-section">
        <h2 className="sc-section-title">{copy.title}</h2>

        {/* Today's Earnings */}
        <Card className="sc-earnings-card sc-earnings-card--today">
          <div className="sc-earnings-header">
            <span className="sc-earnings-label">{copy.todayTitle}</span>
            <span className="sc-earnings-amount">{formatCurrency(todayEarnings)}</span>
          </div>
          <div className="sc-earnings-stats">
            <div className="sc-earnings-stat">
              <span className="sc-stat-value">{completedCount}</span>
              <span className="sc-stat-label">{copy.completedLabel}</span>
            </div>
            <div className="sc-earnings-stat">
              <span className="sc-stat-value">{pendingCount}</span>
              <span className="sc-stat-label">{copy.pendingLabel}</span>
            </div>
          </div>
        </Card>

        {/* Month's Earnings */}
        <Card className="sc-earnings-card">
          <div className="sc-earnings-header">
            <span className="sc-earnings-label">{copy.monthTitle}</span>
            <span className="sc-earnings-amount sc-earnings-amount--month">
              {formatCurrency(monthEarnings)}
            </span>
          </div>
        </Card>
      </section>
    </Stack>
  );
}
