import { describe, expect, it } from "vitest";
import {
  MAX_UNRESOLVED_QUESTIONS,
  discoveryCheckpointSchema,
  reframedTheProblem,
  type DiscoveryCheckpoint,
} from "./discovery";
import { DISCOVERY_CONSTRAINTS } from "@/lib/domain";

function checkpoint(overrides: Record<string, unknown> = {}) {
  return {
    workingTitle: "What onboarding actually needs from a handoff",
    statedProblem: "We need AI to make a better Gong brief for onboarding.",
    refinedProblem:
      "Nobody has written down what onboarding needs to know at handoff, so we cannot tell what a brief would have to contain.",
    baseline:
      "Today the gaps surface on the kickoff call and the engineer chases them by Slack.",
    failurePoint: "The kickoff call, a week after the handoff is supposed to be done.",
    dominantConstraint: "unclear_requirements",
    dominantConstraintDetail:
      "Two people gave different answers about what the brief is for, and neither list of questions exists anywhere.",
    nextAction:
      "List every question an onboarding engineer needs answered, and map each one to Gong, Salesforce, a person, or unknown.",
    expectedLearning:
      "How much of the handoff is retrievable at all, versus how much only exists in somebody's head.",
    whyThisStep:
      "Building the brief first would encode a guess about its contents that nobody has checked.",
    owner: null,
    returnCondition: "When the question list exists and each row has a source.",
    unresolvedQuestions: ["Who owns the handoff today?"],
    ...overrides,
  };
}

describe("discoveryCheckpointSchema", () => {
  it("accepts a complete checkpoint", () => {
    const parsed = discoveryCheckpointSchema.parse(checkpoint());
    expect(parsed.dominantConstraint).toBe("unclear_requirements");
    expect(parsed.unresolvedQuestions).toEqual(["Who owns the handoff today?"]);
  });

  // The three that make a checkpoint worth saving, plus the framing and the
  // constraint. Anything else can honestly be unknown.
  it("requires the fields a checkpoint is useless without", () => {
    for (const field of [
      "workingTitle",
      "refinedProblem",
      "dominantConstraint",
      "dominantConstraintDetail",
      "nextAction",
      "expectedLearning",
      "whyThisStep",
    ] as const) {
      const rest: Record<string, unknown> = checkpoint();
      delete rest[field];
      expect(
        discoveryCheckpointSchema.safeParse(rest).success,
        `${field} must be required`,
      ).toBe(false);
    }
  });

  it("rejects an empty required string rather than saving a blank row", () => {
    expect(
      discoveryCheckpointSchema.safeParse(checkpoint({ nextAction: "" })).success,
    ).toBe(false);
  });

  it("leaves the optional fields optional", () => {
    const parsed = discoveryCheckpointSchema.parse(
      checkpoint({
        statedProblem: null,
        baseline: null,
        failurePoint: null,
        owner: null,
        returnCondition: null,
        unresolvedQuestions: undefined,
      }),
    );
    expect(parsed.owner).toBeNull();
    expect(parsed.unresolvedQuestions).toEqual([]);
  });

  it("accepts every constraint the app declares, and nothing else", () => {
    for (const constraint of DISCOVERY_CONSTRAINTS) {
      expect(
        discoveryCheckpointSchema.safeParse(
          checkpoint({ dominantConstraint: constraint }),
        ).success,
      ).toBe(true);
    }
    expect(
      discoveryCheckpointSchema.safeParse(
        checkpoint({ dominantConstraint: "vibes" }),
      ).success,
    ).toBe(false);
  });

  // "unclear" is a legitimate finding, not a validation failure: a checkpoint
  // whose next step is working out which constraint dominates is a good one.
  it("treats an unclear constraint as valid", () => {
    expect(
      discoveryCheckpointSchema.safeParse(
        checkpoint({ dominantConstraint: "unclear" }),
      ).success,
    ).toBe(true);
  });

  // The card is meant to be scanned. A model that writes an essay into a field
  // is rejected here rather than rendered.
  it("bounds every free-text field", () => {
    const wall = "x".repeat(5000);
    for (const field of [
      "workingTitle",
      "statedProblem",
      "refinedProblem",
      "baseline",
      "failurePoint",
      "dominantConstraintDetail",
      "nextAction",
      "expectedLearning",
      "whyThisStep",
      "owner",
      "returnCondition",
    ]) {
      expect(
        discoveryCheckpointSchema.safeParse(checkpoint({ [field]: wall })).success,
      ).toBe(false);
    }
  });

  it("caps the unresolved-question list and the length of each one", () => {
    expect(
      discoveryCheckpointSchema.safeParse(
        checkpoint({
          unresolvedQuestions: Array.from(
            { length: MAX_UNRESOLVED_QUESTIONS + 1 },
            (_, i) => `Question ${i}`,
          ),
        }),
      ).success,
    ).toBe(false);
    expect(
      discoveryCheckpointSchema.safeParse(
        checkpoint({ unresolvedQuestions: ["x".repeat(5000)] }),
      ).success,
    ).toBe(false);
  });
});

describe("reframedTheProblem", () => {
  it("is true when the framing actually moved", () => {
    expect(
      reframedTheProblem(
        discoveryCheckpointSchema.parse(checkpoint()) as DiscoveryCheckpoint,
      ),
    ).toBe(true);
  });

  it("is false when nothing was said about the original framing", () => {
    expect(
      reframedTheProblem({ statedProblem: null, refinedProblem: "Anything" }),
    ).toBe(false);
  });

  // Showing "Started as" next to an identical refined problem reads as a bug.
  it("is false when the two say the same thing", () => {
    expect(
      reframedTheProblem({
        statedProblem: "  Make the brief better ",
        refinedProblem: "Make the brief better",
      }),
    ).toBe(false);
  });
});
