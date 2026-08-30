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
import { resolveChatIntent, resolveChatUseCaseId } from "@/lib/ai/coach-intent";
import { coachInstructions } from "@/lib/ai/coach-prompt";
import {
  discoveryProposalTools,
  proposalTools,
} from "@/lib/ai/proposal-tools";
import { recordAiUsage } from "@/lib/ai/usage";
import { getCurrentUser } from "@/lib/current-user";
import {
  DEPARTMENTS,
  STATUSES,
  documentedGatesComplete,
  etDateString,
  countsTowardRoi,
  roiGaps,
  type CoachIntent,
} from "@/lib/domain";
import { canUseChat, visibleHistoryNote } from "@/lib/permissions";
import { getCoachLearnings } from "@/server/coach-learnings-queries";
import {
  CHECKPOINT_HISTORY_LIMIT,
  listDiscoveryCheckpoints,
  useCaseContext,
} from "@/server/discovery-queries";
import { buildProgressReport } from "@/server/progress-report";
import { getUseCase, listUseCases } from "@/server/use-case-queries";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!aiConfigured()) {
    return Response.json({ error: AI_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const { messages, chatId, intent, useCaseId } = (await req.json()) as {
    messages: UIMessage[];
    chatId?: string;
    intent?: string;
    useCaseId?: string;
  };

  const db = getDb();

  // What this conversation is, and what it is about, are the server's to say.
  // The browser sends an intent taken from whatever URL it was loaded with —
  // and /coach?chat=<id> carries none — so an existing chat answers for
  // itself. Without this, reopening a Discovery conversation from Recent would
  // quietly run it as a QA chat, and a crafted request could rewrite an
  // existing chat's recorded provenance. See lib/ai/coach-intent.
  let existing:
    | { userId: string; intent: CoachIntent; useCaseId: string | null }
    | undefined;
  if (chatId) {
    [existing] = await db
      .select({
        userId: coachChats.userId,
        intent: coachChats.intent,
        useCaseId: coachChats.useCaseId,
      })
      .from(coachChats)
      .where(eq(coachChats.id, chatId));
    if (!canUseChat(existing?.userId, user.id)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const chatIntent = resolveChatIntent(existing?.intent, intent);

  // A brand-new chat may name the record it was opened from; an existing one
  // keeps the record it already had. Either way the id is validated against a
  // live record before it becomes context, and the title comes from the
  // database rather than from the request.
  const requestedUseCaseId = resolveChatUseCaseId(
    Boolean(existing),
    existing?.useCaseId,
    typeof useCaseId === "string" && useCaseId ? useCaseId : null,
  );
  const linkedUseCase = requestedUseCaseId
    ? await useCaseContext(requestedUseCaseId).catch(() => null)
    : null;

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

    // Discovery's two tools, gated at the tool table the same way the admin
    // one above is. A wizard chat has no business producing checkpoints, and
    // nobody's checkpoints belong in anyone else's conversation.
    ...(chatIntent === "discovery"
      ? {
          get_discovery_history: tool({
            description:
              "This person's own recent Discovery checkpoints, newest first — what they last concluded, what they were going to go and learn, and what was still open. Read-only. Use it when they say they want to continue something, when this conversation is anchored to a record, or when a previous return condition matters. Don't call it when the conversation in front of you already has what you need.",
            inputSchema: z.object({
              useCaseId: z
                .string()
                .nullish()
                .describe("Only checkpoints linked to this use case."),
              limit: z
                .number()
                .int()
                .min(1)
                .max(CHECKPOINT_HISTORY_LIMIT)
                .nullish()
                .describe(`How many to return. Defaults to ${CHECKPOINT_HISTORY_LIMIT}.`),
            }),
            // userId is the session's, not an argument: there is no phrasing
            // that reaches another employee's private discovery work.
            execute: async ({ useCaseId: forUseCase, limit }) => {
              const rows = await listDiscoveryCheckpoints({
                userId: user.id,
                useCaseId: forUseCase ?? undefined,
                limit: limit ?? undefined,
              });
              return rows.map((r) => ({
                id: r.id,
                when: r.createdAt.toISOString().slice(0, 10),
                workingTitle: r.workingTitle,
                refinedProblem: r.refinedProblem,
                dominantConstraint: r.dominantConstraint,
                dominantConstraintDetail: r.dominantConstraintDetail,
                nextAction: r.nextAction,
                expectedLearning: r.expectedLearning,
                returnCondition: r.returnCondition,
                unresolvedQuestions: r.unresolvedQuestions,
                useCase: r.useCaseId
                  ? { id: r.useCaseId, title: r.useCaseTitle }
                  : null,
              }));
            },
          }),
          ...discoveryProposalTools,
        }
      : {}),

    // Proposal tools have NO execute — they surface as cards the human
    // accepts, edits, or dismisses. Nothing writes without their click.
    // Declared in lib/ai/proposal-tools so the evals grade these exact
    // descriptions rather than a second copy of them.
    ...proposalTools,
  };

  const result = streamText({
    model: MODELS.coach,
    instructions: coachInstructions({
      userName: user.name,
      role: user.role,
      todayEt: etDateString(new Date()),
      intent: chatIntent,
      useCase: linkedUseCase,
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
                useCaseId: linkedUseCase?.id ?? null,
              })
              // `intent` and `useCaseId` are deliberately absent from the
              // update: they record what the person came to do and what they
              // came to work on, not what the chat drifted into. They are also
              // what the next turn reads back as authoritative, so a rewrite
              // here would defeat the check at the top of this route.
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
