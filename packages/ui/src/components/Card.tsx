import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';
import { shadows } from '../theme/shadows.js';

export interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'muted' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  variant = 'default',
  size = 'md',
  shadow = false,
  hover = false,
  className = '',
  style,
  onClick,
}: CardProps) {
  const padding = {
    sm: spacing.card.sm,
    md: spacing.card.md,
    lg: spacing.card.lg,
  };

  const radius = {
    sm: radii.card.sm,
    md: radii.card.md,
    lg: radii.card.lg,
  };

  const background = {
    default: colors.surface.DEFAULT,
    muted: colors.surface.muted,
    outlined: 'transparent',
  };

  const border = {
    default: `1px solid ${colors.surface.border}`,
    muted: `1px solid ${colors.surface.border}`,
    outlined: `1px solid ${colors.surface.border}`,
  };

  const styles: React.CSSProperties = {
    padding: padding[size],
    borderRadius: radius[size],
    background: background[variant],
    border: border[variant],
    boxShadow: shadow ? shadows.card : variant === 'default' ? '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
    cursor: onClick ? 'pointer' : 'default',
    transition: hover ? 'all 200ms ease' : 'all 150ms ease',
    ...style,
  };

  return (
    <div 
      style={styles} 
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = colors.primary[300];
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = shadows.cardHover;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = variant === 'outlined' ? colors.surface.border : colors.surface.border;
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = shadow ? shadows.card : 'none';
        }
      }}
    >
      {children}
    </div>
  );
}
