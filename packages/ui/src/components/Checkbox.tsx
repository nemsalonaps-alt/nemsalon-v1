import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  error,
  hint,
  size = 'md',
  indeterminate,
  className = '',
  disabled,
  checked,
  ...props
}: CheckboxProps) {
  const hasError = !!error;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const sizeMap = {
    sm: { checkbox: 16, check: 10 },
    md: { checkbox: 20, check: 12 },
    lg: { checkbox: 24, check: 14 },
  };

  const sizeValue = sizeMap[size];

  const wrapperStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };

  const rowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const checkboxStyles: React.CSSProperties = {
    width: sizeValue.checkbox,
    height: sizeValue.checkbox,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: checked ? colors.primary[500] : colors.surface.DEFAULT,
    border: `2px solid ${checked ? colors.primary[500] : hasError ? colors.error.DEFAULT : colors.surface.border}`,
    borderRadius: radii.xs,
    transition: 'all 150ms ease',
  };

  const checkmarkStyles: React.CSSProperties = {
    width: sizeValue.check,
    height: sizeValue.check,
    color: colors.white,
    opacity: checked ? 1 : 0,
    transform: checked ? 'scale(1)' : 'scale(0.8)',
    transition: 'all 150ms ease',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: size === 'lg' ? '1rem' : size === 'sm' ? '0.8125rem' : '0.875rem',
    color: disabled ? colors.ink.muted : colors.ink.DEFAULT,
    userSelect: 'none',
  };

  const hintStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    color: hasError ? colors.error.DEFAULT : colors.ink.muted,
    marginLeft: sizeValue.checkbox + 8,
  };

  return (
    <label style={wrapperStyles} className={className}>
      <div style={rowStyles}>
        <span style={checkboxStyles}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={checkmarkStyles}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          {...props}
        />
        {label && <span style={labelStyles}>{label}</span>}
      </div>
      {(hint || error) && <span style={hintStyles}>{error || hint}</span>}
    </label>
  );
}
