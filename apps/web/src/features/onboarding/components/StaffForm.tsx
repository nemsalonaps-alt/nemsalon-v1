import type { StaffForm as StaffFormType, WeeklyHours, DayId } from '../types';
import { getDayLabels } from '../schema';
import { getCopy } from '../copy';
import { Card, Badge, Stack, Input } from '@nemsalon/ui';

type StaffFormProps = {
  staff: StaffFormType;
  staffHours: WeeklyHours[];
  errors: Record<string, string>;
  onStaffChange: (patch: Partial<StaffFormType>) => void;
  onHoursChange: (day: DayId, patch: Partial<WeeklyHours>) => void;
  locale?: string;
};

export function StaffForm({
  staff,
  staffHours,
  errors,
  onStaffChange,
  onHoursChange,
  locale
}: StaffFormProps) {
  const copy = getCopy(locale);
  const dayLabels = getDayLabels(locale);
  return (
    <Card>
      <Badge>{copy.staff.badge}</Badge>
      <h1>{copy.staff.title}</h1>
      <p>{copy.staff.body}</p>
      <Stack direction="row" gap="md" className="onb-wrap">
        <Input
          label={copy.staff.fields.nameLabel}
          value={staff.name}
          onChange={(event) => onStaffChange({ name: event.target.value })}
          placeholder={copy.staff.fields.namePlaceholder}
          error={errors.staffName}
          className="onb-field-250"
        />
        <label className="onb-field-250">
          <span className="onb-label">
            {copy.staff.fields.roleLabel}
          </span>
          <select
            value={staff.role}
            onChange={(event) => onStaffChange({ role: event.target.value as StaffFormType['role'] })}
            className="onb-input"
          >
            <option value="owner">{copy.roles.owner}</option>
            <option value="admin">{copy.roles.admin}</option>
            <option value="staff">{copy.roles.staff}</option>
          </select>
          {errors.staffRole && <span className="onb-error">{errors.staffRole}</span>}
        </label>
      </Stack>

      <Stack direction="row" gap="md" className="onb-wrap onb-card-top-sm">
        <Stack gap="xs" className="onb-field-250">
          <label className="onb-label">{copy.staff.fields.emailLabel}</label>
          <input
            type="email"
            className="onb-input"
            value={staff.email ?? ''}
            onChange={(event) => onStaffChange({ email: event.target.value || undefined })}
            placeholder={copy.staff.fields.emailPlaceholder}
          />
          {errors.staffEmail && <span className="onb-error">{errors.staffEmail}</span>}
        </Stack>
      </Stack>

      <label className="onb-label-toggle">
        <input
          type="checkbox"
          checked={staff.sameHours}
          onChange={(event) => onStaffChange({ sameHours: event.target.checked })}
        />
        {copy.staff.fields.useSalonHours}
      </label>

      {!staff.sameHours && (
        <Card variant="outlined" className="onb-card-top-sm">
          <h2>{copy.staff.fields.workingHoursTitle}</h2>
          {staffHours.map((day) => (
            <Stack key={day.day} direction="row" gap="md" align="center" className="onb-card-top-xs">
              <label className="onb-label-inline">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(event) => onHoursChange(day.day, { enabled: event.target.checked })}
                />
                {dayLabels[day.day]}
              </label>
              <input
                type="time"
                className="onb-input-sm"
                value={day.start}
                onChange={(event) => onHoursChange(day.day, { start: event.target.value })}
                disabled={!day.enabled}
              />
              <input
                type="time"
                className="onb-input-sm"
                value={day.end}
                onChange={(event) => onHoursChange(day.day, { end: event.target.value })}
                disabled={!day.enabled}
              />
            </Stack>
          ))}
          {errors.staffHours && <span className="onb-error onb-error-block">{errors.staffHours}</span>}
        </Card>
      )}
    </Card>
  );
}
