import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { listUseCases } from "@/server/use-case-queries";
import { ProgramDashboard } from "@/components/dashboard/program-dashboard";
import { StatusBadge } from "@/components/status-badge";

export default async function Home() {
  const user = await requireUser();

  // Admins land straight on the program dashboard.
  if (user.role === "admin") {
    return (
      <div>
        <h1 className="font-serif text-4xl">The program, at a glance</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          45 documented use cases and 15 with quantified, positive ROI by
          December 31.
        </p>
        <div className="mt-10">
          <ProgramDashboard />
        </div>
      </div>
    );
  }

  const mine = await listUseCases({ mineUserId: user.id });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">
            Welcome back, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            {user.role === "contributor"
              ? "Your use cases, and the program one click away."
              : "Browse everything — the whole ledger is open to you."}
          </p>
        </div>
        {user.role === "contributor" && (
          <Link
            href="/use-cases/new"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-deep"
          >
            Log a use case
          </Link>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">
          {user.role === "contributor" ? "Your use cases" : "Recently updated"}
        </h2>
        {user.role === "contributor" && mine.length === 0 ? (
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
            {(user.role === "contributor"
              ? mine
              : await listUseCases()
            )
              .slice(0, 8)
              .map((uc) => (
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

      <p className="mt-10 text-sm text-ink-muted">
        Want the big picture?{" "}
        <Link
          href="/dashboard"
          className="text-accent underline underline-offset-2"
        >
          See the program dashboard
        </Link>{" "}
        — everyone can.
      </p>
    </div>
  );
}
