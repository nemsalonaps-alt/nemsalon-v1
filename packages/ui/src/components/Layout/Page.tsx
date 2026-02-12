import type { ReactNode } from 'react';
import { colors } from '../../theme/colors.js';

export interface PageProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Page({
  children,
  maxWidth = 'xl',
  padding = 'md',
  className = '',
}: PageProps) {
  const maxWidthMap = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  };

  const paddingMap = {
    none: '0',
    sm: '20px 5vw',
    md: '36px 5vw',
    lg: '48px 5vw',
  };

  const pageStyles: React.CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
    margin: '0 auto',
    padding: paddingMap[padding],
    minHeight: '100vh',
    color: colors.ink.DEFAULT,
  };

  return (
    <main style={pageStyles} className={className}>
      {children}
    </main>
  );
}
