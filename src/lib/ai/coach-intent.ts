/**
 * Which instructions a Coach turn runs under.
 *
 * The intent is what the person came to do, and it decides what the Coach is
 * told to be — a Discovery conversation and an intake wizard are not the same
 * assistant. That makes the question "who gets to say what a chat's intent is"
 * a correctness question rather than a preference.
 *
 * The answer: the chat's own stored intent, once it has one. The browser sends
 * an `intent` with every turn, taken from the URL it happened to be loaded
 * with — and `/coach?chat=<id>` carries no intent at all. Trusting the client
 * would mean a Discovery conversation reopened from Recent silently became a
 * QA chat, losing the mode halfway through the very loop the mode exists for.
 * It would also let a crafted request rewrite an existing chat's provenance.
 *
 * So: an existing chat answers for itself, and the client's intent is used
 * only to open a new one. Pure and I/O-free so both halves of that rule can be
 * unit-tested without a database.
 */
import { COACH_INTENTS, type CoachIntent } from "@/lib/domain";

export const DEFAULT_COACH_INTENT: CoachIntent = "qa";

export function isCoachIntent(value: unknown): value is CoachIntent {
  return (
    typeof value === "string" &&
    (COACH_INTENTS as readonly string[]).includes(value)
  );
}

/** A client-supplied intent, or the default. Never throws — this is untrusted. */
export function parseCoachIntent(value: unknown): CoachIntent {
  return isCoachIntent(value) ? value : DEFAULT_COACH_INTENT;
}

/**
 * The intent a turn actually runs under.
 *
 * `persisted` is the value on the chat row — null for a chat that has not had
 * its first turn saved yet. It wins whenever it exists, which is what makes a
 * reopened Discovery chat still a Discovery chat, and what makes an existing
 * chat's intent unchangeable from the client.
 */
export function resolveChatIntent(
  persisted: CoachIntent | null | undefined,
  requested: unknown,
): CoachIntent {
  return persisted ?? parseCoachIntent(requested);
}

/**
 * A record id taken from a URL or request body, or null.
 *
 * Both `/coach?review=` and `/coach?useCase=` are interpolated into the
 * kickoff — the first user-turn message, sent automatically on page load. A
 * mailed link is enough to put its query string into someone's conversation,
 * so the string has to be shaped like the only thing it can legitimately be:
 * every link we generate builds these from `useCases.id`, which is a UUID.
 * Anything else is treated as absent, not an error — a garbage param opens a
 * plain chat, the same as no param at all.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeRecordId(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

/**
 * The use case a chat is anchored to.
 *
 * Same rule, same reason: a chat opened from a record keeps that record across
 * every later turn, and a client cannot re-point an existing conversation at
 * someone else's record by sending a different id. `requested` is only ever
 * consulted for a brand-new chat, and the caller still validates that the
 * record exists before it is stored.
 */
export function resolveChatUseCaseId(
  chatExists: boolean,
  persisted: string | null | undefined,
  requested: string | null | undefined,
): string | null {
  if (chatExists) return persisted ?? null;
  return requested ?? null;
}
