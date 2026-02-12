import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@nemsalon/shared';
import { getStoredLocale, resolveLocale, type CopyType } from '../../../../i18n';
import type { Customer, BookingSummary } from '../../types';
import { Button, Card, Stack, Input, Badge } from '@nemsalon/ui';
import { FeatureState } from '../../../../components/FeatureState';
import * as api from '../../api';
import '../../console.css';

interface CustomersTabProps {
  customers: Customer[];
  customersLoading: boolean;
  customersError: string | null;
  onRetry: () => void;
  onCreateBooking: (customerId: string) => void;
  onSelectBooking: (bookingId: string) => void;
  copy: CopyType;
  timeZone: string;
}

interface CustomerWithStats extends Customer {
  totalBookings: number;
  totalRevenue: number;
  lastBooking: BookingSummary | null;
  noShowCount: number;
  currency: string;
}

export function CustomersTab({
  customers,
  customersLoading,
  customersError,
  onRetry,
  onCreateBooking,
  onSelectBooking,
  copy,
  timeZone,
}: CustomersTabProps) {
  const c = copy.console.customers;
  const locale = resolveLocale(getStoredLocale());
  const timeLocale = locale === 'da' ? 'da-DK' : 'en-US';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingSummary[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query),
    );
  }, [customers, searchQuery]);

  // Load customer bookings when selected
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerBookings([]);
      return;
    }

    const loadBookings = async () => {
      setBookingsLoading(true);
      const res = await api.listBookings({ limit: 100 });
      if (res.ok) {
        const bookings = res.data.data.filter((b) => b.customerId === selectedCustomer.id);
        setCustomerBookings(bookings);
      }
      setBookingsLoading(false);
    };

    loadBookings();
  }, [selectedCustomer]);

  // Calculate customer stats
  const customersWithStats: CustomerWithStats[] = useMemo(() => {
    return filteredCustomers.map((customer) => {
      const bookings = customerBookings.filter((b) => b.customerId === customer.id);
      const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const noShowCount = bookings.filter((b) => b.status === 'no_show').length;
      const sortedBookings = [...bookings].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );

      return {
        ...customer,
        totalBookings: bookings.length,
        totalRevenue,
        lastBooking: sortedBookings[0] || null,
        noShowCount,
        currency: bookings[0]?.currency || 'DKK',
      };
    });
  }, [filteredCustomers, customerBookings]);

  if (customersLoading && customers.length === 0) {
    return (
      <FeatureState
        status="loading"
        title={c.title}
        description={c.totalCustomers.replace('{count}', String(customers.length))}
      />
    );
  }

  if (customersError && customers.length === 0) {
    return (
      <FeatureState
        status="error"
        title={c.title}
        error={customersError}
        onRetry={onRetry}
        retryLabel="Prøv igen"
      />
    );
  }

  return (
    <Card variant="outlined">
      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center" justify="between">
          <div>
            <h2>{c.title}</h2>
            <p className="settings-muted">
              {c.totalCustomers.replace('{count}', String(customers.length))}
            </p>
          </div>
        </Stack>

        <Input
          type="text"
          placeholder={c.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />

        {selectedCustomer ? (
          <CustomerDetailView
            customer={selectedCustomer}
            bookings={customerBookings}
            bookingsLoading={bookingsLoading}
            onBack={() => setSelectedCustomer(null)}
            onCreateBooking={() => onCreateBooking(selectedCustomer.id)}
            onSelectBooking={onSelectBooking}
            timeZone={timeZone}
            timeLocale={timeLocale}
            c={c}
          />
        ) : (
          <div className="customers-list">
            {customersWithStats.length === 0 ? (
              <div className="dash-empty">
                <p>{c.noCustomersFound}</p>
              </div>
            ) : (
              customersWithStats.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                  timeLocale={timeLocale}
                  c={c}
                />
              ))
            )}
          </div>
        )}
      </Stack>
    </Card>
  );
}

interface CustomerCardProps {
  customer: CustomerWithStats;
  onClick: () => void;
  timeLocale: string;
  c: {
    title: string;
    totalCustomers: string;
    searchPlaceholder: string;
    noCustomersFound: string;
    bookAgain: string;
    bookings: string;
    revenue: string;
    noShows: string;
    lastBooking: string;
    backToList: string;
    lifetimeValue: string;
    notes: string;
    bookingHistory: string;
    loadingBookings: string;
    noBookingsFound: string;
    contact: {
      email: string;
      phone: string;
    };
  };
}

function CustomerCard({ customer, onClick, timeLocale, c }: CustomerCardProps) {
  return (
    <div className="customer-card" onClick={onClick}>
      <div className="customer-card-main">
        <div className="customer-card-name">{customer.name}</div>
        <div className="customer-card-contact">
          {customer.email && <span>{customer.email}</span>}
          {customer.phone && <span>{customer.phone}</span>}
        </div>
      </div>
      <div className="customer-card-stats">
        <div className="customer-stat">
          <span className="customer-stat-value">{customer.totalBookings}</span>
          <span className="customer-stat-label">{c.bookings}</span>
        </div>
        <div className="customer-stat">
          <span className="customer-stat-value">
            {formatPrice(customer.totalRevenue, customer.currency, timeLocale)}
          </span>
          <span className="customer-stat-label">{c.revenue}</span>
        </div>
        {customer.noShowCount > 0 && (
          <Badge variant="warning">
            {customer.noShowCount} {c.noShows}
          </Badge>
        )}
      </div>
      {customer.lastBooking && (
        <div className="customer-card-last">
          {c.lastBooking} {new Date(customer.lastBooking.startTime).toLocaleDateString(timeLocale)}
        </div>
      )}
    </div>
  );
}

interface CustomerDetailViewProps {
  customer: CustomerWithStats;
  bookings: BookingSummary[];
  bookingsLoading: boolean;
  onBack: () => void;
  onCreateBooking: () => void;
  onSelectBooking: (bookingId: string) => void;
  timeZone: string;
  timeLocale: string;
  c: CustomerCardProps['c'];
}

function CustomerDetailView({
  customer,
  bookings,
  bookingsLoading,
  onBack,
  onCreateBooking,
  onSelectBooking,
  timeZone,
  timeLocale,
  c,
}: CustomerDetailViewProps) {
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return (
    <div className="customer-detail">
      <Stack direction="row" gap="md" align="center">
        <Button variant="ghost" size="sm" onClick={onBack}>
          {c.backToList}
        </Button>
      </Stack>

      <Card variant="outlined" className="customer-detail-header">
        <Stack gap="md">
          <div>
            <h3>{customer.name}</h3>
            <div className="customer-detail-contact">
              {customer.email && <a href={`mailto:${customer.email}`}>{customer.email}</a>}
              {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
            </div>
          </div>

          <Stack direction="row" gap="lg" className="customer-detail-stats">
            <div className="customer-big-stat">
              <span className="customer-big-stat-value">{customer.totalBookings}</span>
              <span className="customer-big-stat-label">{c.bookings}</span>
            </div>
            <div className="customer-big-stat">
              <span className="customer-big-stat-value">
                {formatPrice(customer.totalRevenue, customer.currency, timeLocale)}
              </span>
              <span className="customer-big-stat-label">{c.lifetimeValue}</span>
            </div>
            {customer.noShowCount > 0 && (
              <div className="customer-big-stat customer-big-stat-warning">
                <span className="customer-big-stat-value">{customer.noShowCount}</span>
                <span className="customer-big-stat-label">{c.noShows}</span>
              </div>
            )}
          </Stack>

          {customer.notes && (
            <div className="customer-notes">
              <strong>{c.notes}:</strong>
              <p>{customer.notes}</p>
            </div>
          )}

          <Button variant="primary" onClick={onCreateBooking}>
            {c.bookAgain}
          </Button>
        </Stack>
      </Card>

      <div className="customer-bookings-section">
        <h4>{c.bookingHistory}</h4>
        {bookingsLoading ? (
          <p>{c.loadingBookings}</p>
        ) : sortedBookings.length === 0 ? (
          <p>{c.noBookingsFound}</p>
        ) : (
          <div className="customer-bookings-list">
            {sortedBookings.map((booking) => (
              <div
                key={booking.id}
                className="customer-booking-item"
                onClick={() => onSelectBooking(booking.id)}
              >
                <div className="customer-booking-date">
                  {new Date(booking.startTime).toLocaleDateString(timeLocale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="customer-booking-time">
                  {new Date(booking.startTime).toLocaleTimeString(timeLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone,
                  })}
                </div>
                <div className="customer-booking-service">{booking.serviceName}</div>
                <div className="customer-booking-staff">{booking.staffName}</div>
                <Badge
                  variant={
                    booking.status === 'completed'
                      ? 'success'
                      : booking.status === 'cancelled' || booking.status === 'no_show'
                        ? 'error'
                        : 'default'
                  }
                >
                  {booking.status === 'completed' && 'Afsluttet'}
                  {booking.status === 'cancelled' && 'Annulleret'}
                  {booking.status === 'no_show' && 'No-show'}
                  {booking.status === 'confirmed' && 'Bekræftet'}
                  {booking.status === 'pending' && 'Afventer'}
                  {booking.status === 'in_progress' && 'I gang'}
                </Badge>
                <div className="customer-booking-amount">
                  {formatPrice(booking.totalAmount, booking.currency, timeLocale)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
