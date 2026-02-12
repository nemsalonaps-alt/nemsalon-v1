import { useMemo } from 'react';
import { formatPrice } from '@nemsalon/shared';
import { getStoredLocale, resolveLocale, type CopyType } from '../../../../i18n';
import type { BookingSummary, Payment } from '../../types';
import type { StripeConnectStatus } from '../../api';
import { Button, Card, Stack, StatCard, Badge } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import '../../console.css';

interface MoneyTabProps {
  bookings: BookingSummary[];
  payments: Payment[];
  stripeStatus: StripeConnectStatus | null;
  stripeStatusLoading: boolean;
  onStartStripeConnect: () => void;
  copy: CopyType;
}

export function MoneyTab({
  bookings,
  payments,
  stripeStatus,
  stripeStatusLoading,
  onStartStripeConnect,
  copy,
}: MoneyTabProps) {
  const m = copy.console.money;
  const locale = resolveLocale(getStoredLocale());
  const timeLocale = locale === 'da' ? 'da-DK' : 'en-US';
  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const thisMonth = (todayStr ?? '').substring(0, 7);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!todayStr) {
      return {
        todayRevenue: 0,
        monthRevenue: 0,
        expectedRevenue: 0,
        failedPayments: [] as Payment[],
        failedAmount: 0,
        refunds: [] as Payment[],
        refundAmount: 0,
        pendingPayments: [] as Payment[],
        pendingAmount: 0,
        succeededPayments: [] as Payment[],
        succeededAmount: 0,
      };
    }

    const todayBookings = bookings.filter((b) => b.startTime.split('T')[0] === todayStr);
    const todayRevenue = todayBookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const monthBookingsAll = bookings.filter((b) => b.startTime.startsWith(thisMonth));
    const monthRevenue = monthBookingsAll
      .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const expectedRevenue = monthBookingsAll
      .filter((b) => ['confirmed', 'pending'].includes(b.status))
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const failedPayments = payments.filter((p) => p.status === 'failed');
    const failedAmount = failedPayments.reduce((sum, p) => sum + p.amount, 0);

    const refunds = payments.filter((p) => p.status === 'refunded');
    const refundAmount = refunds.reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments.filter((p) => p.status === 'pending');
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    const succeededPayments = payments.filter((p) => p.status === 'succeeded');
    const succeededAmount = succeededPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      todayRevenue,
      monthRevenue,
      expectedRevenue,
      failedPayments,
      failedAmount,
      refunds,
      refundAmount,
      pendingPayments,
      pendingAmount,
      succeededPayments,
      succeededAmount,
    };
  }, [bookings, payments, todayStr, thisMonth]);

  // Upcoming bookings
  const upcomingBookings = useMemo(() => {
    const currentDate = todayStr || '';
    if (!currentDate) return [];
    return bookings
      .filter((b) => {
        const bookingDate = b.startTime.split('T')[0] ?? '';
        return bookingDate > currentDate && ['confirmed', 'pending'].includes(b.status);
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [bookings, todayStr]);

  if (stripeStatusLoading) {
    return <FeatureState status="loading" title={m.title} description={m.subtitle} />;
  }

  const currency = bookings[0]?.currency || 'DKK';

  return (
    <Card variant="outlined">
      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center" justify="between">
          <div>
            <h2>{m.title}</h2>
            <p className="settings-muted">{m.subtitle}</p>
          </div>
          {!stripeStatus?.connected && (
            <Button variant="primary" onClick={onStartStripeConnect}>
              {m.connectStripe}
            </Button>
          )}
        </Stack>

        <div className="dash-section">
          <h3>{m.today}</h3>
          <Stack direction="row" gap="md" className="dash-kpi-row">
            <StatCard
              title={m.todayRevenue}
              value={formatPrice(metrics.todayRevenue, currency, timeLocale)}
              subtitle={m.bookingsCompleted}
            />
            <StatCard
              title={m.todayBookings}
              value={
                metrics.todayRevenue > 0
                  ? bookings.filter(
                      (b) => b.startTime.split('T')[0] === new Date().toISOString().split('T')[0],
                    ).length
                  : 0
              }
              subtitle={m.bookingsCompleted}
            />
          </Stack>
        </div>

        <div className="dash-section">
          <h3>{m.thisMonth}</h3>
          <Stack direction="row" gap="md" className="dash-kpi-row">
            <StatCard
              title={m.monthRevenue}
              value={formatPrice(metrics.monthRevenue, currency, timeLocale)}
              subtitle={m.allConfirmed}
            />
            <StatCard
              title={m.expectedRevenue}
              value={formatPrice(metrics.expectedRevenue, currency, timeLocale)}
              subtitle={m.allConfirmed}
            />
          </Stack>
        </div>

        <div className="dash-section">
          <h3>{m.paymentStatus}</h3>
          <Stack direction="row" gap="md" className="dash-kpi-row">
            <StatCard
              title={m.succeeded}
              value={formatPrice(metrics.succeededAmount, currency, timeLocale)}
              subtitle={m.paymentCount.replace('{count}', String(metrics.succeededPayments.length))}
              className="money-stat-success"
            />
            <StatCard
              title={m.pending}
              value={formatPrice(metrics.pendingAmount, currency, timeLocale)}
              subtitle={m.paymentCount.replace('{count}', String(metrics.pendingPayments.length))}
            />
            <StatCard
              title={m.failed}
              value={formatPrice(metrics.failedAmount, currency, timeLocale)}
              subtitle={m.paymentCount.replace('{count}', String(metrics.failedPayments.length))}
              className="money-stat-error"
            />
            <StatCard
              title={m.refunded}
              value={formatPrice(metrics.refundAmount, currency, timeLocale)}
              subtitle={m.refundCount.replace('{count}', String(metrics.refunds.length))}
            />
          </Stack>
        </div>

        {metrics.failedPayments.length > 0 && (
          <div className="dash-section">
            <h3>{m.failedPayments}</h3>
            <div className="money-failed-list">
              {metrics.failedPayments.slice(0, 10).map((payment) => (
                <div key={payment.id} className="money-failed-item">
                  <div className="money-failed-info">
                    <span className="money-failed-amount">
                      {formatPrice(payment.amount, payment.currency, timeLocale)}
                    </span>
                  </div>
                  <Badge variant="error">{m.failed}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingBookings.length > 0 && (
          <div className="dash-section">
            <h3>{m.upcomingBookings}</h3>
            <div className="money-upcoming-list">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="money-upcoming-item">
                  <div className="money-upcoming-info">
                    <span className="money-upcoming-customer">
                      {booking.customerName || m.unknownCustomer}
                    </span>
                    <span className="money-upcoming-date">
                      {new Date(booking.startTime).toLocaleDateString(timeLocale, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="money-upcoming-amount">
                    {formatPrice(booking.totalAmount, booking.currency, timeLocale)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stripeStatus?.connected && (
          <Card variant="outlined" className="stripe-status-card">
            <Stack direction="row" gap="md" align="center" justify="between">
              <div>
                <h4>{m.stripeConnected}</h4>
                <p className="settings-muted">
                  {m.stripeAccount.replace('{account}', stripeStatus.stripeAccountId || '')}
                </p>
              </div>
              <Badge variant="success">{m.connected}</Badge>
            </Stack>
            <Stack direction="row" gap="lg" className="stripe-status-details">
              <div>
                <span className="stripe-status-label">{m.charges}</span>
                <Badge variant={stripeStatus.chargesEnabled ? 'success' : 'warning'}>
                  {stripeStatus.chargesEnabled ? m.enabled : m.disabled}
                </Badge>
              </div>
              <div>
                <span className="stripe-status-label">{m.payouts}</span>
                <Badge variant={stripeStatus.payoutsEnabled ? 'success' : 'warning'}>
                  {stripeStatus.payoutsEnabled ? m.enabled : m.disabled}
                </Badge>
              </div>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  );
}
