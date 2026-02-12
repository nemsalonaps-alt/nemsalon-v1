import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

type BadgeVariant = 'default' | 'accent' | 'sun' | 'success' | 'error' | 'warning' | 'muted' | 'klar' | 'tilReview' | 'mangler' | 'pro';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  className = '',
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
    default: { bg: colors.surface.muted, color: colors.ink.DEFAULT, border: `1px solid ${colors.surface.border}` },
    accent: { bg: colors.accent.soft, color: colors.accent.DEFAULT, border: `1px solid ${colors.accent.heavy}` },
    sun: { bg: colors.sun.soft, color: colors.ink.DEFAULT, border: `1px solid ${colors.sun.heavy}` },
    success: { bg: colors.success.soft, color: colors.primary[600], border: `1px solid ${colors.primary[300]}` },
    error: { bg: colors.error.soft, color: colors.error.DEFAULT, border: `1px solid ${colors.error.medium}` },
    warning: { bg: colors.sun.medium, color: colors.ink.DEFAULT, border: `1px solid ${colors.sun.heavy}` },
    muted: { bg: colors.surface.muted, color: colors.ink.muted, border: `1px solid ${colors.surface.border}` },
    klar: { bg: colors.status.klar.bg, color: colors.status.klar.text, border: `1px solid ${colors.status.klar.border}` },
    tilReview: { bg: colors.status.tilReview.bg, color: colors.status.tilReview.text, border: `1px solid ${colors.status.tilReview.border}` },
    mangler: { bg: colors.status.mangler.bg, color: colors.status.mangler.text, border: `1px solid ${colors.status.mangler.border}` },
    pro: { bg: colors.status.pro.bg, color: colors.status.pro.text, border: `1px solid ${colors.status.pro.border}` },
  };

  const sizeStyles = {
    sm: { padding: '4px 8px', fontSize: '0.75rem' },
    md: { padding: '6px 12px', fontSize: '0.8125rem' },
  };

  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: styles.bg,
    color: styles.color,
    border: styles.border,
    borderRadius: pill ? radii.full : radii.badge.sm,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={badgeStyles} className={className}>
      {children}
    </span>
  );
}
