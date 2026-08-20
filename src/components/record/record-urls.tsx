import { isSafeHttpUrl, urlDisplayLabel } from "@/lib/use-case-urls";
import type { UseCaseUrlEntry } from "@/server/use-case-queries";
import { EditUrls } from "./edit-urls";

/**
 * Where to find the thing itself. Its own section rather than an InlineField:
 * that editor holds one scalar draft per column, and this is a repeatable list
 * of objects. The precedent is Related workflows, which is a child table for
 * the same reason — and which this section is deliberately *not* named like.
 */
export function RecordUrls({
  useCaseId,
  urls,
  editable,
}: {
  useCaseId: string;
  urls: UseCaseUrlEntry[];
  editable: boolean;
}) {
  // Redundant with useCaseUrlSchema on purpose — see isSafeHttpUrl. The schema
  // guards the doors; this guards the anchor.
  const safe = urls.filter((u) => isSafeHttpUrl(u.url));

  return (
    <section id="where">
      <h2 className="font-serif text-2xl">Where to find it</h2>

      {safe.length === 0 ? (
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          No links yet. Point at the live tool, the repo, or the Claude
          artifact, so the next person can see it rather than read about it.
        </p>
      ) : (
        <ul className="mt-4 max-w-prose space-y-1.5">
          {safe.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-baseline gap-x-3 text-sm"
            >
              <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
                {urlDisplayLabel(u)}
              </span>
              <a
                href={u.url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="min-w-0 break-all underline decoration-hairline-strong underline-offset-2 hover:text-accent hover:decoration-accent"
              >
                {u.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {editable && <EditUrls useCaseId={useCaseId} urls={urls} />}
    </section>
  );
}
