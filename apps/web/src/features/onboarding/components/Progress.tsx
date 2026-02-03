import type { StepId } from '../types';
import { copy } from '../copy';

type Step = {
  id: StepId;
  title: string;
  hint: string;
};

type ProgressProps = {
  steps: Step[];
  activeStep: StepId;
};

export function Progress({ steps, activeStep }: ProgressProps) {
  const stepIndex = steps.findIndex((item) => item.id === activeStep);

  return (
    <aside className="stepper">
      <h2>{copy.stepper.title}</h2>
      {steps.map((item, index) => {
        const status = index < stepIndex ? 'complete' : index === stepIndex ? 'active' : 'upcoming';
        return (
          <div key={item.id} className={`step ${status}`}>
            <div className="step-indicator">{index + 1}</div>
            <div className="step-label">
              <strong>{item.title}</strong>
              <span>{item.hint}</span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
