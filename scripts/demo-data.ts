/**
 * Dev-only demo data — clearly separated from real seeds. Inserts a spread of
 * sample use cases across departments and statuses (with backdated history so
 * the movement feed and attention flags have texture).
 *
 * Idempotent: demo records are keyed by title; existing ones are replaced.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db/client";
import {
  eltOrgs,
  people,
  statusChanges,
  teams,
  useCaseAuthors,
  useCaseUrls,
  useCases,
  users,
} from "../src/db/schema";
import type { Department, UcStatus, UrlKind } from "../src/lib/domain";

const db = getDb();

interface DemoUc {
  title: string;
  description: string;
  department: Department;
  team?: string;
  authors: string[];
  owner: string;
  aiTools: string[];
  approaches: ("prompt" | "automation" | "agentic")[];
  status: UcStatus;
  /**
   * Community submission — logged by someone outside the AI Leads roster.
   * Omitted means in-program, which is the majority.
   */
  community?: boolean;
  daysAgoLogged: number;
  /** [status, daysAgo] after birth, in order. */
  moves?: [UcStatus, number][];
  /** The mandatory annual-ROI note on the move to confirmed_positive_roi. */
  confirmedNote?: string;
  currentSteps?: string[];
  /** Where to find it — the record's "Where to find it" section. */
  urls?: { kind: UrlKind; label?: string | null; url: string }[];
  gates?: Partial<{
    gateNamed: boolean;
    gateTool: boolean;
    gateAdoption: boolean;
    gateOwner: boolean;
    adoptionEvidence: string;
  }>;
  success?: {
    criterion: string;
    met: "yes" | "no" | "not_yet";
  };
  roi?: Partial<{
    buildHours: number;
    baselineMetric: string;
    baselineValue: number;
    baselineUnit: string;
    postValue: number;
    measurementMethod: string;
    netImpactStatement: string;
    isPositive: boolean;
    roiStatus: "not_yet_measurable" | "in_progress" | "complete";
    revisitOn: string;
  }>;
  ratings?: Partial<{
    frequency: number;
    pain: number;
    data: number;
    risk: number;
    ownership: number;
    evaluation: number;
    maintenance: number;
  }>;
}

const DEMO: DemoUc[] = [
  // Two community submissions: logged by people outside the roster, so the
  // Community badge, the casebook filter, and the dashboard card all have
  // something to show in dev. Neither counts toward the 45 or the 15.
  {
    title: "Board-packet skim",
    description:
      "Summarizes the monthly board packet into a one-page brief with the three numbers that moved, so the exec staff meeting starts from the same read.",
    department: "finance_legal",
    team: "Finance",
    authors: ["Dana Whitfield"],
    owner: "Dana Whitfield",
    aiTools: ["Claude"],
    approaches: ["prompt"],
    community: true,
    status: "launched",
    daysAgoLogged: 9,
    moves: [
      ["under_construction", 7],
      ["launched", 2],
    ],
  },
  {
    title: "Onboarding FAQ answerer",
    description:
      "Answers new-hire questions from the internal handbook in Slack, with a link to the source section so people can check it.",
    department: "people",
    team: "POps",
    authors: ["Renee Alvarado"],
    owner: "Renee Alvarado",
    aiTools: ["Claude"],
    approaches: ["prompt", "automation"],
    community: true,
    status: "in_testing",
    daysAgoLogged: 4,
    moves: [["in_testing", 1]],
  },
  {
    title: "Support macro drafter",
    description:
      "Drafts first-pass replies for common district support tickets from the knowledge base, which reps review and send. Cuts the blank-page problem on the 20 highest-volume intents.",
    department: "css",
    team: "Customer Support",
    authors: ["Katie Clarkson", "Arraine Siefert"],
    owner: "Katie Clarkson",
    aiTools: ["Claude"],
    approaches: ["prompt"],
    urls: [
      { kind: "live", url: "https://support.example.com/macro-drafter" },
      { kind: "claude", url: "https://claude.ai/project/demo-macro-drafter" },
    ],
    status: "confirmed_positive_roi",
    daysAgoLogged: 30,
    moves: [
      ["under_construction", 26],
      ["in_testing", 20],
      ["launched", 14],
      ["qualified", 4],
      ["confirmed_positive_roi", 1],
    ],
    confirmedNote:
      "Annual ROI: ~1,100 rep-hours saved per year (4.2 hours per ticket × top-20 intents volume), CSAT flat. Method: Zendesk explore, trailing 4 weeks, annualized.",
    currentSteps: [
      "Rep reads the incoming ticket",
      "Searches the KB for the matching article",
      "Writes a reply from scratch",
      "Peer review for tone on tricky districts",
      "Send and tag the ticket",
    ],
    gates: {
      gateNamed: true,
      gateTool: true,
      gateAdoption: true,
      gateOwner: true,
      adoptionEvidence:
        "12 reps across both support pods use it daily; usage visible in the shared prompt library analytics.",
    },
    success: {
      criterion: "Median first-response time under 2 hours on the top-20 intents",
      met: "yes",
    },
    roi: {
      buildHours: 12,
      baselineMetric: "Median first-response time (top-20 intents)",
      baselineValue: 5.8,
      baselineUnit: "hours",
      postValue: 1.6,
      measurementMethod:
        "Zendesk explore report, trailing 4 weeks, same intent set and business-hours window",
      netImpactStatement:
        "First responses on the highest-volume tickets now land in under a quarter of the previous time, with CSAT flat.",
      isPositive: true,
      roiStatus: "complete",
    },
    ratings: { frequency: 5, pain: 4, data: 4, risk: 2, ownership: 5, evaluation: 4, maintenance: 2 },
  },
  {
    title: "Sprint retro summarizer",
    description:
      "Agentic workflow that reads the retro board and drafts themes, action items, and owners into the team doc before the meeting ends.",
    department: "engineering",
    team: "Engineering",
    authors: ["Vamsi Chunduru", "Garrett Gordon"],
    owner: "Vamsi Chunduru",
    aiTools: ["Claude Code", "Linear MCP"],
    approaches: ["agentic"],
    urls: [
      { kind: "github", url: "https://github.com/clever-demo/retro-summarizer" },
      {
        kind: "other",
        label: "Runbook",
        url: "https://example.com/docs/retro-summarizer",
      },
    ],
    status: "qualified",
    daysAgoLogged: 27,
    moves: [
      ["in_testing", 18],
      ["launched", 12],
      ["qualified", 2],
    ],
    gates: {
      gateNamed: true,
      gateTool: true,
      gateAdoption: true,
      gateOwner: true,
      adoptionEvidence: "Three squads run it every sprint; pinned in #eng-rituals.",
    },
    success: {
      criterion: "Retro writeups published same-day for every sprint",
      met: "yes",
    },
    roi: {
      buildHours: 25,
      baselineMetric: "Retro writeups published same-day",
      baselineValue: 40,
      baselineUnit: "%",
      postValue: 100,
      measurementMethod: "Sprint-doc timestamps over 6 sprints, same squads",
      netImpactStatement:
        "Every retro now ships its writeup the same day, and action items stopped going missing between sprints.",
      isPositive: true,
      roiStatus: "complete",
    },
  },
  {
    title: "Contract clause summarizer",
    description:
      "Summarizes inbound district contracts against Clever's standard positions and flags the clauses Legal actually needs to read.",
    department: "finance_legal",
    team: "Legal",
    authors: ["Wendy Yu"],
    owner: "Wendy Yu",
    aiTools: ["Claude"],
    approaches: ["prompt"],
    status: "qualified",
    daysAgoLogged: 24,
    moves: [
      ["launched", 10],
      ["qualified", 3],
    ],
    gates: { gateNamed: true, gateTool: true, gateAdoption: true, gateOwner: true, adoptionEvidence: "Both counsel and the contracts manager use it on every inbound redline." },
    success: {
      criterion: "Turnaround on standard redlines under 3 business days",
      met: "not_yet",
    },
    roi: {
      baselineMetric: "Median redline turnaround",
      baselineValue: 6,
      baselineUnit: "business days",
      measurementMethod: "Contract log dates, trailing quarter",
      roiStatus: "in_progress",
    },
  },
  {
    title: "Onboarding call-notes to CRM",
    description:
      "Automation that turns onboarding call transcripts into structured CRM field updates and a follow-up checklist for the specialist to confirm.",
    department: "css",
    team: "Clever Core Onboarding",
    authors: ["Sinclair Blackmon"],
    owner: "Sinclair Blackmon",
    aiTools: ["Claude", "Zapier"],
    approaches: ["automation"],
    status: "launched",
    daysAgoLogged: 21,
    moves: [
      ["under_construction", 17],
      ["in_testing", 10],
      ["launched", 6],
    ],
    gates: { gateNamed: true, gateTool: true, gateAdoption: true, gateOwner: true, adoptionEvidence: "4 of 6 onboarding specialists run it on every call." },
    success: {
      criterion: "CRM updated within 24h of every onboarding call",
      met: "not_yet",
    },
    roi: { roiStatus: "not_yet_measurable", revisitOn: "2026-09-15" },
  },
  {
    title: "RFP question-bank answerer",
    description:
      "Drafts answers to repeat RFP questions from the approved answer bank, with citations back to the source doc for review.",
    department: "business_operations",
    team: "Business Operations",
    authors: ["Alex Armstead", "Darcy Grabski"],
    owner: "Alex Armstead",
    aiTools: ["Claude", "Google Drive"],
    approaches: ["prompt"],
    status: "launched",
    daysAgoLogged: 19,
    moves: [["launched", 8]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: false, gateOwner: true },
    success: {
      criterion: "First-draft RFP responses in under a day for standard bids",
      met: "not_yet",
    },
    roi: { roiStatus: "in_progress", baselineMetric: "Days to first full RFP draft", baselineValue: 4, baselineUnit: "days", measurementMethod: "RFP tracker timestamps, trailing 8 bids" },
  },
  {
    title: "Campaign brief generator",
    description:
      "Turns a product-marketing one-pager into channel-specific campaign briefs (email, social, in-app) in the team's voice.",
    department: "mss",
    team: "Marketing",
    authors: ["Evelyn Wong"],
    owner: "Evelyn Wong",
    aiTools: ["Claude"],
    approaches: ["prompt"],
    status: "launched",
    daysAgoLogged: 16,
    moves: [["launched", 5]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: true, gateOwner: true, adoptionEvidence: "Growth and lifecycle marketers both pull briefs from it weekly." },
    success: { criterion: "Campaign brief cycle time under 2 days", met: "not_yet" },
    roi: { roiStatus: "not_yet_measurable", revisitOn: "2026-09-01" },
  },
  {
    title: "Candidate screen summarizer",
    description:
      "Summarizes recruiter screens into the structured debrief template, so hiring managers read a consistent one-pager instead of raw notes.",
    department: "people",
    team: "Talent Acquisition",
    authors: ["Jen Kampf", "Lizzy Dawson"],
    owner: "Jen Kampf",
    aiTools: ["Claude", "Ashby"],
    approaches: ["prompt"],
    status: "in_testing",
    daysAgoLogged: 13,
    moves: [["in_testing", 4]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: false, gateOwner: true },
    success: { criterion: "Debrief ready before the panel meets for every onsite", met: "not_yet" },
  },
  {
    title: "Integration error triager",
    description:
      "Agent that clusters overnight sync errors, matches them to known runbooks, and drafts the district-facing explanation for engineer review.",
    department: "css",
    team: "Integration Engineering",
    authors: ["Victoria Crow Dog", "Meghana Gangadharswami Balihallimath"],
    owner: "Victoria Crow Dog",
    aiTools: ["Claude Code"],
    approaches: ["agentic"],
    status: "in_testing",
    daysAgoLogged: 11,
    moves: [["in_testing", 3]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: false, gateOwner: true },
    success: { criterion: "Overnight error queue triaged before 9am ET daily", met: "not_yet" },
  },
  {
    title: "Design-crit notetaker",
    description:
      "Captures design critique discussions and turns them into decision logs linked to the Figma frames discussed.",
    department: "product_design",
    team: "Product & Design",
    authors: ["Justine Edrozo"],
    owner: "Justine Edrozo",
    aiTools: ["Granola", "Claude"],
    approaches: ["automation"],
    status: "under_construction",
    daysAgoLogged: 9,
    moves: [["under_construction", 2]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: false, gateOwner: true },
  },
  {
    title: "Board-pack first drafts",
    description:
      "Drafts the recurring sections of the monthly business review from the analytics warehouse, leaving analysts to write the judgment calls.",
    department: "business_operations",
    team: "Business Analytics",
    authors: ["Lotte Petersen-Buckley"],
    owner: "Lotte Petersen-Buckley",
    aiTools: ["Claude", "Hex"],
    approaches: ["automation"],
    status: "under_construction",
    daysAgoLogged: 8,
    moves: [["under_construction", 3]],
    gates: { gateNamed: true, gateTool: true, gateAdoption: false, gateOwner: true },
  },
  {
    title: "Renewal-risk digest",
    description:
      "Weekly digest that reads success-manager notes and flags districts drifting toward non-renewal, with the evidence quoted.",
    department: "mss",
    team: "School Success – Global",
    authors: ["Lauren Raulerson"],
    owner: "Lauren Raulerson",
    aiTools: ["Claude", "Salesforce"],
    approaches: ["automation"],
    status: "approved_by_fl",
    daysAgoLogged: 7,
    moves: [["approved_by_fl", 2]],
    gates: { gateNamed: true, gateTool: false, gateAdoption: false, gateOwner: true },
  },
  {
    title: "Sales-call objection miner",
    description:
      "Mines Gong transcripts for new objections by segment and drafts the counter-talk-track for enablement review.",
    department: "mss",
    team: "School Partnerships – Domestic",
    authors: ["Melissa Pevitz"],
    owner: "Melissa Pevitz",
    aiTools: ["Gong", "Claude"],
    approaches: ["prompt"],
    status: "in_discovery",
    daysAgoLogged: 32,
    gates: { gateNamed: true, gateTool: false, gateAdoption: false, gateOwner: false },
  },
  {
    title: "Invoice-matching assistant",
    description:
      "Matches vendor invoices to POs and surfaces the mismatches with a suggested resolution for the accountant to approve.",
    department: "finance_legal",
    team: "Finance",
    authors: ["Kenton Lu"],
    owner: "Kenton Lu",
    aiTools: ["Claude"],
    approaches: ["automation"],
    status: "in_discovery",
    daysAgoLogged: 5,
    gates: { gateNamed: true, gateTool: false, gateAdoption: false, gateOwner: false },
  },
  {
    title: "Pre-sales architecture explainer",
    description:
      "Generates district-specific integration architecture explanations from the standard diagrams and the district's stack answers.",
    department: "css",
    team: "Technical Pre-sales",
    authors: ["David McGeary"],
    owner: "David McGeary",
    aiTools: ["Claude"],
    approaches: ["prompt"],
    status: "in_discovery",
    daysAgoLogged: 3,
    gates: { gateNamed: true, gateTool: false, gateAdoption: false, gateOwner: false },
  },
];

async function main() {
  console.log("Loading demo data (dev only)…");

  const [tom] = await db
    .select()
    .from(users)
    .where(eq(users.primaryEmail, "tom.leger@clever.com"));
  if (!tom) throw new Error("Run db:seed first.");

  const allPeople = await db.select().from(people);
  const personByName = new Map(allPeople.map((p) => [p.name, p]));
  const allTeams = await db.select().from(teams);
  const allOrgs = await db.select().from(eltOrgs);
  const orgByDept = new Map<string, string>();
  for (const o of allOrgs)
    for (const d of o.departments) orgByDept.set(d, o.id);

  // Replace any existing demo records (idempotent by title).
  const titles = DEMO.map((d) => d.title);
  const existing = await db
    .select({ id: useCases.id })
    .from(useCases)
    .where(inArray(useCases.title, titles));
  if (existing.length) {
    await db.delete(useCases).where(
      inArray(
        useCases.id,
        existing.map((e) => e.id),
      ),
    );
    console.log(`· replaced ${existing.length} existing demo records`);
  }

  const now = Date.now();
  const day = 86_400_000;

  for (const d of DEMO) {
    const team = allTeams.find(
      (t) => t.name === d.team && t.department === d.department,
    );
    const ownerPerson = personByName.get(d.owner);
    const loggedAt = new Date(now - d.daysAgoLogged * day);

    // Users linked to author people (so contributor edit rights work in dev).
    const authorRefs = d.authors.map((name) => {
      const p = personByName.get(name);
      return { personId: p?.id ?? null, displayName: name };
    });
    const linkedUsers = await db
      .select({ id: users.id, personId: users.personId })
      .from(users)
      .where(
        inArray(
          users.personId,
          authorRefs.map((a) => a.personId).filter((x): x is string => !!x),
        ),
      );
    const userByPerson = new Map(linkedUsers.map((u) => [u.personId!, u.id]));
    const ownerUser = ownerPerson ? userByPerson.get(ownerPerson.id) : null;

    const [created] = await db
      .insert(useCases)
      .values({
        title: d.title,
        description: d.description,
        department: d.department,
        teamId: team?.id ?? null,
        eltOrgId: orgByDept.get(d.department) ?? null,
        ownerPersonId: ownerPerson?.id ?? null,
        ownerUserId: ownerUser ?? null,
        ownerName: d.owner,
        aiTools: d.aiTools,
        approaches: d.approaches,
        source: "form",
        inProgram: !d.community,
        currentSteps: d.currentSteps ?? [],
        ratingFrequency: d.ratings?.frequency ?? null,
        ratingPain: d.ratings?.pain ?? null,
        ratingDataAvailability: d.ratings?.data ?? null,
        ratingRisk: d.ratings?.risk ?? null,
        ratingOwnershipClarity: d.ratings?.ownership ?? null,
        ratingEvaluationClarity: d.ratings?.evaluation ?? null,
        ratingMaintenanceBurden: d.ratings?.maintenance ?? null,
        gateNamed: d.gates?.gateNamed ?? false,
        gateTool: d.gates?.gateTool ?? false,
        gateAdoption: d.gates?.gateAdoption ?? false,
        adoptionEvidence: d.gates?.adoptionEvidence ?? null,
        gateOwner: d.gates?.gateOwner ?? false,
        successCriterion: d.success?.criterion ?? null,
        successCriterionMet: d.success?.met ?? "not_yet",
        buildHours: d.roi?.buildHours ?? null,
        baselineMetric: d.roi?.baselineMetric ?? null,
        baselineValue: d.roi?.baselineValue ?? null,
        baselineUnit: d.roi?.baselineUnit ?? null,
        postValue: d.roi?.postValue ?? null,
        measurementMethod: d.roi?.measurementMethod ?? null,
        netImpactStatement: d.roi?.netImpactStatement ?? null,
        isPositive: d.roi?.isPositive ?? null,
        roiStatus: d.roi?.roiStatus ?? "not_yet_measurable",
        revisitOn: d.roi?.revisitOn ?? null,
        status: d.status,
        qualifiedAt:
          d.status === "qualified" || d.status === "confirmed_positive_roi"
            ? new Date(now - (d.moves?.find((m) => m[0] === "qualified")?.[1] ?? 1) * day)
            : null,
        approvedById:
          d.status === "qualified" || d.status === "confirmed_positive_roi"
            ? tom.id
            : null,
        roiConfirmedAt:
          d.status === "confirmed_positive_roi"
            ? new Date(
                now -
                  (d.moves?.find((m) => m[0] === "confirmed_positive_roi")?.[1] ??
                    1) *
                    day,
              )
            : null,
        roiConfirmedById: d.status === "confirmed_positive_roi" ? tom.id : null,
        // Every demo row is created by the seeded admin because that user is
        // guaranteed to exist; the real builders are in `authors`. That is why
        // in_program is set explicitly above rather than derived from this —
        // the fixture depicts leads' work, not Tom's.
        createdById: tom.id,
        createdAt: loggedAt,
      })
      .returning();

    await db.insert(useCaseAuthors).values(
      authorRefs.map((a, i) => ({
        useCaseId: created.id,
        personId: a.personId,
        userId: a.personId ? userByPerson.get(a.personId) ?? null : null,
        displayName: a.displayName,
        position: i,
      })),
    );

    if (d.urls?.length) {
      await db.insert(useCaseUrls).values(
        d.urls.map((u, i) => ({
          useCaseId: created.id,
          kind: u.kind,
          label: u.label ?? null,
          url: u.url,
          position: i,
        })),
      );
    }

    const changes: (typeof statusChanges.$inferInsert)[] = [
      {
        useCaseId: created.id,
        fromStatus: null,
        toStatus: d.moves?.length ? "in_discovery" : d.status,
        changedById: tom.id,
        createdAt: loggedAt,
      },
    ];
    let prev: UcStatus = "in_discovery";
    for (const [to, daysAgo] of d.moves ?? []) {
      changes.push({
        useCaseId: created.id,
        fromStatus: prev,
        toStatus: to,
        changedById: tom.id,
        note:
          to === "confirmed_positive_roi" ? (d.confirmedNote ?? null) : null,
        createdAt: new Date(now - daysAgo * day),
      });
      prev = to;
    }
    await db.insert(statusChanges).values(changes);
  }

  console.log(`· inserted ${DEMO.length} demo use cases`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
