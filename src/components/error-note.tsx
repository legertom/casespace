"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";
import { submitFeedbackAction } from "@/server/actions-feedback";

interface Props {
  /** The whole failure, so the report carries the detail and reference. */
  result: ActionResult;
  className?: string;
}

/**
 * Every error a person sees, in one shape: what happened, the underlying
 * detail, a reference that matches the server log, and a way to say something
 * about it without leaving the page.
 */
export function ErrorNote({ result, className }: Props) {
  const pathname = usePathname();
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!result.error) return null;

  function send() {
    setFailed(null);
    startTransition(async () => {
      const res = await submitFeedbackAction({
        message: message.trim() || "(no description given)",
        path: pathname,
        errorRef: result.ref,
        errorDetail: result.detail,
      });
      if (res.error) setFailed(res.error);
      else {
        setSent(true);
        setReporting(false);
        setMessage("");
      }
    });
  }

  return (
    <div
      role="alert"
      className={`border-l-2 border-accent bg-accent-wash px-4 py-3 text-sm ${className ?? ""}`}
    >
      <p>{result.error}</p>
      {result.detail && (
        <p className="mt-1.5 break-words font-mono text-xs text-ink-muted">
          {result.detail}
        </p>
      )}
      {result.ref && (
        <p className="mt-1 text-xs text-ink-faint">
          Reference {result.ref} — quote this and the server log line can be
          found.
        </p>
      )}

      {sent ? (
        <p className="mt-2 text-xs text-ink-muted">
          Thank you — that&rsquo;s recorded, with the error attached.
        </p>
      ) : reporting ? (
        <div className="mt-2">
          <label className="block text-xs text-ink-muted" htmlFor="report-what">
            What were you doing when this happened?
          </label>
          <textarea
            id="report-what"
            autoFocus
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full resize-y rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="rounded-md bg-ink px-3 py-1.5 text-xs text-paper hover:bg-ink/85 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-xs hover:bg-surface"
            >
              Cancel
            </button>
          </div>
          {failed && <p className="mt-1.5 text-xs text-flag">{failed}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="mt-2 rounded-md border border-hairline-strong bg-paper px-3 py-1.5 text-xs hover:bg-surface"
        >
          Report this
        </button>
      )}
    </div>
  );
}
