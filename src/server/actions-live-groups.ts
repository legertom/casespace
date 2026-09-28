"use server";

import { z } from "zod";
import { aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/ai/config";
import type { MeetingContext, MeetingPlan } from "@/lib/ai/meeting-breakouts";
import { requireAdminActor } from "@/server/guards";
import { listRoster } from "@/server/reference";
import { getMeetingBreakoutContext } from "@/server/meeting-breakouts";
import { formGroupsWithJev, formGroupsWithOpus } from "@/server/meeting-group-models";

const idsSchema = z.array(z.string().uuid()).min(2).max(60);

export async function listLiveMeetingLeadsAction(): Promise<{
  leads?: { id: string; name: string; department: string; teams: string[] }[];
  error?: string;
}> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const roster = await listRoster();
  return {
    leads: roster.map((lead) => ({
      id: lead.id,
      name: lead.name,
      department: lead.department,
      teams: lead.teams.map((team) => team.name),
    })),
  };
}

export async function reviewLiveMeetingCasesAction(rawIds: string[]): Promise<{
  context?: MeetingContext;
  error?: string;
}> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const parsed = idsSchema.safeParse(rawIds);
  if (!parsed.success) return { error: "Select at least two AI Leads." };
  try {
    return { context: await getMeetingBreakoutContext(parsed.data) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not read the selected use cases." };
  }
}

export async function formLiveMeetingGroupsAction(
  rawIds: string[],
  method: "jev" | "opus",
): Promise<{ plan?: MeetingPlan; error?: string }> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_MESSAGE };
  const parsed = idsSchema.safeParse(rawIds);
  if (!parsed.success || (method !== "jev" && method !== "opus")) {
    return { error: "Select valid AI Leads and a grouping method." };
  }
  try {
    const context = await getMeetingBreakoutContext(parsed.data);
    return {
      plan: method === "jev"
        ? await formGroupsWithJev(context, gate.user.id)
        : await formGroupsWithOpus(context, gate.user.id),
    };
  } catch (err) {
    console.error("live grouping failed", err);
    return { error: err instanceof Error ? err.message : "Could not form groups." };
  }
}
