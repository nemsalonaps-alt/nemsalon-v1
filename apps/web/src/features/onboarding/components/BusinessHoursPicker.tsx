import type { WeeklyHours, DayId } from '../types';
import { dayLabels } from '../schema';
import { copy } from '../copy';

type BusinessHoursPickerProps = {
  weekly: WeeklyHours[];
  onChange: (day: DayId, patch: Partial<WeeklyHours>) => void;
  error?: string;
};

export function BusinessHoursPicker({ weekly, onChange, error }: BusinessHoursPickerProps) {
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <h2>{copy.salon.hours.title}</h2>
      <p>{copy.salon.hours.body}</p>
      {weekly.map((day) => (
        <div key={day.day} className="hours-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={day.enabled}
              onChange={(event) => onChange(day.day, { enabled: event.target.checked })}
            />
            {dayLabels[day.day]}
          </label>
          <input
            className="input"
            type="time"
            value={day.start}
            onChange={(event) => onChange(day.day, { start: event.target.value })}
            disabled={!day.enabled}
          />
          <input
            className="input"
            type="time"
            value={day.end}
            onChange={(event) => onChange(day.day, { end: event.target.value })}
            disabled={!day.enabled}
          />
        </div>
      ))}
      {error && <span className="error">{error}</span>}
      <div className="note" style={{ marginTop: 12 }}>
        {copy.salon.hours.note}
      </div>
    </div>
  );
}
