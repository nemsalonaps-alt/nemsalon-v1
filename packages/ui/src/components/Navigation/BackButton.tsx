import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { radii } from '../../theme/radii.js';

export interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function BackButton({ onClick, label = 'Tilbage', className = '' }: BackButtonProps) {
  const buttonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.ink.soft,
    background: 'transparent',
    border: 'none',
    borderRadius: radii.md,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };

  return (
    <button
      style={buttonStyles}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.accent.DEFAULT;
        e.currentTarget.style.background = colors.surface.muted;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.ink.soft;
        e.currentTarget.style.background = 'transparent';
      }}
      className={className}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
}
