import type { SelectHTMLAttributes, ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export function Select({
  label,
  error,
  hint,
  size = 'md',
  options,
  placeholder,
  fullWidth = false,
  leftIcon,
  className = '',
  disabled,
  ...props
}: SelectProps) {
  const hasError = !!error;

  const sizePadding = {
    sm: spacing.input.sm,
    md: spacing.input.md,
    lg: spacing.input.lg,
  };

  const sizeFontSize = {
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '1rem',
  };

  const wrapperStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.ink.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const selectWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: fullWidth ? '100%' : 'auto',
  };

  const selectStyles: React.CSSProperties = {
    width: '100%',
    padding: sizePadding[size],
    fontSize: sizeFontSize[size],
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    color: colors.ink.DEFAULT,
    background: colors.surface.DEFAULT,
    border: `1px solid ${hasError ? colors.error.DEFAULT : colors.surface.border}`,
    borderRadius: radii.input[size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'],
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    ...(leftIcon && { paddingLeft: '40px' }),
  };

  const chevronStyles: React.CSSProperties = {
    position: 'absolute',
    right: spacing[3],
    pointerEvents: 'none',
    color: colors.ink.muted,
  };

  const hintStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    color: hasError ? colors.error.DEFAULT : colors.ink.muted,
    marginTop: spacing[1],
  };

  return (
    <div style={wrapperStyles} className={className}>
      {label && <label style={labelStyles}>{label}</label>}
      <div style={selectWrapperStyles}>
        <select
          disabled={disabled}
          style={selectStyles}
          {...props}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary[500];
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary[100]}`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError ? colors.error.DEFAULT : colors.surface.border;
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={chevronStyles}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {(hint || error) && <span style={hintStyles}>{error || hint}</span>}
    </div>
  );
}
