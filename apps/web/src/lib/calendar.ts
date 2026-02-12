export type IcsInviteInput = {
  id: string;
  startTime: string;
  endTime: string;
  summary: string;
  location?: string;
  description?: string;
};

function toIcsDate(value: string) {
  const date = new Date(value);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcsInvite(input: IcsInviteInput) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nemsalon//Booking//DA',
    'BEGIN:VEVENT',
    `UID:${input.id}@nemsalon.app`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(input.startTime)}`,
    `DTEND:${toIcsDate(input.endTime)}`,
    `SUMMARY:${input.summary}`,
    input.location ? `LOCATION:${input.location}` : '',
    input.description ? `DESCRIPTION:${input.description}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\\r\\n');
}

export function downloadIcsInvite(input: IcsInviteInput, filename: string) {
  const content = buildIcsInvite(input);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
