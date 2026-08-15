/**
 * docs/changelog.md as data — pure, so what the weekly post is allowed to say
 * about Casespace itself is unit-tested rather than inferred from a prompt.
 *
 * The file's shape: `## YYYY-MM-DD` groups entries by ship date, `### Title`
 * starts an entry, an optional `Requested by:` line credits whoever asked,
 * and the prose that follows is the summary. Everything above the first date
 * heading is the file's own instructions and is ignored.
 */

export interface ChangelogEntry {
  /** Ship date, YYYY-MM-DD, from the group heading. */
  date: string;
  title: string;
  /** Whoever asked for it, as written. Null when nobody is credited. */
  requestedBy: string | null;
  /** Id of the in-app feedback report this closed, when there was one. */
  feedbackId: string | null;
  /** The paragraph(s) under the title, whitespace-collapsed. */
  summary: string;
}

const DATE_HEADING = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const ENTRY_HEADING = /^###\s+(.+?)\s*$/;
const REQUESTED_BY = /^Requested by:\s*(.+?)\s*$/i;
const FEEDBACK = /^Feedback:\s*(.+?)\s*$/i;

/**
 * Every entry in the file, in the order it appears. Malformed sections are
 * skipped rather than thrown on: a changelog that half-parses still gives the
 * post something true to say, and a broken heading shouldn't fail the cron.
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let date: string | null = null;
  let current: ChangelogEntry | null = null;
  let summaryLines: string[] = [];
  let inFence = false;

  const flush = () => {
    if (current) {
      current.summary = summaryLines
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (current.summary) entries.push(current);
    }
    current = null;
    summaryLines = [];
  };

  for (const line of markdown.split("\n")) {
    // A fenced example of the format is documentation, not entries.
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const dateMatch = DATE_HEADING.exec(line);
    if (dateMatch) {
      flush();
      date = dateMatch[1];
      continue;
    }

    const entryMatch = ENTRY_HEADING.exec(line);
    if (entryMatch) {
      flush();
      // An entry before any date heading has nothing to date it by.
      current = date
        ? {
            date,
            title: entryMatch[1],
            requestedBy: null,
            feedbackId: null,
            summary: "",
          }
        : null;
      continue;
    }

    if (!current) continue;

    const requested = REQUESTED_BY.exec(line);
    if (requested) {
      current.requestedBy = requested[1];
      continue;
    }
    const feedback = FEEDBACK.exec(line);
    if (feedback) {
      current.feedbackId = feedback[1];
      continue;
    }
    if (line.trim()) summaryLines.push(line.trim());
  }
  flush();

  return entries;
}

/**
 * The entries shipped in the week starting `weekStart` (a Monday, YYYY-MM-DD),
 * seven days inclusive of the start. String comparison is safe on ISO dates
 * and keeps this free of timezone reasoning — the dates in the file are
 * calendar days, not instants.
 */
export function entriesInWeek(
  entries: readonly ChangelogEntry[],
  weekStart: string,
): ChangelogEntry[] {
  const end = addDays(weekStart, 7);
  return entries.filter((e) => e.date >= weekStart && e.date < end);
}

/** YYYY-MM-DD plus n days, as YYYY-MM-DD. */
export function addDays(date: string, n: number): string {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
