import { describe, expect, it } from "vitest";
import {
  createdOutcome,
  DISMISSED_CREATE,
  DISMISSED_UPDATE,
  OPENED_IN_FORM,
  recordIdFromOutcome,
  settledLine,
  UPDATED,
} from "./decision";

describe("proposal decisions read back", () => {
  // Transcripts already in the database hold these exact words. Rewording one
  // is fine for the Coach and silent for a fresh decision, but every stored
  // conversation would replay it as an unrecognized outcome — so it has to be
  // a deliberate change, not a passing edit.
  it("keeps the words stored transcripts were written with", () => {
    expect(createdOutcome("abc")).toBe(
      "Accepted — record created at /use-cases/abc",
    );
    expect(OPENED_IN_FORM).toBe(
      "The human chose to review and edit it in the form before saving.",
    );
    expect(DISMISSED_CREATE).toBe(
      "Dismissed — do not save this. Ask what to change if unclear.",
    );
    expect(UPDATED).toBe("Accepted — the record was updated.");
    expect(DISMISSED_UPDATE).toBe("Dismissed — leave the record as it is.");
  });

  it("recovers the record an accepted create saved", () => {
    const id = "6b3a1f2e-0c44-4a9d-9b21-0f7c3d5e8a10";
    expect(recordIdFromOutcome(createdOutcome(id))).toBe(id);
  });

  it("finds no record in the outcomes that saved none", () => {
    for (const outcome of [
      OPENED_IN_FORM,
      DISMISSED_CREATE,
      UPDATED,
      DISMISSED_UPDATE,
    ]) {
      expect(recordIdFromOutcome(outcome)).toBeNull();
    }
  });

  it("treats a truncated accept as no record rather than an empty link", () => {
    expect(recordIdFromOutcome("Accepted — record created at /use-cases/")).toBeNull();
  });

  it("says what happened, for each way a decision can end", () => {
    expect(settledLine(OPENED_IN_FORM)).toBe("Taken to the form to finish there.");
    expect(settledLine(DISMISSED_CREATE)).toBe("Dismissed.");
    expect(settledLine(DISMISSED_UPDATE)).toBe("Dismissed.");
  });

  it("falls back to something true for an outcome it doesn't know", () => {
    expect(settledLine("Something an older build wrote")).toBe(
      "Decision recorded.",
    );
  });
});
