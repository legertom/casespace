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
    // Seeded so the documented `update … where key='open_to_employees'`
    // matches a row — an UPDATE against a missing key no-ops silently.
    ["open_to_employees", true],
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
  const kate = await upsertUser(
    "Kate Schaff",
    "kate.schaff@clever.com",
    "admin",
  );
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

/**
 * Emails confirmed against the "AI Leads" Google Group (Aug 2026) — note the
 * handful that differ from the first.last pattern (jennifer.kampf,
 * meghana.balihallimath, zach.gladnick). Patricia Henriquez appears in the
 * group and joins the roster.
 *
 * Victoria Crow Dog does not. She was absent from the group, and Tom
 * confirmed in Aug 2026 that she is no longer an AI lead, so a fresh seed
 * no longer creates her here. She stays in the directory and on the records
 * she authored — off the roster is not off the team.
 */
const ROSTER: {
  name: string;
  department: Department;
  teams: string[];
  email?: string;
  emailUnverified?: boolean;
}[] = [
  {
    name: "Alex Armstead",
    department: "business_operations",
    teams: ["Business Operations"],
    email: "alex.armstead@clever.com",
  },
  {
    name: "Lotte Petersen-Buckley",
    department: "business_operations",
    teams: ["Business Analytics"],
    email: "lotte.petersen-buckley@clever.com",
  },
  {
    name: "Yowan Ramchoreeter",
    department: "product_design",
    teams: ["Product & Design"],
    email: "yowan.ramchoreeter@clever.com",
  },
  {
    name: "Justine Edrozo",
    department: "product_design",
    teams: ["Product & Design"],
    email: "justine.edrozo@clever.com",
  },
  {
    name: "Vamsi Chunduru",
    department: "engineering",
    teams: ["Engineering"],
    email: "vamsi.chunduru@clever.com",
  },
  {
    name: "Jen Kampf",
    department: "people",
    teams: ["POps", "Talent Acquisition"],
    email: "jennifer.kampf@clever.com",
  },
  {
    name: "David McGeary",
    department: "css",
    teams: ["Technical Pre-sales"],
    email: "david.mcgeary@clever.com",
  },
  {
    name: "Meghana Gangadharswami Balihallimath",
    department: "css",
    teams: ["Integration Engineering"],
    email: "meghana.balihallimath@clever.com",
  },
  {
    name: "Dotun Oni",
    department: "css",
    teams: ["Partner Engineering"],
    email: "dotun.oni@clever.com",
  },
  {
    name: "Sinclair Blackmon",
    department: "css",
    teams: ["Clever Core Onboarding"],
    email: "sinclair.blackmon@clever.com",
  },
  {
    name: "Jonathan Boutin",
    department: "css",
    teams: ["Clever+ Onboarding"],
    email: "jonathan.boutin@clever.com",
  },
  {
    name: "Marley Koschel",
    department: "css",
    teams: ["Customer Education"],
    email: "marley.koschel@clever.com",
  },
  {
    name: "Arraine Siefert",
    department: "css",
    teams: ["Customer Support"],
    email: "arraine.siefert@clever.com",
  },
  {
    name: "Katie Clarkson",
    department: "css",
    teams: ["Customer Support"],
    email: "katie.clarkson@clever.com",
  },
  {
    name: "Shaun Hudgins",
    department: "css",
    teams: ["Technical Account Managers"],
    email: "shaun.hudgins@clever.com",
  },
  {
    name: "Melissa Pevitz",
    department: "mss",
    teams: ["School Partnerships – Domestic"],
    email: "melissa.pevitz@clever.com",
  },
  {
    name: "Aerin Bowers",
    department: "mss",
    teams: ["School Partnerships – International"],
    email: "aerin.bowers@clever.com",
  },
  {
    name: "Lauren Raulerson",
    department: "mss",
    teams: ["School Success – Global"],
    email: "lauren.raulerson@clever.com",
  },
  {
    name: "Patricia Henriquez",
    department: "mss",
    teams: ["School Success – Global"],
    email: "patricia.henriquez@clever.com",
  },
  {
    name: "Zachary Gladnick",
    department: "mss",
    teams: ["App Partnerships"],
    email: "zach.gladnick@clever.com",
  },
  {
    name: "Jennifer Pluma",
    department: "mss",
    teams: ["App Success"],
    email: "jennifer.pluma@clever.com",
  },
  {
    name: "Evelyn Wong",
    department: "mss",
    teams: ["Marketing"],
    email: "evelyn.wong@clever.com",
  },
  {
    name: "Kenton Lu",
    department: "finance_legal",
    teams: ["Finance"],
    email: "kenton.lu@clever.com",
  },
  {
    name: "Wendy Yu",
    department: "finance_legal",
    teams: ["Legal"],
    email: "wendy.yu@clever.com",
  },
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
  let unverified = 0;
  for (const lead of ROSTER) {
    const [person] = await db
      .select()
      .from(people)
      .where(eq(people.name, lead.name));
    if (!person) missingPerson++;
    const email = lead.email ?? `${emailSlug(lead.name)}@clever.com`;
    const emailUnverified = lead.emailUnverified ?? !lead.email;
    if (emailUnverified) unverified++;

    // Upsert by name so email corrections update rows in place. An email a
    // human already verified in-app is never clobbered.
    const [existing] = await db
      .select()
      .from(aiLeads)
      .where(eq(aiLeads.name, lead.name));
    let row;
    if (existing) {
      const emailChanging =
        existing.emailUnverified && existing.email !== email;
      [row] = await db
        .update(aiLeads)
        .set({
          department: lead.department,
          personId: person?.id ?? null,
          ...(existing.emailUnverified ? { email, emailUnverified } : {}),
          // A changed address invalidates any login link made under the old one.
          ...(emailChanging && existing.userId ? { userId: null } : {}),
        })
        .where(eq(aiLeads.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(aiLeads)
        .values({
          name: lead.name,
          email,
          emailUnverified,
          department: lead.department,
          state: "assigned",
          personId: person?.id ?? null,
        })
        .returning();
    }
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
    `· teams: ${teamPairs.size}, AI Leads: ${ROSTER.length}${unverified ? ` (${unverified} email${unverified === 1 ? "" : "s"} still unverified)` : ""}${missingPerson ? ` — ${missingPerson} not in directory` : ""}`,
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
  {
    name: "Amy Lee (CFO)",
    person: "Amy Lee",
    target: 2,
    departments: ["finance_legal"],
    note: null,
    sort: 1,
  },
  {
    name: "Eric Krugler (CTO)",
    person: "Eric Krugler",
    target: 3,
    departments: ["engineering"],
    note: null,
    sort: 2,
  },
  {
    name: "Jamie Reffell (CPO)",
    person: "Jamie Reffell",
    target: 2,
    departments: ["product_design"],
    note: null,
    sort: 3,
  },
  {
    name: "Phillip Mikula (CRO)",
    person: "Phillip Mikula",
    target: 3,
    departments: ["mss"],
    note: null,
    sort: 4,
  },
  // Kate owns CSS — Trent Matthews (Director of Customer Support & Services)
  // reports to her. Confirmed, so no caveat note.
  {
    name: "Kate Schaff",
    person: "Kate Schaff",
    target: 3,
    departments: ["css"],
    note: null,
    sort: 5,
  },
  {
    name: "Trish Sparks (CEO)",
    person: "Trish Sparks",
    target: 2,
    departments: ["people"],
    note: null,
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
  console.log(
    `· ELT orgs: ${ELT_ORGS.length} (targets sum ${ELT_ORGS.reduce((a, o) => a + o.target, 0)})`,
  );
}

const PULSE = [
  {
    key: "ee_daily",
    label: "Employees using AI daily",
    baselineValue: 56,
    targetValue: 85,
    sort: 1,
  },
  {
    key: "mgr_daily",
    label: "Managers, SLT & ELT using AI daily",
    baselineValue: 74,
    targetValue: 100,
    sort: 2,
  },
  {
    key: "readiness",
    label: "Employees reporting AI readiness for their role",
    baselineValue: 83,
    targetValue: 90,
    sort: 3,
  },
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
      .values({
        metricKey: m.key,
        value: m.baselineValue,
        takenOn: baselineDate,
      })
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
