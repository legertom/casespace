import { describe, expect, it } from "vitest";
import {
  diffProposal,
  dropOffByStep,
  summarizeCorrections,
  summarizeOutcomes,
  wizardProgress,
  wizardStepFromText,
} from "./coach-learnings";

const person = (displayName: string) => ({
  personId: null,
  userId: null,
  displayName,
});

describe("diffProposal", () => {
  it("says nothing when the human changed nothing", () => {
    const record = {
      title: "Invoice triage",
      description: "Sorts invoices",
      department: "finance_legal" as const,
      authors: [person("Ada Lovelace")],
    };
    expect(diffProposal(record, record)).toEqual([]);
  });

  it("ignores case and whitespace", () => {
    const changes = diffProposal(
      { title: "Invoice  Triage" },
      { title: "invoice triage" },
    );
    expect(changes).toEqual([]);
  });

  it("calls an empty guess filled and a wrong one corrected", () => {
    const changes = diffProposal(
      { owner: null, department: "engineering" },
      { owner: person("Ada Lovelace"), department: "finance_legal" },
    );
    expect(changes).toEqual([
      {
        field: "department",
        label: "Department",
        kind: "corrected",
        from: "engineering",
        to: "finance_legal",
      },
      {
        field: "owner",
        label: "Owner",
        kind: "filled",
        from: "",
        to: "Ada Lovelace",
      },
    ]);
  });

  // Without a url branch in display(), every links diff reads
  // "[object Object]" and every record scores as corrected.
  it("shows links by their URL, not as objects", () => {
    const changes = diffProposal(
      { urls: [] },
      { urls: [{ kind: "github", label: null, url: "https://github.com/a/b" }] },
    );
    expect(changes).toEqual([
      {
        field: "urls",
        label: "Links",
        kind: "filled",
        from: "",
        to: "https://github.com/a/b",
      },
    ]);
  });

  it("notices build hours the human had to supply", () => {
    const changes = diffProposal({ buildHours: null }, { buildHours: 8 });
    expect(changes).toEqual([
      {
        field: "buildHours",
        label: "Build hours",
        kind: "filled",
        from: "",
        to: "8",
      },
    ]);
  });

  it("calls a deleted guess cleared", () => {
    const changes = diffProposal(
      { baselineMetric: "hours per week" },
      { baselineMetric: null },
    );
    expect(changes).toEqual([
      {
        field: "baselineMetric",
        label: "Baseline metric",
        kind: "cleared",
        from: "hours per week",
        to: "",
      },
    ]);
  });

  it("treats the sparse defaults as no claim, not a wrong claim", () => {
    const changes = diffProposal(
      { gateAdoption: false, roiStatus: "not_yet_measurable", status: "in_discovery" },
      { gateAdoption: true, roiStatus: "complete", status: "launched" },
    );
    expect(changes.map((c) => c.kind)).toEqual(["filled", "filled", "filled"]);
  });

  it("compares people and lists by their display text", () => {
    const changes = diffProposal(
      { authors: [person("Ada Lovelace")], aiTools: ["Claude", "Sheets"] },
      { authors: [person("Ada Lovelace"), person("Grace Hopper")], aiTools: ["Claude"] },
    );
    expect(changes).toEqual([
      {
        field: "authors",
        label: "Authors",
        kind: "corrected",
        from: "Ada Lovelace",
        to: "Ada Lovelace; Grace Hopper",
      },
      {
        field: "aiTools",
        label: "AI tools",
        kind: "corrected",
        from: "Claude; Sheets",
        to: "Claude",
      },
    ]);
  });

  it("skips fields neither side mentioned", () => {
    expect(diffProposal({ title: "A" }, { title: "A" })).toEqual([]);
  });

  it("compares the team by name, since ids are the picker's business", () => {
    const changes = diffProposal(
      { teamName: "Billing", teamId: null },
      { teamName: "Revenue Ops", teamId: "3f0c0a0e-0000-4000-8000-000000000000" },
    );
    expect(changes).toEqual([
      {
        field: "teamName",
        label: "Team",
        kind: "corrected",
        from: "Billing",
        to: "Revenue Ops",
      },
    ]);
  });
});

describe("summarizeCorrections", () => {
  it("ranks corrections above fills and keeps examples", () => {
    const stats = summarizeCorrections([
      diffProposal({ department: "engineering" }, { department: "css" }),
      diffProposal({ department: "engineering" }, { department: "people" }),
      diffProposal({ owner: null }, { owner: person("Ada Lovelace") }),
      diffProposal({ owner: null }, { owner: person("Grace Hopper") }),
      diffProposal({ owner: null }, { owner: person("Katie Clarkson") }),
    ]);
    expect(stats[0].field).toBe("department");
    expect(stats[0].corrected).toBe(2);
    expect(stats[0].examples).toHaveLength(2);
    expect(stats[1].field).toBe("owner");
    expect(stats[1].filled).toBe(3);
    // Fills carry no example — "it was blank" is not texture.
    expect(stats[1].examples).toEqual([]);
  });

  it("is empty when nothing was ever corrected", () => {
    expect(summarizeCorrections([[], []])).toEqual([]);
  });
});

describe("wizardStepFromText", () => {
  it("reads the step off the Coach's question", () => {
    expect(wizardStepFromText("Which team is this for?")).toBe(3);
    expect(
      wizardStepFromText("Rate these 1-5: frequency, pain, and risk."),
    ).toBe(5);
    expect(wizardStepFromText("Who uses it beyond the authors?")).toBe(8);
  });

  it("takes the last cue when a question recaps on its way forward", () => {
    expect(
      wizardStepFromText(
        "Got it — the billing team owns it. Now, how would you rate the pain, 1-5?",
      ),
    ).toBe(5);
  });

  it("returns null rather than guessing", () => {
    expect(wizardStepFromText("Sounds good. Anything else?")).toBeNull();
  });
});

describe("wizardProgress", () => {
  const assistant = (text: string) => ({
    role: "assistant",
    parts: [{ type: "text", text }],
  });
  const user = (text: string) => ({ role: "user", parts: [{ type: "text", text }] });

  it("counts turns and finds the last step asked", () => {
    const progress = wizardProgress([
      user("I want to log a thing"),
      assistant("What does it do today?"),
      user("It sorts invoices"),
      assistant("Which team is this for?"),
    ]);
    expect(progress.userTurns).toBe(2);
    expect(progress.reachedProposal).toBe(false);
    expect(progress.lastStep).toBe(3);
    expect(progress.lastStepLabel).toBe("Team, authors, owner");
  });

  it("notices a proposal card", () => {
    const progress = wizardProgress([
      user("log it"),
      { role: "assistant", parts: [{ type: "tool-propose_use_case" }] },
    ]);
    expect(progress.reachedProposal).toBe(true);
  });

  it("survives junk", () => {
    expect(wizardProgress(null).userTurns).toBe(0);
    expect(wizardProgress([{}, { role: "assistant" }]).lastStep).toBeNull();
  });
});

describe("dropOffByStep", () => {
  const conversation = (steps: string[], proposed = false) => ({
    messages: [
      ...steps.flatMap((text) => [
        { role: "user", parts: [{ type: "text", text: "ok" }] },
        { role: "assistant", parts: [{ type: "text", text }] },
      ]),
      ...(proposed
        ? [{ role: "assistant", parts: [{ type: "tool-propose_use_case" }] }]
        : []),
    ],
  });

  it("buckets abandoned conversations by the step they died on", () => {
    const result = dropOffByStep([
      conversation(["What does it do today?", "Rate the pain 1-5"]),
      conversation(["Which team?", "Rate the pain 1-5"]),
      conversation(["Which team?", "Who owns it going forward?"]),
      conversation(["Which team?", "Rate the pain 1-5"], true),
    ]);
    expect(result.abandoned).toBe(3);
    expect(result.buckets).toEqual([
      { step: 3, label: "Team, authors, owner", count: 1 },
      { step: 5, label: "The seven ratings", count: 2 },
    ]);
  });

  it("does not count someone who opened the door and closed it", () => {
    const result = dropOffByStep([
      { messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] },
    ]);
    expect(result.abandoned).toBe(0);
  });

  it("keeps unreadable abandonments visible instead of dropping them", () => {
    const result = dropOffByStep([conversation(["Sure.", "Anything else?"])]);
    expect(result.abandoned).toBe(1);
    expect(result.unattributed).toBe(1);
    expect(result.buckets).toEqual([]);
  });
});

describe("summarizeOutcomes", () => {
  it("counts the people who never decided", () => {
    const s = summarizeOutcomes({
      proposed: 10,
      accepted: 4,
      editedThenSaved: 3,
      dismissed: 1,
      savedUnchanged: 4,
    });
    expect(s.saved).toBe(7);
    expect(s.walkedAway).toBe(2);
    expect(s.savedRate).toBeCloseTo(0.7);
    expect(s.cleanRate).toBeCloseTo(4 / 7);
  });

  it("credits a notes draft saved untouched, which has no accept button", () => {
    const s = summarizeOutcomes({
      proposed: 4,
      accepted: 0,
      editedThenSaved: 4,
      dismissed: 0,
      savedUnchanged: 3,
    });
    expect(s.cleanRate).toBeCloseTo(0.75);
  });

  it("reports no rate rather than zero when nothing was proposed", () => {
    const s = summarizeOutcomes({
      proposed: 0,
      accepted: 0,
      editedThenSaved: 0,
      dismissed: 0,
      savedUnchanged: 0,
    });
    expect(s.savedRate).toBeNull();
    expect(s.cleanRate).toBeNull();
  });
});
