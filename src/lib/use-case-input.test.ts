import { describe, expect, it } from "vitest";
import {
  applyCreateDefaults,
  UPDATE_PATCHABLE_KEYS,
  useCaseCreateApiSchema,
  useCaseCreateSchema,
  useCaseToFormInput,
  useCaseUpdateSchema,
  useCaseUrlSchema,
  type SavedUseCase,
  type UseCaseCreateInput,
} from "./use-case-input";

describe("sparse API create", () => {
  it("accepts title + description alone and fills the emptiest honest defaults", () => {
    const parsed = useCaseCreateSchema.parse({
      title: "Meeting-notes summarizer",
      description: "Summarizes CS call notes into CRM-ready updates.",
    });
    const row = applyCreateDefaults(parsed, {
      source: "mcp",
      actorRole: "contributor",
      createdById: "user-1",
    });
    expect(row.status).toBe("in_discovery");
    expect(row.source).toBe("mcp");
    expect(row.gateNamed).toBe(false);
    expect(row.gateAdoption).toBe(false);
    expect(row.roiStatus).toBe("not_yet_measurable");
    expect(row.successCriterionMet).toBe("not_yet");
    expect(row.aiTools).toEqual([]);
    expect(row.currentSteps).toEqual([]);
    expect(row.department).toBeNull();
    expect(row.ownerName).toBeNull();
    expect(row.isPositive).toBeNull();
  });

  it("rejects records without title or description", () => {
    expect(() => useCaseCreateSchema.parse({ title: "x" })).toThrow();
    expect(() =>
      useCaseCreateSchema.parse({ title: "  ", description: "y" }),
    ).toThrow();
  });

  it("refuses to create at an admin-gated status", () => {
    for (const status of ["qualified", "confirmed_positive_roi"]) {
      expect(() =>
        useCaseCreateSchema.parse({ title: "t", description: "d", status }),
      ).toThrow();
    }
    expect(
      useCaseCreateSchema.parse({ title: "t", description: "d", status: "launched" })
        .status,
    ).toBe("launched");
  });

  it("bounds ratings to 1–5", () => {
    expect(() =>
      useCaseCreateSchema.parse({
        title: "t",
        description: "d",
        ratingPain: 6,
      }),
    ).toThrow();
  });
});

describe("the patchable-field list", () => {
  it("covers every schema field except the specially-handled three", () => {
    const covered = new Set<string>([
      ...UPDATE_PATCHABLE_KEYS,
      "owner",
      "authors",
      "urls",
      "status",
    ]);
    expect([...covered].sort()).toEqual(
      Object.keys(useCaseUpdateSchema.shape).sort(),
    );
  });

  it("never patches status — transitions go through the movement log", () => {
    expect(UPDATE_PATCHABLE_KEYS).not.toContain("status");
    expect(UPDATE_PATCHABLE_KEYS).not.toContain("owner");
    expect(UPDATE_PATCHABLE_KEYS).not.toContain("authors");
    expect(UPDATE_PATCHABLE_KEYS).toContain("title");
    expect(UPDATE_PATCHABLE_KEYS).toContain("gateNamed");
    expect(UPDATE_PATCHABLE_KEYS).toContain("roiStatus");
  });

  it("never patches urls — they are their own table, not a column", () => {
    expect(UPDATE_PATCHABLE_KEYS).not.toContain("urls");
  });
});

describe("record URLs", () => {
  it("keeps a good link, trimmed, and defaults the kind", () => {
    const parsed = useCaseUrlSchema.parse({ url: "  https://a.example.com/x  " });
    expect(parsed.url).toBe("https://a.example.com/x");
    expect(parsed.kind).toBe("other");
  });

  // The record page renders these as anchors — see also use-case-urls.test.ts,
  // which covers the render-time guard.
  it.each([
    "javascript:alert(1)",
    "javascript://example.com/%0aalert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "//evil.com",
    "not a url",
  ])("refuses %s at the door every write path shares", (url) => {
    expect(useCaseUrlSchema.safeParse({ url }).success).toBe(false);
  });
});

describe("the REST door", () => {
  /**
   * REST and MCP go through the legacy-`approach` preprocessor rather than the
   * bare create schema, so links have to survive that rewrite — the routes
   * themselves know nothing about urls.
   */
  it("carries urls through the legacy-approach rewrite", () => {
    const parsed = useCaseCreateApiSchema.parse({
      title: "T",
      description: "D",
      approach: "prompt",
      urls: [{ kind: "live", url: "https://a.example.com" }],
    }) as UseCaseCreateInput;
    expect(parsed.approaches).toEqual(["prompt"]);
    expect(parsed.urls).toEqual([
      { kind: "live", url: "https://a.example.com" },
    ]);
  });

  it("rejects a bad scheme at the REST door too", () => {
    expect(
      useCaseCreateApiSchema.safeParse({
        title: "T",
        description: "D",
        urls: [{ url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });
});

describe("a saved record, back into the edit form", () => {
  const saved: SavedUseCase = {
    ...applyCreateDefaults(
      useCaseCreateSchema.parse({ title: "T", description: "D" }),
      { source: "form", createdById: "user-1", actorRole: "contributor" },
    ),
    buildHours: 12,
    authors: [{ personId: null, userId: "u2", displayName: "Ada" }],
    urls: [{ kind: "github", label: null, url: "https://github.com/x/y" }],
  };

  /**
   * The form submits every field it holds, so anything this mapper forgets is
   * sent as null and overwrites what was saved. buildHours was the field that
   * got erased this way; this test is why it can't happen again.
   */
  it("covers every field the create schema knows about, except status", () => {
    const expected = Object.keys(useCaseCreateSchema.shape)
      .filter((k) => k !== "status")
      .sort();
    expect(Object.keys(useCaseToFormInput(saved)).sort()).toEqual(expected);
  });

  it("round-trips the fields that were being lost", () => {
    const out = useCaseToFormInput(saved);
    expect(out.buildHours).toBe(12);
    expect(out.urls).toEqual([
      { kind: "github", label: null, url: "https://github.com/x/y" },
    ]);
  });

  it("leaves the owner null rather than inventing an empty person", () => {
    expect(useCaseToFormInput(saved).owner).toBeNull();
    expect(
      useCaseToFormInput({ ...saved, ownerName: "Kate", ownerUserId: "u9" })
        .owner,
    ).toEqual({ personId: null, userId: "u9", displayName: "Kate" });
  });
});

describe("program membership is stamped, not submitted", () => {
  const minimal = { title: "A workflow", description: "What it does." };

  it("stamps in-program for an AI Lead", () => {
    const row = applyCreateDefaults(useCaseCreateSchema.parse(minimal), {
      source: "form",
      createdById: "u1",
      actorRole: "contributor",
    });
    expect(row.inProgram).toBe(true);
  });

  it("stamps community for an employee and for an admin", () => {
    for (const actorRole of ["employee", "admin"] as const) {
      const row = applyCreateDefaults(useCaseCreateSchema.parse(minimal), {
        source: "form",
        createdById: "u1",
        actorRole,
      });
      expect(row.inProgram).toBe(false);
    }
  });

  it("always sets the key rather than leaning on the column default", () => {
    const row = applyCreateDefaults(useCaseCreateSchema.parse(minimal), {
      source: "form",
      createdById: "u1",
      actorRole: "employee",
    });
    expect("inProgram" in row).toBe(true);
  });

  it("is not a field anyone can submit or patch", () => {
    // UPDATE_PATCHABLE_KEYS is derived from the update schema, so a field on
    // the create schema would hand every record's editor the program switch.
    // Membership changes go through the admin-only setProgramMembership.
    expect(Object.keys(useCaseCreateSchema.shape)).not.toContain("inProgram");
    expect(UPDATE_PATCHABLE_KEYS as string[]).not.toContain("inProgram");
  });
});
