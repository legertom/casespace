/**
 * The editorial brief for the weekly What's New post, the prompt built around
 * it, and the title/body split applied to what comes back.
 *
 * This lives in `lib/` — with no database import anywhere in its chain — so
 * the eval suite (`pnpm eval`) can render the prompt and grade real model
 * output against fixture weeks without touching Postgres. `src/server/whats-new.ts`
 * is the only caller in the app.
 */
import type { buildProgressReport } from "@/server/progress-report";

/** A record described the way the post refers to one: what, whose, whose team. */
interface RecordRef {
  title: string;
  department: string;
  owner: string | null;
}

/** Everything the model is told about a week. Assembled by `gatherWeekData`. */
export interface WeekData {
  weekStart: string;
  weekEnd: string;
  casespaceChanges: {
    title: string;
    summary: string;
    requestedBy: string | null;
    shippedOn: string;
  }[];
  newRecords: (RecordRef & { by: string | null })[];
  /**
   * Records logged this week by people outside the AI Leads roster. Kept in
   * their own list, not folded into newRecords, so the model can name the
   * people without the counts absorbing them.
   */
  communityRecords: (RecordRef & { by: string | null })[];
  promotions: (RecordRef & { from: string; to: string })[];
  regressions: (RecordRef & {
    from: string;
    to: string;
    note: string | null;
  })[];
  newQualified: (RecordRef & { authorsCredit: boolean })[];
  newConfirmedRoi: (RecordRef & { authorsCredit: boolean })[];
  pulseReadings: {
    metric: string;
    value: number;
    unit: string;
    baseline: number;
    target: number;
    takenOn: string;
  }[];
  scoreboardNow: Awaited<ReturnType<typeof buildProgressReport>>;
}

export const EDITORIAL_INSTRUCTIONS = `You write "What's New in Casespace" — the weekly internal note on Clever's AI Enablement program. Audience: everyone in the program — the AI Leads, their leaders, and the sponsors (Tom runs the program; Kate is the VP sponsor).

Voice: a well-edited internal newsletter. Observant, specific, zero hype. Plain words, short sentences, sentence case. Recognition means naming people and teams on real work — no badges, no cheerleading, no emoji, no exclamation marks. NEVER mention dollar figures; the program measures counts, rates, and hours only.

Structure (markdown):
- Start with "# " and a specific, quiet headline (not "Weekly update").
- An opening paragraph: the week in three sentences, anchored in the two numbers and what is in flight behind them. Never editorialize about being ahead of or behind a pace — the program does not track it that way.
- "## New in the casebook" — each new record with who logged it and which team it serves. Skip the section if empty ("A quiet week for new entries" belongs in the opener instead).
- "## From the community" — only if communityRecords is non-empty. Records owned outside the AI Leads roster: name them and the team each serves, in one short paragraph of prose. Say plainly that these are not counted toward the two numbers. Do NOT fold them into "New in the casebook", the opening paragraph's numbers, or the scoreboard anywhere in the post — every count in this post is program-only, and communityRecords is the one list that sits outside it.
- "## Movement" — promotions worth noting; call out anything reaching Qualified or Confirmed Positive ROI by name with the people behind it (a confirmed win is the week's biggest news). Include demotions/rejections plainly with their reason — the data here covers program records only, so never imply community records' movement is included; they appear solely under "From the community". Never quote the ROI confirmation note — it may contain dollars.
- "## The 15" — per-ELT-org state in prose, including the honest unallocated bucket.
- "## Pulse" — only if there are new readings this week; compare to baseline and target.
- "## Worth attention this week" — stale records and launched-but-unscored ROI, each with a concrete next step.
- "## New in Casespace" — only if casespaceChanges is non-empty. What changed in the tool itself this week, in two to four sentences of prose (not a bulleted release note). Say what a reader can now do, not how it was built. When an entry has requestedBy, name that person as the one who asked for it — that is the recognition, and it matters more than the feature. Cover only what is in casespaceChanges; never infer other changes from the rest of the data.
Keep the whole thing readable in three minutes. Numbers come only from the data provided — never invent or extrapolate.`;

/** The user-turn prompt: which week, what today is, and the week's data. */
export function whatsNewPrompt(data: WeekData, todayEt: string): string {
  return `Write the post for the week of ${data.weekStart} through ${data.weekEnd} (today is ${todayEt} ET). The week's data:\n\n${JSON.stringify(data, null, 2)}`;
}

/**
 * Split the model's markdown into a stored title and body.
 *
 * The first ATX h1 anywhere in the text becomes the title and is lifted out of
 * the body; with no h1 the whole text is the body and the week stands in as a
 * title.
 */
export function splitPost(
  text: string,
  weekStart: string,
): { title: string; body: string } {
  const trimmed = text.trim();
  const titleMatch = trimmed.match(/^#\s+(.+)$/m);
  return {
    title: titleMatch?.[1].trim() ?? `Week of ${weekStart}`,
    body: titleMatch ? trimmed.replace(titleMatch[0], "").trim() : trimmed,
  };
}
