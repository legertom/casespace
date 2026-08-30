import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { identityForUser } from "@/server/identity";
import { listUseCases } from "@/server/use-case-queries";
import { ProgramDashboard } from "@/components/dashboard/program-dashboard";
import { CommunityBadge, StatusBadge } from "@/components/status-badge";
import { canCreateUseCase } from "@/lib/permissions";

export default async function Home() {
  const user = await requireUser();
  // Anyone who can log gets their own records; guests get a recency list.
  const canLog = canCreateUseCase(user.role);

  // Everyone opens onto the program. Admins stop there — their section never
  // renders, so they skip the fetch too; everyone else gets their own records
  // underneath — first thing on the page, not the only thing on it.
  //
  // Deliberately unscoped by program: your own community submission shows up
  // here exactly like anything else. Hiding someone's first record from them
  // is the one thing the casebook's program default must never do.
  const recent =
    user.role === "admin"
      ? []
      : canLog
        ? await listUseCases({ mine: await identityForUser(user) })
        : await listUseCases();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">The program, at a glance</h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            45 documented use cases and 15 with quantified, positive ROI by
            December 31.
          </p>
        </div>
        {/*
          The header carries this same button from md up, so showing it here
          too just duplicates it. Below md the header's is hidden behind the
          menu, and logging a use case is the one thing this page exists to
          get people to do — so it stays, on small screens only.
        */}
        {canLog && (
          <Link
            href="/use-cases/new"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-deep md:hidden"
          >
            Log a use case
          </Link>
        )}
      </div>

      <div className="mt-10">
        <ProgramDashboard />
      </div>

      {user.role !== "admin" && (
        <section className="mt-14 border-t border-hairline pt-10">
          <h2 className="font-serif text-2xl">
            {canLog
              ? `Your use cases, ${user.name.split(" ")[0]}`
              : "Recently updated"}
          </h2>
          {canLog && recent.length === 0 ? (
            <p className="mt-4 max-w-md text-ink-muted">
              Nothing credits you yet. Built something with AI, however small?{" "}
              <Link
                href="/use-cases/new"
                className="text-accent underline underline-offset-2"
              >
                Log it in five minutes.
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              {recent.slice(0, 8).map((uc) => (
                <li key={uc.id}>
                  <Link
                    href={`/use-cases/${uc.id}`}
                    className="flex items-baseline justify-between gap-6 py-3 hover:bg-surface"
                  >
                    <span className="truncate font-serif">{uc.title}</span>
                    <span className="flex items-center gap-2">
                      {!uc.inProgram && <CommunityBadge />}
                      <StatusBadge status={uc.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
