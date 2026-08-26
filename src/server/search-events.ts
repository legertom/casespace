import "server-only";
import { getDb } from "@/db/client";
import { searchEvents } from "@/db/schema";

/**
 * Recording what people ask the casebook for. Like coach-events, this module
 * watches the feature, it is not part of it: every function swallows its own
 * errors, because a log row that fails to save must never take a search down
 * with it.
 */

const MAX_QUERY_CHARS = 200;

export type SearchVia = "rules" | "ai" | "text";

export async function recordSearchEvent(args: {
  userId: string;
  query: string;
  via: SearchVia;
  parsed?: Record<string, unknown>;
  resultCount?: number | null;
}): Promise<void> {
  const query = args.query.trim().slice(0, MAX_QUERY_CHARS);
  if (!query) return;
  try {
    const db = getDb();
    await db.insert(searchEvents).values({
      userId: args.userId,
      query,
      via: args.via,
      parsed: args.parsed ?? {},
      resultCount: args.resultCount ?? null,
    });
  } catch (err) {
    console.error("search event not recorded", err);
  }
}
