"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { meetingGroupRuns } from "@/db/schema";
import { aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/ai/config";
import { type MeetingContext, type MeetingPlan, type MeetingReport } from "@/lib/ai/meeting-breakouts";
import { requireAdminActor } from "@/server/guards";
import { listRoster } from "@/server/reference";
import { getMeetingBreakoutContext } from "@/server/meeting-breakouts";
import { explainMeetingGroups, fallbackMeetingReport, formGroupsWithJev, formGroupsWithOpus, placeMeetingLatecomer } from "@/server/meeting-group-models";

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
): Promise<{ plan?: MeetingPlan; report?: MeetingReport; runId?: string; error?: string }> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_MESSAGE };
  const parsed = idsSchema.safeParse(rawIds);
  if (!parsed.success || (method !== "jev" && method !== "opus")) {
    return { error: "Select valid AI Leads and a grouping method." };
  }
  try {
    const context = await getMeetingBreakoutContext(parsed.data);
    const plan = method === "jev"
      ? await formGroupsWithJev(context, gate.user.id)
      : await formGroupsWithOpus(context, gate.user.id);
    let report: MeetingReport;
    try {
      report = await explainMeetingGroups(context, plan, gate.user.id);
    } catch (err) {
      console.error("live grouping explanation failed", err);
      report = fallbackMeetingReport(context, plan);
    }
    const [run] = await getDb().insert(meetingGroupRuns).values({
      createdBy: gate.user.id,
      method,
      attendees: context.attendees.map(({ id, name }) => ({ id, name })),
      groups: plan.groups,
      report,
    }).returning({ id: meetingGroupRuns.id });
    return { plan, report, runId: run.id };
  } catch (err) {
    console.error("live grouping failed", err);
    return { error: err instanceof Error ? err.message : "Could not form groups." };
  }
}

export async function deleteMeetingGroupRunAction(id: string): Promise<{ error?: string }> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid group run." };
  await getDb().delete(meetingGroupRuns).where(eq(meetingGroupRuns.id, id));
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  return {};
}

/** A new saved attempt adds exactly one lead; the source report remains intact. */
export async function addMeetingLatecomerAction(
  sourceRunId: string,
  newcomerId: string,
): Promise<{ runId?: string; error?: string }> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!z.string().uuid().safeParse(sourceRunId).success ||
    !z.string().uuid().safeParse(newcomerId).success) return { error: "Choose a valid AI Lead and saved run." };
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_MESSAGE };
  try {
    const [source] = await getDb().select().from(meetingGroupRuns)
      .where(eq(meetingGroupRuns.id, sourceRunId));
    if (!source) return { error: "That saved grouping no longer exists." };
    if (source.attendees.length >= 60) return { error: "This run already has the maximum of 60 attendees." };
    if (source.attendees.some((lead) => lead.id === newcomerId)) {
      return { error: "That AI Lead is already in this grouping." };
    }
    if (source.report.groups.length !== source.groups.length) {
      return { error: "This saved report cannot be extended." };
    }
    const context = await getMeetingBreakoutContext([
      ...source.attendees.map((lead) => lead.id), newcomerId,
    ]);
    const newcomer = context.attendees.find((lead) => lead.id === newcomerId)!;
    const { groups, groupIndex } = await placeMeetingLatecomer(
      context, source.groups, newcomerId, source.method, gate.user.id,
    );
    const group = groups[groupIndex];
    const groupContext: MeetingContext = {
      attendees: context.attendees.filter((lead) => group.memberIds.includes(lead.id)),
      expectedGroupSizes: [group.memberIds.length],
    };
    const groupPlan: MeetingPlan = { method: source.method, groups: [group] };
    let explanation: MeetingReport;
    try {
      explanation = await explainMeetingGroups(groupContext, groupPlan, gate.user.id);
    } catch (err) {
      console.error("latecomer explanation failed", err);
      explanation = fallbackMeetingReport(groupContext, groupPlan);
    }
    const report: MeetingReport = {
      summary: `This version adds ${newcomer.name} to Group ${groupIndex + 1}. Every earlier assignment stays fixed. ${source.report.summary}`,
      groups: source.report.groups.map((item, index) =>
        index === groupIndex ? explanation.groups[0] : item),
      limitation: source.report.limitation,
      latecomer: { sourceRunId, leadId: newcomerId, name: newcomer.name, groupIndex },
    };
    const [run] = await getDb().insert(meetingGroupRuns).values({
      createdBy: gate.user.id,
      method: source.method,
      attendees: [...source.attendees, { id: newcomer.id, name: newcomer.name }],
      groups,
      report,
    }).returning({ id: meetingGroupRuns.id });
    revalidatePath("/groups");
    return { runId: run.id };
  } catch (err) {
    console.error("latecomer placement failed", err);
    return { error: err instanceof Error ? err.message : "Could not place the latecomer." };
  }
}
