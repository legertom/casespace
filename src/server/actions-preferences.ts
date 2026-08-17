"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { parsePipelineChart } from "@/lib/pipeline-chart";

/**
 * Remember which pipeline drawing this person wants on their dashboard.
 *
 * Personal display preference, so every role may set it — including viewers,
 * who are otherwise read-only. It writes nothing about the program and shows
 * nobody anything they could not already see; it only changes which of two
 * drawings of the same counts they get. An admin previewing as someone else
 * still writes to their own row, since `requireUser` returns the real signed-in
 * user either way.
 */
export async function setPipelineChartAction(choice: unknown): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  await db
    .update(users)
    .set({ pipelineChart: parsePipelineChart(choice) })
    .where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}
