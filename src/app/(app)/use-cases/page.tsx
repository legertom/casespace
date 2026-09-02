import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  STATUSES,
  countsTowardDocumented,
  type Department,
  type UcStatus,
} from "@/lib/domain";
import {
  DEFAULT_PROGRAM_SCOPE,
  parseProgramScope,
  scopeToFilter,
} from "@/lib/program-scope";
import { listNames } from "@/lib/format";
import { canCreateUseCase } from "@/lib/permissions";
import { aiConfigured } from "@/lib/ai/config";
import { identityForPerson, identityForUser } from "@/server/identity";
import { listEltOrgs, listPeopleLite } from "@/server/reference";
import { listUseCases } from "@/server/use-case-queries";
import { CommunityBadge, StatusBadge } from "@/components/status-badge";
import {
  UseCaseFilters,
  type CasebookFilterState,
} from "@/components/use-case-filters";

export const metadata = { title: "Use cases" };

interface Search {
  status?: string;
  department?: string;
  q?: string;
  mine?: string;
  person?: string;
  elt?: string;
  program?: string;
}

export default async function UseCasesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  // "qualified_plus" is the old derived filter — old links land on the status
  // that replaced it. "documented" is the 45's slice: Qualified or better.
  const rawStatus =
    sp.status === "qualified_plus" ? "confirmed_positive_roi" : sp.status;
  const status = STATUSES.includes(rawStatus as UcStatus)
    ? (rawStatus as UcStatus)
    : undefined;
  const documentedOnly = rawStatus === "documented";
  const department = DEPARTMENTS.includes(sp.department as Department)
    ? (sp.department as Department)
    : undefined;
  const q = sp.q?.trim() || undefined;
  const mine = sp.mine === "1";
  const personId = sp.person?.trim() || undefined;
  // `?person=` is hand-editable; a value naming nobody — including one that
  // isn't a uuid at all — drops the filter rather than erroring.
  const person = personId ? await identityForPerson(personId) : null;
  const personName = person?.name ?? null;

  // "none" is the dashboard's Unallocated bucket. An id matching no real org
  // is dropped entirely — the full list with no scope heading, rather than a
  // page claiming to be filtered to something that doesn't exist.
  const eltParam = sp.elt?.trim() || undefined;
  const eltOrg =
    eltParam && eltParam !== "none"
      ? ((await listEltOrgs()).find((o) => o.id === eltParam) ?? null)
      : null;
  const eltUnallocated = eltParam === "none";
  const eltLabel = eltUnallocated ? "Unallocated" : (eltOrg?.name ?? null);

  // The casebook defaults to the program — the one page Kate lives on shows
  // her world first. Community work is one tab away, and the empty state
  // below points at it. Note the home page's "Your use cases" ignores this
  // entirely: you always see your own, whichever slice it falls in.
  const programScope = parseProgramScope(sp.program);

  // One filter set, shared by both derived views below so they cannot drift.
  const scope = {
    department,
    q,
    mine: mine ? await identityForUser(user) : undefined,
    credits: person?.identity,
    eltOrgId: eltOrg?.id,
    eltUnallocated,
    inProgram: scopeToFilter(programScope),
  };

  // Status is applied here rather than in SQL so one fetch also yields the
  // per-stage counts the filter rail shows. `everything` is the unfiltered
  // casebook: stable tab totals, typeahead titles, and the empty-state links
  // all read from it, so those numbers can never disagree.
  const [rows, everything, people] = await Promise.all([
    listUseCases(scope),
    listUseCases({}),
    listPeopleLite(),
  ]);

  const stageCounts: Record<string, number> = { documented: 0 };
  for (const s of STATUSES) stageCounts[s] = 0;
  for (const r of rows) {
    stageCounts[r.status] += 1;
    if (countsTowardDocumented(r.status)) stageCounts.documented += 1;
  }

  const visible = status
    ? rows.filter((r) => r.status === status)
    : documentedOnly
      ? rows.filter((r) => countsTowardDocumented(r.status))
      : rows;

  const inProgramTotal = everything.filter((r) => r.inProgram).length;
  const scopeTotals = {
    program: inProgramTotal,
    community: everything.length - inProgramTotal,
    all: everything.length,
  };

  const hasFilters = Boolean(
    q ||
    status ||
    department ||
    mine ||
    documentedOnly ||
    personId ||
    eltLabel ||
    programScope !== DEFAULT_PROGRAM_SCOPE,
  );
  const totalEverything = everything.length;
  // Nothing in the program view, but community records exist — the likeliest
  // confusing empty state now that the default is a filter.
  const communityWaiting =
    programScope === "program" ? scopeTotals.community : 0;

  const filterState: CasebookFilterState = {
    q: q ?? "",
    status: documentedOnly ? "documented" : (status ?? ""),
    department: department ?? "",
    program: programScope,
    mine,
    personId: personId ?? null,
    personName,
    eltId: eltParam ?? null,
  };

  return (
    <div>
      <div>
        <div>
          <h1 className="font-serif text-4xl">
            {personName
              ? `Use cases for ${personName}`
              : eltLabel
                ? `Use cases counting toward ${eltLabel}`
                : "Use cases"}
          </h1>
          <p className="mt-2 text-ink-muted">
            {personName
              ? `Owned or authored by ${personName}.`
              : eltUnallocated
                ? "Logged in departments with no confirmed ELT owner."
                : eltLabel
                  ? `Everything counting toward ${eltLabel}'s share of the 15, at every stage.`
                  : programScope === "community"
                    ? "Owned by people outside the AI Leads roster. Real work — it just isn't counted toward the 45 or the 15."
                    : programScope === "all"
                      ? "Every AI workflow in the casebook, program and community — everyone sees everything."
                      : "Workflows counting toward the program. Community submissions are one tab away."}
          </p>
        </div>
      </div>

      <UseCaseFilters
        state={filterState}
        scopeTotals={scopeTotals}
        stageCounts={stageCounts}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
        titles={everything.map((r) => ({ id: r.id, title: r.title }))}
        resultCount={visible.length}
        aiEnabled={aiConfigured()}
      />

      {visible.length === 0 ? (
        <div className="mt-16 max-w-md">
          <p className="font-serif text-xl">
            {hasFilters ? "Nothing matches this view." : "Nothing here yet."}
          </p>
          <p className="mt-2 text-ink-muted">
            {mine
              ? "No use cases credit you yet."
              : personName
                ? `No use cases credit ${personName} yet.`
                : hasFilters
                  ? "The casebook has records, just none in this slice."
                  : "Know of one that should exist?"}{" "}
            {totalEverything > 0 && (
              <Link
                href="/use-cases?program=all"
                className="text-accent underline underline-offset-2"
              >
                See all {totalEverything} use{" "}
                {totalEverything === 1 ? "case" : "cases"}.
              </Link>
            )}
            {communityWaiting > 0 && (
              <>
                {" "}
                <Link
                  href="/use-cases?program=community"
                  className="text-accent underline underline-offset-2"
                >
                  {communityWaiting === 1
                    ? "1 is a community submission."
                    : `${communityWaiting} are community submissions.`}
                </Link>
              </>
            )}
          </p>
          {canCreateUseCase(user.role) && (
            <p className="mt-2 text-ink-muted">
              Built something with AI, however small?{" "}
              <Link
                href="/use-cases/new"
                className="text-accent underline underline-offset-2"
              >
                Log it in five minutes.
              </Link>
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {visible.map((uc) => (
            <li key={uc.id}>
              <Link
                href={`/use-cases/${uc.id}`}
                className="block py-4 transition-colors hover:bg-surface"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="truncate font-serif text-lg">
                      {uc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!uc.inProgram && <CommunityBadge />}
                    <StatusBadge status={uc.status} />
                  </div>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                  {uc.description}
                </p>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {[
                    uc.department ? DEPARTMENT_LABELS[uc.department] : null,
                    uc.teamName,
                    uc.authors.length
                      ? `by ${listNames(uc.authors.map((a) => a.displayName))}`
                      : null,
                    uc.ownerName ? `owner ${uc.ownerName}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
