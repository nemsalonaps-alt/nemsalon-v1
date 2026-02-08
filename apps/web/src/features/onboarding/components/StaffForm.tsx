import type { StaffForm as StaffFormType, WeeklyHours, DayId } from '../types';
import { getDayLabels } from '../schema';
import { getCopy } from '../copy';

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
    <section className="panel">
      <span className="badge">{copy.staff.badge}</span>
      <h1>{copy.staff.title}</h1>
      <p>{copy.staff.body}</p>
      <div className="grid two">
        <label className="field">
          <span className="label">{copy.staff.fields.nameLabel}</span>
          <input
            className="input"
            value={staff.name}
            onChange={(event) => onStaffChange({ name: event.target.value })}
            placeholder={copy.staff.fields.namePlaceholder}
          />
          {errors.staffName && <span className="error">{errors.staffName}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.staff.fields.roleLabel}</span>
          <select
            className="select"
            value={staff.role}
            onChange={(event) => onStaffChange({ role: event.target.value as StaffFormType['role'] })}
          >
            <option value="owner">{copy.roles.owner}</option>
            <option value="admin">{copy.roles.admin}</option>
            <option value="staff">{copy.roles.staff}</option>
          </select>
          {errors.staffRole && <span className="error">{errors.staffRole}</span>}
        </label>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <label className="field">
          <span className="label">{copy.staff.fields.emailLabel ?? 'Email (optional)'}</span>
          <input
            className="input"
            type="email"
            value={staff.email ?? ''}
            onChange={(event) => onStaffChange({ email: event.target.value || undefined })}
            placeholder={copy.staff.fields.emailPlaceholder ?? 'staff@example.com'}
          />
          {errors.staffEmail && <span className="error">{errors.staffEmail}</span>}
        </label>
      </div>

      <label className="toggle" style={{ marginTop: 16 }}>
        <input
          type="checkbox"
          checked={staff.sameHours}
          onChange={(event) => onStaffChange({ sameHours: event.target.checked })}
        />
        {copy.staff.fields.useSalonHours}
      </label>

      {!staff.sameHours && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>{copy.staff.fields.workingHoursTitle}</h2>
          {staffHours.map((day) => (
            <div key={day.day} className="hours-row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(event) => onHoursChange(day.day, { enabled: event.target.checked })}
                />
                {dayLabels[day.day]}
              </label>
              <input
                className="input"
                type="time"
                value={day.start}
                onChange={(event) => onHoursChange(day.day, { start: event.target.value })}
                disabled={!day.enabled}
              />
              <input
                className="input"
                type="time"
                value={day.end}
                onChange={(event) => onHoursChange(day.day, { end: event.target.value })}
                disabled={!day.enabled}
              />
            </div>
          ))}
          {errors.staffHours && <span className="error">{errors.staffHours}</span>}
        </div>
      )}
    </section>
  );
}
