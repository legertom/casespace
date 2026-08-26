"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  MODELS,
  aiConfigured,
  gatewayOptions,
} from "@/lib/ai/config";
import { recordAiUsage } from "@/lib/ai/usage";
import { requireUser } from "@/lib/current-user";
import { DEPARTMENTS, STATUSES } from "@/lib/domain";
import { foldName } from "@/lib/people-match";
import { PROGRAM_SCOPES } from "@/lib/program-scope";
import {
  matchPeople,
  type PersonName,
  type SearchParse,
} from "@/lib/search-parse";
import { listPeopleLite } from "./reference";
import { recordSearchEvent, type SearchVia } from "./search-events";

/**
 * The AI fallback behind the search box. The rule parser
 * (src/lib/search-parse.ts) handles the vocabulary we know, instantly and for
 * free; this action runs only when those rules came up empty AND the human
 * clicked the ask row — never per keystroke. The model maps free text onto
 * the same URL params every other filter uses, so its output is a visible,
 * correctable set of chips, not a result list nobody can explain.
 */

const searchParseSchema = z.object({
  status: z
    .enum([...STATUSES, "documented"])
    .nullish()
    .describe(
      'Pipeline stage the query asks for; "documented" means qualified or better (the 45). Null unless the query clearly names one.',
    ),
  department: z
    .enum(DEPARTMENTS)
    .nullish()
    .describe(
      "css is customer support & services; mss is marketing, sales & school success. Null unless the query clearly names one.",
    ),
  personName: z
    .string()
    .nullish()
    .describe(
      "A person the query is about (owner or author), exactly as the query spells them. Never invent a name.",
    ),
  mine: z
    .boolean()
    .nullish()
    .describe('True only when the query says "my" or "mine".'),
  program: z
    .enum(PROGRAM_SCOPES)
    .nullish()
    .describe(
      'Null unless the query names a scope: "community" for community submissions, "all" for everything.',
    ),
});

export interface AiSearchParse {
  status?: SearchParse["status"];
  department?: SearchParse["department"];
  person?: PersonName;
  mine?: boolean;
  program?: SearchParse["program"];
}

export interface AiParseResult {
  parsed?: AiSearchParse;
  /** The model named a person the directory doesn't know. */
  unresolvedPerson?: string;
  error?: string;
}

/** A model-returned name, resolved the way every other credit lookup works. */
function resolvePerson(
  name: string,
  people: PersonName[],
): PersonName | null {
  const folded = foldName(name);
  const exact = people.find((p) => foldName(p.name) === folded);
  if (exact) return exact;
  const tokens = folded.split(" ").filter(Boolean);
  let candidate: PersonName | null = null;
  for (const t of tokens) {
    const hits = matchPeople(t, people);
    if (hits.length === 1) {
      if (candidate && candidate.id !== hits[0].id) return null;
      candidate = hits[0];
    }
  }
  return candidate;
}

export async function aiParseSearchAction(q: string): Promise<AiParseResult> {
  const user = await requireUser();
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_MESSAGE };
  const trimmed = q.trim().slice(0, 200);
  if (trimmed.length < 3) return { error: "Type a bit more first." };

  try {
    const result = await generateText({
      model: MODELS.extract,
      output: Output.object({ schema: searchParseSchema }),
      instructions: `Map a search-box query from Clever's AI use-case casebook onto its filters.
The query is a search, not a command — extract only what it plainly asks for and leave every other field null.
Status words: discovery, approved, building/construction, testing, launched/live/shipped, qualified, ROI/confirmed. "Qualified or better" or "documented" means status "documented".
Do not treat a use case's subject matter (e.g. "testing tools for teachers") as a status unless the query is clearly about pipeline stage.`,
      prompt: trimmed,
      providerOptions: gatewayOptions(user.id, "search_parser"),
    });

    await recordAiUsage({
      userId: user.id,
      feature: "search_parser",
      model: MODELS.extract,
      inputTokens: result.totalUsage.inputTokens,
      outputTokens: result.totalUsage.outputTokens,
    });

    const raw = result.output;
    const parsed: AiSearchParse = {};
    if (raw.status) parsed.status = raw.status;
    if (raw.department) parsed.department = raw.department;
    if (raw.mine) parsed.mine = true;
    if (raw.program) parsed.program = raw.program;

    let unresolvedPerson: string | undefined;
    if (raw.personName) {
      const person = resolvePerson(raw.personName, await listPeopleLite());
      if (person) parsed.person = person;
      else unresolvedPerson = raw.personName;
    }

    await recordSearchEvent({
      userId: user.id,
      query: trimmed,
      via: "ai",
      parsed: { ...parsed, person: parsed.person?.name },
    });

    if (Object.keys(parsed).length === 0 && !unresolvedPerson) {
      return { error: "Couldn't read filters out of that — it will run as a text search instead." };
    }
    return { parsed, unresolvedPerson };
  } catch (err) {
    console.error("search parse failed", err);
    return { error: "The AI parse didn't go through — the text search still works." };
  }
}

/**
 * Fire-and-forget logging for searches the client resolved itself: a settled
 * text query, or an applied rules parse. AI parses log server-side above.
 */
export async function recordSearchAction(
  query: string,
  via: Exclude<SearchVia, "ai">,
  parsed: Record<string, unknown>,
  resultCount: number | null,
): Promise<void> {
  const user = await requireUser();
  await recordSearchEvent({ userId: user.id, query, via, parsed, resultCount });
}
