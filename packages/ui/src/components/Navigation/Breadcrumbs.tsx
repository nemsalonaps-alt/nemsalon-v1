import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';

export interface BreadcrumbItem {
  key: string;
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: '0.875rem',
    color: colors.ink.soft,
  };

  const itemStyles: React.CSSProperties = {
    color: colors.ink.soft,
    textDecoration: 'none',
    transition: 'color 150ms ease',
  };

  const activeStyles: React.CSSProperties = {
    color: colors.ink.DEFAULT,
    fontWeight: 500,
  };

  const separatorStyles: React.CSSProperties = {
    color: colors.ink.muted,
  };

  return (
    <nav style={containerStyles} className={className}>
      {items.map((item, index) => (
        <span key={item.key} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {index > 0 && <span style={separatorStyles}>/</span>}
          {item.href ? (
            <a
              href={item.href}
              style={itemStyles}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent.DEFAULT; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.ink.soft; }}
            >
              {item.label}
            </a>
          ) : (
            <span style={index === items.length - 1 ? activeStyles : itemStyles}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
