import type {
  DayId,
  ServiceForm,
  StaffForm as StaffFormType,
  WeeklyHours,
  SalonType
} from '../types';
import { AssignServices } from '../components/AssignServices';
import { ServiceForm as ServiceFormComponent } from '../components/ServiceForm';
import { StaffForm } from '../components/StaffForm';
import { getCopy } from '../copy';
import { Card, Stack, Button } from '@nemsalon/ui';

type SetupStepProps = {
  staff: StaffFormType;
  staffHours: WeeklyHours[];
  service: ServiceForm;
  currency: string;
  salonType?: SalonType | '';
  locale?: string;
  assignService: boolean;
  errors: Record<string, string>;
  saving: boolean;
  apiError?: string;
  onStaffChange: (patch: Partial<StaffFormType>) => void;
  onStaffHoursChange: (day: DayId, patch: Partial<WeeklyHours>) => void;
  onServiceChange: (patch: Partial<ServiceForm>) => void;
  onAssignChange: (next: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function SetupStep({
  staff,
  staffHours,
  service,
  currency,
  salonType,
  locale,
  assignService,
  errors,
  saving,
  apiError,
  onStaffChange,
  onStaffHoursChange,
  onServiceChange,
  onAssignChange,
  onBack,
  onContinue
}: SetupStepProps) {
  const copy = getCopy();
  return (
    <>
      <StaffForm
        staff={staff}
        staffHours={staffHours}
        errors={errors}
        onStaffChange={onStaffChange}
        onHoursChange={onStaffHoursChange}
        locale={locale}
      />
      <ServiceFormComponent
        service={service}
        currency={currency}
        salonType={salonType}
        errors={errors}
        onServiceChange={onServiceChange}
      />
      <AssignServices assignService={assignService} error={errors.assignService} onToggle={onAssignChange} />

      <Stack direction="row" gap="md" className="onb-actions">
        <Button variant="ghost" onClick={onBack}>
          {copy.staff.actions.back}
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={saving}>
          {saving ? copy.staff.actions.saving : copy.staff.actions.continue}
        </Button>
      </Stack>
      {apiError && (
        <Card variant="outlined" className="onb-error-card onb-error-card-soft onb-card-top-sm">
          <p className="onb-error onb-note-tight">{apiError}</p>
        </Card>
      )}
    </>
  );
}
