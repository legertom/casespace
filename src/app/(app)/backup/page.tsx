import Link from "next/link";
import { getTableName } from "drizzle-orm";
import { getDb } from "@/db";
import { countBackupRows } from "@/db/backup";
import { BACKUP_TABLES } from "@/lib/backup";
import { requireAdmin } from "@/lib/current-user";

export const metadata = { title: "Backup" };

const WHAT: Record<string, string> = {
  use_cases: "The records themselves — every field, deleted ones included",
  use_case_authors: "Who is credited on each",
  use_case_urls: "Their links to tools, repos and artifacts",
  use_case_links: "Links between workflows",
  status_changes: "Every status move, with its note",
  field_changes: "The audit trail for owner, authors, gates and membership",
  use_case_comments: "Comments and replies",
  people: "The directory the records name people from",
  users: "Logins",
  user_emails: "Sign-in aliases",
  teams: "Teams",
  elt_orgs: "ELT orgs and their targets",
  ai_leads: "The AI Leads roster",
  ai_lead_teams: "Which teams each lead covers",
};

export default async function BackupPage() {
  await requireAdmin();
  const counts = await countBackupRows(getDb());
  // Records first on the page; the restore order puts what they refer to first.
  const names = BACKUP_TABLES.map((t) => getTableName(t));
  const from = names.indexOf("use_cases");
  const ordered = [...names.slice(from), ...names.slice(0, from)];

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Backup</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        A copy of every use case and everything needed to put it back: one zip,
        made from the database as it is right now. Keep it somewhere that
        isn&rsquo;t Casespace.
      </p>

      <a
        href="/api/backup"
        download
        className="mt-6 inline-block rounded-md bg-ink px-4 py-2.5 text-sm text-paper hover:bg-ink/85"
      >
        Download backup (.zip)
      </a>
      <p className="mt-3 max-w-prose text-sm text-ink-muted">
        Treat the file like the Wins report. It holds names, email addresses,
        and every status note — annual-ROI notes included.
      </p>

      <h2 className="mt-10 font-serif text-2xl">What&rsquo;s in it</h2>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        <code>use-cases.csv</code> is every record on one line, with names
        instead of ids, for opening in a spreadsheet. The{" "}
        <code>data/</code> folder is one JSON file per table below, each row
        exactly as stored — that is what a restore replays.
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-strong text-left text-ink-faint">
            <th className="py-2 pr-4 font-normal">Table</th>
            <th className="py-2 pr-4 font-normal">Holds</th>
            <th className="py-2 text-right font-normal">Rows now</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((name) => (
            <tr key={name} className="border-b border-hairline">
              <td className="py-2 pr-4 font-mono text-xs">{name}</td>
              <td className="py-2 pr-4 text-ink-muted">{WHAT[name] ?? ""}</td>
              <td className="py-2 text-right tabular-nums">{counts[name]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 font-serif text-2xl">What isn&rsquo;t</h2>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Coach conversations and Discovery checkpoints, which are private to the
        people who had them; API tokens; What&rsquo;s New posts; feedback;
        usage logs; and settings the seed script re-creates. The zip&rsquo;s
        README lists each one and why.
      </p>

      <h2 className="mt-10 font-serif text-2xl">Rebuilding from one</h2>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        There is no restore button, on purpose: putting a backup back is done
        from the repository, into an empty database, by someone who means to.{" "}
        <Link
          href="/docs/operations/backup"
          className="text-accent underline underline-offset-2"
        >
          The backup doc
        </Link>{" "}
        has the three commands.
      </p>
    </div>
  );
}
