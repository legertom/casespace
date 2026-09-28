"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMeetingGroupRunAction } from "@/server/actions-live-groups";

export function GroupRunControls({ id, showPrint = true }: { id: string; showPrint?: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="flex items-center gap-3 print:hidden">
    {showPrint && <button type="button" onClick={() => window.print()} className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface">Print or save PDF</button>}
    <button type="button" disabled={deleting} onClick={async () => {
      if (!window.confirm("Delete this saved grouping attempt and its report?")) return;
      setDeleting(true);
      setError(null);
      try {
        const result = await deleteMeetingGroupRunAction(id);
        if (result.error) { setError(result.error); setDeleting(false); return; }
        router.push("/groups");
        router.refresh();
      } catch {
        setError("Could not delete this attempt.");
        setDeleting(false);
      }
    }} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">{deleting ? "Deleting…" : "Delete attempt"}</button>
    {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
  </div>;
}
