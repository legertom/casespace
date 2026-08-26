import "server-only";
import { generateText } from "ai";
import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  postRevisions,
  posts,
  pulseMetrics,
  pulseSnapshots,
  statusChanges,
  useCases,
  users,
} from "@/db/schema";
import {
  MODELS,
  aiConfigured,
  gatewayOptions,
} from "@/lib/ai/config";
import { recordAiUsage } from "@/lib/ai/usage";
import {
  EDITORIAL_INSTRUCTIONS,
  splitPost,
  whatsNewPrompt,
  type WeekData,
} from "@/lib/ai/whats-new-prompt";
import {
  DEPARTMENT_LABELS,
  STATUS_LABELS,
  etDateString,
  statusRank,
  type UcStatus,
} from "@/lib/domain";
import { buildProgressReport } from "./progress-report";
import { changelogForWeek } from "./changelog";

async function gatherWeekData(weekStart: string): Promise<WeekData> {
  const db = getDb();
  const start = new Date(`${weekStart}T00:00:00-04:00`);
  const end = new Date(start.getTime() + 7 * 86_400_000);

  const changes = await db
    .select({ change: statusChanges, uc: useCases, byName: users.name })
    .from(statusChanges)
    .innerJoin(useCases, eq(statusChanges.useCaseId, useCases.id))
    .leftJoin(users, eq(statusChanges.changedById, users.id))
    .where(
      and(
        gte(statusChanges.createdAt, start),
        lt(statusChanges.createdAt, end),
        isNull(useCases.deletedAt),
      ),
    )
    .orderBy(asc(statusChanges.createdAt));

  const describe = (uc: typeof useCases.$inferSelect) => ({
    title: uc.title,
    department: uc.department
      ? DEPARTMENT_LABELS[uc.department]
      : "unassigned",
    owner: uc.ownerName,
  });

  // The post's numbers are program-only, so program movement is what the
  // program's sections describe. Community submissions get their own list and
  // their own section; the query stays single because it already selects the
  // whole record, so in_program arrives with it.
  const newRecords = changes
    .filter((c) => c.change.fromStatus === null && c.uc.inProgram)
    .map((c) => ({ ...describe(c.uc), by: c.byName }));
  const communityRecords = changes
    .filter((c) => c.change.fromStatus === null && !c.uc.inProgram)
    .map((c) => ({ ...describe(c.uc), by: c.byName }));
  const promotions = changes
    .filter(
      (c) =>
        c.uc.inProgram &&
        c.change.fromStatus !== null &&
        statusRank(c.change.toStatus as UcStatus) >
          statusRank(c.change.fromStatus as UcStatus),
    )
    .map((c) => ({
      ...describe(c.uc),
      from: STATUS_LABELS[c.change.fromStatus as UcStatus],
      to: STATUS_LABELS[c.change.toStatus as UcStatus],
    }));
  const regressions = changes
    .filter(
      (c) =>
        c.uc.inProgram &&
        c.change.fromStatus !== null &&
        statusRank(c.change.toStatus as UcStatus) <
          statusRank(c.change.fromStatus as UcStatus),
    )
    .map((c) => ({
      ...describe(c.uc),
      from: STATUS_LABELS[c.change.fromStatus as UcStatus],
      to: STATUS_LABELS[c.change.toStatus as UcStatus],
      note: c.change.note,
    }));
  const newQualified = changes
    .filter((c) => c.uc.inProgram && c.change.toStatus === "qualified")
    .map((c) => ({
      ...describe(c.uc),
      authorsCredit: true,
    }));
  const newConfirmedRoi = changes
    .filter(
      (c) => c.uc.inProgram && c.change.toStatus === "confirmed_positive_roi",
    )
    .map((c) => ({
      ...describe(c.uc),
      authorsCredit: true,
    }));

  const snaps = await db
    .select({ snap: pulseSnapshots, metric: pulseMetrics })
    .from(pulseSnapshots)
    .innerJoin(pulseMetrics, eq(pulseSnapshots.metricKey, pulseMetrics.key))
    .where(
      and(
        gte(pulseSnapshots.takenOn, weekStart),
        lt(pulseSnapshots.takenOn, end.toISOString().slice(0, 10)),
      ),
    );

  const progress = await buildProgressReport();
  const casespaceChanges = await changelogForWeek(weekStart);

  return {
    weekStart,
    casespaceChanges: casespaceChanges.map((c) => ({
      title: c.title,
      summary: c.summary,
      requestedBy: c.requestedBy,
      shippedOn: c.date,
    })),
    weekEnd: new Date(end.getTime() - 86_400_000).toISOString().slice(0, 10),
    newRecords,
    communityRecords,
    promotions,
    regressions,
    newQualified,
    newConfirmedRoi,
    pulseReadings: snaps.map((s) => ({
      metric: s.metric.label,
      value: s.snap.value,
      unit: s.metric.unit,
      baseline: s.metric.baselineValue,
      target: s.metric.targetValue,
      takenOn: s.snap.takenOn,
    })),
    scoreboardNow: progress,
  };
}

export interface GenerateResult {
  id: string;
  weekStart: string;
  title: string;
}

/** Whether the week already has a post — the cron's insert-only guard. */
export async function hasPostForWeek(weekStart: string): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.weekStart, weekStart));
  return Boolean(existing);
}

/**
 * Draft (or re-draft) the post covering the week starting `weekStart`.
 * Re-drafting an existing post archives the outgoing version to
 * post_revisions in the same transaction — nothing an admin wrote, and
 * nothing a reader already saw, is ever simply gone.
 */
export async function generateWhatsNew(
  weekStart: string,
  actorUserId: string | null,
): Promise<GenerateResult> {
  if (!aiConfigured()) {
    throw new Error("AI_GATEWAY_API_KEY is not configured.");
  }
  const data = await gatherWeekData(weekStart);
  const result = await generateText({
    model: MODELS.coach,
    instructions: EDITORIAL_INSTRUCTIONS,
    prompt: whatsNewPrompt(data, etDateString(new Date())),
    providerOptions: gatewayOptions(actorUserId ?? "cron", "whats_new"),
  });

  await recordAiUsage({
    userId: actorUserId,
    feature: "whats_new",
    model: MODELS.coach,
    inputTokens: result.totalUsage.inputTokens,
    outputTokens: result.totalUsage.outputTokens,
  });

  const { title, body } = splitPost(result.text, weekStart);

  const db = getDb();
  const row = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(posts)
      .where(eq(posts.weekStart, weekStart));

    if (existing) {
      await tx.insert(postRevisions).values({
        postId: existing.id,
        title: existing.title,
        body: existing.body,
        model: existing.model,
        generatedAt: existing.generatedAt,
        editedAt: existing.editedAt,
        reason: "regenerated",
        replacedById: actorUserId,
      });
      const [updated] = await tx
        .update(posts)
        .set({
          title,
          body,
          model: MODELS.coach,
          generatedAt: new Date(),
          editedAt: null,
        })
        .where(eq(posts.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await tx
      .insert(posts)
      .values({
        weekStart,
        title,
        body,
        model: MODELS.coach,
        generatedAt: new Date(),
      })
      .returning();
    return inserted;
  });
  return { id: row.id, weekStart, title };
}
