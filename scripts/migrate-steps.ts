/**
 * Apply pending migrations one transaction each.
 *
 *   pnpm db:migrate:steps
 *
 * `pnpm db:migrate` (drizzle-kit) runs every pending migration inside a
 * single transaction. That is fine for a deploy, which has one or two
 * pending. It cannot build an empty database: 0013 adds the `employee` role
 * and 0016 uses it, and Postgres will not let a transaction use an enum value
 * that the same transaction added. Production never noticed because those two
 * shipped in separate deploys.
 *
 * So this is the way to create the schema from nothing — a new environment,
 * or the first step of rebuilding from a backup (docs/operations/backup.md).
 * It keeps drizzle's own books (`drizzle.__drizzle_migrations`, same hash and
 * timestamp), so `pnpm db:migrate` and the deploy build carry on from where
 * it stops.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool } from "pg";
import journal from "../drizzle/meta/_journal.json";
import { describeTarget } from "./db-target";

async function main() {
  console.log(`Migrating ${describeTarget()}`);
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
  const tagAt = new Map(journal.entries.map((e) => [e.when, e.tag]));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // The same table drizzle's migrator creates and reads — see
    // PgDialect.migrate in drizzle-orm/pg-core/dialect.
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`);
    const { rows } = await client.query(
      `select created_at from "drizzle"."__drizzle_migrations" order by created_at desc limit 1`,
    );
    const last = rows[0] ? Number(rows[0].created_at) : null;

    let applied = 0;
    for (const migration of migrations) {
      if (last !== null && last >= migration.folderMillis) continue;
      const tag = tagAt.get(migration.folderMillis) ?? migration.folderMillis;
      await client.query("BEGIN");
      try {
        for (const statement of migration.sql) await client.query(statement);
        await client.query(
          `insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`,
          [migration.hash, migration.folderMillis],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(
          `${tag} failed and was rolled back; everything before it is applied. ${err instanceof Error ? err.message : err}`,
        );
      }
      console.log(`  applied ${tag}`);
      applied++;
    }
    console.log(applied === 0 ? "Nothing pending." : `\n${applied} applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
