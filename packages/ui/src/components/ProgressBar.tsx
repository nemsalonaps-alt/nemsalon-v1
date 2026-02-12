import { colors } from '../theme/colors.js';
import { radii } from '../theme/radii.js';

export interface ProgressBarProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  trackColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ProgressBar({
  value,
  max = 100,
  showPercentage = false,
  size = 'md',
  color = 'primary',
  trackColor = colors.surface.muted,
  className = '',
  style,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const height = {
    sm: '4px',
    md: '8px',
    lg: '12px',
  };

  const fillColor = {
    primary: colors.primary[500],
    success: colors.success.DEFAULT,
    warning: colors.warning.DEFAULT,
    error: colors.error.DEFAULT,
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    ...style,
  };

  const trackStyles: React.CSSProperties = {
    flex: 1,
    height: height[size],
    backgroundColor: trackColor,
    borderRadius: radii.full,
    overflow: 'hidden',
  };

  const fillStyles: React.CSSProperties = {
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: fillColor[color],
    borderRadius: radii.full,
    transition: 'width 300ms ease',
  };

  return (
    <div style={containerStyles} className={className}>
      <div style={trackStyles}>
        <div style={fillStyles} />
      </div>
      {showPercentage && (
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.ink.DEFAULT }}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
