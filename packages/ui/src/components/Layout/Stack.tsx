import type { ReactNode } from 'react';
import { spacing } from '../../theme/spacing.js';

export interface StackProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Stack({
  children,
  direction = 'column',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  fullWidth = false,
  className = '',
  style,
}: StackProps) {
  const gapMap: Record<string, string> = {
    none: '0',
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    '2xl': spacing['2xl'],
    '3xl': spacing['3xl'],
  };

  const justifyMap: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  const styles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: gapMap[gap],
    alignItems: align === 'stretch' ? 'stretch' : align,
    justifyContent: justifyMap[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    width: fullWidth ? '100%' : 'auto',
    ...style,
  };

  return (
    <div style={styles} className={className}>
      {children}
    </div>
  );
}
