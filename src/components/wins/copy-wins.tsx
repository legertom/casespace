"use client";

import { useState } from "react";

/** Copies the pre-rendered markdown roll-up — the EOY report in one paste. */
export function CopyWins({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
    >
      {copied ? "Copied" : "Copy as Markdown"}
    </button>
  );
}
