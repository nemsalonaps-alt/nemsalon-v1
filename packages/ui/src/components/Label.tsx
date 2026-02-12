import type { LabelHTMLAttributes, ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted';
}

export function Label({
  children,
  required,
  size = 'md',
  variant = 'default',
  className = '',
  ...props
}: LabelProps) {
  const sizeStyles = {
    sm: { fontSize: '0.75rem', letterSpacing: '0.05em' },
    md: { fontSize: '0.75rem', letterSpacing: '0.06em' },
    lg: { fontSize: '0.875rem', letterSpacing: '0.04em' },
  };

  const labelStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    fontWeight: 600,
    textTransform: 'uppercase',
    color: variant === 'muted' ? colors.ink.muted : colors.ink.soft,
    ...sizeStyles[size],
  };

  const requiredStyles: React.CSSProperties = {
    color: colors.error.DEFAULT,
  };

  return (
    <label style={labelStyles} className={className} {...props}>
      {children}
      {required && <span style={requiredStyles}>*</span>}
    </label>
  );
}
