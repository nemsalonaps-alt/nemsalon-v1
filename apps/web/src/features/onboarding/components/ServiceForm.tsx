import type { ServiceForm as ServiceFormType, SalonType } from '../types';
import { bufferOptions } from '../schema';
import { getCopy } from '../copy';
import { Card, Stack, Input } from '@nemsalon/ui';

type ServiceFormProps = {
  service: ServiceFormType;
  currency: string;
  salonType?: SalonType | '';
  errors: Record<string, string>;
  onServiceChange: (patch: Partial<ServiceFormType>) => void;
};

export function ServiceForm({ service, currency, salonType, errors, onServiceChange }: ServiceFormProps) {
  const copy = getCopy();
  const typeKey =
    salonType && salonType in copy.salon.types
      ? (salonType as keyof typeof copy.salon.types)
      : null;
  const namePlaceholder =
    (typeKey && copy.salon.types[typeKey] ? copy.salon.types[typeKey].serviceExample : '') || copy.staff.service.namePlaceholder;
  return (
    <Card>
      <h2>{copy.staff.service.title}</h2>
      <p>{copy.staff.service.body}</p>
      <Stack direction="row" gap="md" className="onb-wrap">
        <Input
          label={copy.staff.service.nameLabel}
          value={service.name}
          onChange={(event) => onServiceChange({ name: event.target.value })}
          placeholder={namePlaceholder}
          error={errors.serviceName}
          className="onb-field-200"
        />
        <Input
          label={copy.staff.service.durationLabel}
          type="number"
          value={service.durationMinutes}
          onChange={(event) => onServiceChange({ durationMinutes: event.target.value })}
          error={errors.serviceDuration}
          className="onb-field-120"
          min={5}
          max={480}
        />
        <Input
          label={copy.format.priceLabel(currency)}
          type="text"
          inputMode="decimal"
          value={service.priceDisplay}
          onChange={(event) => onServiceChange({ priceDisplay: event.target.value })}
          placeholder={copy.staff.service.pricePlaceholder}
          error={errors.servicePrice}
          className="onb-field-150"
        />
      </Stack>

      <div className="onb-card-top-sm">
        <span className="onb-buffer-label">
          {copy.staff.service.bufferLabel}
        </span>
        <Stack direction="row" gap="sm" className="onb-wrap onb-buffer-options">
          {bufferOptions.map((option) => (
            <button
              key={option}
              className={[
                'onb-buffer-button',
                service.bufferMinutes === option ? 'onb-buffer-button-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              type="button"
              onClick={() => onServiceChange({ bufferMinutes: option })}
            >
              {copy.format.bufferMinutes(option)}
            </button>
          ))}
        </Stack>
        {errors.serviceBuffer && <span className="onb-error">{errors.serviceBuffer}</span>}
      </div>
    </Card>
  );
}
