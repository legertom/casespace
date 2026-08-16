import { etDateString } from "@/lib/domain";
import { aiConfigured } from "@/lib/ai/config";
import { priorWeekStart } from "@/lib/weeks";
import { generateWhatsNew, hasPostForWeek } from "@/server/whats-new";

export const maxDuration = 300;

/** Vercel cron, Monday morning ET — drafts the post covering the prior week. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!aiConfigured()) {
    return Response.json(
      { ok: false, reason: "AI gateway not configured; skipping." },
      { status: 503 },
    );
  }
  try {
    const weekStart = priorWeekStart(etDateString(new Date()));
    // Insert-only: the cron never touches an existing week. If a post is
    // there — generated, edited, whatever — a re-run leaves it alone. Only
    // a human clicking Regenerate replaces content. Checked before the
    // model call so a skipped week also costs no tokens.
    if (await hasPostForWeek(weekStart)) {
      return Response.json({ ok: true, skipped: true, weekStart });
    }
    const result = await generateWhatsNew(weekStart, null);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("whats-new cron failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
