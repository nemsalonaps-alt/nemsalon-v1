import type { ReactNode } from 'react';
import { spacing } from '../../theme/spacing.js';

export interface GridProps {
  children: ReactNode;
  columns?: number;
  minColumnWidth?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Grid({
  children,
  columns,
  minColumnWidth = '200px',
  gap = 'md',
  className = '',
}: GridProps) {
  const gapMap: Record<string, string> = {
    none: '0',
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  const styles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: columns
      ? `repeat(${columns}, 1fr)`
      : `repeat(auto-fill, minmax(${minColumnWidth}, 1fr))`,
    gap: gapMap[gap],
  };

  return (
    <div style={styles} className={className}>
      {children}
    </div>
  );
}
