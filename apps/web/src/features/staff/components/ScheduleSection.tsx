import { useState } from 'react';
import { formatDateTime } from '@nemsalon/shared';
import { Button, Card, Stack, Input } from '@nemsalon/ui';
import type { BusinessHoursEntry } from '../../console/types';

interface ScheduleSectionProps {
  workingHours: BusinessHoursEntry[];
  timeOffEntries: Array<{ id: string; startTime: string; endTime: string; reason?: string | null }>;
  onSaveWorkingHours: () => void;
  onCreateTimeOff: (form: HTMLFormElement | null) => void;
  onDeleteTimeOff: (id: string) => void;
  workingHoursBusy: boolean;
  timeOffBusy: boolean;
  timeZone: string;
  locale: string;
  copy: {
    workingHoursTitle: string;
    timeOffTitle: string;
    saveHours: string;
    timeOffFrom: string;
    timeOffTo: string;
    timeOffReason: string;
    timeOffReasonPlaceholder: string;
    timeOffAdd: string;
    timeOffRemoveTitle: string;
    timeOffRemoveBody: string;
    days: Record<string, string>;
    rangeSeparator: string;
  };
  workingHoursStatus: string;
  timeOffStartValue: string;
  timeOffEndValue: string;
  timeOffReason: string;
  onTimeOffStartChange: (value: string) => void;
  onTimeOffEndChange: (value: string) => void;
  onTimeOffReasonChange: (value: string) => void;
}

export function ScheduleSection({
  workingHours,
  timeOffEntries,
  onSaveWorkingHours,
  onCreateTimeOff,
  onDeleteTimeOff,
  workingHoursBusy,
  timeOffBusy,
  timeZone,
  locale,
  copy,
  workingHoursStatus,
  timeOffStartValue,
  timeOffEndValue,
  timeOffReason,
  onTimeOffStartChange,
  onTimeOffEndChange,
  onTimeOffReasonChange,
}: ScheduleSectionProps) {
  const [localWorkingHours, setLocalWorkingHours] = useState(workingHours);
  const timeOffFormRef = { current: null as HTMLFormElement | null };

  return (
    <Stack gap="lg">
      {/* Working Hours */}
      <section className="sc-section">
        <h2 className="sc-section-title">{copy.workingHoursTitle}</h2>
        <Card>
          <Stack gap="md">
            {localWorkingHours.map((entry, index) => (
              <Stack key={entry.day} direction="row" gap="md" align="center" justify="between">
                <label className="sc-hours-label">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) => {
                      const next = [...localWorkingHours];
                      next[index] = { ...entry, enabled: e.target.checked };
                      setLocalWorkingHours(next);
                    }}
                  />
                  <span className="sc-day-text">{copy.days[entry.day] || entry.day}</span>
                </label>
                <Stack direction="row" gap="sm" align="center">
                  <Input
                    type="time"
                    size="sm"
                    className="sc-time-input"
                    value={entry.startTime}
                    onChange={(e) => {
                      const next = [...localWorkingHours];
                      next[index] = { ...entry, startTime: e.target.value };
                      setLocalWorkingHours(next);
                    }}
                    disabled={!entry.enabled}
                  />
                  <span>{copy.rangeSeparator}</span>
                  <Input
                    type="time"
                    size="sm"
                    className="sc-time-input"
                    value={entry.endTime}
                    onChange={(e) => {
                      const next = [...localWorkingHours];
                      next[index] = { ...entry, endTime: e.target.value };
                      setLocalWorkingHours(next);
                    }}
                    disabled={!entry.enabled}
                  />
                </Stack>
              </Stack>
            ))}

            <Button
              variant="primary"
              size="md"
              onClick={() => onSaveWorkingHours()}
              isLoading={workingHoursBusy}
              className="sc-save-button"
              data-testid="staff-workinghours-save"
            >
              {copy.saveHours}
            </Button>

            {workingHoursStatus && (
              <Card variant="outlined" className="sc-status-banner">
                <p className="sc-status-banner-text">{workingHoursStatus}</p>
              </Card>
            )}
          </Stack>
        </Card>
      </section>

      {/* Time Off */}
      <section className="sc-section">
        <h2 className="sc-section-title">{copy.timeOffTitle}</h2>
        <Card>
          <Stack gap="md">
            <form
              ref={(el) => {
                timeOffFormRef.current = el;
              }}
              onSubmit={(e) => {
                e.preventDefault();
                onCreateTimeOff(timeOffFormRef.current);
              }}
            >
              <Stack gap="md">
                <Stack direction="row" gap="md" className="sc-wrap">
                  <Stack className="sc-flex">
                    <label className="sc-field-label">{copy.timeOffFrom}</label>
                    <Input
                      type="datetime-local"
                      name="timeOffStart"
                      fullWidth
                      data-testid="staff-timeoff-start"
                      value={timeOffStartValue}
                      onChange={(e) => onTimeOffStartChange(e.target.value)}
                    />
                  </Stack>
                  <Stack className="sc-flex">
                    <label className="sc-field-label">{copy.timeOffTo}</label>
                    <Input
                      type="datetime-local"
                      name="timeOffEnd"
                      fullWidth
                      data-testid="staff-timeoff-end"
                      value={timeOffEndValue}
                      onChange={(e) => onTimeOffEndChange(e.target.value)}
                    />
                  </Stack>
                </Stack>

                <Stack>
                  <label className="sc-field-label">{copy.timeOffReason}</label>
                  <Input
                    fullWidth
                    value={timeOffReason}
                    onChange={(e) => onTimeOffReasonChange(e.target.value)}
                    placeholder={copy.timeOffReasonPlaceholder}
                    data-testid="staff-timeoff-reason"
                  />
                </Stack>

                <Button
                  variant="ghost"
                  size="md"
                  isLoading={timeOffBusy}
                  data-testid="staff-timeoff-add"
                  type="submit"
                  disabled={timeOffBusy}
                >
                  {copy.timeOffAdd}
                </Button>
              </Stack>
            </form>

            {timeOffEntries.length > 0 && (
              <Stack gap="sm" className="sc-timeoff-list">
                {timeOffEntries.map((entry) => (
                  <Stack
                    key={entry.id}
                    direction="row"
                    gap="md"
                    align="center"
                    justify="between"
                    className="sc-timeoff-item"
                  >
                    <div>
                      <strong>
                        {formatDateTime(entry.startTime, { timeZone, locale })}
                        {copy.rangeSeparator}
                        {formatDateTime(entry.endTime, { timeZone, locale })}
                      </strong>
                      {entry.reason && <p className="sc-muted">{entry.reason}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTimeOff(entry.id)}
                      isLoading={timeOffBusy}
                      data-testid="staff-timeoff-remove"
                    >
                      ✕
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      </section>
    </Stack>
  );
}
