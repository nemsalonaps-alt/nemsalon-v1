import type { SalonForm, WeeklyHours, DayId, SalonType } from '../types';
import { StepLayout } from '../components/StepLayout';
import { BusinessHoursPicker } from '../components/BusinessHoursPicker';
import { getCopy } from '../copy';

type SalonStepProps = {
  salon: SalonForm;
  weeklyHours: WeeklyHours[];
  errors: Record<string, string>;
  saving: boolean;
  apiError?: string;
  onSalonChange: (patch: Partial<SalonForm>) => void;
  onHoursChange: (day: DayId, patch: Partial<WeeklyHours>) => void;
  onContinue: () => void;
};

export function SalonStep({
  salon,
  weeklyHours,
  errors,
  saving,
  apiError,
  onSalonChange,
  onHoursChange,
  onContinue
}: SalonStepProps) {
  const copy = getCopy(salon.locale);
  const typeKeys = Object.keys(copy.salon.types) as SalonType[];
  const activeType =
    salon.salonType && salon.salonType in copy.salon.types
      ? (salon.salonType as SalonType)
      : null;
  const activeTypeMeta = activeType ? copy.salon.types[activeType] : null;
  return (
    <StepLayout
      badge={copy.salon.badge}
      title={copy.salon.title}
      subtitle={copy.salon.body}
    >
      <div className="grid two">
        <label className="field">
          <span className="label">{copy.salon.fields.nameLabel}</span>
          <input
            className="input"
            value={salon.name}
            onChange={(event) => onSalonChange({ name: event.target.value })}
            placeholder={copy.salon.fields.namePlaceholder}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.salon.fields.timezoneLabel}</span>
          <input
            className="input"
            value={salon.timezone}
            onChange={(event) => onSalonChange({ timezone: event.target.value })}
            placeholder={copy.salon.fields.timezonePlaceholder}
          />
          {errors.timezone && <span className="error">{errors.timezone}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.salon.fields.localeLabel}</span>
          <select
            className="select"
            value={salon.locale}
            onChange={(event) => onSalonChange({ locale: event.target.value })}
          >
            <option value="da">{copy.locales.da}</option>
            <option value="en">{copy.locales.en}</option>
          </select>
          {errors.locale && <span className="error">{errors.locale}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.salon.fields.typeLabel}</span>
          <select
            className="select"
            value={salon.salonType}
            onChange={(event) =>
              onSalonChange({ salonType: event.target.value as SalonType | '' })
            }
          >
            <option value="">{copy.salon.fields.typePlaceholder}</option>
            {typeKeys.map((key) => (
              <option key={key} value={key}>
                {copy.salon.types[key].label}
              </option>
            ))}
          </select>
          {errors.salonType && <span className="error">{errors.salonType}</span>}
          {activeTypeMeta && <div className="note">{activeTypeMeta.description}</div>}
        </label>
        <label className="field">
          <span className="label">{copy.salon.fields.currencyLabel}</span>
          <input
            className="input"
            value={salon.currency}
            onChange={(event) => onSalonChange({ currency: event.target.value.toUpperCase() })}
            placeholder={copy.salon.fields.currencyPlaceholder}
          />
          {errors.currency && <span className="error">{errors.currency}</span>}
        </label>
      </div>

      <BusinessHoursPicker
        weekly={weeklyHours}
        onChange={onHoursChange}
        error={errors.hours}
        locale={salon.locale}
      />

      <div className="btn-row">
        <button className="btn primary" type="button" onClick={onContinue} disabled={saving}>
          {saving ? copy.salon.actions.saving : copy.salon.actions.continue}
        </button>
      </div>
      {apiError && (
        <div className="banner" style={{ marginTop: 16 }}>
          {apiError}
        </div>
      )}
    </StepLayout>
  );
}
