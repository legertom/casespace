import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, devLoginEnabled, googleConfigured, signIn } from "@/auth";

export const metadata = { title: "Sign in" };

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

async function signInWithDevEmail(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("dev-login", { email, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/signin?error=AccessDenied");
    }
    throw err;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-5xl tracking-tight">Casespace</h1>
        <p className="mt-3 text-ink-muted leading-relaxed">
          Clever&rsquo;s ledger of AI use cases — and the live scoreboard for
          the H2 program.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 border-l-2 border-accent bg-accent-wash px-4 py-3 text-sm"
          >
            That email doesn&rsquo;t have access. Sign in with your clever.com
            account, or ask Tom to add your address to the allowlist.
          </p>
        )}

        <div className="mt-10 space-y-6">
          {googleConfigured ? (
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="w-full rounded-md bg-ink px-4 py-2.5 text-paper transition-colors hover:bg-ink/85"
              >
                Sign in with Google
              </button>
            </form>
          ) : (
            <p className="text-sm text-ink-faint">
              Google sign-in isn&rsquo;t configured yet — set{" "}
              <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code>.
            </p>
          )}

          {devLoginEnabled && (
            <form
              action={signInWithDevEmail}
              className="border-t border-hairline pt-6"
            >
              <label
                htmlFor="dev-email"
                className="block text-sm text-ink-muted"
              >
                Dev sign-in (local only) — any allowed email
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="dev-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@clever.com"
                  className="min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-hairline-strong px-4 py-2 text-sm hover:bg-surface"
                >
                  Enter
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
