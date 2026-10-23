import Link from "next/link";
import { DEPARTMENT_LABELS } from "@/lib/domain";
import { roiCoachAction } from "@/lib/roi";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { InlineField } from "@/components/record/inline-field";
import { CommunityBadge, ConfirmedRoiBadge, StatusBadge } from "@/components/status-badge";
import { Coachmark } from "@/components/coachmark";

/**
 * Breadcrumb, title, badges, and the record-level actions — plus the
 * editing hint and the gate-rejection note, which only editors see.
 */
export function RecordHeader({
  uc,
  record,
  editable,
  mine,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
  /** The viewer owns, authored, or logged this record — not merely an admin who can edit it. */
  mine: boolean;
}) {
  const confirmed = uc.status === "confirmed_positive_roi";
  // Score the ROI with the Coach, or have it reviewed for confirmation —
  // one door, labelled by what the record still needs. See lib/roi.
  const roiAction = roiCoachAction(uc, editable);
  // The ROI nudge is for the person whose record it is: an admin who can edit
  // everything would otherwise meet it on every unscored record they open.
  const nudgeRoi = roiAction === "score" && mine;

  const discovery = (
    <Link
      href={`/coach?intent=discovery&useCase=${uc.id}`}
      className="block rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
    >
      Work this problem with Coach
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-ink-faint">
            <Link href="/use-cases" className="hover:text-accent">
              Use cases
            </Link>{" "}
            / {uc.department ? DEPARTMENT_LABELS[uc.department] : "Unassigned"}
          </p>
          <InlineField
            record={record}
            field="title"
            label="Title"
            value={uc.title}
            editor={{ kind: "text" }}
            canEdit={editable}
            required
          >
            <h1 className="mt-1 font-serif text-4xl leading-tight">
              {uc.title}
            </h1>
          </InlineField>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={uc.status} />
            {confirmed && <ConfirmedRoiBadge />}
            {!uc.inProgram && <CommunityBadge />}
            {uc.rejectionReason && editable && (
              <span className="text-sm text-flag">
                Rejected at the gate — see note below
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {/* Open to anyone who can see the record, unlike the two beside it:
              thinking about somebody else's problem with them is not an edit,
              and the checkpoint it produces is the thinker's own note. Its
              hint steps aside while the ROI one is showing — two marks on one
              row point at nothing. */}
          {nudgeRoi ? (
            discovery
          ) : (
            <Coachmark id="work-this-problem" note="Feeling stuck? Try this button">
              {discovery}
            </Coachmark>
          )}
          {roiAction === "score" && (
            <Coachmark
              id={`score-roi-${uc.id}`}
              note="Not scored yet. The Coach walks you through Kate's three steps and drafts the record for you to confirm."
            >
              <Link
                href={`/coach?review=${uc.id}`}
                className="block rounded-md bg-accent px-3.5 py-1.5 text-sm text-white hover:bg-accent-deep"
              >
                Score the ROI with the Coach
              </Link>
            </Coachmark>
          )}
          {roiAction === "review" && (
            <Link
              href={`/coach?review=${uc.id}`}
              className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
            >
              Review the ROI for confirmation
            </Link>
          )}
          {editable && (
            <Link
              href={`/use-cases/${uc.id}/edit`}
              className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
            >
              Edit everything
            </Link>
          )}
        </div>
      </div>

      {editable && (
        <p className="mt-4 text-sm text-ink-faint">
          Click any field to edit it in place. Highlight any text to ask the
          Coach about it.
        </p>
      )}

      {uc.rejectionReason && editable && (
        <div className="mt-6 max-w-2xl border-l-2 border-flag bg-surface px-4 py-3">
          <p className="text-sm">
            <strong>Rejected at the Qualified gate.</strong>{" "}
            {uc.rejectionReason}
          </p>
        </div>
      )}
    </>
  );
}
