import type { ServiceForm as ServiceFormType, SalonType } from '../types';
import { bufferOptions } from '../schema';
import { getCopy } from '../copy';

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
    (typeKey ? copy.salon.types[typeKey].serviceExample : '') || copy.staff.service.namePlaceholder;
  return (
    <section className="panel">
      <h2>{copy.staff.service.title}</h2>
      <p>{copy.staff.service.body}</p>
      <div className="grid three">
        <label className="field">
          <span className="label">{copy.staff.service.nameLabel}</span>
          <input
            className="input"
            value={service.name}
            onChange={(event) => onServiceChange({ name: event.target.value })}
            placeholder={namePlaceholder}
          />
          {errors.serviceName && <span className="error">{errors.serviceName}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.staff.service.durationLabel}</span>
          <input
            className="input"
            type="number"
            value={service.durationMinutes}
            onChange={(event) => onServiceChange({ durationMinutes: event.target.value })}
            min={5}
            max={480}
          />
          {errors.serviceDuration && <span className="error">{errors.serviceDuration}</span>}
        </label>
        <label className="field">
          <span className="label">{copy.format.priceLabel(currency)}</span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={service.priceDisplay}
            onChange={(event) => onServiceChange({ priceDisplay: event.target.value })}
            placeholder={copy.staff.service.pricePlaceholder}
          />
          {errors.servicePrice && <span className="error">{errors.servicePrice}</span>}
        </label>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <span className="label">{copy.staff.service.bufferLabel}</span>
        <div className="pill-row">
          {bufferOptions.map((option) => (
            <button
              key={option}
              className={`pill ${service.bufferMinutes === option ? 'active' : ''}`}
              type="button"
              onClick={() => onServiceChange({ bufferMinutes: option })}
            >
              {copy.format.bufferMinutes(option)}
            </button>
          ))}
        </div>
        {errors.serviceBuffer && <span className="error">{errors.serviceBuffer}</span>}
      </div>
    </section>
  );
}
