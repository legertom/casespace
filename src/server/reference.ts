import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiLeads, aiLeadTeams, appSettings, eltOrgs, people, teams } from "@/db/schema";
import { DEFAULT_STALE_DAYS } from "@/lib/domain";

export async function listTeams() {
  const db = getDb();
  return db.select().from(teams).orderBy(asc(teams.department), asc(teams.name));
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
