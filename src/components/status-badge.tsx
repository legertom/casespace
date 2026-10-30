import { STATUS_LABELS, type UcStatus } from "@/lib/domain";

const DOT_CLASSES: Record<UcStatus, string> = {
  in_discovery: "bg-st-discovery",
  approved_by_fl: "bg-st-approved",
  under_construction: "bg-st-construction",
  in_testing: "bg-st-testing",
  launched: "bg-st-launched",
  qualified: "bg-st-qualified",
  confirmed_positive_roi: "bg-st-confirmed",
};

/** Status chip: colored dot + label, never color alone. */
export function StatusBadge({ status }: { status: UcStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-muted">
      <span
        aria-hidden
        className={`size-2 rounded-full ${DOT_CLASSES[status]}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Top-tier marker: Kate confirmed measured, positive annual ROI. */
export function ConfirmedRoiBadge() {
  return (
    <span
      title="Kate confirmed measured, positive annual ROI — counts toward the 15 (and the 45)."
      className="inline-flex items-center rounded-sm bg-st-confirmed px-1.5 py-0.5 text-xs font-semibold text-white"
    >
      Confirmed ROI
    </span>
  );
}

/**
 * A Qualified record whose ROI checklist is complete — the next move is
 * Kate's. See isReadyToConfirm. The outline of the Confirmed ROI chip, because
 * that is the decision it is waiting on; a statement of whose turn it is, not
 * a prize.
 */
export function ReadyToConfirmBadge() {
  return (
    <span
      title="Qualified, and its ROI checklist is complete. Nothing is left for the people on it to do — Kate decides whether it moves to Confirmed Positive ROI and counts toward the 15."
      className="inline-flex items-center whitespace-nowrap rounded-sm border border-st-confirmed px-1.5 py-0.5 text-xs font-medium text-st-confirmed"
    >
      Ready to confirm
    </span>
  );
}

/**
 * Marks a record logged outside the AI Leads roster.
 *
 * Only the exception is badged: in-program is the norm, and a chip on every
 * other row would be noise. Neutral styling on purpose — this is a statement
 * about which count a record belongs to, not a demotion or a prize.
 */
export function CommunityBadge() {
  return (
    <span
      title="Owned by someone outside the AI Leads roster. It lives in the casebook like any other record — it just doesn't count toward the 45 or the 15 unless an admin adds it to the program."
      className="inline-flex items-center rounded-sm border border-hairline-strong px-1.5 py-0.5 text-xs text-ink-muted"
    >
      Community
    </span>
  );
}
