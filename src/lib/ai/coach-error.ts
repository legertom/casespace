/**
 * What a failed Coach turn says, and how it gets from the route to the panel.
 *
 * The chat stream has one slot for an error — a string — and the SDK fills it
 * with "An error occurred." unless told otherwise. That sentence is what made
 * a locked conversation undiagnosable: nothing a person could quote, nothing
 * tying their screen to a log line. So the route puts a whole failure in the
 * slot as JSON — the same three fields every server action returns — and the
 * panel reads it back into an ErrorNote, with its reference and its Report
 * button, like every other error in Casespace.
 */

/** Structurally an `ActionResult`, so ErrorNote takes it as-is. */
export interface CoachFailure {
  /** The line a person reads. */
  error: string;
  /** The underlying failure, verbatim. */
  detail?: string;
  /** Ties what the user sees to the server log line. */
  ref?: string;
}

export type CoachErrorKind =
  /** A tool call in the history has no result — the transcript is unsendable. */
  | "transcript"
  | "gateway_auth"
  | "gateway_account"
  | "rate_limit"
  | "model_missing"
  | "provider_down"
  | "timeout"
  | "unknown";

export const COACH_SNAG = "The Coach hit a snag. Try sending that again.";

const MESSAGES: Record<CoachErrorKind, string> = {
  transcript:
    "This conversation has a step the Coach never got an answer to, so it can't pick up from here. Nothing on any record was changed — start a new conversation to carry on.",
  gateway_auth:
    "The Coach can't reach its model: the AI gateway turned down Casespace's credentials. An admin needs to check the gateway key.",
  gateway_account:
    "The Coach can't reach its model: the AI gateway account needs an admin's attention.",
  rate_limit:
    "The Coach is being rate-limited. Give it a minute, then send that again.",
  model_missing:
    "The Coach's model isn't available on the AI gateway. An admin needs to check the model id.",
  provider_down:
    "The model behind the Coach is having trouble right now. Try again in a minute.",
  timeout:
    "The Coach took too long and the turn was cut off. Try sending that again.",
  unknown: COACH_SNAG,
};

const DETAIL_LIMIT = 300;

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  statusCode?: unknown;
  cause?: unknown;
  lastError?: unknown;
}

/**
 * The error and what it wraps, outermost first. The SDK retries a failed call
 * and reports the retries (`lastError`); the gateway wraps the provider's
 * error (`cause`). The one worth naming is usually not the outermost.
 */
function chain(err: unknown): ErrorLike[] {
  const seen: ErrorLike[] = [];
  let at: unknown = err;
  while (at && typeof at === "object" && seen.length < 6) {
    const e = at as ErrorLike;
    if (seen.includes(e)) break;
    seen.push(e);
    at = e.lastError ?? e.cause;
  }
  return seen;
}

function kindOf(e: ErrorLike): CoachErrorKind {
  const name = typeof e.name === "string" ? e.name : "";
  const message = typeof e.message === "string" ? e.message : "";
  const status = typeof e.statusCode === "number" ? e.statusCode : undefined;

  if (name === "AI_MissingToolResultsError") return "transcript";
  if (name === "GatewayAuthenticationError" || status === 401) {
    return "gateway_auth";
  }
  if (
    status === 402 ||
    /insufficient (funds|credit)|payment required|billing/i.test(message)
  ) {
    return "gateway_account";
  }
  if (name === "GatewayForbiddenError" || status === 403) return "gateway_auth";
  if (name === "GatewayRateLimitError" || status === 429) return "rate_limit";
  if (name === "GatewayModelNotFoundError" || status === 404) {
    return "model_missing";
  }
  if (name === "AbortError" || name === "TimeoutError" || status === 408) {
    return "timeout";
  }
  if (
    name === "GatewayInternalServerError" ||
    (status !== undefined && status >= 500) ||
    /overloaded/i.test(message)
  ) {
    return "provider_down";
  }
  return "unknown";
}

/**
 * The failure in one line, as a bug report should carry it. One line
 * literally: a gateway error's message runs on into setup instructions, and
 * those belong in the log, which has the whole error under the reference.
 */
export function errorDetail(err: unknown): string {
  const [outer] = chain(err);
  const text = (
    outer
      ? [outer.name, outer.message]
          .filter((s): s is string => typeof s === "string" && s.length > 0)
          .join(": ")
      : String(err)
  )
    .split("\n")[0]
    .trim();
  return text.length > DETAIL_LIMIT
    ? `${text.slice(0, DETAIL_LIMIT - 1)}…`
    : text;
}

export function describeCoachError(err: unknown): {
  kind: CoachErrorKind;
  error: string;
  detail?: string;
} {
  const kind =
    chain(err)
      .map(kindOf)
      .find((k) => k !== "unknown") ?? "unknown";
  return {
    kind,
    error: MESSAGES[kind],
    // An account problem's own words are the gateway's, and may quote a
    // balance. No dollar figures anywhere in the product — the log line under
    // the reference has them for whoever needs them.
    detail: kind === "gateway_account" ? undefined : errorDetail(err),
  };
}

/** A failure, as the one string the chat stream has room for. */
export function coachErrorText(failure: CoachFailure): string {
  return JSON.stringify(failure);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * The other direction: whatever `useChat` reports, as something ErrorNote can
 * show. Besides the route's own failures that covers what never reached it —
 * a dropped connection, a platform timeout page — where the best available
 * detail is the browser's own message.
 */
export function readCoachError(message: string): CoachFailure {
  try {
    const parsed: unknown = JSON.parse(message);
    if (parsed && typeof parsed === "object") {
      const { error, detail, ref } = parsed as Record<string, unknown>;
      if (typeof error === "string" && error) {
        return {
          error,
          detail: optionalString(detail),
          ref: optionalString(ref),
        };
      }
    }
  } catch {
    // Not one of ours — fall through to what the text itself suggests.
  }
  if (/failed to fetch|load failed|networkerror|network error/i.test(message)) {
    return {
      error:
        "Couldn't reach Casespace. Check your connection, then send that again.",
      detail: message,
    };
  }
  const raw = message.trim();
  return {
    error: COACH_SNAG,
    detail:
      raw && raw !== "An error occurred."
        ? raw.length > DETAIL_LIMIT
          ? `${raw.slice(0, DETAIL_LIMIT - 1)}…`
          : raw
        : undefined,
  };
}
