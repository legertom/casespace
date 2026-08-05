"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pats } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { generateToken, hashToken } from "./pat";

export interface CreatePatResult {
  token?: string;
  error?: string;
}

/** The token is returned exactly once; only its hash is stored. */
export async function createPatAction(name: string): Promise<CreatePatResult> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the token a name (e.g. “Claude Code on my laptop”)." };
  const db = getDb();
  const { token, prefix } = generateToken();
  await db.insert(pats).values({
    userId: user.id,
    name: trimmed,
    tokenHash: hashToken(token),
    tokenPrefix: prefix,
  });
  revalidatePath("/profile");
  return { token };
}

export async function revokePatAction(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const db = getDb();
  await db
    .update(pats)
    .set({ revokedAt: new Date() })
    .where(and(eq(pats.id, id), eq(pats.userId, user.id)));
  revalidatePath("/profile");
  return {};
}
