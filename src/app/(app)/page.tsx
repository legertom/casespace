import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { identityForUser } from "@/server/identity";
import { listUseCases } from "@/server/use-case-queries";
import { ProgramDashboard } from "@/components/dashboard/program-dashboard";
import { StatusBadge } from "@/components/status-badge";

export default async function Home() {
  const user = await requireUser();
  const isContributor = user.role === "contributor";

  // Everyone opens onto the program. Admins stop there; everyone else gets
  // their own records underneath — first thing on the page, not the only
  // thing on it.
  const recent = isContributor
    ? await listUseCases({ mine: await identityForUser(user) })
    : user.role === "viewer"
      ? await listUseCases()
      : [];

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
        {isContributor && (
          <Link
            href="/use-cases/new"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-deep"
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
            {isContributor
              ? `Your use cases, ${user.name.split(" ")[0]}`
              : "Recently updated"}
          </h2>
          {isContributor && recent.length === 0 ? (
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
                    <StatusBadge status={uc.status} />
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
