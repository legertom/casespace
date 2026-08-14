import "server-only";
import { generateText } from "ai";
import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
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
  DEPARTMENT_LABELS,
  STATUS_LABELS,
  etDateString,
  statusRank,
  type UcStatus,
} from "@/lib/domain";
import { buildProgressReport } from "./progress-report";

/** Monday (ET) of the week containing the given ET date. */
export function mondayOf(etDate: string): string {
  const [y, m, d] = etDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

/** The Monday of the week BEFORE the one containing `etDate`. */
export function priorWeekStart(etDate: string): string {
  const thisMonday = mondayOf(etDate);
  const dt = new Date(`${thisMonday}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - 7);
  return dt.toISOString().slice(0, 10);
}

async function gatherWeekData(weekStart: string) {
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

  const newRecords = changes
    .filter((c) => c.change.fromStatus === null)
    .map((c) => ({ ...describe(c.uc), by: c.byName }));
  const promotions = changes
    .filter(
      (c) =>
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
    .filter((c) => c.change.toStatus === "qualified")
    .map((c) => ({
      ...describe(c.uc),
      authorsCredit: true,
    }));
  const newConfirmedRoi = changes
    .filter((c) => c.change.toStatus === "confirmed_positive_roi")
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

  return {
    weekStart,
    weekEnd: new Date(end.getTime() - 86_400_000).toISOString().slice(0, 10),
    newRecords,
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

const EDITORIAL_INSTRUCTIONS = `You write "What's New in Casespace" — the weekly internal note on Clever's AI Enablement program. Audience: everyone in the program — the AI Leads, their leaders, and the sponsors (Tom runs the program; Kate is the VP sponsor).

Voice: a well-edited internal newsletter. Observant, specific, zero hype. Plain words, short sentences, sentence case. Recognition means naming people and teams on real work — no badges, no cheerleading, no emoji, no exclamation marks. NEVER mention dollar figures; the program measures counts, rates, and hours only.

Structure (markdown):
- Start with "# " and a specific, quiet headline (not "Weekly update").
- An opening paragraph: the week in three sentences, anchored in the two numbers and what is in flight behind them. Never editorialize about being ahead of or behind a pace — the program does not track it that way.
- "## New in the casebook" — each new record with who logged it and which team it serves. Skip the section if empty ("A quiet week for new entries" belongs in the opener instead).
- "## Movement" — promotions worth noting; call out anything reaching Qualified or Confirmed Positive ROI by name with the people behind it (a confirmed win is the week's biggest news). Include demotions/rejections plainly with their reason. Never quote the ROI confirmation note — it may contain dollars.
- "## The 15" — per-ELT-org state in prose, including the honest unallocated bucket.
- "## Pulse" — only if there are new readings this week; compare to baseline and target.
- "## Worth attention this week" — stale records and launched-but-unscored ROI, each with a concrete next step.
Keep the whole thing readable in three minutes. Numbers come only from the data provided — never invent or extrapolate.`;

export interface GenerateResult {
  id: string;
  weekStart: string;
  title: string;
}

/** Draft (or re-draft) the post covering the week starting `weekStart`. */
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
    prompt: `Write the post for the week of ${data.weekStart} through ${data.weekEnd} (today is ${etDateString(new Date())} ET). The week's data:\n\n${JSON.stringify(data, null, 2)}`,
    providerOptions: gatewayOptions(actorUserId ?? "cron", "whats_new"),
  });

  await recordAiUsage({
    userId: actorUserId,
    feature: "whats_new",
    model: MODELS.coach,
    inputTokens: result.totalUsage.inputTokens,
    outputTokens: result.totalUsage.outputTokens,
  });

  const text = result.text.trim();
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1].trim() ?? `Week of ${weekStart}`;
  const body = titleMatch
    ? text.replace(titleMatch[0], "").trim()
    : text;

  const db = getDb();
  const [row] = await db
    .insert(posts)
    .values({
      weekStart,
      title,
      body,
      model: MODELS.coach,
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: posts.weekStart,
      set: {
        title,
        body,
        model: MODELS.coach,
        generatedAt: new Date(),
        editedAt: null,
      },
    })
    .returning();
  return { id: row.id, weekStart, title };
}
