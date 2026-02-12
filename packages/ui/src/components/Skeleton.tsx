import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  className = '',
}: SkeletonProps) {
  const defaultHeights = {
    text: 16,
    rect: 100,
    circle: undefined,
  };

  const finalHeight = height || defaultHeights[variant];

  const styles: React.CSSProperties = {
    width,
    height: variant === 'circle' ? width : finalHeight,
    background: `linear-gradient(90deg, ${colors.surface.muted} 25%, ${colors.surface.muted} 50%, ${colors.surface.muted} 75%)`,
    backgroundSize: '200% 100%',
    borderRadius: variant === 'circle' ? '50%' : variant === 'text' ? radii.sm : radii.md,
    animation: 'shimmer 1.5s infinite',
  };

  return <div style={styles} className={className} />;
}

// Predefined skeleton layouts
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }} className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 && lines > 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }} className={className}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="80%" />
    </div>
  );
}
