import Link from "next/link";
import { DEPARTMENT_LABELS } from "@/lib/domain";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { InlineField } from "@/components/record/inline-field";
import { ConfirmedRoiBadge, StatusBadge } from "@/components/status-badge";

/**
 * Breadcrumb, title, badges, and the record-level actions — plus the
 * editing hint and the gate-rejection note, which only editors see.
 */
export function RecordHeader({
  uc,
  record,
  editable,
  isAdmin,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
  isAdmin: boolean;
}) {
  const confirmed = uc.status === "confirmed_positive_roi";
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
            {uc.rejectionReason && editable && (
              <span className="text-sm text-flag">
                Rejected at the gate — see note below
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(editable || isAdmin) &&
            (uc.status === "launched" || uc.status === "qualified") && (
              <Link
                href={`/coach?review=${uc.id}`}
                className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
              >
                Run ROI review
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
