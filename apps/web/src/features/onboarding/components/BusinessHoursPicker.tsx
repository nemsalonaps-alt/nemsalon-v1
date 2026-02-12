import type { WeeklyHours, DayId } from '../types';
import { getDayLabels } from '../schema';
import { getCopy } from '../copy';
import { Card, Stack } from '@nemsalon/ui';

type BusinessHoursPickerProps = {
  weekly: WeeklyHours[];
  onChange: (day: DayId, patch: Partial<WeeklyHours>) => void;
  error?: string;
  locale?: string;
};

export function BusinessHoursPicker({ weekly, onChange, error, locale }: BusinessHoursPickerProps) {
  const copy = getCopy(locale);
  const dayLabels = getDayLabels(locale);
  return (
    <Card variant="outlined" className="onb-hours-card">
      <h2>{copy.salon.hours.title}</h2>
      <p className="onb-note">{copy.salon.hours.body}</p>
      {weekly.map((day) => (
        <Stack key={day.day} direction="row" gap="md" align="center" className="onb-hours-row">
          <label className="onb-label-inline">
            <input
              type="checkbox"
              checked={day.enabled}
              onChange={(event) => onChange(day.day, { enabled: event.target.checked })}
            />
            {dayLabels[day.day]}
          </label>
          <input
            type="time"
            className="onb-input-sm"
            value={day.start}
            onChange={(event) => onChange(day.day, { start: event.target.value })}
            disabled={!day.enabled}
          />
          <input
            type="time"
            className="onb-input-sm"
            value={day.end}
            onChange={(event) => onChange(day.day, { end: event.target.value })}
            disabled={!day.enabled}
          />
        </Stack>
      ))}
      {error && <span className="onb-error onb-error-block">{error}</span>}
      <p className="onb-hours-note">
        {copy.salon.hours.note}
      </p>
    </Card>
  );
}
