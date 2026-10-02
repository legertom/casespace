import { MissingToolResultsError } from "ai";
import { describe, expect, it } from "vitest";
import {
  COACH_SNAG,
  coachErrorText,
  describeCoachError,
  errorDetail,
  readCoachError,
} from "./coach-error";

function named(name: string, message: string, extra: object = {}) {
  return Object.assign(new Error(message), { name }, extra);
}

describe("naming what went wrong", () => {
  it("recognizes the SDK's own missing-tool-result error", () => {
    const err = new MissingToolResultsError({ toolCallIds: ["call_1"] });
    const described = describeCoachError(err);
    expect(described.kind).toBe("transcript");
    expect(described.error).toMatch(/start a new conversation/);
    expect(described.detail).toMatch(/call_1/);
  });

  it("tells a rejected key from a rate limit from a provider outage", () => {
    expect(
      describeCoachError(named("GatewayAuthenticationError", "bad key")).kind,
    ).toBe("gateway_auth");
    expect(
      describeCoachError(named("GatewayRateLimitError", "slow down")).kind,
    ).toBe("rate_limit");
    expect(
      describeCoachError(named("AI_APICallError", "boom", { statusCode: 529 }))
        .kind,
    ).toBe("provider_down");
    expect(
      describeCoachError(named("GatewayModelNotFoundError", "no such model"))
        .kind,
    ).toBe("model_missing");
  });

  // The SDK reports the retries; the reason is one level down.
  it("looks through a retry wrapper to the error underneath", () => {
    const err = named("AI_RetryError", "Failed after 3 attempts.", {
      lastError: named("AI_APICallError", "Too many requests", {
        statusCode: 429,
      }),
    });
    expect(describeCoachError(err).kind).toBe("rate_limit");
  });

  it("looks through a gateway wrapper to its cause", () => {
    const err = named("GatewayResponseError", "bad response", {
      cause: named("TimeoutError", "timed out"),
    });
    expect(describeCoachError(err).kind).toBe("timeout");
  });

  // "No dollar figures anywhere in the product" includes the gateway's words.
  it("keeps an account problem's detail out of what a person sees", () => {
    const described = describeCoachError(
      named("GatewayInternalServerError", "Insufficient funds: add $5.00", {
        statusCode: 402,
      }),
    );
    expect(described.kind).toBe("gateway_account");
    expect(described.detail).toBeUndefined();
    expect(described.error).not.toMatch(/\$/);
  });

  it("falls back to the snag line, with the real message as detail", () => {
    const described = describeCoachError(new TypeError("x is not a function"));
    expect(described).toEqual({
      kind: "unknown",
      error: COACH_SNAG,
      detail: "TypeError: x is not a function",
    });
  });

  it("survives things that aren't errors", () => {
    expect(describeCoachError("plain string").kind).toBe("unknown");
    expect(errorDetail("plain string")).toBe("plain string");
    expect(describeCoachError(undefined).kind).toBe("unknown");
  });

  // The gateway's auth error continues into how to make a key. Log material.
  it("keeps only the first line of a message that runs on", () => {
    expect(
      errorDetail(
        named("GatewayAuthenticationError", "Invalid API key.\n\nCreate one: …"),
      ),
    ).toBe("GatewayAuthenticationError: Invalid API key.");
  });

  it("keeps the detail short enough to read", () => {
    expect(errorDetail(new Error("x".repeat(1000))).length).toBeLessThanOrEqual(
      300,
    );
  });
});

describe("reading a failure back in the panel", () => {
  it("round-trips what the route sent", () => {
    const failure = { error: "Nope.", detail: "Error: nope", ref: "AB12CD" };
    expect(readCoachError(coachErrorText(failure))).toEqual(failure);
  });

  // The 503 body used to reach the screen as raw JSON.
  it("unwraps a JSON error body from a non-streaming response", () => {
    expect(readCoachError('{"error":"AI features aren\'t set up yet"}')).toEqual(
      { error: "AI features aren't set up yet", detail: undefined, ref: undefined },
    );
  });

  it("says so when the request never reached the server", () => {
    const failure = readCoachError("Failed to fetch");
    expect(failure.error).toMatch(/connection/);
    expect(failure.detail).toBe("Failed to fetch");
  });

  it("shows unrecognized text as detail rather than swallowing it", () => {
    expect(readCoachError("FUNCTION_INVOCATION_TIMEOUT")).toEqual({
      error: COACH_SNAG,
      detail: "FUNCTION_INVOCATION_TIMEOUT",
    });
  });

  it("adds nothing for the SDK's own placeholder", () => {
    expect(readCoachError("An error occurred.")).toEqual({
      error: COACH_SNAG,
      detail: undefined,
    });
  });

  it("ignores JSON that isn't a failure", () => {
    expect(readCoachError("[1,2]").error).toBe(COACH_SNAG);
    expect(readCoachError('{"ok":true}').error).toBe(COACH_SNAG);
  });
});
