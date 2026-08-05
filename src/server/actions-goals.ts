"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { getDb } from "@/db/client";
import { pulseSnapshots } from "@/db/schema";
import type { ActionResult } from "./actions";

const snapshotSchema = z.object({
  metricKey: z.string().min(1),
  value: z.number().min(0).max(100),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Admins record new pulse-survey readings; history is kept (upsert per date). */
export async function addPulseSnapshotAction(raw: {
  metricKey: string;
  value: number;
  takenOn: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") {
    return { error: "Only admins record pulse readings." };
  }
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Enter a value between 0 and 100 and a valid date." };
  }
  const db = getDb();
  await db
    .insert(pulseSnapshots)
    .values({
      metricKey: parsed.data.metricKey,
      value: parsed.data.value,
      takenOn: parsed.data.takenOn,
      enteredById: user.id,
    })
    .onConflictDoUpdate({
      target: [pulseSnapshots.metricKey, pulseSnapshots.takenOn],
      set: { value: parsed.data.value, enteredById: user.id },
    });
  revalidatePath("/goals");
  return {};
}
