import { describe, expect, it } from "vitest";
import type { FieldChangeEntry } from "@/server/use-case-queries";
import {
  OWNER_AUDIT_BEGAN,
  membershipTrail,
  ownerWhenLogged,
} from "./membership-trail";

const LOGGED = new Date("2026-09-25T14:00:00Z");

function change(
  field: FieldChangeEntry["field"],
  fromValue: string | null,
  toValue: string | null,
  at: string,
  by: string | null = "Evelyn Wong",
): FieldChangeEntry {
  return {
    id: `${field}-${at}`,
    field,
    fromValue,
    toValue,
    createdAt: new Date(at),
    changedByName: by,
  };
}

describe("owner when logged", () => {
  it("is the current owner when the owner never changed", () => {
    expect(
      ownerWhenLogged({
        ownerName: "Evelyn Wong",
        createdAt: LOGGED,
        fieldHistory: [],
      }),
    ).toEqual({ known: true, owner: "Evelyn Wong" });
  });

  it("is the earliest change's 'from', whatever order the trail arrives in", () => {
    expect(
      ownerWhenLogged({
        ownerName: "Evelyn Wong",
        createdAt: LOGGED,
        // Newest first, as getUseCase returns it.
        fieldHistory: [
          change("owner", "Kenton Lu", "Evelyn Wong", "2026-10-30T15:00:00Z"),
          change("owner", "Bianca Ng", "Kenton Lu", "2026-10-01T15:00:00Z"),
        ],
      }),
    ).toEqual({ known: true, owner: "Bianca Ng" });
  });

  it("is no owner when the first change set one", () => {
    expect(
      ownerWhenLogged({
        ownerName: "Neal Pascua",
        createdAt: LOGGED,
        fieldHistory: [
          change("owner", null, "Neal Pascua", "2026-09-25T14:05:00Z"),
        ],
      }),
    ).toEqual({ known: true, owner: null });
  });

  it("ignores other audited fields", () => {
    expect(
      ownerWhenLogged({
        ownerName: "Evelyn Wong",
        createdAt: LOGGED,
        fieldHistory: [
          change("authors", "Bianca Ng", "Evelyn Wong", "2026-09-25T14:05:00Z"),
        ],
      }),
    ).toEqual({ known: true, owner: "Evelyn Wong" });
  });

  it("refuses to guess for a record older than the audit trail", () => {
    expect(
      ownerWhenLogged({
        ownerName: "Evelyn Wong",
        createdAt: new Date(OWNER_AUDIT_BEGAN.getTime() - 1),
        fieldHistory: [],
      }),
    ).toEqual({ known: false });
  });
});

describe("membership trail", () => {
  it("names the owner the stamp read, not the current one", () => {
    const trail = membershipTrail({
      inProgram: false,
      ownerName: "Evelyn Wong",
      createdAt: LOGGED,
      createdByName: "Evelyn Wong",
      fieldHistory: [
        change("owner", "Bianca Ng", "Evelyn Wong", "2026-10-30T15:00:00Z"),
      ],
    });
    expect(trail.logged).toBe(
      "2026-09-25 by Evelyn Wong, owned then by Bianca Ng",
    );
    expect(trail.changes).toEqual([
      {
        when: "2026-10-30",
        change: "Owner: Bianca Ng → Evelyn Wong",
        by: "Evelyn Wong",
      },
    ]);
  });

  it("says membership followed the logger when no owner was named", () => {
    expect(
      membershipTrail({
        inProgram: true,
        ownerName: null,
        createdAt: LOGGED,
        createdByName: "Evelyn Wong",
        fieldHistory: [],
      }).logged,
    ).toBe(
      "2026-09-25 by Evelyn Wong, with no owner named, so membership followed whoever logged it",
    );
  });

  it("says so when the owner at logging is not on record", () => {
    expect(
      membershipTrail({
        inProgram: true,
        ownerName: "Evelyn Wong",
        createdAt: new Date("2026-08-20T14:00:00Z"),
        createdByName: "Tom Leger",
        fieldHistory: [],
      }).logged,
    ).toBe(
      "2026-08-20 by Tom Leger, before owner changes were recorded, so the owner it had then is not on record",
    );
  });

  it("drops the logger when their account is gone", () => {
    expect(
      membershipTrail({
        inProgram: false,
        ownerName: "Bianca Ng",
        createdAt: LOGGED,
        createdByName: null,
        fieldHistory: [],
      }).logged,
    ).toBe("2026-09-25, owned then by Bianca Ng");
  });

  it("keeps owner and membership changes, oldest first, and nothing else", () => {
    const trail = membershipTrail({
      inProgram: true,
      ownerName: "Evelyn Wong",
      createdAt: LOGGED,
      createdByName: "Evelyn Wong",
      fieldHistory: [
        change("in_program", "false", "true", "2026-10-30T16:00:00Z", "Tom Leger"),
        change("gate_owner", "false", "true", "2026-10-30T15:30:00Z"),
        change("owner", "Bianca Ng", "Evelyn Wong", "2026-10-30T15:00:00Z"),
        change("authors", "Bianca Ng", "Evelyn Wong", "2026-09-25T14:05:00Z"),
      ],
    });
    expect(trail.changes).toEqual([
      {
        when: "2026-10-30",
        change: "Owner: Bianca Ng → Evelyn Wong",
        by: "Evelyn Wong",
      },
      {
        when: "2026-10-30",
        change: "Added to the program — counts toward the 45 and the 15",
        by: "Tom Leger",
      },
    ]);
  });
});
