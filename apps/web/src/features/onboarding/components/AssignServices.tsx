import { copy } from '../copy';

type AssignServicesProps = {
  assignService: boolean;
  error?: string;
  onToggle: (next: boolean) => void;
};

export function AssignServices({ assignService, error, onToggle }: AssignServicesProps) {
  return (
    <div className="panel">
      <label className="toggle" style={{ marginTop: 18 }}>
        <input
          type="checkbox"
          checked={assignService}
          onChange={(event) => onToggle(event.target.checked)}
        />
        {copy.staff.service.assignLabel}
      </label>
      {error && <span className="error">{error}</span>}
      <div className="note" style={{ marginTop: 12 }}>
        {copy.staff.service.assignNote}
      </div>
    </div>
  );
}
