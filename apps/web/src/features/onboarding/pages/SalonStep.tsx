import type { SalonForm, WeeklyHours, DayId } from '../types';
import { StepLayout } from '../components/StepLayout';
import { BusinessHoursPicker } from '../components/BusinessHoursPicker';
import { getCopy } from '../copy';
import { Input, Stack, Card, Button } from '@nemsalon/ui';

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
  onContinue,
}: SalonStepProps) {
  const copy = getCopy(salon.locale);
  return (
    <StepLayout badge={copy.salon.badge} title={copy.salon.title} subtitle={copy.salon.body}>
      <Stack direction="row" gap="md" className="onb-wrap">
        <Input
          label={copy.salon.fields.nameLabel}
          value={salon.name}
          onChange={(event) => onSalonChange({ name: event.target.value })}
          placeholder={copy.salon.fields.namePlaceholder}
          error={errors.name}
          className="onb-field-250"
          data-testid="salon-name-input"
        />
        <div className="onb-field-250">
          <label className="onb-label">{copy.salon.fields.typeLabel}</label>
          <select
            value={salon.salonType}
            onChange={(event) => onSalonChange({ salonType: event.target.value })}
            className={['onb-select', errors.salonType ? 'onb-select-error' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <option value="">{copy.salon.fields.typePlaceholder}</option>
            {Object.entries(copy.salon.types).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          {errors.salonType && <p className="onb-error onb-card-top-xs">{errors.salonType}</p>}
        </div>
        <Input
          label={copy.salon.fields.timezoneLabel}
          value={salon.timezone}
          onChange={(event) => onSalonChange({ timezone: event.target.value })}
          placeholder={copy.salon.fields.timezonePlaceholder}
          error={errors.timezone}
          className="onb-field-250"
        />
        <Input
          label={copy.salon.fields.localeLabel}
          value={salon.locale}
          onChange={(event) => onSalonChange({ locale: event.target.value })}
          className="onb-field-250"
        />
        <Input
          label={copy.salon.fields.currencyLabel}
          value={salon.currency}
          onChange={(event) => onSalonChange({ currency: event.target.value.toUpperCase() })}
          placeholder={copy.salon.fields.currencyPlaceholder}
          error={errors.currency}
          className="onb-field-250"
        />
      </Stack>

      <BusinessHoursPicker
        weekly={weeklyHours}
        onChange={onHoursChange}
        error={errors.hours}
        locale={salon.locale}
      />

      {apiError && (
        <Card variant="outlined" className="onb-error" data-testid="salon-error">
          <p>{apiError}</p>
        </Card>
      )}

      <Stack direction="row" gap="md" className="onb-actions-row">
        <Button variant="primary" onClick={onContinue} disabled={saving} data-testid="salon-submit">
          {saving ? copy.salon.actions.saving : copy.salon.actions.continue}
        </Button>
      </Stack>
      {apiError && (
        <Card variant="outlined" className="onb-error-card onb-card-top-sm">
          <p className="onb-error onb-note-tight">{apiError}</p>
        </Card>
      )}
    </StepLayout>
  );
}
