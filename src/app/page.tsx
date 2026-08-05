import { requireUser } from "@/lib/current-user";
import { signOut } from "@/auth";

export default async function Home() {
  const user = await requireUser();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-serif text-4xl">Casespace</h1>
      <p className="mt-4 text-ink-muted">
        Signed in as <strong className="text-ink">{user.name}</strong> (
        {user.primaryEmail}) — role: <strong>{user.role}</strong>.
      </p>
      <form action={doSignOut} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-hairline-strong px-4 py-2 text-sm hover:bg-surface"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
