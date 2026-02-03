import type { ReactNode } from 'react';

type StepLayoutProps = {
  badge?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StepLayout({ badge, title, subtitle, children }: StepLayoutProps) {
  return (
    <section className="panel">
      {badge && <span className="badge">{badge}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </section>
  );
}
