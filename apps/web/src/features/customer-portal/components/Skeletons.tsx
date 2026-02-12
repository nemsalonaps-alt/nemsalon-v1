import '../portal.css';

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const baseStyles: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: variant === 'circular' ? '50%' : variant === 'rectangular' ? '8px' : '4px',
  };

  return (
    <div className={`cp-skeleton ${variant} ${className}`} style={baseStyles} aria-hidden="true" />
  );
}

// Pre-built skeleton components for common patterns

interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showActions?: boolean;
  lines?: number;
}

export function SkeletonCard({
  showImage = true,
  showTitle = true,
  showSubtitle = true,
  showActions = true,
  lines = 2,
}: SkeletonCardProps) {
  return (
    <div className="cp-skeleton-card">
      {showImage && (
        <div className="cp-skeleton-card-image">
          <Skeleton variant="rectangular" width="100%" height="120px" />
        </div>
      )}
      <div className="cp-skeleton-card-content">
        {showTitle && <Skeleton width="70%" height="20px" className="cp-mb-sm" />}
        {showSubtitle && <Skeleton width="50%" height="16px" className="cp-mb-sm" />}
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width="100%" height="12px" className="cp-mb-xs" />
        ))}
        {showActions && (
          <div className="cp-skeleton-card-actions">
            <Skeleton variant="rectangular" width="100px" height="36px" />
            <Skeleton variant="rectangular" width="80px" height="36px" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 3,
  showActions = false,
}: {
  items?: number;
  showActions?: boolean;
}) {
  return (
    <div className="cp-skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} showImage={false} showActions={showActions} />
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="cp-skeleton-profile">
      <div className="cp-skeleton-profile-header">
        <Skeleton variant="circular" width="80px" height="80px" />
        <div className="cp-skeleton-profile-info">
          <Skeleton width="150px" height="24px" className="cp-mb-sm" />
          <Skeleton width="100px" height="16px" />
        </div>
      </div>
      <div className="cp-skeleton-profile-form">
        <Skeleton width="100%" height="56px" className="cp-mb-md" />
        <Skeleton width="100%" height="56px" className="cp-mb-md" />
        <Skeleton width="100%" height="100px" />
      </div>
    </div>
  );
}

export function SkeletonReceipt() {
  return (
    <div className="cp-skeleton-receipt">
      <div className="cp-skeleton-receipt-header">
        <Skeleton width="200px" height="24px" className="cp-mb-sm" />
        <Skeleton width="100px" height="16px" />
      </div>
      <div className="cp-skeleton-receipt-details">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="cp-skeleton-receipt-row">
            <Skeleton width="120px" height="16px" />
            <Skeleton width="80px" height="16px" />
          </div>
        ))}
      </div>
      <div className="cp-skeleton-receipt-total">
        <Skeleton width="150px" height="32px" />
      </div>
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="cp-skeleton-settings">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="cp-skeleton-settings-item">
          <Skeleton width="200px" height="20px" className="cp-mb-sm" />
          <Skeleton width="100%" height="40px" />
        </div>
      ))}
    </div>
  );
}
