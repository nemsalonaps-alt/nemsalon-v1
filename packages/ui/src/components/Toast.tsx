import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';
import { shadows } from '../theme/shadows.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  className?: string;
}

export function Toast({ message, type = 'info', onClose, className = '' }: ToastProps) {
  const typeStyles: Record<ToastType, { bg: string; color: string; icon: string }> = {
    success: { bg: colors.accent.DEFAULT, color: colors.white, icon: '✓' },
    error: { bg: colors.error.DEFAULT, color: colors.white, icon: '✕' },
    warning: { bg: colors.sun.DEFAULT, color: colors.ink.DEFAULT, icon: '!' },
    info: { bg: colors.accent.DEFAULT, color: colors.white, icon: 'i' },
  };

  const styles = typeStyles[type];

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: spacing[6],
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[5]}`,
    background: styles.bg,
    color: styles.color,
    borderRadius: radii.full,
    fontSize: '0.875rem',
    fontWeight: 500,
    boxShadow: type === 'error' ? shadows.toastError : shadows.toast,
    zIndex: 1000,
  };

  const iconStyles: React.CSSProperties = {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.full,
    fontSize: '0.75rem',
    fontWeight: 700,
  };

  return (
    <div style={containerStyles} className={className}>
      <span style={iconStyles}>{styles.icon}</span>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginLeft: spacing[2],
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
