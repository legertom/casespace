import { describe, expect, it } from "vitest";
import {
  isCoachIntent,
  parseCoachIntent,
  resolveChatIntent,
  resolveChatUseCaseId,
} from "./coach-intent";
import { COACH_INTENTS } from "@/lib/domain";

describe("parseCoachIntent", () => {
  it("accepts every intent the app declares", () => {
    for (const intent of COACH_INTENTS) {
      expect(parseCoachIntent(intent)).toBe(intent);
    }
  });

  it("accepts discovery", () => {
    expect(parseCoachIntent("discovery")).toBe("discovery");
    expect(isCoachIntent("discovery")).toBe(true);
  });

  it("falls back to qa rather than throwing on junk", () => {
    for (const junk of [undefined, null, "", "DISCOVERY", "admin", 7, {}]) {
      expect(parseCoachIntent(junk)).toBe("qa");
    }
  });
});

describe("resolveChatIntent", () => {
  it("opens a new chat with what the door asked for", () => {
    expect(resolveChatIntent(null, "discovery")).toBe("discovery");
    expect(resolveChatIntent(null, "wizard")).toBe("wizard");
    expect(resolveChatIntent(undefined, "roi_review")).toBe("roi_review");
    expect(resolveChatIntent(null, undefined)).toBe("qa");
  });

  // The bug this function exists to fix. /coach?chat=<id> carries no intent,
  // so a reopened Discovery conversation would otherwise run under the QA
  // prompt and lose the mode halfway through the loop the mode is for.
  it("keeps a reopened chat in its own mode when the client says nothing", () => {
    expect(resolveChatIntent("discovery", undefined)).toBe("discovery");
    expect(resolveChatIntent("wizard", undefined)).toBe("wizard");
    expect(resolveChatIntent("roi_review", undefined)).toBe("roi_review");
  });

  // Intent is provenance. A client that sends a different one does not get to
  // rewrite what a conversation was opened to do.
  it("does not let the client change an existing chat's intent", () => {
    expect(resolveChatIntent("discovery", "wizard")).toBe("discovery");
    expect(resolveChatIntent("qa", "discovery")).toBe("qa");
    expect(resolveChatIntent("wizard", "roi_review")).toBe("wizard");
  });
});

describe("resolveChatUseCaseId", () => {
  it("takes the requested record only for a brand-new chat", () => {
    expect(resolveChatUseCaseId(false, null, "uc-1")).toBe("uc-1");
    expect(resolveChatUseCaseId(false, null, null)).toBeNull();
  });

  it("keeps an existing chat pointed at the record it was opened from", () => {
    expect(resolveChatUseCaseId(true, "uc-1", undefined)).toBe("uc-1");
  });

  // Same rule as intent: an existing conversation's context is the server's.
  it("ignores a request to re-point an existing chat at another record", () => {
    expect(resolveChatUseCaseId(true, "uc-1", "uc-2")).toBe("uc-1");
    expect(resolveChatUseCaseId(true, null, "uc-2")).toBeNull();
  });
});
