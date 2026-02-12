import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Der opstod en fejl',
  message,
  action,
  className = '',
}: ErrorStateProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
    padding: `${spacing[4]} ${spacing[5]}`,
    background: colors.error.soft,
    border: `1px solid ${colors.error.heavy}`,
    borderRadius: radii['2xl'],
    color: colors.error.DEFAULT,
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: 0,
  };

  const messageStyles: React.CSSProperties = {
    fontSize: '0.875rem',
    margin: 0,
  };

  return (
    <div style={containerStyles} className={className}>
      <div style={contentStyles}>
        <p style={titleStyles}>{title}</p>
        <p style={messageStyles}>{message}</p>
      </div>
      {action}
    </div>
  );
}
