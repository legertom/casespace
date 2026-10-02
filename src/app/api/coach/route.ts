import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type TextStreamPart,
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
import {
  resolveChatIntent,
  resolveChatUseCaseId,
  sanitizeRecordId,
} from "@/lib/ai/coach-intent";
import {
  coachErrorText,
  describeCoachError,
  type CoachFailure,
} from "@/lib/ai/coach-error";
import { coachInstructions } from "@/lib/ai/coach-prompt";
import { courseTools } from "@/lib/ai/course-tools";
import {
  discoveryProposalTools,
  proposalTools,
} from "@/lib/ai/proposal-tools";
import {
  settleUndecidedCards,
  withoutEmptyAssistantTurns,
} from "@/lib/ai/transcript-repair";
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
import { recordCoachFailure } from "@/server/coach-failures";
import { getCoachLearnings } from "@/server/coach-learnings-queries";
import { errorRef } from "@/server/guards";
import {
  CHECKPOINT_HISTORY_LIMIT,
  listDiscoveryCheckpoints,
  useCaseContext,
} from "@/server/discovery-queries";
import { buildProgressReport } from "@/server/progress-report";
import { getUseCase, listUseCases } from "@/server/use-case-queries";

export const maxDuration = 120;

/**
 * Who and what a failure happened to — everything the log line needs to be
 * findable from a person's name, and nothing of what they typed. Filled in as
 * the request learns it, so an early failure logs what was known by then.
 */
interface TurnContext {
  userId?: string;
  chatId?: string;
  intent?: string;
  /** How long the transcript was, which is all the log says about it. */
  messages?: number;
}

/** Failure rows still being written — see `reportFailure`. */
type Saves = Promise<void>[];

/**
 * One failure, reported once, under a reference the person can quote: a log
 * line, and a `coach_failures` row that says who and when without a log
 * search. The prefix matches the one server actions log under,
 * so "search for the reference" is the same instruction everywhere.
 *
 * The row is written without being waited on here — two of the three callers
 * are synchronous hooks inside the stream — so the write goes on `saves` and
 * the request settles them before it ends. A function that returns with a
 * write still in flight may never finish it.
 */
function reportFailure(
  stage: "setup" | "turn" | "tool",
  err: unknown,
  ctx: TurnContext,
  saves: Saves,
): CoachFailure {
  const ref = errorRef();
  const { kind, error, detail } = describeCoachError(err);
  console.error(
    `[casespace error ${ref}] coach ${stage} failed`,
    JSON.stringify({ kind, model: MODELS.coach, ...ctx }),
    err,
  );
  saves.push(
    recordCoachFailure({
      ref,
      stage,
      kind,
      model: MODELS.coach,
      userId: ctx.userId,
      chatId: ctx.chatId,
      intent: ctx.intent,
      messageCount: ctx.messages,
      err,
    }),
  );
  return { error, detail, ref };
}

export async function POST(req: Request) {
  const ctx: TurnContext = {};
  const saves: Saves = [];
  try {
    return await respond(req, ctx, saves);
  } catch (err) {
    // Anything thrown before the stream opens — an unreadable body, the
    // database, a transcript the SDK can't convert. Same shape as a failure
    // mid-stream, so the panel shows both the same way.
    const failure = reportFailure("setup", err, ctx, saves);
    await Promise.all(saves);
    return Response.json(failure, { status: 500 });
  }
}

async function respond(req: Request, ctx: TurnContext, saves: Saves) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "You've been signed out. Reload the page to sign back in." },
      { status: 401 },
    );
  }
  ctx.userId = user.id;
  if (!aiConfigured()) {
    return Response.json({ error: AI_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const {
    messages: sent,
    chatId,
    intent,
    useCaseId,
  } = (await req.json()) as {
    messages: UIMessage[];
    chatId?: string;
    intent?: string;
    useCaseId?: string;
  };
  // An earlier failed turn may have left an empty assistant message in the
  // stored chat; it goes no further than this.
  const messages = withoutEmptyAssistantTurns(sent);
  ctx.chatId = chatId;
  ctx.messages = messages.length;

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
      return Response.json(
        { error: "That conversation belongs to someone else." },
        { status: 403 },
      );
    }
  }

  const chatIntent = resolveChatIntent(existing?.intent, intent);
  ctx.intent = chatIntent;

  // A brand-new chat may name the record it was opened from; an existing one
  // keeps the record it already had. Either way the id is validated against a
  // live record before it becomes context, and the title comes from the
  // database rather than from the request.
  const requestedUseCaseId = resolveChatUseCaseId(
    Boolean(existing),
    existing?.useCaseId,
    sanitizeRecordId(useCaseId),
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

    // The browser renders an admin-only roster picker for this client tool.
    ...(user.role === "admin"
      ? {
          open_live_groups: tool({
            description:
              "Open the live AI Leads grouping workspace. Use when an admin asks to form live groups; the workspace shows clickable rostered AI Leads, their credited use cases, and Jev and Claude Opus grouping methods. Do not ask for typed attendance names.",
            inputSchema: z.object({}),
          }),
        }
      : {}),

    // Wizard-only, gated at the tool table for the same reason the two below
    // are: a tool the Coach cannot see is a tool it cannot be talked into
    // calling, and a course suggestion belongs to the moment somebody has just
    // finished describing a workflow — not to a question about the scoreboard.
    // Declared in lib/ai/course-tools so the evals grade this exact
    // description and this exact matcher rather than a second copy of them.
    ...(chatIntent === "wizard" ? courseTools() : {}),

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

  // The cards are the tools with no execute — the same structural fact the
  // writes rule rests on, read off the table rather than listed a second time.
  const toolTable: Record<string, { execute?: unknown }> = tools;
  const isCard = (name: string) =>
    name in toolTable && typeof toolTable[name].execute !== "function";

  const result = streamText({
    model: MODELS.coach,
    instructions: coachInstructions({
      userName: user.name,
      role: user.role,
      todayEt: etDateString(new Date()),
      intent: chatIntent,
      useCase: linkedUseCase,
    }),
    // Two ways a transcript arrives with a tool call nobody answered, and
    // either one makes every later turn unsendable. A card someone typed a
    // reply past is told to the model as undecided; a read tool a cut-off
    // stream left hanging is simply dropped. Only the model's view is
    // repaired — what is stored, and what the browser shows, keeps the card
    // waiting on its click. See lib/ai/transcript-repair.
    messages: await convertToModelMessages(
      settleUndecidedCards(messages, isCard),
      { ignoreIncompleteToolCalls: true },
    ),
    tools,
    stopWhen: isStepCount(6),
    providerOptions: gatewayOptions(user.id, "coach"),
    // The SDK's default prints the bare error. It is reported below instead,
    // once, with a reference and the context that makes it findable.
    onError: () => {},
  });

  // The UI stream's one error hook fires for two different things: the turn
  // itself failing, and a single tool failing inside a turn that carries on.
  // Marking the first kind as it passes is what tells them apart.
  const turnErrors = new Set<unknown>();
  const reported = new Set<string>();
  const stream = result.stream.pipeThrough(
    new TransformStream<
      TextStreamPart<typeof tools>,
      TextStreamPart<typeof tools>
    >({
      transform(part, controller) {
        if (part.type === "error") turnErrors.add(part.error);
        controller.enqueue(part);
      },
    }),
  );

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream,
      originalMessages: messages,
      onError: (err) => {
        // The SDK hands a turn's error text back through this hook a second
        // time, wrapped, while it assembles the messages for onEnd. Already
        // reported; not a second failure.
        if (err instanceof Error && reported.has(err.message)) return err.message;
        if (turnErrors.has(err)) {
          // What the panel shows: the failure whole, as the one string the
          // stream has room for. See lib/ai/coach-error.
          const text = coachErrorText(
            reportFailure("turn", err, ctx, saves),
          );
          reported.add(text);
          return text;
        }
        // What the model reads as the tool's result — so plain words, and the
        // reference in case the Coach relays it.
        const { detail, ref } = reportFailure("tool", err, ctx, saves);
        return `The tool failed (reference ${ref}): ${detail ?? "no detail"}`;
      },
      onEnd: async ({ messages: finalMessages }) => {
        // The stream stays open until this returns, which is what gives any
        // failure rows from this turn time to land. recordCoachFailure never
        // rejects.
        await Promise.all(saves);
        try {
          if (chatId) {
            const firstUserText =
              messages
                .find((m) => m.role === "user")
                ?.parts.find((p) => p.type === "text")
                ?.text.slice(0, 80) ?? "Conversation";
            // A turn that failed outright still ends with an assistant
            // message, an empty one. What the person sent is worth keeping;
            // that is not.
            const toStore = withoutEmptyAssistantTurns(finalMessages);
            await db
              .insert(coachChats)
              .values({
                id: chatId,
                userId: user.id,
                title: firstUserText,
                messages: toStore,
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
                set: { messages: toStore, updatedAt: new Date() },
              });
          }
          // Rejects when the turn produced nothing, which the turn's own
          // failure has already reported — there is no usage to record.
          const usage = await Promise.resolve(result.totalUsage).catch(
            () => null,
          );
          if (usage) {
            await recordAiUsage({
              userId: user.id,
              feature: "coach",
              model: MODELS.coach,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            });
          }
        } catch (err) {
          console.error(
            "coach persistence failed",
            JSON.stringify(ctx),
            err,
          );
        }
      },
    }),
  });
}
