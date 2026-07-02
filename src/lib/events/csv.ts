// Minimal CSV writer for admin exports. Handles quoting, embedded commas /
// quotes / newlines, arrays/objects (JSON-encoded), and guards against
// spreadsheet formula injection (leading = + - @ tab).

export interface CsvColumn<T> {
  key: keyof T & string;
  header?: string;
}

export function csvEscape(value: unknown): string {
  let s: string;
  if (value == null) s = '';
  else if (Array.isArray(value) || typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);

  // Formula-injection guard: Excel/Sheets execute cells starting with these.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => csvEscape(c.header ?? c.key)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}
