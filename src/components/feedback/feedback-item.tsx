"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveFeedbackAction } from "@/server/actions-feedback";

interface Item {
  id: string;
  message: string;
  path: string | null;
  errorRef: string | null;
  errorDetail: string | null;
  resolvedAt: Date | null;
  createdAt: string;
  reporterName: string | null;
}

export function FeedbackItem({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const resolved = !!item.resolvedAt;

  return (
    <li
      className={`rounded-md border border-hairline bg-surface p-4 ${resolved ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-faint">
          {item.reporterName ?? "Someone"} · {item.createdAt}
          {item.path && <span> · {item.path}</span>}
          {item.errorRef && <span> · ref {item.errorRef}</span>}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resolveFeedbackAction(item.id, !resolved);
              router.refresh();
            })
          }
          className="rounded-md border border-hairline-strong px-2.5 py-1 text-xs hover:bg-paper disabled:opacity-60"
        >
          {resolved ? "Reopen" : "Mark resolved"}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
        {item.message}
      </p>
      {item.errorDetail && (
        <p className="mt-2 break-words font-mono text-xs text-ink-muted">
          {item.errorDetail}
        </p>
      )}
    </li>
  );
}
