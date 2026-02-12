import type { ReactNode } from 'react';
import { Card, Badge } from '@nemsalon/ui';

type StepLayoutProps = {
  badge?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StepLayout({ badge, title, subtitle, children }: StepLayoutProps) {
  return (
    <Card>
      {badge && <Badge variant="default">{badge}</Badge>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </Card>
  );
}
