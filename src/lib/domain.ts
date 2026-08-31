/**
 * Casespace domain logic — pure functions only, no I/O.
 * Everything the program's numbers depend on lives here and is unit-tested.
 */

// ---------------------------------------------------------------------------
// Program constants (H2 2026)
// ---------------------------------------------------------------------------

export const PROGRAM_START = "2026-07-01";
export const PROGRAM_END = "2026-12-31";
export const TARGET_DOCUMENTED = 45; // Qualified or better
export const TARGET_ROI = 15; // Confirmed Positive ROI
export const DEFAULT_STALE_DAYS = 21;
export const WORKFLOWS_PER_LEAD = 2;
/**
 * How many names the mention composer carries. Everyone at Clever can sign
 * in now, so the list grows with headcount. Capped rather than paginated
 * because the composer filters client-side; if the cap ever bites, the fix
 * is a server-side search, not a bigger number. Lives here (not in the
 * server query module) so the composer can tell a full list from a capped
 * one and say so instead of failing silently.
 */
export const MENTIONABLE_LIMIT = 400;
/**
 * How deep comment threads nest, counting the top level. Jira's comments are
 * flat; ours thread — deliberately, and only this far. depth is 0-based, so
 * the deepest comment is depth 5 and the Reply control stops rendering there.
 */
export const MAX_COMMENT_DEPTH = 6;

/**
 * Whether a comment at this depth can take a reply. The Reply control asks
 * this before rendering and the server asks it again before inserting — the
 * client is a courtesy, the server is the rule.
 */
export function canReplyAtDepth(parentDepth: number): boolean {
  return parentDepth + 1 < MAX_COMMENT_DEPTH;
}

// ---------------------------------------------------------------------------
// Departments (program groupings, not HRIS)
// ---------------------------------------------------------------------------

export const DEPARTMENTS = [
  "business_operations",
  "product_design",
  "engineering",
  "people",
  "css",
  "mss",
  "finance_legal",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  business_operations: "Business Operations",
  product_design: "Product / Design",
  engineering: "Engineering",
  people: "People",
  css: "CSS",
  mss: "MSS",
  finance_legal: "Finance / Legal",
};

// ---------------------------------------------------------------------------
// Tool & approach
// ---------------------------------------------------------------------------

/**
 * How AI shows up in a use case. "prompt" / "automation" / "agentic" describe
 * AI doing the work at runtime (AI-enabled). "built" covers workflows where
 * AI (e.g. Claude Code) built the tool but doesn't run at runtime (AI-built)
 * — that still satisfies the "AI tool & approach identified" gate.
 *
 * A record holds any number of these: Casespace itself is AI-built *and*
 * agentic at runtime. None selected means nobody has said yet.
 */
export const APPROACHES = ["prompt", "automation", "agentic", "built"] as const;

export type Approach = (typeof APPROACHES)[number];

export const APPROACH_LABELS: Record<Approach, string> = {
  prompt: "Prompt",
  automation: "Automation",
  agentic: "Agentic",
  built: "AI-built",
};

/** Labels in the canonical order, for display: "Agentic · AI-built". */
export function approachLabels(approaches: readonly string[]): string {
  return APPROACHES.filter((a) => approaches.includes(a))
    .map((a) => APPROACH_LABELS[a])
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Links between workflows
// ---------------------------------------------------------------------------

/**
 * How one workflow relates to another. A link is stored once, on the record
 * it was made from ("from" builds on "to"), and shows on both records — the
 * far end reads the inverse label.
 */
export const LINK_KINDS = ["builds_on", "duplicates", "relates_to"] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

/** What the record the link was made from says. */
export const LINK_LABELS: Record<LinkKind, string> = {
  builds_on: "Builds on",
  duplicates: "Duplicates",
  relates_to: "Relates to",
};

/** What the far end says. "Relates to" is symmetric — same word both ways. */
export const LINK_INVERSE_LABELS: Record<LinkKind, string> = {
  builds_on: "Built on by",
  duplicates: "Duplicated by",
  relates_to: "Relates to",
};

/** The sentence the picker completes: "This workflow builds on …". */
export const LINK_PHRASES: Record<LinkKind, string> = {
  builds_on: "builds on",
  duplicates: "duplicates",
  relates_to: "relates to",
};

/** How the two sides of a record's links are headed, in display order. */
export const LINK_HEADINGS: readonly {
  kind: LinkKind;
  outgoing: boolean;
  label: string;
}[] = [
  { kind: "builds_on", outgoing: true, label: LINK_LABELS.builds_on },
  { kind: "builds_on", outgoing: false, label: LINK_INVERSE_LABELS.builds_on },
  { kind: "duplicates", outgoing: true, label: LINK_LABELS.duplicates },
  {
    kind: "duplicates",
    outgoing: false,
    label: LINK_INVERSE_LABELS.duplicates,
  },
  { kind: "relates_to", outgoing: true, label: LINK_LABELS.relates_to },
];

export function isLinkKind(value: string): value is LinkKind {
  return (LINK_KINDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// URLs on a record
// ---------------------------------------------------------------------------

/**
 * What a URL on a record points at — where to find the thing itself. Distinct
 * from LINK_KINDS above, which relates two *records* to each other.
 *
 * Three named kinds because they are the three people actually attach, plus
 * `other` so the list never blocks a link nobody anticipated; that is what the
 * free label is for.
 */
export const URL_KINDS = ["live", "github", "claude", "other"] as const;

export type UrlKind = (typeof URL_KINDS)[number];

export const URL_KIND_LABELS: Record<UrlKind, string> = {
  live: "Live",
  github: "GitHub",
  claude: "Claude",
  other: "Link",
};

/** What the picker offers, in display order, with a hint at what belongs. */
export const URL_KIND_HINTS: Record<UrlKind, string> = {
  live: "The working tool, where someone can use it",
  github: "The repository",
  claude: "A Claude artifact, project, or skill",
  other: "Anything else — say what it is",
};

// ---------------------------------------------------------------------------
// Worksheet ratings
// ---------------------------------------------------------------------------

/** The seven scoping-worksheet lenses: column, label, and what it asks. */
export const RATING_FIELDS = [
  ["ratingFrequency", "Frequency", "How often the workflow runs"],
  ["ratingPain", "Pain", "How painful it is today"],
  [
    "ratingDataAvailability",
    "Data availability",
    "Is the needed data accessible?",
  ],
  ["ratingRisk", "Risk", "Cost of getting it wrong"],
  ["ratingOwnershipClarity", "Ownership clarity", "Is it clear who owns it?"],
  [
    "ratingEvaluationClarity",
    "Evaluation clarity",
    "Is it clear how to judge output?",
  ],
  [
    "ratingMaintenanceBurden",
    "Maintenance burden",
    "Effort to keep it working",
  ],
] as const;

export type RatingKey = (typeof RATING_FIELDS)[number][0];

/** Whether the success criterion has been met, as people read it. */
export const SUCCESS_MET_LABELS: Record<"yes" | "no" | "not_yet", string> = {
  yes: "Yes",
  no: "No",
  not_yet: "Not yet",
};

/**
 * The four gates that make a record "documented", in reading order. Used by
 * the proposal card, where a person confirms them before saving; the record
 * page spells the same four out longhand because each toggle there also
 * carries its own help text.
 */
export const GATE_FIELDS = [
  ["gateNamed", "Named workflow, clear description"],
  ["gateTool", "AI tool & approach identified"],
  ["gateAdoption", "Adoption beyond the author(s)"],
  ["gateOwner", "A named owner"],
] as const;

export type GateKey = (typeof GATE_FIELDS)[number][0];

// ---------------------------------------------------------------------------
// Status pipeline
// ---------------------------------------------------------------------------

export const STATUSES = [
  "in_discovery",
  "approved_by_fl",
  "under_construction",
  "in_testing",
  "launched",
  "qualified",
  "confirmed_positive_roi",
] as const;

export type UcStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<UcStatus, string> = {
  in_discovery: "In Discovery",
  approved_by_fl: "Approved by Functional Leader",
  under_construction: "Under Construction",
  in_testing: "In Testing",
  launched: "Launched",
  qualified: "Qualified",
  confirmed_positive_roi: "Confirmed Positive ROI",
};

export const STATUS_SHORT_LABELS: Record<UcStatus, string> = {
  in_discovery: "Discovery",
  approved_by_fl: "FL Approved",
  under_construction: "Building",
  in_testing: "Testing",
  launched: "Launched",
  qualified: "Qualified",
  confirmed_positive_roi: "ROI Confirmed",
};

/**
 * One plain sentence per stage, for the dashboard's pipeline legend. Written
 * for the person deciding where their record belongs, not for the program's
 * bookkeeping — the two counted stages still say what the counting means.
 */
export const STATUS_DESCRIPTIONS: Record<UcStatus, string> = {
  in_discovery: "Still being scoped — what the workflow is and whether it's worth building.",
  approved_by_fl: "The Functional Leader has signed off on building it.",
  under_construction: "Actively being built.",
  in_testing: "Being tested by one or more users.",
  launched: "In use by your team.",
  qualified: "Through the Qualified gate — counts toward the 45.",
  confirmed_positive_roi: "Measured, positive ROI confirmed — counts toward the 15.",
};

export function statusRank(s: UcStatus): number {
  return STATUSES.indexOf(s);
}

/**
 * Statuses a non-admin write may set directly. Qualified and Confirmed
 * Positive ROI are reachable only through the admin transition gate
 * (canSetStatus) — both record Kate's decisions and neither may be minted
 * on create. Deriving from STATUSES keeps this in step with the pipeline.
 */
export const SETTABLE_STATUSES = STATUSES.filter(
  (s): s is Exclude<UcStatus, "qualified" | "confirmed_positive_roi"> =>
    s !== "qualified" && s !== "confirmed_positive_roi",
);

export type SettableStatus = (typeof SETTABLE_STATUSES)[number];

/**
 * The role ladder, conceptually viewer < employee < contributor < admin.
 *
 * Array order is the Postgres enum order and deliberately NOT the ladder:
 * "employee" is appended last because `ALTER TYPE ... ADD VALUE` is
 * irreversible and inserting mid-list invites drizzle-kit into a type
 * recreation. Nothing reads ROLES ordinally — only STATUSES has a rank.
 *
 * - viewer      — signed in but not a Clever employee (an allow-listed guest).
 * - employee    — anyone at Clever. Logs and edits their own records.
 * - contributor — an AI Lead, i.e. on the ai_leads roster. Their records count
 *                 toward the program (see inProgramAtCreation).
 * - admin       — runs the program.
 */
export const ROLES = ["viewer", "contributor", "admin", "employee"] as const;

export type Role = (typeof ROLES)[number];

/**
 * Who may move a record from one status to another.
 * - Admins move any record from any status to any other. Nothing blocks
 *   Kate — not the record's contents, and not the shape of the graph.
 *   (Kate's call, relayed by Tom, 2026-08-16; the 15 stays a subset of the
 *   45 through the counting rules, not through a required path.)
 * - AI Leads and employees move records freely among the five pre-Qualified
 *   statuses (forward or back; people fix mistakes). Which *records* they may
 *   move is the separate question canMoveUseCaseStatus (permissions.ts)
 *   answers: leads any record, employees only their own.
 * - Anything entering or leaving Qualified or Confirmed Positive ROI is
 *   admin-only: both record Kate's decisions.
 */
export function canSetStatus(
  role: Role,
  from: UcStatus,
  to: UcStatus,
): boolean {
  if (role === "viewer") return false;
  if (from === to) return false;
  if (role === "admin") return true;
  return (
    statusRank(from) < statusRank("qualified") &&
    statusRank(to) < statusRank("qualified")
  );
}

// ---------------------------------------------------------------------------
// Documented gates & the ROI evidence checklist
// ---------------------------------------------------------------------------

export interface GateFields {
  gateNamed: boolean;
  gateTool: boolean;
  gateAdoption: boolean;
  gateOwner: boolean;
}

export function documentedGatesComplete(uc: GateFields): boolean {
  return uc.gateNamed && uc.gateTool && uc.gateAdoption && uc.gateOwner;
}

export interface RoiFields {
  successCriterion: string | null;
  successCriterionMet: "yes" | "no" | "not_yet";
  baselineMetric: string | null;
  baselineValue: number | null;
  postValue: number | null;
  measurementMethod: string | null;
  netImpactStatement: string | null;
  isPositive: boolean | null;
  roiStatus: "not_yet_measurable" | "in_progress" | "complete";
}

/**
 * ROI scoring is complete when: success criterion defined and met, baseline +
 * post measured with a stated (same) methodology, a net-impact statement
 * written, the outcome positive, and the record marked complete.
 */
export function roiComplete(uc: RoiFields): boolean {
  return Boolean(
    uc.successCriterion?.trim() &&
    uc.successCriterionMet === "yes" &&
    uc.baselineMetric?.trim() &&
    uc.baselineValue !== null &&
    uc.postValue !== null &&
    uc.measurementMethod?.trim() &&
    uc.netImpactStatement?.trim() &&
    uc.isPositive === true &&
    uc.roiStatus === "complete",
  );
}

/** What still stands between this record and complete ROI scoring. */
export function roiGaps(uc: RoiFields): string[] {
  const gaps: string[] = [];
  if (!uc.successCriterion?.trim()) gaps.push("No success criterion defined");
  else if (uc.successCriterionMet === "not_yet")
    gaps.push("Success criterion not yet evaluated");
  else if (uc.successCriterionMet === "no")
    gaps.push("Success criterion not met");
  if (!uc.baselineMetric?.trim() || uc.baselineValue === null)
    gaps.push("No baseline measurement");
  if (uc.postValue === null) gaps.push("No post-measurement");
  if (!uc.measurementMethod?.trim())
    gaps.push("Measurement method not stated (must match the baseline's)");
  if (!uc.netImpactStatement?.trim()) gaps.push("No net-impact statement");
  if (uc.isPositive === null) gaps.push("Net outcome not assessed");
  else if (uc.isPositive === false) gaps.push("Net outcome is not positive");
  if (uc.roiStatus !== "complete") gaps.push("ROI scoring not marked complete");
  return gaps;
}

/**
 * The record fields that get an audit row when they change — the ones that
 * move the program's numbers or its credit. Status has its own table
 * (status_changes); everything else on the worksheet changes silently,
 * deliberately: a trail drowning in text edits is a trail nobody reads.
 */
export const AUDITED_FIELDS = [
  "in_program",
  "owner",
  "authors",
  "elt_org",
  "gate_named",
  "gate_tool",
  "gate_adoption",
  "gate_owner",
] as const;
export type AuditedField = (typeof AUDITED_FIELDS)[number];

/** The 45 counts records at Qualified or better. */
export function countsTowardDocumented(status: UcStatus): boolean {
  return status === "qualified" || status === "confirmed_positive_roi";
}

/**
 * The 15 counts only records Kate has moved to Confirmed Positive ROI —
 * an explicit stage (with a mandatory annual-ROI note), never derived.
 * Every confirmed record also counts toward the 45.
 */
export function countsTowardRoi(status: UcStatus): boolean {
  return status === "confirmed_positive_roi";
}

/**
 * Program membership at creation: true when the record is an AI Lead's — its
 * OWNER holds a roster row, or, when no owner was named, the person logging
 * it is a lead.
 *
 * Ownership decides, not data entry. Most of the casebook was typed in by
 * whoever had the record in front of them — often an admin on a lead's
 * behalf — and who held the keyboard must not decide what counts. (Tom's
 * call, 2026-08-25, revising the same-day logged-by rule after the launch
 * backfill showed 16 of 17 records were admin-entered lead work.) An admin's
 * own unowned record is still community until an explicit gesture — the
 * toggle, or promotion past the Qualified gate, both admin-only — takes it
 * on.
 *
 * `ownerIsLead` is null when the record has no owner, or when the owner
 * never resolved to a directory person or account: an unlinked name cannot
 * be roster-checked without guessing, and credit must not guess.
 *
 * Stamped once into use_cases.in_program and never re-derived — not by a
 * later owner change, not by roster changes. A lead who leaves the roster
 * does not retroactively empty the casebook, and a community record does not
 * become program work because its owner was later added to the roster.
 */
export function inProgramAtCreation(
  ownerIsLead: boolean | null,
  actorRole: Role,
): boolean {
  return ownerIsLead ?? actorRole === "contributor";
}

/**
 * Both halves of "counts toward the 45": in the program, and Qualified or
 * better. The two rules above answer only "does this *status* count" — they
 * are used on their own where membership was already filtered in SQL. Use
 * these where you hold a record and want the whole truth.
 */
export function countsTowardProgramDocumented(uc: {
  inProgram: boolean;
  status: UcStatus;
}): boolean {
  return uc.inProgram && countsTowardDocumented(uc.status);
}

/** Both halves of "counts toward the 15". Every one of these is also in the 45. */
export function countsTowardProgramRoi(uc: {
  inProgram: boolean;
  status: UcStatus;
}): boolean {
  return uc.inProgram && countsTowardRoi(uc.status);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Calendar date in America/New_York for a given instant, as YYYY-MM-DD. */
export function etDateString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// ELT allocation
// ---------------------------------------------------------------------------

export interface EltOrgLike {
  id: string;
  name: string;
  target: number;
  departments: Department[];
}

/** Suggest the ELT org a use case counts toward, from its program department. */
export function suggestEltOrg<T extends EltOrgLike>(
  department: Department | null,
  orgs: T[],
): T | null {
  if (!department) return null;
  return orgs.find((o) => o.departments.includes(department)) ?? null;
}

/** Per-org targets should sum to 15 by design — warn (never block) when they don't. */
export function targetSumWarning(orgs: { target: number }[]): string | null {
  const sum = orgs.reduce((a, o) => a + o.target, 0);
  if (sum === TARGET_ROI) return null;
  return `Per-org targets sum to ${sum}, not ${TARGET_ROI}. The allocation is out of step with the program target.`;
}

// ---------------------------------------------------------------------------
// Attention flags
// ---------------------------------------------------------------------------

/** A record is stale when it has sat in its current status too long. */
export function isStale(
  lastStatusChangeAt: Date,
  now: Date,
  staleDays: number = DEFAULT_STALE_DAYS,
): boolean {
  return now.getTime() - lastStatusChangeAt.getTime() >= staleDays * DAY_MS;
}

export function daysInStatus(lastStatusChangeAt: Date, now: Date): number {
  return Math.floor((now.getTime() - lastStatusChangeAt.getTime()) / DAY_MS);
}

// ---------------------------------------------------------------------------
// Coach conversations
// ---------------------------------------------------------------------------

/**
 * What a Coach conversation was opened to do. Set once, from the door the
 * person came through, and never re-guessed from what the chat drifted into —
 * see `resolveChatIntent` in lib/ai/coach-intent.
 *
 * `discovery` is the odd one out: the other three are things the Coach helps
 * you finish, and discovery is a thing it helps you understand. It changes the
 * instructions, so it has to survive a reopen.
 */
export const COACH_INTENTS = [
  "wizard",
  "roi_review",
  "qa",
  "discovery",
] as const;

export type CoachIntent = (typeof COACH_INTENTS)[number];

/**
 * What currently prevents sensible progress on a fuzzy AI idea — the thing a
 * Discovery conversation is trying to name.
 *
 * Deliberately not a technical list. The dominant constraint on most AI work
 * at Clever is not model capability; it is that nobody has said what the
 * output must contain, or that the person who would act on it gets nothing
 * out of doing so. `unclear` is a real answer, and so is a checkpoint whose
 * next step is "work out which of these it is".
 */
export const DISCOVERY_CONSTRAINTS = [
  "unclear_requirements",
  "missing_information",
  "input_quality",
  "missing_context",
  "data_access",
  "permissions",
  "workflow",
  "technical_feasibility",
  "model_capability",
  "reliability",
  "evaluation",
  "human_adoption",
  "incentives",
  "ownership",
  "organizational_alignment",
  "scale",
  "cost",
  "security_privacy",
  "other",
  "unclear",
] as const;

export type DiscoveryConstraint = (typeof DISCOVERY_CONSTRAINTS)[number];

/** How each constraint reads on the checkpoint card. */
export const DISCOVERY_CONSTRAINT_LABELS: Record<DiscoveryConstraint, string> = {
  unclear_requirements: "Unclear requirements",
  missing_information: "Missing information",
  input_quality: "Input quality",
  missing_context: "Missing context",
  data_access: "Data availability or access",
  permissions: "Permissions",
  workflow: "Workflow ambiguity",
  technical_feasibility: "Technical feasibility",
  model_capability: "Model capability",
  reliability: "Reliability",
  evaluation: "Evaluation",
  human_adoption: "Human adoption",
  incentives: "Incentives",
  ownership: "Ownership",
  organizational_alignment: "Organizational alignment",
  scale: "Scale",
  cost: "Cost",
  security_privacy: "Security and privacy",
  other: "Something else",
  unclear: "Not yet clear",
};

export function isDiscoveryConstraint(
  value: string,
): value is DiscoveryConstraint {
  return (DISCOVERY_CONSTRAINTS as readonly string[]).includes(value);
}
