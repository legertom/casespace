"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { aiLeadMonthlySyncs, aiLeadTeams, aiLeads, teams } from "@/db/schema";
import { DEPARTMENTS } from "@/lib/domain";
import { isLeadSyncMonth } from "@/lib/lead-progress";
import type { ActionResult } from "./actions";
import { requireAdminActor } from "./guards";

export async function updateLeadEmailAction(
  leadId: string,
  email: string,
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const parsed = z.string().email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { error: "Enter a valid email address." };
  const db = getDb();
  try {
    await db
      .update(aiLeads)
      .set({ email: parsed.data, emailUnverified: false, userId: null })
      .where(eq(aiLeads.id, leadId));
  } catch {
    return { error: "That email is already on another roster row." };
  }
  revalidatePath("/roster");
  return {};
}

export async function setLeadStateAction(
  leadId: string,
  state: "assigned" | "unassigned" | "pending",
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const db = getDb();
  await db.update(aiLeads).set({ state }).where(eq(aiLeads.id, leadId));
  revalidatePath("/roster");
  return {};
}

export async function setLeadMonthlySyncAction(
  leadId: string,
  month: string,
  met: boolean,
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const parsed = z
    .object({
      leadId: z.string().uuid(),
      month: z.string().refine(isLeadSyncMonth),
      met: z.boolean(),
    })
    .safeParse({ leadId, month, met });
  if (!parsed.success) {
    return { error: "That monthly sync could not be updated." };
  }

  const db = getDb();
  if (parsed.data.met) {
    await db
      .insert(aiLeadMonthlySyncs)
      .values({
        leadId: parsed.data.leadId,
        month: parsed.data.month,
        completedById: gate.user.id,
      })
      .onConflictDoUpdate({
        target: [aiLeadMonthlySyncs.leadId, aiLeadMonthlySyncs.month],
        set: { completedById: gate.user.id, completedAt: new Date() },
      });
  } else {
    await db
      .delete(aiLeadMonthlySyncs)
      .where(
        and(
          eq(aiLeadMonthlySyncs.leadId, leadId),
          eq(aiLeadMonthlySyncs.month, parsed.data.month),
        ),
      );
  }
  revalidatePath("/roster");
  return {};
}

export async function setLeadTeamsAction(
  leadId: string,
  teamIds: string[],
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const db = getDb();
  await db.delete(aiLeadTeams).where(eq(aiLeadTeams.leadId, leadId));
  if (teamIds.length) {
    await db
      .insert(aiLeadTeams)
      .values(teamIds.map((teamId) => ({ leadId, teamId })))
      .onConflictDoNothing();
  }
  revalidatePath("/roster");
  return {};
}

const addLeadSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  department: z.enum(DEPARTMENTS),
  personId: z.string().uuid().nullish(),
  teamIds: z.array(z.string().uuid()).max(10),
});

export async function addLeadAction(
  raw: z.infer<typeof addLeadSchema>,
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const parsed = addLeadSchema.safeParse(raw);
  if (!parsed.success) return { error: "Name, valid email, and department are required." };
  const db = getDb();
  try {
    const [lead] = await db
      .insert(aiLeads)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        emailUnverified: false,
        department: parsed.data.department,
        personId: parsed.data.personId ?? null,
        state: "assigned",
      })
      .returning();
    if (parsed.data.teamIds.length) {
      await db.insert(aiLeadTeams).values(
        parsed.data.teamIds.map((teamId) => ({ leadId: lead.id, teamId })),
      );
    }
  } catch {
    return { error: "That email is already on the roster." };
  }
  revalidatePath("/roster");
  return {};
}

export async function removeLeadAction(leadId: string): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const db = getDb();
  await db.delete(aiLeads).where(eq(aiLeads.id, leadId));
  revalidatePath("/roster");
  return {};
}

/** Admins can add a team without code changes (the old app needed a migration). */
export async function addTeamAction(raw: {
  name: string;
  department: (typeof DEPARTMENTS)[number];
}): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const name = raw.name.trim();
  if (!name) return { error: "Team name is required." };
  const db = getDb();
  await db
    .insert(teams)
    .values({ name, department: raw.department })
    .onConflictDoNothing();
  revalidatePath("/roster");
  return {};
}
