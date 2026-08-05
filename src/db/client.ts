/**
 * Database client factory. No `server-only` guard here so that seed scripts
 * (run with tsx) can share it; app code imports from "./index", which adds
 * the guard.
 */
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createNodeDb>;

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
    // Neon over HTTP for serverless; both drizzle flavors share the same core
    // query API, so we present the node-postgres type.
    return drizzleNeon(neon(url), { schema }) as unknown as Db;
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
