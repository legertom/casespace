"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPatAction, revokePatAction } from "@/server/actions-pats";

interface PatRow {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
}

export function PatManager({ tokens }: { tokens: PatRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {freshToken && (
        <div className="mb-6 rounded-md border border-hairline-strong bg-surface p-4">
          <p className="text-sm font-semibold">
            Your new token — shown once, never again.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-accent-wash px-2 py-1 text-sm">
              {freshToken}
            </code>
            <button
              type="button"
              className="rounded-md border border-hairline-strong px-2.5 py-1 text-sm hover:bg-paper"
              onClick={async () => {
                await navigator.clipboard.writeText(freshToken);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setCopied(false);
          startTransition(async () => {
            const res = await createPatAction(name);
            if (res.error) setError(res.error);
            else if (res.token) {
              setFreshToken(res.token);
              setName("");
              router.refresh();
            }
          });
        }}
      >
        <label className="text-sm">
          <span className="block font-medium">New token name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Claude Code on my laptop"
            className="mt-1.5 w-64 rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-md bg-ink px-3.5 py-2 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
        >
          Create token
        </button>
        {error && (
          <p role="alert" className="w-full text-sm text-accent">
            {error}
          </p>
        )}
      </form>

      {tokens.length > 0 && (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-strong text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Token</th>
              <th className="py-2 pr-4 font-medium">Last used</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-hairline ${t.revoked ? "text-ink-faint line-through" : ""}`}
              >
                <td className="py-2 pr-4">{t.name}</td>
                <td className="py-2 pr-4">
                  <code>{t.tokenPrefix}…</code>
                </td>
                <td className="py-2 pr-4">
                  {t.revoked ? "revoked" : t.lastUsedAt ?? "never"}
                </td>
                <td className="py-2 text-right">
                  {!t.revoked && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await revokePatAction(t.id);
                          router.refresh();
                        })
                      }
                      className="text-ink-faint underline-offset-2 hover:text-accent hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
