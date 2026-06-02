/** Date formatting helpers — app-wide mm-dd-yyyy display format. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse an ISO date (YYYY-MM-DD) as a local Date, avoiding UTC shifts. */
function parseIsoLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Format an ISO date string (YYYY-MM-DD) as mm-dd-yyyy. */
export function formatMDY(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseIsoLocal(iso);
  if (!d) return iso;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;
}

/** "mm-dd-yyyy – mm-dd-yyyy" for a Mon–Fri work week given the Monday ISO date. */
export function formatWeekRange(startIso: string | null | undefined): string {
  if (!startIso) return "";
  const mon = parseIsoLocal(startIso);
  if (!mon) return startIso;
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) =>
    `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;
  return `${fmt(mon)} – ${fmt(fri)}`;
}

/** Parse mm-dd-yyyy (or m-d-yyyy) user input into an ISO YYYY-MM-DD string. */
export function parseMDYToIso(input: string): string | null {
  const m = /^\s*(\d{1,2})-(\d{1,2})-(\d{4})\s*$/.exec(input);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

/** Compute MM-DD for a given day offset within a week starting at startDate
 *  (YYYY-MM-DD). Parses parts to avoid timezone shifts. */
export function mmddFor(startDate: string | null | undefined, dayOffset: number): string {
  if (!startDate) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + dayOffset));
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}