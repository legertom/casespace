import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { signOut } from "@/auth";
import { aiConfigured } from "@/lib/ai/config";
import { canCreateUseCase } from "@/lib/permissions";
import { VIEW_AS_LABELS, VIEW_AS_PROSE, VIEW_AS_ROLES } from "@/lib/view-as";
import { startViewAsAction, stopViewAsAction } from "@/server/actions-view-as";
import { CoachLauncher } from "@/components/coach/coach-launcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isRealAdmin = user.realRole === "admin";

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-baseline gap-8">
            <Link href="/" className="font-serif text-xl tracking-tight">
              Casespace
            </Link>
            <nav aria-label="Primary" className="flex gap-5 text-sm text-ink-muted">
              <Link href="/dashboard" className="hover:text-ink">
                Dashboard
              </Link>
              <Link href="/use-cases" className="hover:text-ink">
                Use cases
              </Link>
              <Link href="/goals" className="hover:text-ink">
                Goals
              </Link>
              <Link href="/roster" className="hover:text-ink">
                AI Leads
              </Link>
              <Link href="/whats-new" className="hover:text-ink">
                What&rsquo;s New
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {canCreateUseCase(user.role) && (
              <Link
                href="/use-cases/new"
                className="rounded-md bg-accent px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-accent-deep"
              >
                Log a use case
              </Link>
            )}
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm text-ink-muted hover:text-ink">
                {user.name}
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-hairline bg-surface p-3 shadow-sm">
                <p className="truncate text-sm">{user.primaryEmail}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                  {user.viewingAs
                    ? `${user.realRole} · viewing as ${VIEW_AS_LABELS[user.viewingAs]}`
                    : user.role}
                </p>
                {isRealAdmin && (
                  <div className="mt-3 border-t border-hairline pt-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">
                      View as
                    </p>
                    {VIEW_AS_ROLES.map((r) => (
                      <form key={r} action={startViewAsAction.bind(null, r)}>
                        <button
                          type="submit"
                          disabled={user.viewingAs === r}
                          className="py-1 hover:text-accent disabled:text-ink-faint disabled:hover:text-ink-faint"
                        >
                          {VIEW_AS_LABELS[r]}
                          {user.viewingAs === r && " (current)"}
                        </button>
                      </form>
                    ))}
                    {user.viewingAs && (
                      <form action={stopViewAsAction}>
                        <button type="submit" className="py-1 hover:text-accent">
                          Back to admin
                        </button>
                      </form>
                    )}
                  </div>
                )}
                <div className="mt-3 border-t border-hairline pt-3 text-sm">
                  <Link href="/profile" className="block py-1 hover:text-accent">
                    Profile &amp; API tokens
                  </Link>
                  <form action={doSignOut}>
                    <button type="submit" className="py-1 hover:text-accent">
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>
      {user.viewingAs && (
        <div className="border-b border-hairline bg-accent-wash">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 text-sm text-accent-deep">
            <p>
              Previewing as <strong>{VIEW_AS_PROSE[user.viewingAs]}</strong> —
              writes and admin surfaces are restricted to match.
            </p>
            <form action={stopViewAsAction}>
              <button type="submit" className="underline underline-offset-2">
                Back to admin
              </button>
            </form>
          </div>
        </div>
      )}
      <main id="main" className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      {aiConfigured() && <CoachLauncher />}
    </div>
  );
}
