/**
 * Week arithmetic for What's New. A post's identity is the Monday (ET) of
 * the week it covers, and that date is also its URL: /whats-new/2026-08-10.
 * Pure — moved out of server/whats-new.ts so the slug logic is unit-tested.
 */

/** Monday (ET) of the week containing the given ET date. */
export function mondayOf(etDate: string): string {
  const [y, m, d] = etDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

/** The Monday of the week BEFORE the one containing `etDate`. */
export function priorWeekStart(etDate: string): string {
  const thisMonday = mondayOf(etDate);
  const dt = new Date(`${thisMonday}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - 7);
  return dt.toISOString().slice(0, 10);
}

/**
 * Whether a URL segment is a valid post permalink: a real calendar date,
 * YYYY-MM-DD, that is a Monday. "2026-08-11" (a Tuesday) is not a post URL
 * and 404s rather than guessing which week was meant.
 */
export function isWeekSlug(segment: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(segment)) return false;
  const dt = new Date(`${segment}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return false;
  // Reject well-formed non-dates like 2026-02-31, which Date rolls over.
  if (dt.toISOString().slice(0, 10) !== segment) return false;
  return mondayOf(segment) === segment;
}
