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

/** Derived top-tier marker: Qualified with complete, positive ROI. */
export function QualifiedPlusBadge() {
  return (
    <span className="inline-flex items-center rounded-sm bg-st-qualifiedplus px-1.5 py-0.5 text-xs font-semibold text-white">
      Qualified+
    </span>
  );
}
