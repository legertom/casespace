/**
 * Idempotent real seeds: admins, people directory (org-chart snapshot),
 * teams, AI Leads roster, ELT orgs + targets, pulse goals with June baselines.
 * Safe to run repeatedly. Demo/sample use cases live in demo-data.ts, not here.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/db/client";
import {
  aiLeads,
  aiLeadTeams,
  allowedLoginEmails,
  appSettings,
  eltOrgs,
  people,
  pulseMetrics,
  pulseSnapshots,
  teams,
  userEmails,
  users,
} from "../src/db/schema";
import type { Department } from "../src/lib/domain";

const db = getDb();

interface OrgChartRow {
  name: string;
  title: string;
  department: string;
  site: string;
  level: number;
  reportsTo: string;
  directReports: number;
  totalReports: number;
}

function emailSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

async function seedSettings() {
  const settings: [string, unknown][] = [
    [
      "admin_emails",
      ["tom.leger@clever.com", "tomleger@gmail.com", "kate.schaff@clever.com"],
    ],
    ["stale_days", 21],
  ];
  for (const [key, value] of settings) {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoNothing({ target: appSettings.key });
  }
  await db
    .insert(allowedLoginEmails)
    .values({ email: "tomleger@gmail.com", note: "Tom's personal alias" })
    .onConflictDoNothing();
  console.log("· settings + login allowlist");
}

async function upsertUser(name: string, primaryEmail: string, role: "admin") {
  const [u] = await db
    .insert(users)
    .values({ name, primaryEmail, role })
    .onConflictDoUpdate({
      target: users.primaryEmail,
      set: { name, role },
    })
    .returning();
  return u;
}

async function seedAdmins() {
  const tom = await upsertUser("Tom Leger", "tom.leger@clever.com", "admin");
  const kate = await upsertUser("Kate Schaff", "kate.schaff@clever.com", "admin");
  const aliases: [string, string][] = [
    ["tom.leger@clever.com", tom.id],
    ["tomleger@gmail.com", tom.id],
    ["kate.schaff@clever.com", kate.id],
  ];
  for (const [email, userId] of aliases) {
    await db
      .insert(userEmails)
      .values({ email, userId })
      .onConflictDoUpdate({ target: userEmails.email, set: { userId } });
  }
  console.log("· admins: Tom (2 aliases) + Kate");
  return { tom, kate };
}

async function seedPeople() {
  const raw = readFileSync(
    path.join(process.cwd(), "data/casebook-v2-org-chart.json"),
    "utf8",
  );
  const rows: OrgChartRow[] = JSON.parse(raw);

  for (const r of rows) {
    await db
      .insert(people)
      .values({
        name: r.name,
        title: r.title,
        hrisDepartment: r.department,
        site: r.site,
        level: r.level,
        reportsToName: r.reportsTo || null,
        directReports: r.directReports,
        totalReports: r.totalReports,
      })
      .onConflictDoUpdate({
        target: people.name,
        set: {
          title: r.title,
          hrisDepartment: r.department,
          site: r.site,
          level: r.level,
          reportsToName: r.reportsTo || null,
          directReports: r.directReports,
          totalReports: r.totalReports,
        },
      });
  }

  // Second pass: resolve manager names to ids. Unresolvable names (the
  // parent-company CEO) keep reportsToName only.
  await db.execute(sql`
    update people p set reports_to_id = m.id
    from people m
    where p.reports_to_name = m.name and p.reports_to_id is distinct from m.id
  `);

  const count = await db.$count(people);
  console.log(`· people directory: ${count} rows`);
  return rows.length;
}

async function linkAdminPeople(tomId: string, kateId: string) {
  // Tom's directory row is spelled "Tom Léger" — link explicitly.
  const [tomPerson] = await db
    .select()
    .from(people)
    .where(eq(people.name, "Tom Léger"));
  const [katePerson] = await db
    .select()
    .from(people)
    .where(eq(people.name, "Kate Schaff"));
  if (tomPerson)
    await db
      .update(users)
      .set({ personId: tomPerson.id })
      .where(eq(users.id, tomId));
  if (katePerson)
    await db
      .update(users)
      .set({ personId: katePerson.id })
      .where(eq(users.id, kateId));
  console.log("· linked admin accounts to directory rows");
}

const ROSTER: { name: string; department: Department; teams: string[] }[] = [
  { name: "Alex Armstead", department: "business_operations", teams: ["Business Operations"] },
  { name: "Lotte Petersen-Buckley", department: "business_operations", teams: ["Business Analytics"] },
  { name: "Yowan Ramchoreeter", department: "product_design", teams: ["Product & Design"] },
  { name: "Justine Edrozo", department: "product_design", teams: ["Product & Design"] },
  { name: "Vamsi Chunduru", department: "engineering", teams: ["Engineering"] },
  { name: "Jen Kampf", department: "people", teams: ["POps", "Talent Acquisition"] },
  { name: "David McGeary", department: "css", teams: ["Technical Pre-sales"] },
  { name: "Victoria Crow Dog", department: "css", teams: ["Integration Engineering"] },
  { name: "Meghana Gangadharswami Balihallimath", department: "css", teams: ["Integration Engineering"] },
  { name: "Dotun Oni", department: "css", teams: ["Partner Engineering"] },
  { name: "Sinclair Blackmon", department: "css", teams: ["Clever Core Onboarding"] },
  { name: "Jonathan Boutin", department: "css", teams: ["Clever+ Onboarding"] },
  { name: "Marley Koschel", department: "css", teams: ["Customer Education"] },
  { name: "Arraine Siefert", department: "css", teams: ["Customer Support"] },
  { name: "Katie Clarkson", department: "css", teams: ["Customer Support"] },
  { name: "Shaun Hudgins", department: "css", teams: ["Technical Account Managers"] },
  { name: "Melissa Pevitz", department: "mss", teams: ["School Partnerships – Domestic"] },
  { name: "Aerin Bowers", department: "mss", teams: ["School Partnerships – International"] },
  { name: "Lauren Raulerson", department: "mss", teams: ["School Success – Global"] },
  { name: "Zachary Gladnick", department: "mss", teams: ["App Partnerships"] },
  { name: "Jennifer Pluma", department: "mss", teams: ["App Success"] },
  { name: "Evelyn Wong", department: "mss", teams: ["Marketing"] },
  { name: "Kenton Lu", department: "finance_legal", teams: ["Finance"] },
  { name: "Wendy Yu", department: "finance_legal", teams: ["Legal"] },
];

async function seedTeamsAndRoster() {
  const teamPairs = new Map<string, { name: string; department: Department }>();
  for (const lead of ROSTER)
    for (const t of lead.teams)
      teamPairs.set(`${lead.department}::${t}`, {
        name: t,
        department: lead.department,
      });

  const teamIds = new Map<string, string>();
  for (const t of teamPairs.values()) {
    const [row] = await db
      .insert(teams)
      .values(t)
      .onConflictDoUpdate({
        target: [teams.name, teams.department],
        set: { name: t.name },
      })
      .returning();
    teamIds.set(`${t.department}::${t.name}`, row.id);
  }

  let missingPerson = 0;
  for (const lead of ROSTER) {
    const [person] = await db
      .select()
      .from(people)
      .where(eq(people.name, lead.name));
    if (!person) missingPerson++;
    const email = `${emailSlug(lead.name)}@clever.com`;
    const [row] = await db
      .insert(aiLeads)
      .values({
        name: lead.name,
        email,
        emailUnverified: true,
        department: lead.department,
        state: "assigned",
        personId: person?.id ?? null,
      })
      .onConflictDoUpdate({
        target: aiLeads.email,
        set: {
          name: lead.name,
          department: lead.department,
          personId: person?.id ?? null,
        },
      })
      .returning();
    for (const t of lead.teams) {
      await db
        .insert(aiLeadTeams)
        .values({
          leadId: row.id,
          teamId: teamIds.get(`${lead.department}::${t}`)!,
        })
        .onConflictDoNothing();
    }
  }
  console.log(
    `· teams: ${teamPairs.size}, AI Leads: ${ROSTER.length} (emails placeholder-flagged)${missingPerson ? ` — ${missingPerson} not in directory` : ""}`,
  );
}

const ELT_ORGS: {
  name: string;
  person: string | null;
  target: number;
  departments: Department[];
  note: string | null;
  sort: number;
}[] = [
  { name: "Amy Lee (CFO)", person: "Amy Lee", target: 2, departments: ["finance_legal"], note: null, sort: 1 },
  { name: "Eric Krugler (CTO)", person: "Eric Krugler", target: 3, departments: ["engineering"], note: null, sort: 2 },
  { name: "Jamie Reffell (CPO)", person: "Jamie Reffell", target: 2, departments: ["product_design"], note: null, sort: 3 },
  { name: "Phillip Mikula (CRO)", person: "Phillip Mikula", target: 3, departments: ["mss"], note: null, sort: 4 },
  {
    name: "Kate Schaff",
    person: "Kate Schaff",
    target: 3,
    departments: [],
    note: "Confirm semantics: Kate's own sponsored use cases, or a floating program-wide bucket? Modeled as a program-wide bucket (no department mapping) until confirmed.",
    sort: 5,
  },
  {
    name: "Trish Sparks (CEO)",
    person: "Trish Sparks",
    target: 2,
    departments: ["people"],
    note: "Slide says “POps/GA” — mapped to the People grouping here; confirm. CSS, Business Operations, and Business Analytics deliberately remain unmapped until Tom/Kate confirm owners.",
    sort: 6,
  },
];

async function seedEltOrgs() {
  for (const o of ELT_ORGS) {
    const [person] = o.person
      ? await db.select().from(people).where(eq(people.name, o.person))
      : [undefined];
    await db
      .insert(eltOrgs)
      .values({
        name: o.name,
        ownerPersonId: person?.id ?? null,
        target: o.target,
        departments: o.departments,
        note: o.note,
        sort: o.sort,
      })
      .onConflictDoUpdate({
        target: eltOrgs.name,
        set: {
          ownerPersonId: person?.id ?? null,
          target: o.target,
          departments: o.departments,
          note: o.note,
          sort: o.sort,
        },
      });
  }
  console.log(`· ELT orgs: ${ELT_ORGS.length} (targets sum ${ELT_ORGS.reduce((a, o) => a + o.target, 0)})`);
}

const PULSE = [
  { key: "ee_daily", label: "Employees using AI daily", baselineValue: 56, targetValue: 85, sort: 1 },
  { key: "mgr_daily", label: "Managers, SLT & ELT using AI daily", baselineValue: 74, targetValue: 100, sort: 2 },
  { key: "readiness", label: "Employees reporting AI readiness for their role", baselineValue: 83, targetValue: 90, sort: 3 },
];

async function seedPulse() {
  const baselineDate = "2026-06-30"; // the June pulse survey
  for (const m of PULSE) {
    await db
      .insert(pulseMetrics)
      .values({ ...m, baselineDate, unit: "%" })
      .onConflictDoUpdate({
        target: pulseMetrics.key,
        set: { ...m, baselineDate, unit: "%" },
      });
    await db
      .insert(pulseSnapshots)
      .values({ metricKey: m.key, value: m.baselineValue, takenOn: baselineDate })
      .onConflictDoNothing();
  }
  console.log("· pulse goals: 3 metrics with June baselines");
}

async function main() {
  console.log("Seeding casespace…");
  await seedSettings();
  const { tom, kate } = await seedAdmins();
  await seedPeople();
  await linkAdminPeople(tom.id, kate.id);
  await seedTeamsAndRoster();
  await seedEltOrgs();
  await seedPulse();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
