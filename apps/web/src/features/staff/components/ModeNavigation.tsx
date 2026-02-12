import { Stack } from '@nemsalon/ui';

export type StaffMode = 'home' | 'schedule' | 'bookings' | 'earnings' | 'profile';

type ModeNavigationProps = {
  currentMode: StaffMode;
  onModeChange: (mode: StaffMode) => void;
  copy: {
    home: string;
    schedule: string;
    bookings: string;
    earnings: string;
    profile: string;
  };
};

export function ModeNavigation({ currentMode, onModeChange, copy }: ModeNavigationProps) {
  const modes: { id: StaffMode; label: string; icon: string }[] = [
    { id: 'home', label: copy.home, icon: '🏠' },
    { id: 'schedule', label: copy.schedule, icon: '📅' },
    { id: 'bookings', label: copy.bookings, icon: '📋' },
    { id: 'earnings', label: copy.earnings, icon: '💰' },
    { id: 'profile', label: copy.profile, icon: '👤' },
  ];

  return (
    <Stack direction="row" gap="xs" className="sc-mode-nav" justify="center" align="center">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`sc-mode-btn ${currentMode === mode.id ? 'sc-mode-btn--active' : ''}`}
          data-testid={`staff-mode-${mode.id}`}
        >
          <span className="sc-mode-icon">{mode.icon}</span>
          <span className="sc-mode-label">{mode.label}</span>
        </button>
      ))}
    </Stack>
  );
}
