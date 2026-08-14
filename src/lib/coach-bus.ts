/**
 * How the rest of the app hands text to the floating Coach. A window event
 * keeps the sender (a field's Coach button, the selection tooltip) from
 * needing a reference to the panel, which lives in the app shell.
 *
 * The text lands in the Coach's composer, not in a sent message: the user
 * gets to add their question — and to think better of it — before anything
 * goes to the model.
 */
export const ASK_COACH_EVENT = "casespace:ask-coach";

export interface CoachAsk {
  /** Prefilled into the composer, caret at the end. */
  text: string;
}

export function askCoach(text: string) {
  window.dispatchEvent(
    new CustomEvent<CoachAsk>(ASK_COACH_EVENT, { detail: { text } }),
  );
}

export function onAskCoach(handle: (ask: CoachAsk) => void) {
  const listener = (e: Event) => handle((e as CustomEvent<CoachAsk>).detail);
  window.addEventListener(ASK_COACH_EVENT, listener);
  return () => window.removeEventListener(ASK_COACH_EVENT, listener);
}

/** "Help me with this field" — the Coach can read the record and propose an edit. */
export function askAboutField(
  record: { id: string; title: string },
  label: string,
  current: string,
) {
  const head = `About ${label} on “${record.title}” (record ${record.id}):`;
  return current.trim()
    ? `${head}\n\n> ${current.trim().replace(/\n/g, "\n> ")}\n\n`
    : `${head} nothing recorded yet.\n\n`;
}

/** A quote block the Coach can act on, with the record named so it can look it up. */
export function quoteForCoach(
  record: { id: string; title: string },
  quoted: string,
  about?: string,
) {
  const head = about
    ? `About ${about} on “${record.title}” (record ${record.id}):`
    : `From “${record.title}” (record ${record.id}):`;
  return `${head}\n\n> ${quoted.trim().replace(/\n/g, "\n> ")}\n\n`;
}
