/**
 * What the AI doors got wrong, as data — pure functions, no I/O.
 *
 * The Coach proposes; a human accepts, corrects, or walks away. That decision
 * is the only honest measure of how well it guesses, and it used to evaporate:
 * the proposal card spoke the outcome back into the model's context and kept
 * nothing. These functions turn the same moment into something admins can read
 * a month later.
 *
 * Two deliberate limits, both about privacy. Diffs compare *fields*, never
 * conversations. And drop-off is reported as a step number, derived from the
 * Coach's own questions — an admin learns that people leave at the ratings,
 * not what anyone typed on the way there.
 */
import type { PersonRef, UseCaseCreateInput } from "./use-case-input";

/**
 * A record as the diff sees it: the create-input shape, plus the team by name.
 *
 * `teamId` and `eltOrgId` are excluded on purpose. A proposal carries a team
 * *name* and `proposalToCreateInput` sets `teamId: null` for the picker to
 * resolve, so diffing ids would score the resolver rather than the Coach.
 * Callers resolve the saved team to its name and pass it here instead.
 */
export type DiffInput = Partial<UseCaseCreateInput> & {
  teamName?: string | null;
};

export type ChangeKind =
  /** The Coach left it empty and the human knew the answer. */
  | "filled"
  /** Both had a value and they disagreed. The expensive kind. */
  | "corrected"
  /** The Coach put something there and the human took it out. */
  | "cleared";

export interface FieldChange {
  field: string;
  label: string;
  kind: ChangeKind;
  /** Display strings, truncated — never the raw objects. */
  from: string;
  to: string;
}

/** Every field worth learning about, in the order the wizard asks for them. */
const FIELDS: { key: keyof DiffInput; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "currentSteps", label: "Current steps" },
  { key: "department", label: "Department" },
  { key: "teamName", label: "Team" },
  { key: "authors", label: "Authors" },
  { key: "owner", label: "Owner" },
  { key: "aiTools", label: "AI tools" },
  { key: "urls", label: "Links" },
  { key: "approaches", label: "Approaches" },
  { key: "buildHours", label: "Build hours" },
  { key: "ratingFrequency", label: "Rating: frequency" },
  { key: "ratingPain", label: "Rating: pain" },
  { key: "ratingDataAvailability", label: "Rating: data availability" },
  { key: "ratingRisk", label: "Rating: risk" },
  { key: "ratingOwnershipClarity", label: "Rating: ownership clarity" },
  { key: "ratingEvaluationClarity", label: "Rating: evaluation clarity" },
  { key: "ratingMaintenanceBurden", label: "Rating: maintenance burden" },
  { key: "successCriterion", label: "Success criterion" },
  { key: "functionalLeaderSuccess", label: "Functional leader's success" },
  { key: "successCriterionMet", label: "Success criterion met" },
  { key: "adoptionEvidence", label: "Adoption evidence" },
  { key: "gateNamed", label: "Gate: named workflow" },
  { key: "gateTool", label: "Gate: tool identified" },
  { key: "gateAdoption", label: "Gate: adoption" },
  { key: "gateOwner", label: "Gate: owner" },
  { key: "baselineMetric", label: "Baseline metric" },
  { key: "baselineValue", label: "Baseline value" },
  { key: "baselineUnit", label: "Baseline unit" },
  { key: "postValue", label: "Post value" },
  { key: "measurementMethod", label: "Measurement method" },
  { key: "netImpactStatement", label: "Net impact" },
  { key: "roiStatus", label: "ROI status" },
  { key: "revisitOn", label: "Revisit on" },
  { key: "status", label: "Starting status" },
];

const MAX_VALUE_CHARS = 140;

/**
 * Values `proposalToCreateInput` supplies when a proposal said nothing — the
 * emptiest honest defaults. A human moving off one of these is closing a gap,
 * not overruling a guess, so it counts as "filled" rather than "corrected".
 */
const NO_CLAIM: Partial<Record<keyof DiffInput, string>> = {
  gateNamed: "no",
  gateTool: "no",
  gateAdoption: "no",
  gateOwner: "no",
  successCriterionMet: "not_yet",
  roiStatus: "not_yet_measurable",
  status: "in_discovery",
};

function isPersonRef(v: unknown): v is PersonRef {
  return typeof v === "object" && v !== null && "displayName" in v;
}

/** A record URL. Without this branch every links diff would read "[object Object]". */
function isUrlRef(v: unknown): v is { url: string } {
  return typeof v === "object" && v !== null && "url" in v;
}

function one(v: unknown): string {
  if (isPersonRef(v)) return v.displayName;
  if (isUrlRef(v)) return v.url;
  return String(v);
}

/** One comparable, human-readable string per value. Empty means "nothing here". */
function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const parts = value.map(one);
    return parts.filter((p) => p.trim() !== "").join("; ");
  }
  if (isPersonRef(value)) return value.displayName;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

/** Case and whitespace are not corrections. "Ada  Lovelace" == "ada lovelace". */
function comparable(shown: string): string {
  return shown.toLowerCase().replace(/\s+/g, " ").trim();
}

function truncate(s: string): string {
  return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS - 1)}…` : s;
}

/**
 * What the human changed about the proposal before saving it.
 *
 * A field the proposal never mentioned (absent, not null) is skipped rather
 * than scored as "filled" — the notes door omits keys the notes didn't
 * support, and silence isn't a wrong guess.
 */
export function diffProposal(
  proposed: DiffInput,
  saved: DiffInput,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const { key, label } of FIELDS) {
    if (!(key in proposed) && !(key in saved)) continue;
    const from = display(proposed[key]);
    const to = display(saved[key]);
    if (comparable(from) === comparable(to)) continue;

    const claimed = from !== "" && from !== NO_CLAIM[key];
    const kind: ChangeKind = !claimed ? "filled" : to === "" ? "cleared" : "corrected";
    changes.push({
      field: String(key),
      label,
      kind,
      from: truncate(from),
      to: truncate(to),
    });
  }
  return changes;
}

export interface FieldStat {
  field: string;
  label: string;
  filled: number;
  corrected: number;
  cleared: number;
  total: number;
  /** Most recent first, capped — the texture behind the count. */
  examples: { from: string; to: string }[];
}

const MAX_EXAMPLES = 3;

/**
 * Roll many diffs into a per-field scoreboard, worst first. "Worst" weights
 * corrections above fills: the Coach inventing a wrong owner is a bigger
 * problem than the Coach declining to guess one.
 */
export function summarizeCorrections(diffs: FieldChange[][]): FieldStat[] {
  const byField = new Map<string, FieldStat>();
  for (const diff of diffs) {
    for (const change of diff) {
      let stat = byField.get(change.field);
      if (!stat) {
        stat = {
          field: change.field,
          label: change.label,
          filled: 0,
          corrected: 0,
          cleared: 0,
          total: 0,
          examples: [],
        };
        byField.set(change.field, stat);
      }
      stat[change.kind] += 1;
      stat.total += 1;
      if (change.kind !== "filled" && stat.examples.length < MAX_EXAMPLES) {
        stat.examples.push({ from: change.from, to: change.to });
      }
    }
  }
  return [...byField.values()].sort(
    (a, b) =>
      b.corrected * 2 + b.cleared * 2 + b.filled -
      (a.corrected * 2 + a.cleared * 2 + a.filled),
  );
}

// ---------------------------------------------------------------------------
// Where the wizard loses people
// ---------------------------------------------------------------------------

/** The intake order in `coachInstructions`, and what each step sounds like. */
export const WIZARD_STEPS: { step: number; label: string; cues: RegExp }[] = [
  { step: 1, label: "Name the workflow", cues: /\b(what does it do|call this workflow|name (it|the workflow)|working on)\b/i },
  { step: 2, label: "Walk the steps", cues: /\b(start to finish|step by step|walk me through|what happens (first|next)|each step)\b/i },
  { step: 3, label: "Team, authors, owner", cues: /\b(which team|what team|department|who built|who owns|owner going forward)\b/i },
  { step: 4, label: "Tooling and approach", cues: /\b(claude code|ai-built|at runtime|which tools?|what tool|automation|agentic)\b/i },
  { step: 5, label: "The seven ratings", cues: /\b(rate|rating|1[–-]5|1 to 5|frequency|how painful|maintenance burden)\b/i },
  { step: 6, label: "Success criterion", cues: /\b(success criterion|success look like|functional leader|how would you know)\b/i },
  { step: 7, label: "ROI numbers", cues: /\b(baseline|post[- ]value|measurement method|roi|measure it|how many hours)\b/i },
  { step: 8, label: "Adoption evidence", cues: /\b(adoption|beyond the authors|anyone else|who else uses|other than you)\b/i },
];

/**
 * Which intake step a message is asking about, or null when nothing matches.
 * The *last* cue wins: a question that recaps step 3 on the way to asking
 * step 5 is a step 5 question.
 */
export function wizardStepFromText(text: string): number | null {
  let best: { step: number; at: number } | null = null;
  for (const { step, cues } of WIZARD_STEPS) {
    const match = cues.exec(text);
    if (!match) continue;
    if (!best || match.index > best.at) best = { step, at: match.index };
  }
  return best?.step ?? null;
}

/** Just enough of an AI SDK UIMessage to read progress off it. */
interface MessageLike {
  role?: string;
  parts?: { type?: string; text?: string }[];
}

export interface WizardProgress {
  userTurns: number;
  /** True once the Coach put a proposal card on screen. */
  reachedProposal: boolean;
  /** The step the Coach was asking about when the conversation stopped. */
  lastStep: number | null;
  lastStepLabel: string | null;
}

/**
 * How far a wizard conversation got. Reads the Coach's questions, never the
 * human's answers — the step is inferred from what the app asked.
 */
export function wizardProgress(messages: unknown): WizardProgress {
  const list: MessageLike[] = Array.isArray(messages) ? messages : [];
  let userTurns = 0;
  let reachedProposal = false;
  let lastStep: number | null = null;

  for (const message of list) {
    const parts = Array.isArray(message?.parts) ? message.parts : [];
    if (message?.role === "user") {
      userTurns += 1;
      continue;
    }
    if (message?.role !== "assistant") continue;
    for (const part of parts) {
      if (part?.type === "tool-propose_use_case") reachedProposal = true;
      if (part?.type === "text" && typeof part.text === "string") {
        const step = wizardStepFromText(part.text);
        if (step !== null) lastStep = step;
      }
    }
  }

  return {
    userTurns,
    reachedProposal,
    lastStep,
    lastStepLabel:
      WIZARD_STEPS.find((s) => s.step === lastStep)?.label ?? null,
  };
}

export interface DropOff {
  step: number;
  label: string;
  count: number;
}

/**
 * Wizard conversations that ended before a proposal, bucketed by the step they
 * died on. A conversation of one turn is someone opening the door and closing
 * it again, not a drop-off worth chasing, so it takes two.
 */
export function dropOffByStep(
  conversations: { messages: unknown }[],
): { buckets: DropOff[]; abandoned: number; unattributed: number } {
  const counts = new Map<number, number>();
  let abandoned = 0;
  let unattributed = 0;

  for (const c of conversations) {
    const progress = wizardProgress(c.messages);
    if (progress.reachedProposal || progress.userTurns < 2) continue;
    abandoned += 1;
    if (progress.lastStep === null) {
      unattributed += 1;
      continue;
    }
    counts.set(progress.lastStep, (counts.get(progress.lastStep) ?? 0) + 1);
  }

  const buckets = WIZARD_STEPS.map(({ step, label }) => ({
    step,
    label,
    count: counts.get(step) ?? 0,
  })).filter((b) => b.count > 0);

  return { buckets, abandoned, unattributed };
}

// ---------------------------------------------------------------------------
// The headline numbers
// ---------------------------------------------------------------------------

export interface OutcomeCounts {
  proposed: number;
  accepted: number;
  editedThenSaved: number;
  dismissed: number;
  /**
   * Of everything saved, how many went in with no field changed. Not the same
   * as `accepted`: the notes door has no accept-as-is button, so a draft its
   * author read and saved untouched arrives as an edit with an empty diff.
   */
  savedUnchanged: number;
}

export interface OutcomeSummary extends OutcomeCounts {
  saved: number;
  /** Proposed, then neither saved nor dismissed. */
  walkedAway: number;
  /** Saved as-is or after edits, over everything proposed. */
  savedRate: number | null;
  /** Saved without a single field changed — the Coach got it right outright. */
  cleanRate: number | null;
}

export function summarizeOutcomes(counts: OutcomeCounts): OutcomeSummary {
  const saved = counts.accepted + counts.editedThenSaved;
  const decided = saved + counts.dismissed;
  return {
    ...counts,
    saved,
    walkedAway: Math.max(0, counts.proposed - decided),
    savedRate: counts.proposed > 0 ? saved / counts.proposed : null,
    cleanRate: saved > 0 ? counts.savedUnchanged / saved : null,
  };
}
