import { describe, expect, it } from "vitest";
import {
  COURSES,
  COURSE_BASE_URL,
  COURSE_TAGS,
  MAX_SUGGESTIONS,
  courseSignalWeights,
  courseUrl,
  suggestCourses,
} from "./courses";

const slugs = (signals: Parameters<typeof suggestCourses>[0]) =>
  suggestCourses(signals).map((c) => c.slug);

describe("the catalogue", () => {
  it("has no duplicate slugs", () => {
    const seen = COURSES.map((c) => c.slug);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("gives every course a title, a summary, and at least one tag", () => {
    for (const course of COURSES) {
      expect(course.title.length, course.slug).toBeGreaterThan(0);
      expect(course.summary.length, course.slug).toBeGreaterThan(20);
      expect(course.tags.length, course.slug).toBeGreaterThan(0);
    }
  });

  it("uses only known tags", () => {
    for (const course of COURSES) {
      for (const tag of course.tags) expect(COURSE_TAGS).toContain(tag);
      if (course.requires) expect(COURSE_TAGS).toContain(course.requires);
    }
  });

  it("only requires a tag the course itself carries", () => {
    // A course gated on something it isn't about would be unreachable for
    // reasons nobody could find by reading it.
    for (const course of COURSES) {
      if (course.requires) expect(course.tags, course.slug).toContain(course.requires);
    }
  });

  it("builds course URLs on deeplearning.ai", () => {
    expect(courseUrl("agentic-ai")).toBe(`${COURSE_BASE_URL}agentic-ai`);
    for (const course of COURSES) {
      expect(course.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("suggesting nothing", () => {
  // The most important behaviour here. An irrelevant course costs more trust
  // than a relevant one earns, so silence has to be reachable and common.
  it("says nothing for a workflow with no AI shape to it", () => {
    expect(slugs({ text: "Quarterly board slide review with the ELT." })).toEqual([]);
  });

  it("says nothing for an empty record", () => {
    expect(slugs({})).toEqual([]);
    expect(slugs({ text: "", aiTools: [], approaches: [] })).toEqual([]);
  });

  it("does not let 'probably not an engineer' carry a course on its own", () => {
    // nontechnical + foundations fire for almost everyone. Alone they must
    // never clear the bar, or every record in the casebook gets the same two
    // intro courses stapled to it.
    const weights = courseSignalWeights({ text: "A weekly report." });
    expect(weights.get("nontechnical")).toBeGreaterThan(0);
    expect(slugs({ text: "A weekly report." })).toEqual([]);
  });
});

describe("suggesting the obviously right thing", () => {
  it("sends a prompt-only workflow to the prompting course, and not to a developer course", () => {
    const out = slugs({
      text: "Sales reps draft follow-up emails after customer meetings.",
      aiTools: ["Claude"],
      approaches: ["prompt"],
      department: "mss",
    });
    expect(out[0]).toBe("ai-prompting-for-everyone");
    expect(out).not.toContain("chatgpt-prompt-eng");
    expect(out).not.toContain("ai-python-for-beginners");
  });

  it("sends a Claude Code build to the coding-agent courses", () => {
    const out = slugs({
      text: "An internal tool we built with Claude Code that assembles onboarding checklists.",
      aiTools: ["Claude Code"],
      approaches: ["built"],
      department: "people",
    });
    expect(out).toContain("claude-code-a-highly-agentic-coding-assistant");
    // Someone who ships with Claude Code is not the audience for "if you've
    // never written code before".
    expect(out).not.toContain("build-with-andrew");
  });

  it("sends an agentic workflow to the agent courses", () => {
    const out = slugs({
      text: "An agent that triages inbound support tickets and routes them.",
      approaches: ["agentic"],
      department: "css",
    });
    expect(out).toContain("agentic-ai");
  });

  it("sends a Zapier automation to the orchestration course", () => {
    const out = slugs({
      text: "A nightly automation that files new requests into the tracker.",
      aiTools: ["Zapier"],
      approaches: ["automation"],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.includes("crewai") || s.includes("orchestrating"))).toBe(true);
  });

  it("hears a document-extraction problem", () => {
    const out = slugs({
      text: "Reading scanned invoices and pulling the totals into a spreadsheet.",
      approaches: ["prompt"],
      department: "finance_legal",
    });
    expect(out).toContain("document-ai-from-ocr-to-agentic-doc-extraction");
  });
});

describe("not riding in on a broad co-tag", () => {
  // The bug this class of gate exists for: "Building AI Browser Agents" scored
  // well for a ticket-triage agent purely on `agents` + `automation`, because
  // those two tags are broad and `browser` — the thing the course is actually
  // about — was never mentioned by anyone.
  const triage = {
    text: "An agent that triages inbound support tickets, tags them, and routes them to the right queue.",
    approaches: ["agentic", "automation"] as const,
    department: "css" as const,
  };

  it.each([
    ["building-ai-browser-agents", "browser"],
    ["voice-for-ai-agents-and-applications", "voice"],
    ["agent-memory-building-memory-aware-agents", "memory"],
    ["governing-ai-agents", "safety"],
    ["evaluating-ai-agents", "evaluation"],
  ])("keeps %s out until %s is actually raised", (slug) => {
    expect(slugs({ ...triage, approaches: [...triage.approaches] })).not.toContain(slug);
  });

  it("lets them in once it is", () => {
    expect(
      slugs({ ...triage, approaches: [...triage.approaches], ratings: { evaluationClarity: 1 } }),
    ).toContain("evaluating-ai-agents");
    expect(
      slugs({
        text: "A voice agent that answers the main phone line.",
        approaches: ["agentic"],
      }),
    ).toContain("voice-for-ai-agents-and-applications");
  });

  it("keeps the code-review course out of an unrelated build", () => {
    expect(
      slugs({
        text: "An internal tool we built with Claude Code that assembles onboarding checklists.",
        aiTools: ["Claude Code"],
        approaches: ["built"],
      }),
    ).not.toContain("ai-code-review");
  });
});

describe("the ratings the wizard already collects", () => {
  it("reads a low evaluation-clarity rating as a need for evals", () => {
    const out = slugs({
      text: "An agent that summarises weekly customer feedback.",
      approaches: ["agentic"],
      ratings: { evaluationClarity: 1 },
    });
    expect(out).toContain("evaluating-ai-agents");
  });

  it("reads a high risk rating as a need for governance", () => {
    const out = slugs({
      text: "An agent that answers questions about student records.",
      approaches: ["agentic"],
      ratings: { risk: 5 },
    });
    expect(out.some((s) => s === "governing-ai-agents" || s === "red-teaming-llm-applications")).toBe(true);
  });

  it("ignores ratings in the middle of the scale", () => {
    const mid = courseSignalWeights({
      text: "A weekly digest.",
      ratings: { evaluationClarity: 3, risk: 3, dataAvailability: 3, maintenanceBurden: 3 },
    });
    expect(mid.get("evaluation")).toBeUndefined();
    expect(mid.get("safety")).toBeUndefined();
  });
});

describe("the shape of the answer", () => {
  const busy = {
    text: "An agent built with Claude Code that reads scanned contracts, extracts the renewal dates into a spreadsheet, and posts a summary. It hallucinates sometimes and we are not sure how to evaluate it.",
    aiTools: ["Claude Code", "Zapier", "Snowflake"],
    approaches: ["agentic", "built", "automation"] as const,
    department: "engineering" as const,
    ratings: { evaluationClarity: 1, risk: 5, maintenanceBurden: 5 },
  };

  it("never returns more than three", () => {
    expect(suggestCourses({ ...busy, approaches: [...busy.approaches] }).length).toBeLessThanOrEqual(
      MAX_SUGGESTIONS,
    );
    expect(
      suggestCourses({ ...busy, approaches: [...busy.approaches] }, 10).length,
    ).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it("honours a smaller limit", () => {
    expect(
      suggestCourses({ ...busy, approaches: [...busy.approaches] }, 1),
    ).toHaveLength(1);
  });

  it("never returns two courses from the same family", () => {
    const out = suggestCourses({ ...busy, approaches: [...busy.approaches] });
    const families = out
      .map((c) => COURSES.find((x) => x.slug === c.slug)?.family)
      .filter(Boolean);
    expect(new Set(families).size).toBe(families.length);
  });

  it("carries the link and the reason the course matched", () => {
    const [first] = suggestCourses({
      text: "Sales reps draft follow-up emails.",
      approaches: ["prompt"],
    });
    expect(first.url).toBe(courseUrl(first.slug));
    expect(first.matchedOn.length).toBeGreaterThan(0);
    expect(first.summary.length).toBeGreaterThan(20);
  });

  it("is stable — the same signals give the same courses in the same order", () => {
    const a = slugs({ ...busy, approaches: [...busy.approaches] });
    const b = slugs({ ...busy, approaches: [...busy.approaches] });
    expect(a).toEqual(b);
  });
});
