export function buildLocation(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(', ');
}

export function buildIcsDescription(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join('\n');
}

export function buildIcsDataUrl(content: string) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}
