import { requireUser } from "@/lib/current-user";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
} from "@/lib/domain";
import {
  listLeadMonthlySyncs,
  listPeopleLite,
  listRoster,
  listTeams,
} from "@/server/reference";
import { PersonLink } from "@/components/person-link";
import { AddLeadForm, LeadRowAdmin } from "@/components/roster/roster-admin";

export const metadata = { title: "AI Leads" };

export default async function RosterPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const [roster, allTeams, people, monthlySyncs] = await Promise.all([
    listRoster(),
    listTeams(),
    isAdmin ? listPeopleLite() : Promise.resolve([]),
    isAdmin ? listLeadMonthlySyncs() : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="font-serif text-4xl">The AI Leads</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        {roster.length} leads across {DEPARTMENTS.length} departments — each
        building two workflows for their function.
      </p>

      <div className="mt-10 space-y-10">
        {DEPARTMENTS.map((d) => {
          const leads = roster.filter((l) => l.department === d);
          if (leads.length === 0) return null;
          return (
            <section key={d} aria-label={DEPARTMENT_LABELS[d]}>
              <h2 className="border-b border-hairline-strong pb-2 font-serif text-2xl">
                {DEPARTMENT_LABELS[d]}
              </h2>
              <ul className="divide-y divide-hairline">
                {leads.map((l) => (
                  <li key={l.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <div>
                        <span className="font-medium">
                          <PersonLink name={l.name} personId={l.personId} />
                        </span>
                        <span className="ml-2 text-sm text-ink-muted">
                          {l.teams.map((t) => t.name).join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-ink-muted">
                        {!isAdmin && (
                          <a
                            href={`mailto:${l.email}`}
                            className="underline-offset-2 hover:text-accent hover:underline"
                          >
                            {l.email}
                          </a>
                        )}
                        {!isAdmin && l.emailUnverified && (
                          <span className="rounded-sm bg-accent-wash px-1.5 py-0.5 text-xs text-accent-deep">
                            unverified
                          </span>
                        )}
                        {l.state !== "assigned" && (
                          <span className="text-xs uppercase tracking-wide text-flag">
                            {l.state}
                          </span>
                        )}
                        {l.userId && (
                          <span
                            className="text-xs text-st-launched"
                            title="This lead has signed in; their login is linked."
                          >
                            linked
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <LeadRowAdmin
                        lead={{
                          id: l.id,
                          email: l.email,
                          emailUnverified: l.emailUnverified,
                          state: l.state,
                          department: l.department as Department,
                          teams: l.teams,
                          completedSyncMonths: monthlySyncs
                            .filter((sync) => sync.leadId === l.id)
                            .map((sync) => sync.month),
                        }}
                        allTeams={
                          allTeams as {
                            id: string;
                            name: string;
                            department: Department;
                          }[]
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-12">
          <AddLeadForm
            people={people}
            allTeams={
              allTeams as { id: string; name: string; department: Department }[]
            }
          />
        </div>
      )}
    </div>
  );
}
