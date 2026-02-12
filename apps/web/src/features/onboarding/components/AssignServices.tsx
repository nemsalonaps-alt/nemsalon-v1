import { getCopy } from '../copy';
import { Card } from '@nemsalon/ui';

type AssignServicesProps = {
  assignService: boolean;
  error?: string;
  onToggle: (next: boolean) => void;
};

export function AssignServices({ assignService, error, onToggle }: AssignServicesProps) {
  const copy = getCopy();
  return (
    <Card variant="outlined">
      <label className="onb-assign-label">
        <input
          type="checkbox"
          checked={assignService}
          onChange={(event) => onToggle(event.target.checked)}
        />
        {copy.staff.service.assignLabel}
      </label>
      {error && <span className="onb-error onb-error-block">{error}</span>}
      <p className="onb-assign-note">
        {copy.staff.service.assignNote}
      </p>
    </Card>
  );
}
