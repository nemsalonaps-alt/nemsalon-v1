import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';
import { Card } from './Card.js';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  subtitle?: string;
  variant?: 'default' | 'outlined';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  variant = 'default',
  className = '',
  style,
  onClick,
}: StatCardProps) {
  const trendColor = trend?.direction === 'up' ? colors.success.DEFAULT : colors.error.DEFAULT;
  const trendIcon = trend?.direction === 'up' ? '↑' : '↓';

  return (
    <Card
      variant={variant}
      className={className}
      onClick={onClick}
      style={{
        flex: '1 1 200px',
        minWidth: '200px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.ink.muted,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              margin: `${spacing[3]} 0`,
              color: colors.ink.DEFAULT,
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            {trend && (
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: trendColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {trendIcon} {Math.abs(trend.percentage)}%
              </span>
            )}
            {subtitle && (
              <span style={{ fontSize: '0.875rem', color: colors.ink.muted }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: radii.md,
              background: colors.primary[100],
              color: colors.primary[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
