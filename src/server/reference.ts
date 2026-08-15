import "server-only";
import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiLeads, aiLeadTeams, appSettings, eltOrgs, people, teams } from "@/db/schema";
import { DEFAULT_STALE_DAYS, type Department } from "@/lib/domain";

export async function listTeams() {
  const db = getDb();
  return db.select().from(teams).orderBy(asc(teams.department), asc(teams.name));
}

export interface MyTeam {
  id: string;
  name: string;
  department: Department;
}

/**
 * The signed-in user's own team(s), via their roster row. Sign-in links the
 * row by email (`auth-provision`), so `userId` is the reliable match;
 * `personId` covers a lead whose row was linked to a person before they ever
 * signed in.
 */
export async function listMyTeams(user: {
  id: string;
  personId: string | null;
}): Promise<MyTeam[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({
      id: teams.id,
      name: teams.name,
      department: teams.department,
    })
    .from(aiLeads)
    .innerJoin(aiLeadTeams, eq(aiLeadTeams.leadId, aiLeads.id))
    .innerJoin(teams, eq(aiLeadTeams.teamId, teams.id))
    .where(
      user.personId
        ? or(eq(aiLeads.userId, user.id), eq(aiLeads.personId, user.personId))
        : eq(aiLeads.userId, user.id),
    )
    .orderBy(asc(teams.name));
  return rows as MyTeam[];
}

/**
 * The team to pre-select when this user logs a use case. Only unambiguous
 * when they lead exactly one team — a lead covering two functions has to say
 * which one, and guessing would quietly mis-file the record.
 */
export async function getDefaultTeam(user: {
  id: string;
  personId: string | null;
}): Promise<MyTeam | null> {
  const mine = await listMyTeams(user);
  return mine.length === 1 ? mine[0] : null;
}

export async function listEltOrgs() {
  const db = getDb();
  return db.select().from(eltOrgs).orderBy(asc(eltOrgs.sort));
}

export interface PersonLite {
  id: string;
  name: string;
  title: string | null;
}

/** The whole directory is small (~300 rows) — ship it to pickers directly. */
export async function listPeopleLite(): Promise<PersonLite[]> {
  const db = getDb();
  return db
    .select({ id: people.id, name: people.name, title: people.title })
    .from(people)
    .where(eq(people.active, true))
    .orderBy(asc(people.name));
}

export async function getPersonName(id: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ name: people.name })
    .from(people)
    .where(eq(people.id, id));
  return row?.name ?? null;
}

export async function listRoster() {
  const db = getDb();
  const leads = await db.select().from(aiLeads).orderBy(asc(aiLeads.name));
  const links = await db
    .select({ leadId: aiLeadTeams.leadId, teamId: aiLeadTeams.teamId, teamName: teams.name })
    .from(aiLeadTeams)
    .innerJoin(teams, eq(aiLeadTeams.teamId, teams.id));
  return leads.map((l) => ({
    ...l,
    teams: links.filter((x) => x.leadId === l.id).map((x) => ({ id: x.teamId, name: x.teamName })),
  }));
}

export async function getStaleDays(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "stale_days"));
  return typeof row?.value === "number" ? row.value : DEFAULT_STALE_DAYS;
}
