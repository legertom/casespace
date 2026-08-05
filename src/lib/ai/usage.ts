import "server-only";
import { getDb } from "@/db/client";
import { aiUsage } from "@/db/schema";
import type { AiFeature } from "./config";

/**
 * Token accounting from day one — no dashboard yet, but history can't be
 * backfilled. Never throws (accounting must not break the feature).
 */
export async function recordAiUsage(entry: {
  userId: string | null;
  feature: AiFeature;
  model: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(aiUsage).values({
      userId: entry.userId,
      feature: entry.feature,
      model: entry.model,
      inputTokens: Math.round(entry.inputTokens ?? 0),
      outputTokens: Math.round(entry.outputTokens ?? 0),
    });
  } catch (err) {
    console.error("ai_usage recording failed", err);
  }
}
