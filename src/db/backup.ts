/**
 * The database half of the backup: read every backed-up table, and put a
 * backup's rows back. What a backup *is* lives in lib/backup. No `server-only`
 * guard, for the same reason as ./client — the backup and restore scripts
 * (run with tsx) share this with the app.
 */
import { getTableName, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import journal from "../../drizzle/meta/_journal.json";
import {
  BACKUP_TABLES,
  fromStoredRow,
  toStoredRow,
  type BackupTables,
  type ParsedBackup,
} from "../lib/backup";
import type { Db } from "./client";

/** The newest migration this code knows — what a backup records as its schema. */
export function currentSchemaTag(): string {
  return journal.entries.at(-1)?.tag ?? "unknown";
}

/**
 * Every backed-up table, read inside one read-only snapshot. Without it a
 * record created mid-backup could land in `use_case_authors` and not in
 * `use_cases`, and the restore would fail on the orphan.
 */
export async function readBackupTables(db: Db): Promise<BackupTables> {
  return db.transaction(
    async (tx) => {
      const tables: BackupTables = {};
      for (const table of BACKUP_TABLES) {
        const rows = await tx.select().from(table as PgTable);
        tables[getTableName(table)] = rows.map((row) =>
          toStoredRow(table, row),
        );
      }
      return tables;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

/** Row counts for the same tables — what the backup page shows before you download. */
export async function countBackupRows(db: Db): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table as PgTable);
    counts[getTableName(table)] = n;
  }
  return counts;
}

// Well under Postgres's 65,535-parameter ceiling for the widest table.
const INSERT_CHUNK = 100;

/**
 * Put a backup back, whole or not at all.
 *
 * Only into empty tables. A restore is for rebuilding a database that was
 * lost, and merging into one that has rows — which rows win? — is a different
 * and much more dangerous tool. Refusing here is also what makes it safe to
 * point at the wrong database by mistake: a live one is never empty.
 */
export async function restoreBackup(
  db: Db,
  backup: ParsedBackup,
): Promise<Record<string, number>> {
  const known = new Set<string>(BACKUP_TABLES.map((t) => getTableName(t)));
  const strangers = Object.keys(backup.tables).filter((n) => !known.has(n));
  if (strangers.length > 0) {
    throw new Error(
      `This backup has tables the current code doesn't restore: ${strangers.join(", ")}.`,
    );
  }

  return db.transaction(async (tx) => {
    const occupied: string[] = [];
    for (const table of BACKUP_TABLES) {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(table as PgTable);
      if (n > 0) occupied.push(`${getTableName(table)} (${n})`);
    }
    if (occupied.length > 0) {
      throw new Error(
        `Refusing to restore: these tables already have rows — ${occupied.join(", ")}. A restore only fills an empty database.`,
      );
    }

    const restored: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      const name = getTableName(table);
      const rows = (backup.tables[name] ?? []).map((stored) =>
        fromStoredRow(table, stored),
      );
      for (let at = 0; at < rows.length; at += INSERT_CHUNK) {
        await tx.insert(table as PgTable).values(rows.slice(at, at + INSERT_CHUNK));
      }
      restored[name] = rows.length;
    }
    return restored;
  });
}
