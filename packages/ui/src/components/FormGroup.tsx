import type { ReactNode } from 'react';
import { spacing } from '../theme/spacing.js';

export interface FormGroupProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export function FormGroup({
  children,
  direction = 'column',
  gap = 'md',
  align = 'stretch',
  className = '',
}: FormGroupProps) {
  const gapValues = {
    sm: spacing[2],
    md: spacing[3],
    lg: spacing[4],
  };

  const styles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: gapValues[gap],
    alignItems: align === 'stretch' ? 'stretch' : align,
  };

  return (
    <div style={styles} className={className}>
      {children}
    </div>
  );
}
