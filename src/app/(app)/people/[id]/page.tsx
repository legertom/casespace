import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  DEPARTMENT_LABELS,
  countsTowardDocumented,
  countsTowardRoi,
} from "@/lib/domain";
import { creditsIdentity } from "@/lib/people-match";
import { listUseCases, type UseCaseRow } from "@/server/use-case-queries";
import { myProfile, personProfile } from "@/server/person-profile";
import { CommunityBadge, StatusBadge } from "@/components/status-badge";

/**
 * `me` is a reserved id, not a person: directory ids are UUIDs, so it can
 * never collide with one. It exists so the header can link somewhere fixed —
 * and so the two-thirds of Clever with no directory row still have a page.
 *
 * Cached per request: the metadata and the page body both need the name.
 */
const load = cache(async (id: string) => {
  const user = await requireUser();
  // A hand-typed or truncated id is caught inside personProfile and comes
  // back null, so a bad link 404s instead of showing an error page.
  const profile = id === "me" ? await myProfile(user) : await personProfile(id);
  if (!profile) return null;
  const isMe =
    profile.identity.userId === user.id ||
    (user.personId !== null && profile.personId === user.personId);
  return { user, profile, isMe };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await load(id);
  return { title: loaded ? loaded.profile.name : "Person" };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await load(id);
  if (!loaded) notFound();
  const { profile, isMe } = loaded;

  // Your own page asks the wider question — everything you logged as well as
  // everything you're credited on — so a record you filed and forgot to put
  // your name on is still somewhere you can find it. `mine` is a superset of
  // `credits`, so one fetch answers both halves.
  const rows = await listUseCases(
    isMe ? { mine: profile.identity } : { credits: profile.identity },
  );
  const credited = rows.filter((r) => creditsIdentity(r, profile.identity));
  const loggedOnly = isMe
    ? rows.filter((r) => !creditsIdentity(r, profile.identity))
    : [];

  const documented = credited.filter((r) =>
    countsTowardDocumented(r.status),
  ).length;
  const confirmed = credited.filter((r) => countsTowardRoi(r.status)).length;

  const casebookHref = profile.personId
    ? `/use-cases?person=${profile.personId}`
    : "/use-cases?mine=1";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{profile.name}</h1>
          <p className="mt-2 text-ink-muted">
            {[
              profile.title,
              profile.lead
                ? `AI Lead — ${DEPARTMENT_LABELS[profile.lead.department]}`
                : null,
              profile.lead?.teams.map((t) => t.name).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ") || "At Clever."}
          </p>
          {profile.email && (
            <p className="mt-1 text-sm">
              <a
                href={`mailto:${profile.email}`}
                className="text-ink-muted underline-offset-2 hover:text-accent hover:underline"
              >
                {profile.email}
              </a>
              {profile.lead?.emailUnverified && (
                <span className="ml-2 rounded-sm bg-accent-wash px-1.5 py-0.5 text-xs text-accent-deep">
                  unverified
                </span>
              )}
            </p>
          )}
        </div>
        {isMe && (
          <Link
            href="/profile"
            className="text-sm text-accent underline underline-offset-2"
          >
            MCP &amp; API
          </Link>
        )}
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline-strong pb-2">
          <h2 className="font-serif text-2xl">
            {isMe ? "Your use cases" : `Use cases crediting ${firstName(profile.name)}`}
          </h2>
          {credited.length > 0 && (
            <Link
              href={casebookHref}
              className="text-sm text-accent underline underline-offset-2"
            >
              Filter and search these in the casebook
            </Link>
          )}
        </div>
        <p className="mt-3 text-ink-muted">
          {credited.length === 0
            ? isMe
              ? "Nothing credits you yet."
              : `Nothing credits ${firstName(profile.name)} yet.`
            : `${count(credited.length, "use case")} — owned or authored. ` +
              `${documented} counting toward the 45, ${confirmed} confirmed.`}
        </p>
        {credited.length === 0 ? (
          <p className="mt-2 max-w-md text-ink-muted">
            {isMe ? (
              <>
                Built something with AI, however small?{" "}
                <Link
                  href="/use-cases/new"
                  className="text-accent underline underline-offset-2"
                >
                  Log it in five minutes.
                </Link>
              </>
            ) : (
              <>
                Credit is typed by hand on each record, so a record of theirs
                may simply not name them yet.
              </>
            )}
          </p>
        ) : (
          <RecordList rows={credited} />
        )}
      </section>

      {loggedOnly.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-hairline-strong pb-2 font-serif text-2xl">
            Logged by you, credited to someone else
          </h2>
          <p className="mt-3 max-w-prose text-ink-muted">
            You filed {count(loggedOnly.length, "record")} that name someone
            else as owner or author. They count toward that person, not you —
            they are here so you can still find them.
          </p>
          <RecordList rows={loggedOnly} />
        </section>
      )}
    </div>
  );
}

function RecordList({ rows }: { rows: UseCaseRow[] }) {
  return (
    <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
      {rows.map((uc) => (
        <li key={uc.id}>
          <Link
            href={`/use-cases/${uc.id}`}
            className="block py-3 transition-colors hover:bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="truncate font-serif text-lg">{uc.title}</span>
              <span className="flex items-center gap-2">
                {!uc.inProgram && <CommunityBadge />}
                <StatusBadge status={uc.status} />
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
              {uc.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const firstName = (name: string) => name.split(" ")[0];

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
