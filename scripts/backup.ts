/**
 * Write a backup zip of whatever DATABASE_URL points at.
 *
 *   pnpm db:backup                       → backups/casespace-backup-<when>.zip
 *   pnpm db:backup path/to/file.zip
 *
 * The same archive the /backup page downloads — see docs/operations/backup.md.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentSchemaTag, readBackupTables } from "../src/db/backup";
import { getDb } from "../src/db/client";
import {
  backupFilename,
  buildBackupFiles,
  zipBackupFiles,
} from "../src/lib/backup";
import { describeTarget } from "./db-target";

async function main() {
  console.log(`Backing up ${describeTarget()}`);
  const createdAt = new Date();
  const tables = await readBackupTables(getDb());
  const { manifest, files } = buildBackupFiles(tables, {
    createdAt,
    createdBy: `${os.userInfo().username} (pnpm db:backup)`,
    schema: currentSchemaTag(),
  });
  const out = path.resolve(
    process.argv[2] ?? path.join("backups", backupFilename(createdAt)),
  );
  mkdirSync(path.dirname(out), { recursive: true });
  const bytes = zipBackupFiles(files, createdAt);
  writeFileSync(out, bytes);

  for (const t of manifest.tables) {
    console.log(`  ${t.name.padEnd(20)} ${String(t.rows).padStart(6)}`);
  }
  console.log(`\nWrote ${out} (${(bytes.byteLength / 1024).toFixed(0)} KB)`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
