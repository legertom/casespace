/**
 * The backup: every use case and everything needed to put it back.
 *
 * A zip with two layers, for two readers. `data/*.json` is one file per
 * table, rows exactly as stored and keyed by their real column names — the
 * copy a restore replays, and one any other tool could load without this
 * codebase. `use-cases.csv` is the same records flattened with names in place
 * of ids — the copy a person opens in a spreadsheet when the app is the thing
 * that's gone.
 *
 * Pure: this module decides what is in a backup and what its bytes are. It
 * never touches the database — `src/db/backup.ts` reads and writes rows.
 */
import { createHash } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  aiLeadTeams,
  aiLeads,
  eltOrgs,
  fieldChanges,
  people,
  statusChanges,
  teams,
  useCaseAuthors,
  useCaseComments,
  useCaseLinks,
  useCaseUrls,
  useCases,
  userEmails,
  users,
} from "../db/schema";

export const BACKUP_FORMAT = "casespace-backup";
export const BACKUP_VERSION = 1;

/**
 * What a backup holds, in the order a restore must insert it: nothing here
 * refers to a table below it. The records are `use_cases` and the six tables
 * hanging off it; the seven above are the people, logins, teams and ELT orgs
 * those rows point at, kept with their ids so every reference still resolves.
 *
 * A test reads the schema's foreign keys and fails if this order is wrong or
 * a referenced table is missing.
 */
export const BACKUP_TABLES = [
  people,
  users,
  userEmails,
  teams,
  eltOrgs,
  aiLeads,
  aiLeadTeams,
  useCases,
  useCaseAuthors,
  useCaseUrls,
  useCaseLinks,
  statusChanges,
  fieldChanges,
  useCaseComments,
] as const satisfies readonly PgTable[];

/**
 * Every other table, and why it is not use-case content. Listed rather than
 * implied so that a new table is a decision: a test fails until it appears
 * either above or here.
 */
export const NOT_BACKED_UP: Record<string, string> = {
  pats: "API tokens. Stored hashed and useless elsewhere; people make new ones.",
  coach_chats: "Private conversations with the Coach, not program data.",
  discovery_checkpoints:
    "Personal working notes. No admin surface reads these and a backup is not one.",
  coach_events: "Telemetry on how Coach proposals landed.",
  coach_failures: "An error log.",
  ai_usage: "Token accounting.",
  search_events: "Search telemetry.",
  feedback: "Reports about Casespace itself.",
  notifications: "Derived from comments and links; stale the moment they are restored.",
  posts: "The weekly What's New posts — generated from the records and the changelog.",
  post_revisions: "Edit history of those posts.",
  pulse_metrics: "Goals page configuration, re-created by `pnpm db:seed`.",
  pulse_snapshots: "Adoption survey readings — program data, but not use cases.",
  app_settings: "Configuration, re-created by `pnpm db:seed`.",
  allowed_login_emails: "Sign-in allowlist, re-created by `pnpm db:seed`.",
  ai_lead_monthly_syncs: "Admin record of one-on-ones, not use-case content.",
  meeting_group_runs: "Saved breakout groupings for AI Leads meetings.",
};

/** A row as the backup stores it: database column names, JSON values. */
export type StoredRow = Record<string, unknown>;

/** Table name → its rows, as stored. */
export type BackupTables = Record<string, StoredRow[]>;

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** ISO timestamp. */
  createdAt: string;
  /** Who asked for it, by name. */
  createdBy: string;
  /** The newest migration the database had been built to — see drizzle/. */
  schema: string;
  /** In restore order. */
  tables: { name: string; file: string; rows: number; sha256: string }[];
  notIncluded: Record<string, string>;
}

export interface ParsedBackup {
  manifest: BackupManifest;
  tables: BackupTables;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** A row drizzle selected, as the backup stores it. Timestamps become ISO strings. */
export function toStoredRow(
  table: PgTable,
  row: Record<string, unknown>,
): StoredRow {
  const stored: StoredRow = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const value = row[key];
    stored[column.name] =
      value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return stored;
}

/**
 * The other direction: a stored row, as drizzle inserts it.
 *
 * A column the schema has gained since the backup is simply absent, and takes
 * its default. A column the schema no longer has is refused — dropping data
 * silently is the one thing a restore must not do.
 */
export function fromStoredRow(
  table: PgTable,
  stored: StoredRow,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const known = new Set<string>();
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    known.add(column.name);
    if (!(column.name in stored)) continue;
    const value = stored[column.name];
    row[key] =
      value !== null && column.dataType === "date"
        ? new Date(value as string)
        : value;
  }
  const unknown = Object.keys(stored).filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `${getTableName(table)} in this backup has ${unknown.length === 1 ? "a column" : "columns"} the current schema doesn't: ${unknown.join(", ")}. Restore with the code the backup was taken on (see "schema" in manifest.json).`,
    );
  }
  return row;
}

function primaryKeyNames(table: PgTable): string[] {
  const single = Object.values(getTableColumns(table))
    .filter((c) => c.primary)
    .map((c) => c.name);
  if (single.length > 0) return single;
  return (
    getTableConfig(table).primaryKeys[0]?.columns.map((c) => c.name) ?? []
  );
}

/**
 * A fixed order, so two backups of the same data are the same bytes and a
 * diff between two backups shows what changed. Comments go parents first:
 * a reply's parent has to exist before the reply does.
 */
export function sortStoredRows(table: PgTable, rows: StoredRow[]): StoredRow[] {
  const keys = primaryKeyNames(table);
  const keyOf = (row: StoredRow) => keys.map((k) => String(row[k])).join("\u0000");
  const depthOf = (row: StoredRow) =>
    typeof row.depth === "number" ? row.depth : 0;
  return [...rows].sort((a, b) => {
    if (table === useCaseComments && depthOf(a) !== depthOf(b)) {
      return depthOf(a) - depthOf(b);
    }
    const ka = keyOf(a);
    const kb = keyOf(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// The readable copy
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (typeof value === "boolean") text = value ? "yes" : "no";
  else if (typeof value === "string") {
    // A spreadsheet runs a cell that starts like a formula. This is the copy
    // people open in one, so such text is quoted into being text.
    text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  } else text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // The BOM is what makes Excel read the file as UTF-8 instead of mangling
  // every dash and accent in it.
  return (
    "﻿" +
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}

function byId(rows: StoredRow[] | undefined): Map<unknown, StoredRow> {
  return new Map((rows ?? []).map((r) => [r.id, r]));
}

function grouped(rows: StoredRow[] | undefined): Map<unknown, StoredRow[]> {
  const out = new Map<unknown, StoredRow[]>();
  for (const row of rows ?? []) {
    const list = out.get(row.use_case_id) ?? [];
    list.push(row);
    out.set(row.use_case_id, list);
  }
  return out;
}

function list(value: unknown): string {
  return Array.isArray(value) ? value.join("; ") : "";
}

/**
 * One line per use case, names in place of ids. Deliberately without the
 * status history: the annual-ROI confirmation note lives there and may carry
 * dollars, and this is the file most likely to be opened, forwarded, or
 * pasted somewhere. The history is in `data/status_changes.json`.
 */
export function useCasesCsv(tables: BackupTables): string {
  const teamOf = byId(tables.teams);
  const orgOf = byId(tables.elt_orgs);
  const personOf = byId(tables.people);
  const userOf = byId(tables.users);
  const authorsOf = grouped(tables.use_case_authors);
  const urlsOf = grouped(tables.use_case_urls);
  const position = (a: StoredRow, b: StoredRow) =>
    Number(a.position ?? 0) - Number(b.position ?? 0);
  const name = (row: StoredRow | undefined) => row?.name ?? "";

  const header = [
    "id",
    "title",
    "status",
    "counts_toward_program",
    "department",
    "team",
    "elt_org",
    "owner",
    "authors",
    "description",
    "ai_tools",
    "approaches",
    "current_steps",
    "links",
    "gate_named",
    "gate_tool",
    "gate_adoption",
    "gate_owner",
    "adoption_evidence",
    "success_criterion",
    "success_criterion_met",
    "roi_status",
    "baseline_metric",
    "baseline_value",
    "baseline_unit",
    "post_value",
    "measurement_method",
    "net_impact_statement",
    "is_positive",
    "build_hours",
    "revisit_on",
    "functional_leader_success",
    "rating_frequency",
    "rating_pain",
    "rating_data_availability",
    "rating_risk",
    "rating_ownership_clarity",
    "rating_evaluation_clarity",
    "rating_maintenance_burden",
    "rejection_reason",
    "source",
    "created_by",
    "created_at",
    "updated_at",
    "qualified_at",
    "roi_confirmed_at",
    "deleted_at",
  ];

  const rows = (tables.use_cases ?? []).map((uc) => [
    uc.id,
    uc.title,
    uc.status,
    uc.in_program,
    uc.department,
    name(teamOf.get(uc.team_id)),
    name(orgOf.get(uc.elt_org_id)),
    uc.owner_name ||
      name(personOf.get(uc.owner_person_id)) ||
      name(userOf.get(uc.owner_user_id)),
    (authorsOf.get(uc.id) ?? [])
      .sort(position)
      .map((a) => a.display_name)
      .join("; "),
    uc.description,
    list(uc.ai_tools),
    list(uc.approaches),
    Array.isArray(uc.current_steps)
      ? uc.current_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "",
    (urlsOf.get(uc.id) ?? [])
      .sort(position)
      .map((u) => `${u.label || u.kind}: ${u.url}`)
      .join("\n"),
    uc.gate_named,
    uc.gate_tool,
    uc.gate_adoption,
    uc.gate_owner,
    uc.adoption_evidence,
    uc.success_criterion,
    uc.success_criterion_met,
    uc.roi_status,
    uc.baseline_metric,
    uc.baseline_value,
    uc.baseline_unit,
    uc.post_value,
    uc.measurement_method,
    uc.net_impact_statement,
    uc.is_positive,
    uc.build_hours,
    uc.revisit_on,
    uc.functional_leader_success,
    uc.rating_frequency,
    uc.rating_pain,
    uc.rating_data_availability,
    uc.rating_risk,
    uc.rating_ownership_clarity,
    uc.rating_evaluation_clarity,
    uc.rating_maintenance_burden,
    uc.rejection_reason,
    uc.source,
    name(userOf.get(uc.created_by_id)),
    uc.created_at,
    uc.updated_at,
    uc.qualified_at,
    uc.roi_confirmed_at,
    uc.deleted_at,
  ]);
  return toCsv(header, rows);
}

// ---------------------------------------------------------------------------
// The zip
// ---------------------------------------------------------------------------

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function readme(manifest: BackupManifest): string {
  const records =
    manifest.tables.find((t) => t.name === "use_cases")?.rows ?? 0;
  return [
    "Casespace backup",
    "================",
    "",
    `Taken ${manifest.createdAt} by ${manifest.createdBy}.`,
    `${records} use ${records === 1 ? "case" : "cases"}. Database schema: ${manifest.schema}.`,
    "",
    "What's here",
    "-----------",
    "",
    "use-cases.csv",
    "  Every use case on one line, with names instead of ids. Open it in a",
    "  spreadsheet. This is for reading; it is not what a restore uses.",
    "",
    "data/*.json",
    "  One file per database table, every row exactly as stored. This is the",
    "  complete copy, and what a restore replays.",
    "",
    ...manifest.tables.map(
      (t) => `    ${t.file.padEnd(34)} ${String(t.rows).padStart(6)} rows`,
    ),
    "",
    "manifest.json",
    "  The list above with a SHA-256 of each file, so a restore can tell a",
    "  damaged backup from a good one.",
    "",
    "Handle with care",
    "----------------",
    "",
    "This file holds names, email addresses, and every status note —",
    "including annual-ROI confirmation notes, which are admin-only in",
    "Casespace. Keep it where only admins can reach it.",
    "",
    "Rebuilding from this file",
    "-------------------------",
    "",
    "Into an empty database, from a checkout of the Casespace repository:",
    "",
    "  pnpm db:migrate:steps           # create the tables",
    "  pnpm db:restore <this file>     # put the rows back",
    "  pnpm db:seed                    # settings and goals a backup doesn't carry",
    "",
    "The restore refuses to run if any of these tables already has rows.",
    "docs/operations/backup.md in the repository has the details.",
    "",
    "Not included",
    "------------",
    "",
    ...Object.entries(manifest.notIncluded).map(
      ([table, why]) => `  ${table}: ${why}`,
    ),
    "",
  ].join("\n");
}

/** The backup's files, path → text. Split from zipping so tests can read them. */
export function buildBackupFiles(
  tables: BackupTables,
  meta: { createdAt: Date; createdBy: string; schema: string },
): { manifest: BackupManifest; files: Record<string, string> } {
  const files: Record<string, string> = {};
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: meta.createdAt.toISOString(),
    createdBy: meta.createdBy,
    schema: meta.schema,
    tables: [],
    notIncluded: NOT_BACKED_UP,
  };
  for (const table of BACKUP_TABLES) {
    const name = getTableName(table);
    const rows = sortStoredRows(table, tables[name] ?? []);
    const file = `data/${name}.json`;
    const text = `${JSON.stringify(rows, null, 2)}\n`;
    files[file] = text;
    manifest.tables.push({ name, file, rows: rows.length, sha256: sha256(text) });
  }
  files["use-cases.csv"] = useCasesCsv(tables);
  files["manifest.json"] = `${JSON.stringify(manifest, null, 2)}\n`;
  files["README.txt"] = readme(manifest);
  return { manifest, files };
}

export function zipBackupFiles(
  files: Record<string, string>,
  createdAt: Date,
): Uint8Array {
  // README first: it is what someone sees when they open the archive.
  const order = ["README.txt", "manifest.json", "use-cases.csv"];
  const paths = [
    ...order.filter((p) => p in files),
    ...Object.keys(files).filter((p) => !order.includes(p)),
  ];
  return zipSync(
    Object.fromEntries(paths.map((p) => [p, strToU8(files[p])])),
    { level: 6, mtime: createdAt },
  );
}

export function backupFilename(createdAt: Date): string {
  const stamp = createdAt.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `casespace-backup-${stamp}.zip`;
}

/**
 * Open a backup and check it is one, whole. Every table file must be present,
 * match its recorded hash, and hold the number of rows the manifest says — a
 * restore from a truncated download should fail here, not halfway through.
 */
export function readBackup(bytes: Uint8Array): ParsedBackup {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error("That file isn't a readable zip archive.");
  }
  const manifestBytes = entries["manifest.json"];
  if (!manifestBytes) {
    throw new Error("No manifest.json — this isn't a Casespace backup.");
  }
  const manifest = JSON.parse(strFromU8(manifestBytes)) as BackupManifest;
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error("manifest.json doesn't describe a Casespace backup.");
  }
  if (manifest.version !== BACKUP_VERSION) {
    throw new Error(
      `This backup is format version ${manifest.version}; this code reads version ${BACKUP_VERSION}.`,
    );
  }
  const tables: BackupTables = {};
  for (const entry of manifest.tables) {
    const fileBytes = entries[entry.file];
    if (!fileBytes) throw new Error(`${entry.file} is missing from the backup.`);
    const text = strFromU8(fileBytes);
    if (sha256(text) !== entry.sha256) {
      throw new Error(
        `${entry.file} doesn't match its recorded checksum — the backup is damaged or was edited.`,
      );
    }
    const rows = JSON.parse(text) as StoredRow[];
    if (rows.length !== entry.rows) {
      throw new Error(
        `${entry.file} holds ${rows.length} rows; the manifest says ${entry.rows}.`,
      );
    }
    tables[entry.name] = rows;
  }
  return { manifest, tables };
}
