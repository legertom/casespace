"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
} from "@/lib/domain";
import {
  addLeadAction,
  addTeamAction,
  removeLeadAction,
  setLeadStateAction,
  setLeadTeamsAction,
  updateLeadEmailAction,
} from "@/server/actions-roster";
import { PeoplePicker, type PersonOption } from "@/components/people-picker";
import type { PersonRef } from "@/lib/use-case-input";

interface TeamOpt {
  id: string;
  name: string;
  department: Department;
}

const inputCls =
  "rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-sm";

export function LeadRowAdmin({
  lead,
  allTeams,
}: {
  lead: {
    id: string;
    email: string;
    emailUnverified: boolean;
    state: "assigned" | "unassigned" | "pending";
    department: Department;
    teams: { id: string; name: string }[];
  };
  allTeams: TeamOpt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(lead.email);
  const [editingTeams, setEditingTeams] = useState(false);
  const [teamIds, setTeamIds] = useState(lead.teams.map((t) => t.id));
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-hairline pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`email-${lead.id}`}>
          Email for this lead
        </label>
        <input
          id={`email-${lead.id}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputCls} w-72`}
        />
        {email !== lead.email && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateLeadEmailAction(lead.id, email))}
            className="rounded-md bg-ink px-2.5 py-1.5 text-sm text-paper disabled:opacity-60"
          >
            Save email
          </button>
        )}
        {lead.emailUnverified && (
          <span className="rounded-sm bg-accent-wash px-1.5 py-0.5 text-xs text-accent-deep">
            unverified placeholder
          </span>
        )}
        <select
          aria-label="Lead state"
          value={lead.state}
          disabled={pending}
          onChange={(e) =>
            run(() =>
              setLeadStateAction(
                lead.id,
                e.target.value as "assigned" | "unassigned" | "pending",
              ),
            )
          }
          className={inputCls}
        >
          <option value="assigned">Assigned</option>
          <option value="pending">Pending</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <button
          type="button"
          onClick={() => setEditingTeams((v) => !v)}
          className="text-sm text-ink-muted underline-offset-2 hover:text-accent hover:underline"
        >
          {editingTeams ? "Close teams" : "Reassign teams"}
        </button>
        {!confirmRemove ? (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="text-sm text-ink-faint underline-offset-2 hover:text-accent hover:underline"
          >
            Remove
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm">
            Remove from roster?
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeLeadAction(lead.id))}
              className="rounded-md bg-accent px-2 py-1 text-white"
            >
              Yes
            </button>
            <button type="button" onClick={() => setConfirmRemove(false)}>
              No
            </button>
          </span>
        )}
      </div>
      {editingTeams && (
        <div className="flex flex-wrap items-center gap-3">
          {allTeams
            .filter((t) => t.department === lead.department)
            .map((t) => (
              <label key={t.id} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={teamIds.includes(t.id)}
                  onChange={(e) =>
                    setTeamIds((ids) =>
                      e.target.checked
                        ? [...ids, t.id]
                        : ids.filter((x) => x !== t.id),
                    )
                  }
                />
                {t.name}
              </label>
            ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setLeadTeamsAction(lead.id, teamIds))}
            className="rounded-md bg-ink px-2.5 py-1 text-sm text-paper disabled:opacity-60"
          >
            Save teams
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddLeadForm({
  people,
  allTeams,
}: {
  people: PersonOption[];
  allTeams: TeamOpt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState<PersonRef[]>([]);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<Department>("css");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState("");

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <h2 className="font-serif text-xl">Add an AI Lead</h2>
      <div className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <PeoplePicker
          label="Person"
          hint="From the directory (or as written)."
          people={people}
          value={person}
          onChange={setPerson}
        />
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputCls} mt-1.5 block w-full font-normal`}
          />
        </label>
        <label className="block text-sm font-medium">
          Department
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value as Department);
              setTeamIds([]);
            }}
            className={`${inputCls} mt-1.5 block w-full font-normal`}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium">Teams supported</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {allTeams
              .filter((t) => t.department === department)
              .map((t) => (
                <label key={t.id} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={teamIds.includes(t.id)}
                    onChange={(e) =>
                      setTeamIds((ids) =>
                        e.target.checked
                          ? [...ids, t.id]
                          : ids.filter((x) => x !== t.id),
                      )
                    }
                  />
                  {t.name}
                </label>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              placeholder="New team name…"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              className={`${inputCls} flex-1`}
              aria-label="New team name"
            />
            <button
              type="button"
              disabled={pending || !newTeam.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await addTeamAction({ name: newTeam, department });
                  if (res.error) setError(res.error);
                  else {
                    setNewTeam("");
                    router.refresh();
                  }
                });
              }}
              className="rounded-md border border-hairline-strong px-2.5 py-1.5 text-sm disabled:opacity-60"
            >
              Add team
            </button>
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || person.length === 0 || !email}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await addLeadAction({
                name: person[0].displayName,
                email,
                department,
                personId: person[0].personId ?? null,
                teamIds,
              });
              if (res.error) setError(res.error);
              else {
                setPerson([]);
                setEmail("");
                setTeamIds([]);
                router.refresh();
              }
            });
          }}
          className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add to roster"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
