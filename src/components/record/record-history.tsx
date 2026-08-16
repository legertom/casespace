import { STATUS_LABELS } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { StatusChangeEntry } from "@/server/use-case-queries";

/** The movement log, birth event first (well — last; newest at the top). */
export function RecordHistory({ history }: { history: StatusChangeEntry[] }) {
  return (
    <section>
      <h2 className="font-serif text-2xl">History</h2>
      <ol className="mt-3 space-y-2.5">
        {history.map((h) => (
          <li key={h.id} className="flex gap-4 text-sm">
            <span className="w-24 shrink-0 text-ink-faint">
              {fmtDate(h.createdAt)}
            </span>
            <span>
              {h.fromStatus === null ? (
                <>Logged into the casebook at {STATUS_LABELS[h.toStatus]}</>
              ) : (
                <>
                  {STATUS_LABELS[h.fromStatus]} →{" "}
                  {STATUS_LABELS[h.toStatus]}
                </>
              )}
              {h.changedByName && (
                <span className="text-ink-faint"> · {h.changedByName}</span>
              )}
              {h.note && (
                <span className="block text-ink-muted">{h.note}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
