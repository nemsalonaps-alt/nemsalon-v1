import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';

export interface Tab {
  key: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[1],
    borderBottom: `1px solid ${colors.surface.border}`,
  };

  const tabStyles = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? colors.accent.DEFAULT : colors.ink.soft,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${isActive ? colors.accent.DEFAULT : 'transparent'}`,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    marginBottom: '-1px',
  });

  return (
    <nav style={containerStyles} className={className}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            style={tabStyles(isActive)}
            onClick={() => onChange(tab.key)}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = colors.ink.DEFAULT;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = colors.ink.soft;
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
