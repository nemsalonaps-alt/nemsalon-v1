import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: spacing[8],
    gap: spacing[3],
  };

  const iconWrapperStyles: React.CSSProperties = {
    width: 64,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.surface.muted,
    borderRadius: '50%',
    color: colors.ink.muted,
    marginBottom: spacing[2],
  };

  const titleStyles: React.CSSProperties = {
    fontFamily: "'Fraunces', serif",
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.ink.DEFAULT,
    margin: 0,
  };

  const descriptionStyles: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.ink.soft,
    maxWidth: '300px',
    margin: 0,
  };

  return (
    <div style={containerStyles} className={className}>
      {icon && <div style={iconWrapperStyles}>{icon}</div>}
      <h3 style={titleStyles}>{title}</h3>
      {description && <p style={descriptionStyles}>{description}</p>}
      {action && <div style={{ marginTop: spacing[2] }}>{action}</div>}
    </div>
  );
}
