"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MeetingAttendee } from "@/lib/ai/meeting-breakouts";
import {
  addMeetingLatecomerAction,
  listLiveMeetingLeadsAction,
  reviewLiveMeetingCasesAction,
} from "@/server/actions-live-groups";

interface LeadOption { id: string; name: string; department: string }

export function LatecomerControls({
  runId, attendeeIds, groupSizes, method,
}: {
  runId: string;
  attendeeIds: string[];
  groupSizes: number[];
  method: "jev" | "opus";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [selected, setSelected] = useState("");
  const [reviewed, setReviewed] = useState<MeetingAttendee | null>(null);
  const [busy, setBusy] = useState<"loading" | "reviewing" | "placing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seats = groupSizes.filter((size) => size < 5).length;

  async function showPicker() {
    setOpen(true);
    if (leads.length) return;
    setBusy("loading");
    setError(null);
    try {
      const result = await listLiveMeetingLeadsAction();
      if (result.error) setError(result.error);
      else setLeads((result.leads ?? []).filter((lead) => !attendeeIds.includes(lead.id)));
    } catch {
      setError("Could not load the AI Leads roster.");
    } finally {
      setBusy(null);
    }
  }

  async function review() {
    setBusy("reviewing");
    setError(null);
    try {
      const result = await reviewLiveMeetingCasesAction([...attendeeIds, selected]);
      if (result.error) setError(result.error);
      else setReviewed(result.context?.attendees.find((lead) => lead.id === selected) ?? null);
    } catch {
      setError("Could not review this lead's use cases.");
    } finally {
      setBusy(null);
    }
  }

  async function place() {
    setBusy("placing");
    setError(null);
    try {
      const result = await addMeetingLatecomerAction(runId, selected);
      if (result.error) setError(result.error);
      else if (result.runId) {
        router.push(`/groups/${result.runId}`);
        router.refresh();
      }
    } catch {
      setError("Could not place this latecomer.");
    } finally {
      setBusy(null);
    }
  }

  return <section id="add-latecomer" className="rounded-lg border border-hairline-strong bg-paper p-4 print:hidden" aria-label="Add a latecomer">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl">Someone arrived late?</h2>
        <p className="mt-1 text-sm text-ink-muted">Add one AI Lead while keeping everyone already assigned in their group. A new report saves automatically.</p>
      </div>
      {!open && <button type="button" onClick={() => void showPicker()} disabled={seats === 0} className="rounded-md bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50">Add latecomer</button>}
    </div>
    {seats === 0 && <p className="mt-3 text-sm text-ink-muted">Every group already has five people. Form new groups to make room; a locked placement would leave the latecomer alone.</p>}
    {open && seats > 0 && <div className="mt-4 border-t border-hairline pt-4">
      <p className="text-sm font-medium">Who joined?</p>
      <p className="mt-1 text-xs text-ink-faint">Only rostered AI Leads who are not already assigned appear here.</p>
      {busy === "loading" && <p className="mt-3 text-sm text-ink-muted">Loading AI Leads…</p>}
      <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
        {leads.map((lead) => <button key={lead.id} type="button" aria-pressed={selected === lead.id}
          disabled={Boolean(busy)} onClick={() => { setSelected(lead.id); setReviewed(null); setError(null); }}
          className={`rounded-md border px-2.5 py-1.5 text-sm ${selected === lead.id ? "border-accent bg-accent-wash text-ink" : "border-hairline-strong text-ink-muted hover:bg-surface"}`}>{lead.name}</button>)}
      </div>
      {!busy && leads.length === 0 && !error && <p className="mt-2 text-sm text-ink-muted">No unassigned AI Leads remain on the roster.</p>}
      {selected && !reviewed && <button type="button" disabled={Boolean(busy)} onClick={() => void review()} className="mt-4 rounded-md border border-hairline-strong px-3 py-2 text-sm hover:bg-surface disabled:opacity-50">{busy === "reviewing" ? "Reading use cases…" : "Review this lead's use cases"}</button>}
      {reviewed && <div className="mt-4 rounded-md border border-hairline p-3 text-sm">
        <p className="font-medium">{reviewed.name} · {reviewed.cases.length} credited {reviewed.cases.length === 1 ? "use case" : "use cases"}</p>
        {reviewed.cases.length ? <ul className="mt-2 list-disc pl-5 text-ink-muted">{reviewed.cases.map((uc) => <li key={uc.id}>{uc.title}</li>)}</ul>
          : <p className="mt-1 text-ink-muted">No credited use cases yet.</p>}
        <button type="button" disabled={Boolean(busy)} onClick={() => void place()} className="mt-3 rounded-md bg-ink px-3 py-2 text-paper disabled:opacity-50">{busy === "placing" ? "Placing and saving…" : `Place with ${method === "jev" ? "Jev" : "Claude Opus"}`}</button>
      </div>}
      <button type="button" disabled={Boolean(busy)} onClick={() => { setOpen(false); setSelected(""); setReviewed(null); setError(null); }} className="mt-3 block text-xs text-ink-muted underline disabled:opacity-50">Cancel</button>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
