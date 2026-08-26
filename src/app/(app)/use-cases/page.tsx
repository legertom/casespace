import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  STATUSES,
  STATUS_LABELS,
  countsTowardDocumented,
  type Department,
  type UcStatus,
} from "@/lib/domain";
import {
  DEFAULT_PROGRAM_SCOPE,
  PROGRAM_SCOPE_LABELS,
  PROGRAM_SCOPES,
  parseProgramScope,
  scopeToFilter,
} from "@/lib/program-scope";
import { listNames } from "@/lib/format";
import { canCreateUseCase } from "@/lib/permissions";
import { identityForPerson, identityForUser } from "@/server/identity";
import { listEltOrgs } from "@/server/reference";
import { listUseCases } from "@/server/use-case-queries";
import { CommunityBadge, StatusBadge } from "@/components/status-badge";

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
  // her world first. Community work is one select away, and the empty state
  // below points at it. Note the home page's "Your use cases" ignores this
  // entirely: you always see your own, whichever slice it falls in.
  const programScope = parseProgramScope(sp.program);

  // One filter set, shared by both queries below so they cannot drift apart.
  const scope = {
    department,
    q,
    mine: mine ? await identityForUser(user) : undefined,
    credits: person?.identity,
    eltOrgId: eltOrg?.id,
    eltUnallocated,
    inProgram: scopeToFilter(programScope),
  };

  const rows = await listUseCases({ status, ...scope });

  const visible = documentedOnly
    ? rows.filter((r) => countsTowardDocumented(r.status))
    : rows;

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
  // A filter that matches nothing shouldn't read as "the casebook is empty" —
  // tell them what does exist and give them one click to it. One unfiltered
  // fetch feeds both counts below, so the links can never disagree about
  // what the casebook holds.
  const everything =
    visible.length === 0 && hasFilters ? await listUseCases({}) : [];
  const totalEverything = everything.length;
  // Nothing in the program view, but community records exist — the likeliest
  // confusing empty state now that the default is a filter.
  const communityWaiting =
    programScope === "program"
      ? everything.filter((r) => !r.inProgram).length
      : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
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
                    ? "Logged by people outside the AI Leads roster. Real work — it just isn't counted toward the 45 or the 15."
                    : programScope === "all"
                      ? "Every AI workflow in the casebook, program and community — everyone sees everything."
                      : "Workflows counting toward the program. Switch the filter to see community submissions too."}
          </p>
        </div>
      </div>

      <form className="mt-8 flex flex-wrap items-center gap-3" method="get">
        {personId && <input type="hidden" name="person" value={personId} />}
        {eltLabel && eltParam && (
          <input type="hidden" name="elt" value={eltParam} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title, description, owner…"
          className="w-64 rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-sm"
          aria-label="Search use cases"
        />
        <select
          name="status"
          defaultValue={documentedOnly ? "documented" : (status ?? "")}
          className="rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
          <option value="documented">Qualified or better (the 45)</option>
        </select>
        <select
          name="department"
          defaultValue={department ?? ""}
          className="rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-sm"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </select>
        <select
          name="program"
          defaultValue={programScope}
          className="rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-sm"
          aria-label="Filter by program scope"
        >
          {PROGRAM_SCOPES.map((sc) => (
            <option key={sc} value={sc}>
              {PROGRAM_SCOPE_LABELS[sc]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
          <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
          Mine
        </label>
        <button
          type="submit"
          className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
        >
          Filter
        </button>
        {hasFilters && (
          <Link
            href="/use-cases"
            className="text-sm text-ink-faint hover:text-accent"
          >
            Clear
          </Link>
        )}
      </form>

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
        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
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
