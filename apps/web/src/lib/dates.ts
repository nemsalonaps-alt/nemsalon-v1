export function toLocalDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateInput(value: string): Date {
  return new Date(`${value}T00:00:00`);
}
