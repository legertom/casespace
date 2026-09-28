"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMeetingGroupRunAction } from "@/server/actions-live-groups";

export function GroupRunControls({ id, showPrint = true }: { id: string; showPrint?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function deleteRun() {
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
  }
  return <div className="flex flex-wrap items-center gap-3 print:hidden">
    {showPrint && <button type="button" onClick={() => window.print()} className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface">Print or save PDF</button>}
    {!confirming ? <button type="button" onClick={() => { setConfirming(true); setError(null); }} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete attempt</button>
      : <span role="group" aria-label="Confirm deletion" className="flex flex-wrap items-center gap-2 text-sm">
        <span>Delete this attempt and its report permanently?</span>
        <button type="button" disabled={deleting} onClick={() => setConfirming(false)} className="rounded-md border border-hairline-strong px-3 py-1.5 hover:bg-surface">Cancel</button>
        <button type="button" disabled={deleting} onClick={deleteRun} className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{deleting ? "Deleting…" : "Delete permanently"}</button>
      </span>}
    {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
  </div>;
}
