import type { ReactNode } from 'react';

export interface ContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Container({
  children,
  maxWidth = 'xl',
  className = '',
}: ContainerProps) {
  const maxWidthMap = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  };

  const containerStyles: React.CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
    margin: '0 auto',
    width: '100%',
  };

  return (
    <div style={containerStyles} className={className}>
      {children}
    </div>
  );
}
