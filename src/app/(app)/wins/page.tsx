import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { DEPARTMENT_LABELS, TARGET_ROI, etDateString } from "@/lib/domain";
import { fmtDate, listNames } from "@/lib/format";
import { canViewWins } from "@/lib/permissions";
import { getWins, type WinRow } from "@/server/wins-queries";
import { CopyWins } from "@/components/wins/copy-wins";

export const metadata = { title: "Wins" };

function winMeta(w: WinRow): string {
  return [
    w.department ? DEPARTMENT_LABELS[w.department] : null,
    w.teamName,
    w.authors.length ? `by ${listNames(w.authors)}` : null,
    w.ownerName ? `owner ${w.ownerName}` : null,
    w.eltOrgName ? `counts toward ${w.eltOrgName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The whole page as one markdown document — the EOY roll-up in a paste. */
function toMarkdown(wins: WinRow[], asOf: string): string {
  const lines = [
    `# Confirmed wins — ${wins.length} of ${TARGET_ROI}`,
    "",
    `As of ${asOf}. Each entry carries the annual-ROI note recorded at confirmation.`,
  ];
  for (const w of wins) {
    lines.push("", `## ${w.title}`, "");
    lines.push(
      `- **Confirmed:** ${w.confirmedAt ? fmtDate(w.confirmedAt) : "date not recorded"}${w.confirmedByName ? ` by ${w.confirmedByName}` : ""}`,
    );
    const meta = winMeta(w);
    if (meta) lines.push(`- **Who and where:** ${meta}`);
    lines.push(
      `- **Annual ROI:** ${w.annualRoiNote ?? "no confirmation note on record"}`,
    );
    if (w.netImpactStatement) {
      lines.push(`- **Net impact:** ${w.netImpactStatement}`);
    }
  }
  return lines.join("\n");
}

export default async function WinsPage() {
  const user = await requireUser();
  if (!canViewWins(user.role)) notFound();

  const wins = await getWins();
  const asOf = etDateString(new Date());

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Wins</h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            Every workflow confirmed at positive ROI, with the annual-ROI note
            recorded at confirmation — the raw material for the end-of-year
            report. This page is admin-only: confirmation notes may carry
            dollars, and dollars stay off open surfaces.
          </p>
        </div>
        {wins.length > 0 && <CopyWins markdown={toMarkdown(wins, asOf)} />}
      </div>

      <p className="mt-8 font-serif text-2xl">
        {wins.length}
        <span className="text-lg text-ink-faint"> of {TARGET_ROI} confirmed</span>
      </p>

      {wins.length === 0 ? (
        <div className="mt-10 max-w-md">
          <p className="font-serif text-xl">No confirmed wins yet.</p>
          <p className="mt-2 text-ink-muted">
            When a Qualified record&rsquo;s ROI is measured and positive, move
            it to Confirmed Positive ROI from its record page. The required
            annual-ROI note lands here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-5">
          {wins.map((w) => (
            <li
              key={w.id}
              className="rounded-md border border-hairline bg-surface p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <Link
                  href={`/use-cases/${w.id}`}
                  className="font-serif text-xl hover:text-accent"
                >
                  {w.title}
                </Link>
                <span className="text-sm text-ink-faint">
                  Confirmed {w.confirmedAt ? fmtDate(w.confirmedAt) : "—"}
                  {w.confirmedByName ? ` · ${w.confirmedByName}` : ""}
                </span>
              </div>
              {winMeta(w) && (
                <p className="mt-1 text-xs text-ink-faint">{winMeta(w)}</p>
              )}
              <blockquote className="mt-3 border-l-2 border-st-confirmed pl-3 text-sm leading-relaxed">
                {w.annualRoiNote ?? (
                  <span className="text-ink-faint">
                    No confirmation note on record.
                  </span>
                )}
              </blockquote>
              {w.netImpactStatement && (
                <p className="mt-2 text-sm text-ink-muted">
                  Net impact: {w.netImpactStatement}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
