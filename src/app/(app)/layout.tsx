import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { signOut } from "@/auth";
import { aiConfigured } from "@/lib/ai/config";
import { CoachLauncher } from "@/components/coach/coach-launcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-baseline gap-8">
            <Link href="/" className="font-serif text-xl tracking-tight">
              Casespace
            </Link>
            <nav aria-label="Primary" className="flex gap-5 text-sm text-ink-muted">
              <Link href="/" className="hover:text-ink">
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
              {user.role === "admin" && (
                <Link href="/whats-new" className="hover:text-ink">
                  What&rsquo;s New
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/use-cases/new"
              className="rounded-md bg-accent px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-accent-deep"
            >
              Log a use case
            </Link>
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm text-ink-muted hover:text-ink">
                {user.name}
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-hairline bg-surface p-3 shadow-sm">
                <p className="truncate text-sm">{user.primaryEmail}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                  {user.role}
                </p>
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
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      {aiConfigured() && <CoachLauncher />}
    </div>
  );
}
