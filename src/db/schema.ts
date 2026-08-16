import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  APPROACHES,
  DEPARTMENTS,
  LINK_KINDS,
  ROLES,
  STATUSES,
} from "../lib/domain";

// ---------------------------------------------------------------------------
// Enums — value lists live in lib/domain (single source; the two cannot
// drift). Relative import because drizzle-kit bundles this file itself.
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ROLES);

/** The program's 7 groupings — not HRIS department names (those live on people.hrisDepartment). */
export const departmentEnum = pgEnum("department", DEPARTMENTS);

export const leadStateEnum = pgEnum("lead_state", [
  "assigned",
  "unassigned",
  "pending",
]);

export const ucStatusEnum = pgEnum("uc_status", STATUSES);

export const approachEnum = pgEnum("approach", APPROACHES);

export const ucSourceEnum = pgEnum("uc_source", [
  "form",
  "wizard",
  "notes",
  "api",
  "mcp",
]);

export const successMetEnum = pgEnum("success_met", ["yes", "no", "not_yet"]);

export const roiStatusEnum = pgEnum("roi_status", [
  "not_yet_measurable",
  "in_progress",
  "complete",
]);

/** What a Coach conversation was opened to do — set from the kickoff, never re-guessed. */
export const coachIntentEnum = pgEnum("coach_intent", [
  "wizard",
  "roi_review",
  "qa",
]);

/**
 * The life of a proposal, in four beats. A `proposed` row with no later row
 * for the same proposal is the fifth outcome — the human walked away — and is
 * counted by its absence rather than written.
 */
export const coachEventKindEnum = pgEnum("coach_event_kind", [
  "proposed",
  "accepted",
  "edited_then_saved",
  "dismissed",
]);

/** Why a notification exists, most specific first — see commentNotifications(). */
export const notificationKindEnum = pgEnum("notification_kind", [
  "comment",
  "reply",
  "mention",
  "link",
]);

/** How one workflow relates to another — see LINK_KINDS in lib/domain. */
export const linkKindEnum = pgEnum("link_kind", LINK_KINDS);

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  primaryEmail: text("primary_email").notNull().unique(),
  role: roleEnum("role").notNull().default("viewer"),
  image: text("image"),
  personId: uuid("person_id").references(() => people.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** One user can own multiple sign-in email aliases (e.g. Tom's clever.com + gmail). */
export const userEmails = pgTable("user_emails", {
  email: text("email").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Non-clever.com addresses allowed to sign in. */
export const allowedLoginEmails = pgTable("allowed_login_emails", {
  email: text("email").primaryKey(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Small key→JSON settings store (admin_emails, stale_days, …). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// People directory (org-chart snapshot; admin-editable, not live HR data)
// ---------------------------------------------------------------------------

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    title: text("title"),
    /** HRIS department naming from the snapshot — reference only; program views use departmentEnum. */
    hrisDepartment: text("hris_department"),
    site: text("site"),
    level: integer("level"),
    reportsToId: uuid("reports_to_id"),
    /** Raw manager name from the snapshot (kept even when unresolvable, e.g. parent-company CEO). */
    reportsToName: text("reports_to_name"),
    directReports: integer("direct_reports").notNull().default(0),
    totalReports: integer("total_reports").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("people_name_idx").on(t.name)],
);

// ---------------------------------------------------------------------------
// Program structure: teams, AI Leads roster, ELT orgs
// ---------------------------------------------------------------------------

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    department: departmentEnum("department").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("teams_name_dept_idx").on(t.name, t.department)],
);

export const aiLeads = pgTable("ai_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  /** True until Tom confirms the real address (seed uses firstname.lastname pattern). */
  emailUnverified: boolean("email_unverified").notNull().default(true),
  department: departmentEnum("department").notNull(),
  state: leadStateEnum("state").notNull().default("assigned"),
  personId: uuid("person_id").references(() => people.id),
  /** Set when the lead signs in and their login links to this roster row. */
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const aiLeadTeams = pgTable(
  "ai_lead_teams",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => aiLeads.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.teamId] })],
);

/** The allocation of the 15 ROI-quantified use cases across ELT owners. */
export const eltOrgs = pgTable("elt_orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  ownerPersonId: uuid("owner_person_id").references(() => people.id),
  target: integer("target").notNull().default(0),
  /** Program departments whose use cases roll up here. May be empty, and may hold several — Kate Schaff owns both CSS and Business Operations. */
  departments: departmentEnum("departments").array().notNull().default([]),
  /** ⚠ CONFIRM annotations and mapping caveats, surfaced in the admin UI. */
  note: text("note"),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// The core object: use cases
// ---------------------------------------------------------------------------

export const useCases = pgTable("use_cases", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identity & description
  title: text("title").notNull(),
  description: text("description").notNull(),
  department: departmentEnum("department"),
  teamId: uuid("team_id").references(() => teams.id),
  eltOrgId: uuid("elt_org_id").references(() => eltOrgs.id),

  // Owner — exactly one named person responsible going forward.
  ownerPersonId: uuid("owner_person_id").references(() => people.id),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  ownerName: text("owner_name"),

  aiTools: text("ai_tools").array().notNull().default([]),
  /** One workflow can be several at once — a prompt inside an automation, say. Empty means "not sure yet". */
  approaches: approachEnum("approaches").array().notNull().default([]),
  source: ucSourceEnum("source").notNull().default("form"),

  // Workflow discovery (intake worksheet)
  currentSteps: jsonb("current_steps").$type<string[]>().notNull().default([]),
  ratingFrequency: smallint("rating_frequency"),
  ratingPain: smallint("rating_pain"),
  ratingDataAvailability: smallint("rating_data_availability"),
  ratingRisk: smallint("rating_risk"),
  ratingOwnershipClarity: smallint("rating_ownership_clarity"),
  ratingEvaluationClarity: smallint("rating_evaluation_clarity"),
  ratingMaintenanceBurden: smallint("rating_maintenance_burden"),
  functionalLeaderSuccess: text("functional_leader_success"),

  // The four "Documented" gates
  gateNamed: boolean("gate_named").notNull().default(false),
  gateTool: boolean("gate_tool").notNull().default(false),
  gateAdoption: boolean("gate_adoption").notNull().default(false),
  adoptionEvidence: text("adoption_evidence"),
  gateOwner: boolean("gate_owner").notNull().default(false),

  // Success criterion (first-class)
  successCriterion: text("success_criterion"),
  successCriterionMet: successMetEnum("success_criterion_met")
    .notNull()
    .default("not_yet"),

  // ROI (the bar for the 15) — counts and rates, never dollars.
  baselineMetric: text("baseline_metric"),
  baselineValue: doublePrecision("baseline_value"),
  baselineUnit: text("baseline_unit"),
  postValue: doublePrecision("post_value"),
  measurementMethod: text("measurement_method"),
  netImpactStatement: text("net_impact_statement"),
  isPositive: boolean("is_positive"),
  roiStatus: roiStatusEnum("roi_status").notNull().default("not_yet_measurable"),
  revisitOn: date("revisit_on"),

  // Lifecycle
  status: ucStatusEnum("status").notNull().default("in_discovery"),
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  approvedById: uuid("approved_by_id").references(() => users.id),
  /** Set when Kate confirms positive ROI; cleared on demotion. The annual-ROI note lives in status_changes. */
  roiConfirmedAt: timestamp("roi_confirmed_at", { withTimezone: true }),
  roiConfirmedById: uuid("roi_confirmed_by_id").references(() => users.id),
  /** Reason from the most recent rejection at the Qualified gate; cleared on promotion. */
  rejectionReason: text("rejection_reason"),

  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** One or more builders credited on a use case. Linked to real people wherever possible. */
export const useCaseAuthors = pgTable("use_case_authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  useCaseId: uuid("use_case_id")
    .notNull()
    .references(() => useCases.id, { onDelete: "cascade" }),
  personId: uuid("person_id").references(() => people.id),
  userId: uuid("user_id").references(() => users.id),
  displayName: text("display_name").notNull(),
  position: integer("position").notNull().default(0),
});

/**
 * A link between two workflows. Any AI lead can make one, on any two records
 * — a lead who spots that two workflows are the same thing shouldn't have to
 * own either to say so. Stored once, on the side it was made from; the far
 * end renders the inverse label (LINK_INVERSE_LABELS).
 */
export const useCaseLinks = pgTable(
  "use_case_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUseCaseId: uuid("from_use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    toUseCaseId: uuid("to_use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    kind: linkKindEnum("kind").notNull(),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One link per pair. The reverse pair is rejected in the action, which can
    // say which relationship already exists; a constraint could only say no.
    uniqueIndex("use_case_link_pair_idx").on(t.fromUseCaseId, t.toUseCaseId),
    index("use_case_link_to_idx").on(t.toUseCaseId),
  ],
);

/** Full history of status movement — feeds the movement feed and What's New. */
export const statusChanges = pgTable("status_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  useCaseId: uuid("use_case_id")
    .notNull()
    .references(() => useCases.id, { onDelete: "cascade" }),
  /** Null when the record was created (birth event). */
  fromStatus: ucStatusEnum("from_status"),
  toStatus: ucStatusEnum("to_status").notNull(),
  changedById: uuid("changed_by_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Goals & adoption trends
// ---------------------------------------------------------------------------

export const pulseMetrics = pgTable("pulse_metrics", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  baselineValue: doublePrecision("baseline_value").notNull(),
  baselineDate: date("baseline_date").notNull(),
  targetValue: doublePrecision("target_value").notNull(),
  unit: text("unit").notNull().default("%"),
  sort: integer("sort").notNull().default(0),
});

export const pulseSnapshots = pgTable(
  "pulse_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricKey: text("metric_key")
      .notNull()
      .references(() => pulseMetrics.key, { onDelete: "cascade" }),
    value: doublePrecision("value").notNull(),
    takenOn: date("taken_on").notNull(),
    enteredById: uuid("entered_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("pulse_metric_date_idx").on(t.metricKey, t.takenOn)],
);

// ---------------------------------------------------------------------------
// What's New (admin-only weekly blog)
// ---------------------------------------------------------------------------

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Monday of the week the post covers (the prior week). Also the post's URL: /whats-new/<weekStart>. */
  weekStart: date("week_start").notNull().unique(),
  title: text("title").notNull(),
  /** Markdown body. */
  body: text("body").notNull(),
  model: text("model"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const postRevisionReasonEnum = pgEnum("post_revision_reason", [
  "regenerated",
  "edited",
]);

/**
 * The outgoing version of a post, captured whenever anything replaces its
 * text — append-only, written in the same transaction as the replacement.
 * No path may replace a post's words without a row landing here; nothing
 * an admin wrote (or a reader saw) is ever simply gone. No UI reads this
 * yet — it is insurance, queryable when someone needs it.
 */
export const postRevisions = pgTable(
  "post_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    model: text("model"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    /** What replaced this version: fresh model output, or a hand edit. */
    reason: postRevisionReasonEnum("reason").notNull(),
    /** Who did the replacing. The cron never replaces, so this is never system-null in practice. */
    replacedById: uuid("replaced_by_id").references(() => users.id),
    replacedAt: timestamp("replaced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("post_revision_post_idx").on(t.postId)],
);

// ---------------------------------------------------------------------------
// API access & AI accounting
// ---------------------------------------------------------------------------

export const pats = pgTable("pats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** SHA-256 of the token; the token itself is shown once at creation. */
  tokenHash: text("token_hash").notNull().unique(),
  /** First characters (e.g. "csp_ab12…") for recognizability in the UI. */
  tokenPrefix: text("token_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Coach conversations (per user). Messages stored as AI SDK UIMessage JSON. */
export const coachChats = pgTable("coach_chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  messages: jsonb("messages").notNull().default([]),
  /** Set from the kickoff on the first turn and never rewritten — what the
   *  person came to do, not what the conversation drifted into. */
  intent: coachIntentEnum("intent").notNull().default("qa"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * What the AI doors proposed and what the human did about it — the app's only
 * record of how well the Coach guesses. Admin-only to read (canViewCoachLearnings).
 *
 * Deliberately aggregate-grade: a row holds the proposed *fields* and the
 * human's correction, never the conversation. Admins learn that the Coach
 * guesses department wrong; they don't get to read anyone's transcript.
 *
 * `chatId` carries no foreign key on purpose. The proposal card renders while
 * the response is still streaming, which is before /api/coach writes the chat
 * row on stream end — a constraint here would lose the first event of every
 * conversation to a race.
 */
export const coachEvents = pgTable(
  "coach_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Correlates the four beats of one proposal. The tool call id for the
     *  wizard, a fresh uuid for the notes door. */
    proposalRef: text("proposal_ref").notNull(),
    chatId: uuid("chat_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: coachEventKindEnum("kind").notNull(),
    /** Which door proposed it — the wizard chat or the notes parser. */
    door: ucSourceEnum("door").notNull(),
    /** Set on accepted / edited_then_saved. Survives the record's deletion as null. */
    useCaseId: uuid("use_case_id").references(() => useCases.id, {
      onDelete: "set null",
    }),
    /** On `proposed`: the proposed UseCaseCreateInput. Otherwise empty. */
    proposed: jsonb("proposed").notNull().default({}),
    /** On `edited_then_saved`: FieldChange[] — what the human corrected. */
    diff: jsonb("diff").notNull().default([]),
    /** On `dismissed`: the human's one line on what was wrong. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("coach_events_proposal_idx").on(t.proposalRef),
    index("coach_events_created_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Comments & notifications
// ---------------------------------------------------------------------------

/**
 * Public discussion on a use case — visible to anyone who can see the record,
 * writable by every role including viewer (see canComment). Distinct from
 * status-change notes, which move or judge the record; comments do neither.
 * Threads nest to MAX_COMMENT_DEPTH levels (depth 0–5).
 */
export const useCaseComments = pgTable(
  "use_case_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    useCaseId: uuid("use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    /** Null for a top-level comment. */
    parentId: uuid("parent_id").references((): AnyPgColumn => useCaseComments.id, {
      onDelete: "cascade",
    }),
    /** 0-based, set server-side to parent.depth + 1; capped at MAX_COMMENT_DEPTH - 1. */
    depth: integer("depth").notNull().default(0),
    /** Markdown, rendered with the same react-markdown + remark-gfm stack as posts. */
    body: text("body").notNull(),
    /** Ids of @-mentioned users — the picker writes these; names are never parsed back out. */
    mentionedUserIds: uuid("mentioned_user_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set on edit; renders as "edited" beside the timestamp. */
    editedAt: timestamp("edited_at", { withTimezone: true }),
    /** Soft delete — a removed comment with replies leaves a placeholder. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("comment_use_case_idx").on(t.useCaseId)],
);

/**
 * In-app notifications. Email is deliberately deferred: with ~22 users,
 * page-load freshness is enough — there is no queue, no cron, no polling.
 * Rows are written inline by the action that causes them.
 *
 * Exactly one of commentId / linkId is set, and it says what the row is
 * about: a comment on the record, or a link made to it. useCaseId is always
 * the record the recipient is credited on — the one they land on.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Recipient. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    useCaseId: uuid("use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    /** Set for comment/reply/mention. */
    commentId: uuid("comment_id").references(() => useCaseComments.id, {
      onDelete: "cascade",
    }),
    /** Set for "link" — removing the link takes the notification with it. */
    linkId: uuid("link_id").references(() => useCaseLinks.id, {
      onDelete: "cascade",
    }),
    /** Who caused it. Never the recipient. */
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.readAt)],
);

// ---------------------------------------------------------------------------
// Product feedback — "this broke" and "this is awkward", captured where it
// happened rather than in a Slack thread nobody can find later.
// ---------------------------------------------------------------------------

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null only if the reporter's account is later removed. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** What they typed. */
    message: text("message").notNull(),
    /** The page they were on. */
    path: text("path"),
    /** Set when the report came from an error, so it reads as a bug report. */
    errorRef: text("error_ref"),
    errorDetail: text("error_detail"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);
