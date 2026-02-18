/**
 * Returns a YYYY-MM-DD string in local time (not UTC).
 * Avoids the timezone shift bug where toISOString() can roll the date
 * forward or backward when the local time is near midnight.
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
