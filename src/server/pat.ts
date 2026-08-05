import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pats, users } from "@/db/schema";

/**
 * Token-authenticated actor. Deliberately the raw database row rather than
 * CurrentUser: an API token carries the owner's real role, and is never
 * subject to the browser-cookie "view as" preview.
 */
export type PatUser = typeof users.$inferSelect;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): { token: string; prefix: string } {
  const token = `csp_${randomBytes(24).toString("hex")}`;
  return { token, prefix: token.slice(0, 10) };
}

/**
 * Resolve an Authorization: Bearer header to its owning user. Token
 * permissions follow the web role of the token's owner. Returns null on any
 * failure — callers answer 401.
 */
export async function authenticatePat(
  req: Request,
): Promise<PatUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(csp_[a-f0-9]{48})$/i);
  if (!match) return null;
  const db = getDb();
  const [row] = await db
    .select({ pat: pats, user: users })
    .from(pats)
    .innerJoin(users, eq(pats.userId, users.id))
    .where(and(eq(pats.tokenHash, hashToken(match[1])), isNull(pats.revokedAt)));
  if (!row) return null;
  // Best-effort recency stamp; never blocks the request.
  db.update(pats)
    .set({ lastUsedAt: new Date() })
    .where(eq(pats.id, row.pat.id))
    .catch(() => {});
  return row.user;
}
