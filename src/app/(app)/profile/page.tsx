import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pats, userEmails } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { fmtDate } from "@/lib/format";
import { PatManager } from "@/components/profile/pat-manager";

export const metadata = { title: "Profile & API tokens" };

export default async function ProfilePage() {
  const user = await requireUser();
  const db = getDb();
  const [aliases, tokens] = await Promise.all([
    db.select().from(userEmails).where(eq(userEmails.userId, user.id)),
    db
      .select()
      .from(pats)
      .where(eq(pats.userId, user.id))
      .orderBy(desc(pats.createdAt)),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">{user.name}</h1>
      <p className="mt-2 text-ink-muted">
        {aliases.map((a) => a.email).join(" · ")} — role: {user.role}
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Personal access tokens</h2>
        <p className="mt-2 text-ink-muted">
          File use cases from your editor — the API and MCP server authenticate
          with these. A token can do what you can do here, no more.
        </p>
        <div className="mt-6">
          <PatManager
            tokens={tokens.map((t) => ({
              id: t.id,
              name: t.name,
              tokenPrefix: t.tokenPrefix,
              lastUsedAt: t.lastUsedAt ? fmtDate(t.lastUsedAt) : null,
              createdAt: fmtDate(t.createdAt),
              revoked: Boolean(t.revokedAt),
            }))}
          />
        </div>
      </section>

      <section className="mt-12 space-y-4 text-sm leading-relaxed">
        <h2 className="font-serif text-2xl">Filing from anywhere</h2>
        <div>
          <h3 className="font-semibold">MCP (Claude Code, Cursor)</h3>
          <p className="mt-1 text-ink-muted">
            Add the server and log use cases mid-build with{" "}
            <code>log_use_case</code> — only a title and description required.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md border border-hairline bg-surface p-3 text-xs leading-relaxed">
            {`claude mcp add --transport http casespace \\
  ${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-deployment"}/api/mcp \\
  --header "Authorization: Bearer csp_…"`}
          </pre>
        </div>
        <div>
          <h3 className="font-semibold">REST</h3>
          <pre className="mt-2 overflow-x-auto rounded-md border border-hairline bg-surface p-3 text-xs leading-relaxed">
            {`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-deployment"}/api/v1/use-cases \\
  -H "Authorization: Bearer csp_…" -H "Content-Type: application/json" \\
  -d '{"title": "…", "description": "…"}'`}
          </pre>
          <p className="mt-1 text-ink-muted">
            Also: <code>GET /api/v1/use-cases</code>,{" "}
            <code>GET|PATCH /api/v1/use-cases/:id</code>,{" "}
            <code>GET /api/v1/roster</code>, <code>GET /api/v1/progress</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
