import { getTableName, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import {
  BACKUP_TABLES,
  NOT_BACKED_UP,
  backupFilename,
  backupIsStale,
  buildBackupFiles,
  fromStoredRow,
  isStoredBackupName,
  readBackup,
  sortStoredRows,
  storedBackupPath,
  storedBackupTakenAt,
  toCsv,
  toStoredRow,
  useCasesCsv,
  zipBackupFiles,
  type BackupTables,
} from "./backup";

const allTables = (Object.values(schema) as unknown[]).filter(
  (v): v is PgTable => is(v, PgTable),
);
const backedUp: string[] = BACKUP_TABLES.map((t) => getTableName(t));

describe("what a backup covers", () => {
  // A new table has to be a decision: in the backup, or out with a reason.
  it("accounts for every table in the schema, exactly once", () => {
    const names = allTables.map((t) => getTableName(t)).sort();
    const accounted = [...backedUp, ...Object.keys(NOT_BACKED_UP)].sort();
    expect(accounted).toEqual(names);
  });

  // The restore inserts in BACKUP_TABLES order, so this is what keeps it from
  // failing on a foreign key — and what notices when a record starts pointing
  // at a table the backup leaves behind.
  it("holds every table its rows point at, earlier in the order", () => {
    const problems: string[] = [];
    BACKUP_TABLES.forEach((table, at) => {
      for (const fk of getTableConfig(table).foreignKeys) {
        const target = getTableName(fk.reference().foreignTable);
        const from = getTableName(table);
        if (target === from) continue; // comments reply to comments
        const targetAt = backedUp.indexOf(target);
        if (targetAt === -1) problems.push(`${from} → ${target} (not backed up)`);
        else if (targetAt > at) problems.push(`${from} → ${target} (restored later)`);
      }
    });
    expect(problems).toEqual([]);
  });

  it("carries the records and everything hanging off them", () => {
    expect(backedUp).toEqual(
      expect.arrayContaining([
        "use_cases",
        "use_case_authors",
        "use_case_urls",
        "use_case_links",
        "status_changes",
        "field_changes",
        "use_case_comments",
      ]),
    );
  });

  it("leaves out tokens and private conversations", () => {
    for (const table of ["pats", "coach_chats", "discovery_checkpoints"]) {
      expect(backedUp).not.toContain(table);
    }
  });
});

describe("a row, there and back", () => {
  const selected = {
    id: "6b3a1f2e-0c44-4a9d-9b21-0f7c3d5e8a10",
    title: "Renewal forecast — draft",
    description: 'Says "hello", then\nstops.',
    department: null,
    aiTools: ["Claude", "Sheets"],
    approaches: [],
    currentSteps: ["Pull the report", "Paste into the model"],
    baselineValue: 4.5,
    isPositive: null,
    inProgram: false,
    revisitOn: "2026-12-01",
    createdById: "11111111-1111-4111-8111-111111111111",
    createdAt: new Date("2026-09-01T14:30:00.123Z"),
    updatedAt: new Date("2026-09-02T09:00:00.000Z"),
    deletedAt: null,
  };

  it("stores under the database's column names, timestamps as ISO text", () => {
    const stored = toStoredRow(schema.useCases, selected);
    expect(stored.ai_tools).toEqual(["Claude", "Sheets"]);
    expect(stored.created_at).toBe("2026-09-01T14:30:00.123Z");
    expect(stored.revisit_on).toBe("2026-12-01");
    expect(stored.deleted_at).toBeNull();
    expect("aiTools" in stored).toBe(false);
  });

  it("survives JSON and comes back as what drizzle inserts", () => {
    const stored = JSON.parse(
      JSON.stringify(toStoredRow(schema.useCases, selected)),
    );
    const back = fromStoredRow(schema.useCases, stored);
    for (const [key, value] of Object.entries(selected)) {
      expect(back[key]).toEqual(value);
    }
    expect(back.createdAt).toBeInstanceOf(Date);
    // A calendar date is not a moment, and must not become one.
    expect(back.revisitOn).toBe("2026-12-01");
  });

  it("leaves a column the schema gained since to its default", () => {
    const back = fromStoredRow(schema.teams, { id: "t1", name: "Support" });
    expect(back).toEqual({ id: "t1", name: "Support" });
  });

  it("refuses a column the schema no longer has, by name", () => {
    expect(() =>
      fromStoredRow(schema.teams, { id: "t1", name: "Support", mascot: "owl" }),
    ).toThrow(/teams.*mascot/);
  });
});

describe("row order", () => {
  it("is the same whatever order the database returned", () => {
    const rows = [{ id: "b" }, { id: "c" }, { id: "a" }];
    expect(sortStoredRows(schema.teams, rows).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("orders a composite key by all of it", () => {
    const rows = [
      { lead_id: "b", team_id: "1" },
      { lead_id: "a", team_id: "2" },
      { lead_id: "a", team_id: "1" },
    ];
    expect(sortStoredRows(schema.aiLeadTeams, rows)).toEqual([
      { lead_id: "a", team_id: "1" },
      { lead_id: "a", team_id: "2" },
      { lead_id: "b", team_id: "1" },
    ]);
  });

  it("puts a comment before the replies to it", () => {
    const rows = [
      { id: "a", depth: 2 },
      { id: "z", depth: 0 },
      { id: "m", depth: 1 },
    ];
    expect(sortStoredRows(schema.useCaseComments, rows).map((r) => r.id)).toEqual(
      ["z", "m", "a"],
    );
  });
});

describe("the CSV", () => {
  it("quotes what needs quoting and nothing else", () => {
    const csv = toCsv(["a", "b"], [["plain", 'has "quotes", commas\nand lines']]);
    expect(csv).toBe(
      '﻿a,b\r\nplain,"has ""quotes"", commas\nand lines"\r\n',
    );
  });

  it("writes nothing for null and words for booleans", () => {
    expect(toCsv(["a", "b", "c"], [[null, true, false]])).toContain(",yes,no");
  });

  // A spreadsheet executes a cell that begins like a formula.
  it("defuses text a spreadsheet would run", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)");
    expect(toCsv(["a"], [[-3]])).toContain("\r\n-3\r\n");
  });
});

const tables: BackupTables = {
  people: [{ id: "p1", name: "Jen Kampf" }],
  users: [{ id: "u1", name: "Tom Leger", primary_email: "tom@example.com" }],
  teams: [{ id: "t1", name: "Support Ops", department: "CSS" }],
  elt_orgs: [{ id: "e1", name: "Customer" }],
  use_cases: [
    {
      id: "uc1",
      title: "Quarterly report, automated",
      description: "Was an hour each quarter.",
      status: "qualified",
      in_program: true,
      department: "CSS",
      team_id: "t1",
      elt_org_id: "e1",
      owner_person_id: "p1",
      owner_user_id: null,
      owner_name: null,
      ai_tools: ["Claude"],
      approaches: ["automation"],
      current_steps: ["Export", "Summarize"],
      created_by_id: "u1",
      created_at: "2026-09-01T14:30:00.000Z",
    },
  ],
  use_case_authors: [
    { id: "a2", use_case_id: "uc1", display_name: "Lizzy Dawson", position: 1 },
    { id: "a1", use_case_id: "uc1", display_name: "Jen Kampf", position: 0 },
  ],
  use_case_urls: [
    { id: "l1", use_case_id: "uc1", kind: "repo", label: null, url: "https://example.com/r", position: 0 },
  ],
  status_changes: [
    { id: "s1", use_case_id: "uc1", from_status: "qualified", to_status: "confirmed_positive_roi", note: "Worth $40k a year" },
  ],
};

describe("the readable copy of the records", () => {
  const csv = useCasesCsv(tables);
  const [header, row] = csv.replace("﻿", "").split("\r\n");

  it("has one line per use case under a header", () => {
    expect(header.startsWith("id,title,status,")).toBe(true);
    expect(row.startsWith("uc1,")).toBe(true);
  });

  it("says names where the database says ids", () => {
    expect(row).toContain("Support Ops");
    expect(row).toContain("Customer");
    expect(row).toContain("Jen Kampf; Lizzy Dawson");
    expect(row).toContain("Tom Leger");
    expect(row).not.toContain("t1,");
  });

  it("numbers the steps and labels the links", () => {
    expect(csv).toContain("1. Export\n2. Summarize");
    expect(csv).toContain("repo: https://example.com/r");
  });

  // The annual-ROI note may carry dollars; this is the file that gets passed
  // around. The note stays in data/status_changes.json.
  it("carries no status notes", () => {
    expect(csv).not.toContain("$40k");
  });
});

describe("the archive", () => {
  const createdAt = new Date("2026-10-02T19:30:00.000Z");
  const meta = { createdAt, createdBy: "Tom Leger", schema: "0019_coach_failures" };
  const { manifest, files } = buildBackupFiles(tables, meta);
  const zip = zipBackupFiles(files, createdAt);

  it("has a file for every backed-up table, even an empty one", () => {
    expect(manifest.tables.map((t) => t.name)).toEqual(backedUp);
    expect(files["data/use_case_comments.json"]).toBe("[]\n");
  });

  it("counts what it holds", () => {
    const count = (name: string) =>
      manifest.tables.find((t) => t.name === name)?.rows;
    expect(count("use_cases")).toBe(1);
    expect(count("use_case_authors")).toBe(2);
  });

  it("opens with a README that says what it is and how to restore it", () => {
    expect(Object.keys(unzipSync(zip))[0]).toBe("README.txt");
    expect(files["README.txt"]).toContain("pnpm db:restore");
    expect(files["README.txt"]).toContain("1 use case.");
  });

  it("reads back to the rows that went in", () => {
    const parsed = readBackup(zip);
    expect(parsed.manifest).toEqual(manifest);
    expect(parsed.tables.use_cases).toEqual(tables.use_cases);
    expect(parsed.tables.status_changes?.[0].note).toBe("Worth $40k a year");
    // Sorted on the way in, so two backups of the same data are identical.
    expect(parsed.tables.use_case_authors.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("is byte-for-byte repeatable", () => {
    const again = zipBackupFiles(buildBackupFiles(tables, meta).files, createdAt);
    expect(Buffer.from(again).equals(Buffer.from(zip))).toBe(true);
  });

  it("names the file for when it was taken", () => {
    expect(backupFilename(createdAt)).toBe("casespace-backup-2026-10-02-19-30.zip");
  });
});

describe("a backup that isn't whole", () => {
  const createdAt = new Date("2026-10-02T19:30:00.000Z");
  const { files } = buildBackupFiles(tables, {
    createdAt,
    createdBy: "Tom Leger",
    schema: "0019_coach_failures",
  });
  const rezip = (changed: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};
    for (const [path, text] of Object.entries({ ...files, ...changed })) {
      if (text !== undefined) merged[path] = text;
    }
    return zipBackupFiles(merged, createdAt);
  };

  it("is refused when a table file was edited", () => {
    const edited = files["data/use_cases.json"].replace("qualified", "launched");
    expect(() => readBackup(rezip({ "data/use_cases.json": edited }))).toThrow(
      /use_cases\.json.*checksum/,
    );
  });

  it("is refused when a table file is missing", () => {
    expect(() => readBackup(rezip({ "data/teams.json": undefined }))).toThrow(
      /teams\.json is missing/,
    );
  });

  it("is refused when it is some other zip", () => {
    expect(() => readBackup(zipSync({ "notes.txt": strToU8("hi") }))).toThrow(
      /isn't a Casespace backup/,
    );
  });

  it("is refused when it isn't a zip at all", () => {
    expect(() => readBackup(strToU8("not a zip"))).toThrow(/readable zip/);
  });

  it("is refused when it is a format this code doesn't read", () => {
    const manifest = JSON.stringify({
      ...JSON.parse(files["manifest.json"]),
      version: 99,
    });
    expect(() => readBackup(rezip({ "manifest.json": manifest }))).toThrow(
      /version 99/,
    );
  });
});

describe("stored backups", () => {
  const taken = new Date("2026-10-02T07:00:00.000Z");
  const name = backupFilename(taken);

  it("are kept under one prefix, by the name they were made with", () => {
    expect(storedBackupPath(name)).toBe(
      "backups/casespace-backup-2026-10-02-07-00.zip",
    );
    expect(isStoredBackupName(name)).toBe(true);
    expect(storedBackupTakenAt(name)).toEqual(taken);
  });

  // The download route takes this from the URL.
  it("are the only thing the download route will fetch", () => {
    for (const other of [
      "../secrets.txt",
      "backups/casespace-backup-2026-10-02-07-00.zip",
      "casespace-backup-2026-10-02-07-00.zip/..",
      "casespace-backup-latest.zip",
      "",
    ]) {
      expect(isStoredBackupName(other)).toBe(false);
      expect(storedBackupTakenAt(other)).toBeNull();
    }
  });

  it("count as stale once a daily run has clearly been missed", () => {
    const now = new Date("2026-10-03T12:00:00.000Z");
    expect(backupIsStale(new Date("2026-10-03T07:00:00.000Z"), now)).toBe(false);
    // Yesterday's, with today's running late: not yet.
    expect(backupIsStale(new Date("2026-10-02T07:00:00.000Z"), now)).toBe(false);
    expect(backupIsStale(new Date("2026-10-01T07:00:00.000Z"), now)).toBe(true);
    expect(backupIsStale(null, now)).toBe(true);
  });
});
