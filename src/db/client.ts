/**
 * Database client factory. No `server-only` guard here so that seed scripts
 * (run with tsx) can share it; app code imports from "./index", which adds
 * the guard.
 */
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createNodeDb>;

/**
 * The transaction handle inside db.transaction callbacks. Multi-statement
 * writes (a record plus its authors plus its birth event, a comment plus its
 * notifications) must land whole or not at all — pass `tx` through, never a
 * fresh getDb().
 */
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function createNodeDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzleNode(pool, { schema });
}

export function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  if (url.includes("neon.tech")) {
    // Neon over WebSocket, not HTTP: the HTTP driver cannot run interactive
    // transactions, and the write paths depend on them. Uses the runtime's
    // global WebSocket (Node 22+; Vercel's default runtime qualifies). Both
    // drizzle flavors share the same core query API, so we present the
    // node-postgres type.
    const pool = new NeonPool({ connectionString: url });
    return drizzleNeon(pool, { schema }) as unknown as Db;
  }
  return createNodeDb();
}

// Lazy init keeps `next build` from needing a database, and (deliberately) no
// Proxy wrapper — Proxies break Auth.js adapter introspection.
let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = createDb();
  return _db;
}
