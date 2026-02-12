import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';
import { shadows } from '../theme/shadows.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className = '' }: ModalProps) {
  if (!isOpen) return null;

  const sizeMap = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '500px' },
    lg: { maxWidth: '700px' },
  };

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(27, 24, 20, 0.5)',
    zIndex: 1000,
    padding: spacing[4],
  };

  const modalStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: sizeMap[size].maxWidth,
    background: colors.surface.DEFAULT,
    borderRadius: radii['3xl'],
    boxShadow: shadows.modal,
    overflow: 'hidden',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[4]} ${spacing[5]}`,
    borderBottom: `1px solid ${colors.surface.border}`,
  };

  const titleStyles: React.CSSProperties = {
    fontFamily: "'Fraunces', serif",
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: 0,
    color: colors.ink.DEFAULT,
  };

  const closeButtonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: radii.md,
    cursor: 'pointer',
    color: colors.ink.muted,
    transition: 'all 150ms ease',
  };

  const contentStyles: React.CSSProperties = {
    padding: spacing[5],
  };

  return (
    <div style={overlayStyles} onClick={onClose} className={className}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={headerStyles}>
            <h2 style={titleStyles}>{title}</h2>
            <button
              style={closeButtonStyles}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.surface.muted;
                e.currentTarget.style.color = colors.ink.DEFAULT;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.ink.muted;
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div style={contentStyles}>{children}</div>
      </div>
    </div>
  );
}
