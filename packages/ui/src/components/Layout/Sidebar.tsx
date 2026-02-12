import type { ReactNode } from 'react';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';

export interface SidebarProps {
  children: ReactNode;
  width?: number;
  collapsible?: boolean;
  className?: string;
}

export function Sidebar({
  children,
  width = 250,
  className = '',
}: SidebarProps) {
  const sidebarStyles: React.CSSProperties = {
    width,
    minHeight: '100vh',
    background: colors.surface.muted,
    borderRight: `1px solid ${colors.surface.border}`,
    padding: spacing[4],
    flexShrink: 0,
  };

  return (
    <aside style={sidebarStyles} className={className}>
      {children}
    </aside>
  );
}
