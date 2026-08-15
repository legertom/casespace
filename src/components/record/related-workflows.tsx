import Link from "next/link";
import { groupLinks, type RecordLink } from "@/lib/use-case-links";
import type { LinkableUseCase } from "@/server/use-case-link-queries";
import { LinkWorkflow, UnlinkButton } from "./link-workflow";

interface Props {
  useCaseId: string;
  links: RecordLink[];
  candidates: LinkableUseCase[];
  currentUserId: string;
  /** Whether this reader may link workflows at all — every AI lead may. */
  canLink: boolean;
  /** True for someone who can edit this record: they can drop any link on it. */
  canEditRecord: boolean;
  isAdmin: boolean;
}

/**
 * How this workflow sits against the others. Both ends of every link show
 * here, the far end under its inverse heading, so a record always says what
 * it builds on *and* what builds on it.
 */
export function RelatedWorkflows({
  useCaseId,
  links,
  candidates,
  currentUserId,
  canLink,
  canEditRecord,
  isAdmin,
}: Props) {
  const groups = groupLinks(links);
  const removable = (link: RecordLink) =>
    isAdmin || canEditRecord || link.createdById === currentUserId;

  return (
    <section id="related">
      <h2 className="font-serif text-2xl">Related workflows</h2>

      {groups.length === 0 ? (
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          Nothing linked yet. Link a workflow when this one builds on it,
          repeats it, or belongs beside it — any AI lead can, on any record.
        </p>
      ) : (
        <div className="mt-4 max-w-prose space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {group.label}
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {group.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
                  >
                    <Link
                      href={`/use-cases/${link.otherId}`}
                      className="underline decoration-hairline-strong underline-offset-2 hover:text-accent hover:decoration-accent"
                    >
                      {link.otherTitle}
                    </Link>
                    <span className="flex items-baseline gap-3 text-xs text-ink-faint">
                      {link.otherOwnerName && <span>{link.otherOwnerName}</span>}
                      {removable(link) && (
                        <UnlinkButton id={link.id} title={link.otherTitle} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {canLink && (
        <LinkWorkflow
          useCaseId={useCaseId}
          candidates={candidates}
          linkedIds={links.map((l) => l.otherId)}
        />
      )}
    </section>
  );
}
