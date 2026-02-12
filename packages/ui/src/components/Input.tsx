import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  id?: string;
}

const sizeStyles = {
  sm: {
    padding: spacing.input.sm,
    fontSize: '0.8125rem',
  },
  md: {
    padding: spacing.input.md,
    fontSize: '0.875rem',
  },
  lg: {
    padding: spacing.input.lg,
    fontSize: '1rem',
  },
};

export function Input({
  label,
  error,
  hint,
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  inputRef,
  id: providedId,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const hasError = !!error;
  const sizeStyle = sizeStyles[size];

  const inputStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    color: colors.ink.DEFAULT,
    background: colors.surface.DEFAULT,
    border: `1px solid ${hasError ? colors.error.DEFAULT : colors.surface.border}`,
    borderRadius: radii.input[size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'],
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    ...(leftIcon && { paddingLeft: '40px' }),
    ...(rightIcon && { paddingRight: '40px' }),
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

  const iconWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: fullWidth ? '100%' : 'auto',
  };

  const leftIconStyles: React.CSSProperties = {
    position: 'absolute',
    left: spacing[3],
    display: 'flex',
    alignItems: 'center',
    color: colors.ink.muted,
    pointerEvents: 'none',
  };

  const rightIconStyles: React.CSSProperties = {
    position: 'absolute',
    right: spacing[3],
    display: 'flex',
    alignItems: 'center',
    color: colors.ink.muted,
    pointerEvents: 'none',
  };

  const hintStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    color: hasError ? colors.error.DEFAULT : colors.ink.muted,
    marginTop: spacing[1],
  };

  return (
    <div style={wrapperStyles} className={className}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
        </label>
      )}
      <div style={iconWrapperStyles}>
        {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}
        <input
          id={inputId}
          style={inputStyles}
          disabled={disabled}
          ref={inputRef}
          {...props}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary[500];
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary[100]}`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? colors.error.DEFAULT
              : colors.surface.border;
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
        {rightIcon && <span style={rightIconStyles}>{rightIcon}</span>}
      </div>
      {(hint || error) && <span style={hintStyles}>{error || hint}</span>}
    </div>
  );
}
