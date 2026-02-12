import type { TextareaHTMLAttributes } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  rows?: number;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function TextArea({
  label,
  error,
  hint,
  size = 'md',
  rows = 4,
  fullWidth = false,
  resize = 'vertical',
  className = '',
  disabled,
  style,
  ...props
}: TextAreaProps) {
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

  const textareaStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    minHeight: `${rows * 24}px`,
    padding: sizePadding[size],
    fontSize: sizeFontSize[size],
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    color: colors.ink.DEFAULT,
    background: colors.surface.DEFAULT,
    border: `1px solid ${hasError ? colors.error.DEFAULT : colors.surface.border}`,
    borderRadius: radii.input[size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'],
    outline: 'none',
    resize,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    ...style,
  };

  const hintStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    color: hasError ? colors.error.DEFAULT : colors.ink.muted,
    marginTop: spacing[1],
  };

  return (
    <div style={wrapperStyles} className={className}>
      {label && <label style={labelStyles}>{label}</label>}
      <textarea
        rows={rows}
        disabled={disabled}
        style={textareaStyles}
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
      />
      {(hint || error) && <span style={hintStyles}>{error || hint}</span>}
    </div>
  );
}
