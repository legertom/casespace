import {
  STATUS_LABELS,
  type UcStatus,
} from "@/lib/domain";

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
