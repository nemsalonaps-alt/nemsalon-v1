import { colors } from '../theme/colors.js';
import { spacing } from '../theme/spacing.js';
import { radii } from '../theme/radii.js';

export interface Step {
  key: string;
  label: string;
  number: number;
}

export interface StepperProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[2],
    padding: spacing[4],
    background: colors.surface.DEFAULT,
    border: `1px solid ${colors.surface.border}`,
    borderRadius: radii['3xl'],
  };

  const stepStyles = (index: number): React.CSSProperties => {
    const isActive = index === currentIndex;
    const isComplete = index < currentIndex;

    return {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2]} ${spacing[3]}`,
      borderRadius: radii.lg,
      transition: 'all 200ms ease',
      flex: 1,
      justifyContent: 'center',
      background: isActive ? colors.accent.DEFAULT : isComplete ? colors.accent.soft : 'transparent',
      color: isActive ? colors.white : isComplete ? colors.accent.DEFAULT : colors.ink.soft,
    };
  };

  const numberStyles = (index: number): React.CSSProperties => {
    const isActive = index === currentIndex;
    const isComplete = index < currentIndex;

    return {
      width: 24,
      height: 24,
      display: 'grid',
      placeItems: 'center',
      fontSize: '0.75rem',
      fontWeight: 600,
      borderRadius: radii.full,
      background: isActive ? 'rgba(255, 255, 255, 0.2)' : isComplete ? colors.accent.DEFAULT : colors.surface.muted,
      color: isActive ? colors.white : isComplete ? colors.white : colors.ink.soft,
    };
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyles} className={className}>
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        return (
          <div key={step.key} style={stepStyles(index)}>
            <span style={numberStyles(index)}>
              {isComplete ? '✓' : step.number}
            </span>
            <span style={labelStyles} className="stepper-label">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
