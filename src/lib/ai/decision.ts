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
export const FEEDBACK_FILED =
  "Accepted — the feedback was filed for the admins.";
export const DISMISSED_FEEDBACK =
  "Dismissed — do not file this. Ask what to change if unclear.";

/**
 * The Discovery checkpoint card's four outcomes.
 *
 * These read as instructions because that is what they are: the string is the
 * tool result, and it is the only thing telling the Coach what to do next. The
 * failure mode they exist to prevent is a saved checkpoint followed by another
 * three paragraphs of coaching — the point of a checkpoint is that the talking
 * stopped.
 *
 * "Draft a use case from this" deliberately routes back through
 * `propose_use_case` rather than writing anything: there is one create path in
 * this application, it renders a card, and Discovery does not get a second one.
 */
export const CHECKPOINT_SAVED =
  "Saved — the checkpoint is recorded. Acknowledge in one or two sentences, restate the next step and the return condition, and stop. Do not start another round of questions. Checkpoint ";
export const CHECKPOINT_SAVED_AND_DRAFT =
  "Saved — and the human wants a use-case record drafted from it. Call propose_use_case now, using only what this conversation actually established: no invented owner, no invented numbers, and no documented gates ticked. Say in one line what you left blank. Checkpoint ";
export const CHECKPOINT_CONTINUE =
  "Not yet — the human wants to keep working the problem. Do not save, do not re-propose this checkpoint, and do not restart the conversation. Take up the next highest-value uncertainty from where you left off.";
export const CHECKPOINT_DISMISSED =
  "Dismissed — nothing was saved. Ask what was off about it if that is unclear, and do not propose the same checkpoint again unless the conversation materially changes.";

export function createdOutcome(id: string): string {
  return `${CREATED_AT}${id}`;
}

export function checkpointSavedOutcome(id: string, draftUseCase = false): string {
  return `${draftUseCase ? CHECKPOINT_SAVED_AND_DRAFT : CHECKPOINT_SAVED}${id}`;
}

/** The checkpoint a saved outcome wrote, or null for every other outcome. */
export function checkpointIdFromOutcome(outcome: string): string | null {
  for (const prefix of [CHECKPOINT_SAVED_AND_DRAFT, CHECKPOINT_SAVED]) {
    if (outcome.startsWith(prefix)) {
      return outcome.slice(prefix.length).trim() || null;
    }
  }
  return null;
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
  if (outcome.startsWith(CHECKPOINT_SAVED_AND_DRAFT)) {
    return "Saved, and drafted into a use case below.";
  }
  if (outcome.startsWith(CHECKPOINT_SAVED)) return "Checkpoint saved.";
  switch (outcome) {
    case OPENED_IN_FORM:
      return "Taken to the form to finish there.";
    case DISMISSED_CREATE:
    case DISMISSED_UPDATE:
    case DISMISSED_FEEDBACK:
    case CHECKPOINT_DISMISSED:
      return "Dismissed.";
    case FEEDBACK_FILED:
      return "Filed.";
    case CHECKPOINT_CONTINUE:
      return "Kept talking — no checkpoint saved.";
    default:
      return "Decision recorded.";
  }
}
