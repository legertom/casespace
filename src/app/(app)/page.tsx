import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { listUseCases } from "@/server/use-case-queries";
import { StatusBadge } from "@/components/status-badge";

export default async function Home() {
  const user = await requireUser();
  const mine = await listUseCases({ mineUserId: user.id });

  return (
    <div>
      <h1 className="font-serif text-4xl">Welcome back, {user.name.split(" ")[0]}.</h1>
      <p className="mt-2 text-ink-muted">
        The program dashboard lands here next. Meanwhile, the ledger is open.
      </p>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Your use cases</h2>
          <Link href="/use-cases" className="text-sm text-accent hover:underline">
            Browse all →
          </Link>
        </div>
        {mine.length === 0 ? (
          <p className="mt-4 max-w-md text-ink-muted">
            Nothing credits you yet. Built something with AI, however small?{" "}
            <Link href="/use-cases/new" className="text-accent underline underline-offset-2">
              Log it in five minutes.
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {mine.slice(0, 8).map((uc) => (
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
    </div>
  );
}
