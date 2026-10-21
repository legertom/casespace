import {
  fmtHours,
  fmtPayback,
  fmtPct,
  ROI_MISSING_TEXT,
  type RoiResult,
} from "@/lib/roi";

/**
 * The computed ROI as the form, the record page and the proposal flow show
 * it — one component so a number never reads differently in two places.
 * Payback always sits beside ROI: 35% with a nine-month payback is a
 * different story from 35% with a three-year one.
 *
 * No hooks, so it renders from server and client components alike.
 */
export function RoiReadout({
  result,
  label,
  compare,
  className,
}: {
  result: RoiResult;
  label: "Expected" | "Actual";
  /** The plan, shown beside an actual so the two can be read together. */
  compare?: RoiResult;
  className?: string;
}) {
  if (!result.ok) {
    return (
      <p className={`text-xs text-ink-faint ${className ?? ""}`}>
        {label} ROI: not worked out yet. {ROI_MISSING_TEXT[result.reason]}
      </p>
    );
  }
  const f = result.figures;
  const negative = f.yearOneRoiPct < 0;
  return (
    <div
      className={`rounded-md border border-hairline bg-paper p-3 text-sm ${className ?? ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label} ROI
      </p>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        ({fmtHours(f.hoursSavedPerYear)} − {fmtHours(f.buildHours)}) ÷{" "}
        {fmtHours(f.buildHours)} × 100
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        <Kv
          k="Year one"
          v={fmtPct(f.yearOneRoiPct)}
          className={negative ? "text-flag" : ""}
          hero
        />
        <Kv k="Payback" v={fmtPayback(f.paybackMonths)} />
        <Kv k="Hours saved a year" v={fmtHours(f.hoursSavedPerYear)} />
        {f.yearTwoRoiPct !== null && (
          <Kv k="Year two" v={fmtPct(f.yearTwoRoiPct)} />
        )}
        <Kv k="Two years" v={fmtPct(f.twoYearRoiPct)} />
        {compare?.ok && (
          <Kv k="Expected was" v={fmtPct(compare.figures.yearOneRoiPct)} />
        )}
      </dl>
      {negative && (
        <p className="mt-2 text-xs text-ink-muted">
          Negative in year one is a result, not a failure — report it with
          the payback and the year-two figure. Never invent a year-end number.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-faint">
        In hours, never dollars. At one rate for build time and saved time it
        is the same percentage — which is the workshop&rsquo;s assumption too.
      </p>
    </div>
  );
}

function Kv({
  k,
  v,
  hero = false,
  className = "",
}: {
  k: string;
  v: string;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{k}</dt>
      <dd className={`${hero ? "text-lg font-medium" : ""} ${className}`}>{v}</dd>
    </div>
  );
}
