import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { radii } from '../../theme/radii.js';

export interface NavTab {
  key: string;
  label: string;
}

export interface NavTabProps {
  tabs: NavTab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function NavTab({ tabs, activeTab, onChange, className = '' }: NavTabProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[1],
    padding: spacing[2],
    background: colors.surface.muted,
    borderRadius: radii.lg,
  };

  const tabStyles = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? colors.white : colors.ink.muted,
    background: isActive ? colors.primary[500] : 'transparent',
    border: 'none',
    borderRadius: radii.md,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  });

  return (
    <nav style={containerStyles} className={className}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          style={tabStyles(tab.key === activeTab)}
          onClick={() => onChange(tab.key)}
          data-testid={`nav-tab-${tab.key}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
