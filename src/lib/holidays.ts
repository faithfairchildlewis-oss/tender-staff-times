/** Center-wide closed dates. Maps ISO date (YYYY-MM-DD) → reason. */
export const CLOSED_DATES: Record<string, string> = {
  "2026-07-03": "Independence Day",
  "2026-08-03": "Summer Recess",
  "2026-08-04": "Summer Recess",
  "2026-08-05": "Summer Recess",
  "2026-08-06": "Summer Recess",
  // Labor Day 2026 falls on Monday, Sept 7. User asked for "Sept 6 for
  // Labor Day"; Sept 6 is a Sunday so we close Sept 7 instead.
  "2026-09-07": "Labor Day",
};

/** Compute ISO date for a given day offset within a week starting at
 *  startDate (YYYY-MM-DD). Parses parts to avoid timezone shifts. */
export function isoForOffset(
  startDate: string | null | undefined,
  offset: number,
): string | null {
  if (!startDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + offset));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function holidayForOffset(
  startDate: string | null | undefined,
  offset: number,
): string | null {
  const iso = isoForOffset(startDate, offset);
  return iso ? (CLOSED_DATES[iso] ?? null) : null;
}

export function holidayForDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return CLOSED_DATES[iso] ?? null;
}