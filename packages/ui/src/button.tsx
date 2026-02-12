import type { ButtonHTMLAttributes, ReactNode } from 'react';
import * as React from 'react';
import { colors } from './theme/colors.js';
import { spacing } from './theme/spacing.js';
import { radii } from './theme/radii.js';
import { shadows } from './theme/shadows.js';
import { typography } from './theme/typography.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'pill';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const sizePadding = {
  sm: `${spacing[2]} ${spacing[3]}`,
  md: `${spacing[3]} ${spacing[4]}`,
  lg: `${spacing[4]} ${spacing[6]}`,
};

const sizeFontSize = {
  sm: typography.fontSize.sm,
  md: typography.fontSize.base,
  lg: typography.fontSize.lg,
};

const sizeRadius = {
  sm: radii.button.sm,
  md: radii.button.md,
  lg: radii.button.lg,
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: sizePadding[size],
    fontSize: sizeFontSize[size],
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.sans,
    lineHeight: '1.5',
    border: 'none',
    borderRadius: variant === 'pill' ? radii.button.pill : sizeRadius[size],
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    boxShadow: shadows.button,
    opacity: disabled || isLoading ? 0.6 : 1,
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: colors.primary[500],
      color: colors.white,
    },
    secondary: {
      backgroundColor: colors.white,
      color: colors.ink.DEFAULT,
      border: `1px solid ${colors.surface.border}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.ink.DEFAULT,
    },
    subtle: {
      backgroundColor: colors.primary[50],
      color: colors.primary[700],
    },
    danger: {
      backgroundColor: colors.error.DEFAULT,
      color: colors.white,
    },
    pill: {
      backgroundColor: colors.primary[500],
      color: colors.white,
    },
  };

  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: colors.primary[600],
      boxShadow: shadows.buttonHover,
      transform: 'translateY(-1px)',
    },
    secondary: {
      backgroundColor: colors.surface.muted,
      borderColor: colors.primary[200],
    },
    ghost: {
      backgroundColor: colors.surface.muted,
    },
    subtle: {
      backgroundColor: colors.primary[100],
    },
    danger: {
      backgroundColor: '#b91c1c',
      boxShadow: shadows.error,
    },
    pill: {
      backgroundColor: colors.primary[600],
      boxShadow: shadows.buttonHover,
      transform: 'translateY(-1px)',
    },
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...(isHovered && !disabled && !isLoading ? hoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      role="button"
      style={combinedStyles}
      disabled={disabled || isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-flex', width: '1em', height: '1em' }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              height: '100%',
              animation: 'nemsalon-spin 1.5s linear infinite',
            }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset="60"
            >
              <animate
                attributeName="stroke-dashoffset"
                dur="1.5s"
                repeatCount="indefinite"
                from="60"
                to="0"
              />
            </circle>
          </svg>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
