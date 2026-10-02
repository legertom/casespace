/**
 * Put a backup back into whatever DATABASE_URL points at.
 *
 *   pnpm db:restore backups/casespace-backup-<when>.zip
 *
 * Only into a database whose backed-up tables are empty — it refuses
 * otherwise, and changes nothing. Run `pnpm db:migrate:steps` first to create
 * the tables and `pnpm db:seed` after. See docs/operations/backup.md.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync } from "node:fs";
import { currentSchemaTag, restoreBackup } from "../src/db/backup";
import { getDb } from "../src/db/client";
import { readBackup } from "../src/lib/backup";
import { describeTarget } from "./db-target";

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error("Usage: pnpm db:restore <backup.zip>");
  }
  const backup = readBackup(new Uint8Array(readFileSync(file)));
  const { manifest } = backup;
  console.log(
    `Backup taken ${manifest.createdAt} by ${manifest.createdBy}, schema ${manifest.schema}.`,
  );
  if (manifest.schema !== currentSchemaTag()) {
    console.log(
      `Note: this checkout is at schema ${currentSchemaTag()}. Columns added since the backup take their defaults.`,
    );
  }
  console.log(`Restoring into ${describeTarget()}`);

  const restored = await restoreBackup(getDb(), backup);
  for (const [name, rows] of Object.entries(restored)) {
    console.log(`  ${name.padEnd(20)} ${String(rows).padStart(6)}`);
  }
  console.log("\nRestored. Run `pnpm db:seed` for settings and goals.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
