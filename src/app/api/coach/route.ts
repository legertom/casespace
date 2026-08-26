import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { coachChats } from "@/db/schema";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  MODELS,
  aiConfigured,
  gatewayOptions,
} from "@/lib/ai/config";
import { coachInstructions } from "@/lib/ai/coach-prompt";
import { proposalSchema, updateProposalSchema } from "@/lib/ai/proposal";
import { recordAiUsage } from "@/lib/ai/usage";
import { getCurrentUser } from "@/lib/current-user";
import {
  DEPARTMENTS,
  STATUSES,
  documentedGatesComplete,
  etDateString,
  countsTowardRoi,
  roiGaps,
} from "@/lib/domain";
import { visibleHistoryNote } from "@/lib/permissions";
import { getCoachLearnings } from "@/server/coach-learnings-queries";
import { buildProgressReport } from "@/server/progress-report";
import { getUseCase, listUseCases } from "@/server/use-case-queries";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!aiConfigured()) {
    return Response.json({ error: AI_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const { messages, chatId, intent } = (await req.json()) as {
    messages: UIMessage[];
    chatId?: string;
    intent?: string;
  };
  const chatIntent =
    intent === "wizard" || intent === "roi_review" ? intent : "qa";

  const db = getDb();
  if (chatId) {
    const [existing] = await db
      .select({ userId: coachChats.userId })
      .from(coachChats)
      .where(eq(coachChats.id, chatId));
    if (existing && existing.userId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const tools = {
    search_use_cases: tool({
      description:
        "Search the use-case casebook. All arguments optional; returns compact records.",
      inputSchema: z.object({
        q: z.string().nullish().describe("Text search in title/description/owner"),
        status: z.enum(STATUSES).nullish(),
        department: z.enum(DEPARTMENTS).nullish(),
        inProgram: z
          .boolean()
          .nullish()
          .describe(
            "true = program records only, false = community submissions only. Omit for both — the default, because 'has anyone tried X?' is answered wrong by hiding half the casebook.",
          ),
      }),
      execute: async ({ q, status, department, inProgram }) => {
        const rows = await listUseCases({
          q: q ?? undefined,
          status: status ?? undefined,
          department: department ?? undefined,
          inProgram: inProgram ?? undefined,
        });
        return rows.slice(0, 30).map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          confirmedPositiveRoi: countsTowardRoi(r.status),
          // Whether it counts toward the 45/15. In the projection so the Coach
          // can never describe a community record as part of the program.
          inProgram: r.inProgram,
          department: r.department,
          team: r.teamName,
          owner: r.ownerName,
          authors: r.authors.map((a) => a.displayName),
          documentedGatesComplete: documentedGatesComplete(r),
          roiStatus: r.roiStatus,
        }));
      },
    }),

    get_use_case: tool({
      description: "Fetch one use case in full, including ROI gaps and history.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const uc = await getUseCase(id).catch(() => null);
        if (!uc) return { error: "Not found" };
        return {
          id: uc.id,
          title: uc.title,
          description: uc.description,
          status: uc.status,
          confirmedPositiveRoi: countsTowardRoi(uc.status),
          inProgram: uc.inProgram,
          department: uc.department,
          team: uc.teamName,
          eltOrg: uc.eltOrgName,
          owner: uc.ownerName,
          authors: uc.authors.map((a) => a.displayName),
          aiTools: uc.aiTools,
          urls: uc.urls.map((u) => ({ kind: u.kind, label: u.label, url: u.url })),
          approaches: uc.approaches,
          currentSteps: uc.currentSteps,
          ratings: {
            frequency: uc.ratingFrequency,
            pain: uc.ratingPain,
            dataAvailability: uc.ratingDataAvailability,
            risk: uc.ratingRisk,
            ownershipClarity: uc.ratingOwnershipClarity,
            evaluationClarity: uc.ratingEvaluationClarity,
            maintenanceBurden: uc.ratingMaintenanceBurden,
          },
          functionalLeaderSuccess: uc.functionalLeaderSuccess,
          gates: {
            named: uc.gateNamed,
            tool: uc.gateTool,
            adoption: uc.gateAdoption,
            owner: uc.gateOwner,
            adoptionEvidence: uc.adoptionEvidence,
            allFourMet: documentedGatesComplete(uc),
          },
          successCriterion: uc.successCriterion,
          successCriterionMet: uc.successCriterionMet,
          roi: {
            status: uc.roiStatus,
            baselineMetric: uc.baselineMetric,
            baselineValue: uc.baselineValue,
            baselineUnit: uc.baselineUnit,
            postValue: uc.postValue,
            measurementMethod: uc.measurementMethod,
            netImpactStatement: uc.netImpactStatement,
            isPositive: uc.isPositive,
            revisitOn: uc.revisitOn,
            gapsToConfirmation: roiGaps(uc),
          },
          rejectionReason: uc.rejectionReason,
          recentHistory: uc.history.slice(0, 6).map((h) => ({
            when: h.createdAt.toISOString().slice(0, 10),
            from: h.fromStatus,
            to: h.toStatus,
            by: h.changedByName,
            // The annual-ROI note may carry dollars — admins only, same
            // rule as /wins and the record page.
            note: visibleHistoryNote(h, user.role),
          })),
        };
      },
    }),

    get_progress: tool({
      description:
        "The program scoreboard: counts vs targets, what is in flight behind them, per-ELT-org splits, per-team coverage, and attention flags.",
      inputSchema: z.object({}),
      execute: () => buildProgressReport(),
    }),

    // Admin-only, and gated at the tool table rather than inside execute:
    // a tool the Coach can't see is a tool it can't be talked into calling.
    ...(user.role === "admin"
      ? {
          get_coach_learnings: tool({
            description:
              "How well the Coach's own proposals have landed: accept and correction rates, the fields it most often gets wrong, where the intake wizard loses people, and why proposals were dismissed. Admin-only. Aggregate — never anyone's conversation.",
            inputSchema: z.object({
              windowDays: z
                .number()
                .int()
                .min(1)
                .max(365)
                .nullish()
                .describe("How far back to look. Defaults to 90 days."),
            }),
            execute: ({ windowDays }) =>
              getCoachLearnings(windowDays ?? undefined),
          }),
        }
      : {}),

    // Proposal tools have NO execute — they surface as cards the human
    // accepts, edits, or dismisses. Nothing writes without their click.
    propose_use_case: tool({
      description:
        "Propose a new use-case record for the human to review. Use once you have at least a title and description; include everything else you learned. The human's decision comes back as the tool result.",
      inputSchema: proposalSchema,
    }),

    propose_update: tool({
      description:
        "Propose changes to an existing use case for the human to review. Only include the fields that change. The human's decision comes back as the tool result.",
      inputSchema: updateProposalSchema,
    }),
  };

  const result = streamText({
    model: MODELS.coach,
    instructions: coachInstructions({
      userName: user.name,
      role: user.role,
      todayEt: etDateString(new Date()),
    }),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(6),
    providerOptions: gatewayOptions(user.id, "coach"),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onEnd: async ({ messages: finalMessages }) => {
        try {
          if (chatId) {
            const firstUserText =
              messages
                .find((m) => m.role === "user")
                ?.parts.find((p) => p.type === "text")
                ?.text.slice(0, 80) ?? "Conversation";
            await db
              .insert(coachChats)
              .values({
                id: chatId,
                userId: user.id,
                title: firstUserText,
                messages: finalMessages,
                intent: chatIntent,
              })
              // `intent` is deliberately absent from the update: it records
              // what the person came to do, not what the chat drifted into.
              .onConflictDoUpdate({
                target: coachChats.id,
                set: { messages: finalMessages, updatedAt: new Date() },
              });
          }
          const usage = await result.totalUsage;
          await recordAiUsage({
            userId: user.id,
            feature: "coach",
            model: MODELS.coach,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
        } catch (err) {
          console.error("coach persistence failed", err);
        }
      },
    }),
  });
}
