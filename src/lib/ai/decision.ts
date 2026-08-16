/**
 * How a human's decision on a Coach proposal is recorded, and how it reads
 * back. The outcome string is written for the Coach — it becomes the tool's
 * output in the transcript — but the transcript outlives the sitting: a
 * conversation reopened from the sidebar replays its proposals, and a decision
 * already made has to settle the card instead of offering the buttons a second
 * time. "Log it" twice would be two records of one use case.
 */

/** An accepted create carries the id it saved, so the link survives a reopen. */
export const CREATED_AT = "Accepted — record created at /use-cases/";
export const OPENED_IN_FORM =
  "The human chose to review and edit it in the form before saving.";
export const DISMISSED_CREATE =
  "Dismissed — do not save this. Ask what to change if unclear.";
export const UPDATED = "Accepted — the record was updated.";
export const DISMISSED_UPDATE = "Dismissed — leave the record as it is.";

export function createdOutcome(id: string): string {
  return `${CREATED_AT}${id}`;
}

/** The record an accepted create-proposal saved, or null for every other outcome. */
export function recordIdFromOutcome(outcome: string): string | null {
  if (!outcome.startsWith(CREATED_AT)) return null;
  const id = outcome.slice(CREATED_AT.length).trim();
  return id || null;
}

/**
 * The line a settled card shows in place of its buttons. Accepted outcomes are
 * the cards' own business — they have a record to link to — so this covers the
 * rest, and falls back to something true for an outcome it doesn't recognize.
 */
export function settledLine(outcome: string): string {
  switch (outcome) {
    case OPENED_IN_FORM:
      return "Taken to the form to finish there.";
    case DISMISSED_CREATE:
    case DISMISSED_UPDATE:
      return "Dismissed.";
    default:
      return "Decision recorded.";
  }
}
