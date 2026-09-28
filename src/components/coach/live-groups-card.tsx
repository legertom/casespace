"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MeetingContext, MeetingPlan } from "@/lib/ai/meeting-breakouts";
import {
  formLiveMeetingGroupsAction,
  listLiveMeetingLeadsAction,
  reviewLiveMeetingCasesAction,
} from "@/server/actions-live-groups";

interface LiveLead {
  id: string;
  name: string;
  department: string;
  teams: string[];
}

interface ChosenGroups {
  kind: "live_groups_choice";
  method: "jev" | "opus";
  groups: { names: string[]; rationale?: string }[];
}

/** The selected plan stays readable in the saved conversation. */
export function ChosenLiveGroups({ output }: { output: unknown }) {
  let choice: ChosenGroups | null = null;
  try {
    const parsed = JSON.parse(String(output)) as ChosenGroups;
    if (parsed.kind === "live_groups_choice" && Array.isArray(parsed.groups) &&
      parsed.groups.every((group) => Array.isArray(group.names))) choice = parsed;
  } catch { /* Earlier conversations may contain plain text output. */ }
  if (!choice) return <div className="my-3 rounded-md border border-hairline-strong p-3 text-sm">{String(output)}</div>;
  return (
    <section className="my-3 rounded-md border border-hairline-strong p-3 text-sm" aria-label="Chosen live groups">
      <h3 className="font-medium text-ink">Chosen live groups · {choice.method === "jev" ? "Jev" : "Claude Opus"}</h3>
      <ol className="mt-2 space-y-2">
        {choice.groups.map((group, i) => (
          <li key={i}>
            <strong>Group {i + 1}:</strong> {group.names.join(", ")}
            {group.rationale && (
              <details className="mt-1 text-xs text-ink-muted">
                <summary className="cursor-pointer">Why this group?</summary>
                <p className="mt-1">{group.rationale}</p>
              </details>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-ink-muted">Ask each group to find a shared thread in their work. Then give everyone a turn to share the obstacle they brought and choose one next step together.</p>
    </section>
  );
}

export function LiveGroupsCard({ onDecision }: { onDecision: (result: string) => void }) {
  const [leads, setLeads] = useState<LiveLead[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [context, setContext] = useState<MeetingContext | null>(null);
  const [plans, setPlans] = useState<Partial<Record<"jev" | "opus", MeetingPlan>>>({});
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [running, setRunning] = useState<"jev" | "opus" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<"jev" | "opus" | null>(null);

  useEffect(() => {
    let active = true;
    void listLiveMeetingLeadsAction().then((result) => {
      if (!active) return;
      if (result.error) setError(result.error);
      else setLeads(result.leads ?? []);
      setLoading(false);
    }).catch(() => {
      if (active) { setError("Could not load the AI Leads roster."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  function toggle(id: string) {
    if (chosen || running || reviewing) return;
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    setContext(null);
    setPlans({});
    setError(null);
  }

  async function review() {
    setReviewing(true);
    setError(null);
    try {
      const result = await reviewLiveMeetingCasesAction(selected);
      if (result.error) setError(result.error);
      else setContext(result.context ?? null);
    } catch {
      setError("Could not read the selected use cases.");
    } finally {
      setReviewing(false);
    }
  }

  async function form(method: "jev" | "opus") {
    setRunning(method);
    setError(null);
    try {
      const result = await formLiveMeetingGroupsAction(selected, method);
      if (result.error) setError(result.error);
      else if (result.plan) setPlans((current) => ({ ...current, [method]: result.plan }));
    } catch {
      setError(`Could not run ${method === "jev" ? "Jev" : "Claude Opus"}.`);
    } finally {
      setRunning(null);
    }
  }

  function choose(method: "jev" | "opus") {
    const plan = plans[method];
    if (!plan || !context) return;
    setChosen(method);
    const byId = new Map(context.attendees.map((lead) => [lead.id, lead.name]));
    const choice: ChosenGroups = {
      kind: "live_groups_choice",
      method,
      groups: plan.groups.map((group) => ({
        names: group.memberIds.map((id) => byId.get(id) ?? "Unknown attendee"),
        rationale: group.rationale,
      })),
    };
    onDecision(JSON.stringify(choice));
  }

  const byDepartment = new Map<string, LiveLead[]>();
  for (const lead of leads) {
    const group = byDepartment.get(lead.department) ?? [];
    group.push(lead);
    byDepartment.set(lead.department, group);
  }
  const names = new Map(context?.attendees.map((lead) => [lead.id, lead.name]) ?? []);

  return (
    <section className="my-3 rounded-lg border border-hairline-strong bg-paper p-4" aria-label="Form live AI Leads groups">
      <h3 className="font-serif text-lg text-ink">Form live groups</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Click the AI Leads here today. Review their recorded work, then compare two groupings.
      </p>
      {loading && <p className="mt-3 text-sm text-ink-faint">Loading the AI Leads roster…</p>}
      {!loading && [...byDepartment.entries()].map(([department, members]) => (
        <div key={department} className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {department.replaceAll("_", " ")}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((lead) => {
              const active = selected.includes(lead.id);
              return (
                <button
                  key={lead.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(lead.id)}
                  disabled={Boolean(chosen || running || reviewing)}
                  className={`rounded-md border px-2.5 py-1.5 text-sm ${active
                    ? "border-accent bg-accent-wash text-ink"
                    : "border-hairline-strong text-ink-muted hover:bg-surface"}`}
                >
                  {lead.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!chosen && (
        <button
          type="button"
          onClick={() => void review()}
          disabled={selected.length < 2 || reviewing || Boolean(running)}
          className="mt-5 rounded-md bg-ink px-3.5 py-2 text-sm text-paper disabled:opacity-50"
        >
          {reviewing ? "Reading use cases…" : `Review use cases for ${selected.length} selected leads`}
        </button>
      )}

      {context && (
        <div className="mt-5 border-t border-hairline pt-4">
          <h4 className="font-medium text-ink">Use cases credited to the selected leads</h4>
          <p className="mt-1 text-xs text-ink-faint">
            Only these {context.attendees.length} attendees enter either grouping method.
          </p>
          <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-2">
            {context.attendees.map((lead) => (
              <div key={lead.id} className="rounded-md border border-hairline p-2.5">
                <p className="font-medium text-ink">{lead.name} <span className="font-normal text-ink-faint">· {lead.cases.length} use cases</span></p>
                {lead.cases.length === 0 && <p className="mt-1 text-xs text-ink-faint">No credited use cases yet.</p>}
                {lead.cases.map((uc) => (
                  <details key={uc.id} className="mt-1 text-xs">
                    <summary className="cursor-pointer text-accent">{uc.title} ({uc.role})</summary>
                    <p className="mt-1 text-ink-muted">{uc.description}</p>
                    <Link href={`/use-cases/${uc.id}`} className="mt-1 inline-block underline underline-offset-2">Open record</Link>
                  </details>
                ))}
              </div>
            ))}
          </div>
          {!chosen && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void form("jev")} disabled={Boolean(running)} className="rounded-md border border-hairline-strong px-3 py-2 text-sm hover:bg-surface disabled:opacity-50">
                {running === "jev" ? "Jev is choosing…" : "Method A · Jev"}
              </button>
              <button type="button" onClick={() => void form("opus")} disabled={Boolean(running)} className="rounded-md border border-hairline-strong px-3 py-2 text-sm hover:bg-surface disabled:opacity-50">
                {running === "opus" ? "Claude Opus is grouping…" : "Method B · Claude Opus"}
              </button>
            </div>
          )}
        </div>
      )}

      {(["jev", "opus"] as const).map((method) => {
        const plan = plans[method];
        if (!plan) return null;
        return (
          <div key={method} className="mt-4 rounded-md border border-hairline-strong p-3">
            <h4 className="font-medium text-ink">{method === "jev" ? "Method A · Jev" : "Method B · Claude Opus"}</h4>
            {plan.note && <p className="mt-1 text-xs text-ink-faint">{plan.note}</p>}
            <ol className="mt-2 space-y-2 text-sm">
              {plan.groups.map((group, i) => (
                <li key={i}>
                  <strong>Group {i + 1}:</strong> {group.memberIds.map((id) => names.get(id)).join(", ")}
                  {group.rationale && (
                    <details className="mt-1 text-xs text-ink-muted">
                      <summary className="cursor-pointer">Why this group?</summary>
                      <p className="mt-1">{group.rationale}</p>
                    </details>
                  )}
                </li>
              ))}
            </ol>
            {!chosen && <button type="button" onClick={() => choose(method)} className="mt-3 rounded-md bg-ink px-3 py-1.5 text-xs text-paper">Use this plan</button>}
            {chosen === method && <p className="mt-2 text-xs text-ink-muted">Chosen for this meeting.</p>}
          </div>
        );
      })}

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
