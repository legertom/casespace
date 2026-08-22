/** The H2 2026 one-on-one cadence tracked for each AI Lead. */
export const LEAD_SYNC_MONTHS = [
  { value: "2026-08-01", shortLabel: "Aug", label: "August 2026" },
  { value: "2026-09-01", shortLabel: "Sep", label: "September 2026" },
  { value: "2026-10-01", shortLabel: "Oct", label: "October 2026" },
  { value: "2026-11-01", shortLabel: "Nov", label: "November 2026" },
  { value: "2026-12-01", shortLabel: "Dec", label: "December 2026" },
] as const;

export type LeadSyncMonth = (typeof LEAD_SYNC_MONTHS)[number]["value"];

export function isLeadSyncMonth(value: string): value is LeadSyncMonth {
  return LEAD_SYNC_MONTHS.some((month) => month.value === value);
}
