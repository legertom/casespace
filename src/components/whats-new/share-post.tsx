"use client";

import { useEffect, useRef, useState } from "react";
import { PUBLIC_DESCRIPTION } from "@/lib/public-meta";

/**
 * Share a post: a button opening a dialog with the permalink ready to copy
 * and a preview of the unfurl. Casespace is sign-in only — scrapers bounce
 * to /signin, so a pasted link previews as the app's own card everywhere
 * (Slack, iMessage), never as the post body. The preview shows that card,
 * so the sharer sees exactly what their recipient will.
 */
export function SharePostButton({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // The URL arrives focused and selected — ⌘C works before any click.
  useEffect(() => {
    if (open) urlRef.current?.select();
    else setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
      >
        Share
      </button>

      {open && (
        <ShareDialog
          url={`${window.location.origin}/whats-new/${weekStart}`}
          host={window.location.host}
          copied={copied}
          urlRef={urlRef}
          onCopy={async (url) => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              // Clipboard blocked — leave the URL selected for a manual ⌘C.
              urlRef.current?.select();
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareDialog({
  url,
  host,
  copied,
  urlRef,
  onCopy,
  onClose,
}: {
  url: string;
  host: string;
  copied: boolean;
  urlRef: React.RefObject<HTMLInputElement | null>;
  onCopy: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-post-heading"
        className="relative w-full max-w-md rounded-lg border border-hairline-strong bg-paper p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="share-post-heading" className="font-serif text-xl">
            Share this post
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-ink-faint hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            ref={urlRef}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Link to this post"
            className="min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink-muted"
          />
          <button
            type="button"
            onClick={() => onCopy(url)}
            className="shrink-0 rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          How the link previews
        </p>
        <div className="mt-2 overflow-hidden rounded-md border border-hairline bg-surface">
          {/* The real card: /opengraph-image is what scrapers are served. */}
          <img
            src="/opengraph-image"
            alt="Casespace — Clever's AI use-case casebook and program scoreboard"
            className="aspect-[1200/630] w-full border-b border-hairline object-cover"
          />
          <div className="p-3">
            <p className="text-xs text-ink-faint">{host}</p>
            <p className="mt-0.5 text-sm font-semibold">Casespace</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-muted">
              {PUBLIC_DESCRIPTION}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Casespace is sign-in only, so pasted links unfurl as the app&rsquo;s
          card — the post itself stays behind sign-in. Teammates who open the
          link land right on this week.
        </p>
      </div>
    </div>
  );
}
