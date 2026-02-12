import { Stack, Card } from '@nemsalon/ui';
import './staff-skeletons.css';

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const baseStyles: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: variant === 'circular' ? '50%' : variant === 'rectangular' ? '8px' : '4px',
  };

  return (
    <div className={`sc-skeleton ${variant} ${className}`} style={baseStyles} aria-hidden="true" />
  );
}

export function SkeletonHome() {
  return (
    <Stack gap="lg">
      {/* Next Booking Skeleton */}
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="120px" height="24px" />
        </h2>
        <Card className="sc-next-card">
          <Stack gap="md">
            <Skeleton width="100px" height="48px" style={{ borderRadius: '8px' }} />
            <div style={{ marginBottom: 8 }}>
              <Skeleton width="200px" height="28px" className="sc-mb-sm" />
              <Skeleton width="150px" height="20px" />
            </div>
            <Skeleton width="100%" height="48px" style={{ borderRadius: '8px' }} />
          </Stack>
        </Card>
      </section>

      {/* Today's List Skeleton */}
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="150px" height="24px" />
        </h2>
        <Stack gap="sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sc-booking-item">
              <Skeleton variant="circular" width="10px" height="10px" />
              <div className="sc-booking-time">
                <Skeleton width="50px" height="18px" />
              </div>
              <div className="sc-booking-info">
                <Skeleton width="120px" height="18px" className="sc-mb-xs" />
                <Skeleton width="80px" height="14px" />
              </div>
              <Skeleton width="80px" height="24px" style={{ borderRadius: '20px' }} />
            </div>
          ))}
        </Stack>
      </section>
    </Stack>
  );
}

export function SkeletonSchedule() {
  return (
    <Stack gap="lg">
      {/* Working Hours Skeleton */}
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="150px" height="24px" />
        </h2>
        <Card>
          <Stack gap="md">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="sc-skeleton-row">
                <Skeleton width="80px" height="24px" />
                <Skeleton width="120px" height="36px" />
              </div>
            ))}
            <Skeleton width="150px" height="40px" style={{ marginTop: 16, borderRadius: '8px' }} />
          </Stack>
        </Card>
      </section>

      {/* Time Off Skeleton */}
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="120px" height="24px" />
        </h2>
        <Card>
          <Stack gap="md">
            <div className="sc-skeleton-row">
              <Skeleton width="150px" height="56px" />
              <Skeleton width="150px" height="56px" />
            </div>
            <Skeleton width="200px" height="40px" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="sc-skeleton-row">
                <Skeleton width="250px" height="20px" />
                <Skeleton width="60px" height="36px" />
              </div>
            ))}
          </Stack>
        </Card>
      </section>
    </Stack>
  );
}

export function SkeletonBookings() {
  return (
    <Stack gap="lg">
      {/* Search & Filter Skeleton */}
      <Card>
        <Stack gap="md">
          <Skeleton width="100%" height="40px" />
          <div className="sc-skeleton-row">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="60px" height="32px" style={{ borderRadius: '20px' }} />
            ))}
          </div>
        </Stack>
      </Card>

      {/* Bookings List Skeleton */}
      <section className="sc-section">
        <Stack gap="sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <Stack gap="sm">
                <div className="sc-skeleton-row">
                  <Skeleton variant="circular" width="10px" height="10px" />
                  <Skeleton width="150px" height="16px" />
                </div>
                <Skeleton width="100%" height="1px" />
                <div className="sc-skeleton-row">
                  <Skeleton width="100px" height="16px" />
                  <Skeleton width="150px" height="16px" />
                </div>
                <div className="sc-skeleton-row">
                  <Skeleton width="80px" height="16px" />
                  <Skeleton width="120px" height="16px" />
                </div>
                <div className="sc-skeleton-actions">
                  <Skeleton width="80px" height="40px" style={{ borderRadius: '8px' }} />
                  <Skeleton width="80px" height="40px" style={{ borderRadius: '8px' }} />
                  <Skeleton width="80px" height="40px" style={{ borderRadius: '8px' }} />
                </div>
              </Stack>
            </Card>
          ))}
        </Stack>
      </section>
    </Stack>
  );
}

export function SkeletonEarnings() {
  return (
    <Stack gap="lg">
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="150px" height="24px" />
        </h2>
        <Card className="sc-earnings-card sc-earnings-card--today">
          <Stack gap="md">
            <div className="sc-skeleton-row">
              <Skeleton width="80px" height="18px" />
              <Skeleton width="150px" height="36px" />
            </div>
            <div className="sc-skeleton-row">
              <div>
                <Skeleton width="40px" height="32px" />
                <Skeleton width="60px" height="14px" />
              </div>
              <div>
                <Skeleton width="40px" height="32px" />
                <Skeleton width="60px" height="14px" />
              </div>
            </div>
          </Stack>
        </Card>
        <Card className="sc-earnings-card">
          <Stack gap="md">
            <div className="sc-skeleton-row">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="150px" height="32px" />
            </div>
          </Stack>
        </Card>
      </section>
    </Stack>
  );
}

export function SkeletonProfile() {
  return (
    <Stack gap="lg">
      <section className="sc-section">
        <h2 className="sc-section-title">
          <Skeleton width="100px" height="24px" />
        </h2>
        <Card>
          <Stack gap="md">
            <div className="sc-skeleton-row">
              <Skeleton variant="circular" width="64px" height="64px" />
              <Skeleton width="150px" height="24px" />
            </div>
            <div className="sc-skeleton-details">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="sc-skeleton-detail-row">
                  <Skeleton width="80px" height="16px" />
                  <Skeleton width="150px" height="16px" />
                </div>
              ))}
            </div>
          </Stack>
        </Card>
      </section>
    </Stack>
  );
}
