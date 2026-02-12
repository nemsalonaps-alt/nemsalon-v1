import type { StepId } from '../types';
import { getCopy } from '../copy';

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
  const copy = getCopy();
  const stepIndex = steps.findIndex((item) => item.id === activeStep);

  return (
    <aside className="onb-aside">
      <h2 className="onb-step-title">{copy.stepper.title}</h2>
      {steps.map((item, index) => {
        const status = index < stepIndex ? 'complete' : index === stepIndex ? 'active' : 'upcoming';
        return (
          <div
            key={item.id}
            className={[
              'onb-step-row',
              status === 'upcoming' ? 'onb-step-row-upcoming' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className={[
                'onb-step-index',
                status === 'complete' || status === 'active' ? 'onb-step-index-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {index + 1}
            </div>
            <div className="onb-step-content">
              <strong className="onb-step-name">{item.title}</strong>
              <span className="onb-step-hint">{item.hint}</span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
