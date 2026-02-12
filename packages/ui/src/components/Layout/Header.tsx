import type { ReactNode } from 'react';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function Header({
  title,
  subtitle,
  eyebrow,
  actions,
  className = '',
}: HeaderProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[4],
    marginBottom: spacing[5],
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };

  const eyebrowStyles: React.CSSProperties = {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: colors.ink.soft,
    margin: 0,
  };

  const titleStyles: React.CSSProperties = {
    fontFamily: "'Fraunces', serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.ink.DEFAULT,
    margin: 0,
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.ink.soft,
    margin: 0,
  };

  return (
    <header style={containerStyles} className={className}>
      <div style={contentStyles}>
        {eyebrow && <p style={eyebrowStyles}>{eyebrow}</p>}
        <h1 style={titleStyles}>{title}</h1>
        {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}
