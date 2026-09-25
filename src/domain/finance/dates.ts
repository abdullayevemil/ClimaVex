/**
 * Calendar-date handling for a single business timezone.
 *
 * Every dated financial rule in ClimaVex is a *calendar* rule: a repayment is
 * due on a day, not at an instant. Mixing timestamps into that logic is how
 * an insurance payout silently lands on the wrong side of a due date. So all
 * comparison happens on `YYYY-MM-DD` strings in Europe/Istanbul (UTC+3, no DST),
 * which sort lexicographically in true chronological order.
 */
export const BUSINESS_TIMEZONE = "Europe/Istanbul";
const ISTANBUL_OFFSET_MINUTES = 180;

export type IsoDate = string; // YYYY-MM-DD

export function toIsoDate(value: Date | string): IsoDate {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return toIsoDate(new Date(value));
  }
  const shifted = new Date(value.getTime() + ISTANBUL_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Midnight UTC of the given calendar date — how DATE columns round-trip. */
export function isoDateToUtcDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = isoDateToUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((isoDateToUtcDate(a).getTime() - isoDateToUtcDate(b).getTime()) / 86_400_000);
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return a > b;
}

export function isWithin(date: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return date >= start && date <= end;
}

export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 4000) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function dayOfYear(iso: IsoDate): number {
  const d = isoDateToUtcDate(iso);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}
