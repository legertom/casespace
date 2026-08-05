import Link from "next/link";
import { redirect } from "next/navigation";
import { AI_NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/config";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";
import { NotesDoor } from "@/components/coach/notes-door";

export const metadata = { title: "Start from notes" };

export default async function FromNotesPage() {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Start from notes</h1>
      <p className="mt-2 text-ink-muted">
        Paste whatever exists — meeting notes, a doc excerpt, a Slack thread.
        The parser pre-fills every field it can defend and flags the gaps.
        You review everything before anything saves.
      </p>
      {aiConfigured() ? (
        <div className="mt-8">
          <NotesDoor />
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-hairline bg-surface p-4 text-sm text-ink-muted">
          {AI_NOT_CONFIGURED_MESSAGE} The{" "}
          <Link href="/use-cases/new" className="text-accent underline underline-offset-2">
            form door
          </Link>{" "}
          works without it.
        </div>
      )}
    </div>
  );
}
