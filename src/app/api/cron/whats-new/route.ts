import { etDateString } from "@/lib/domain";
import { aiConfigured } from "@/lib/ai/config";
import { generateWhatsNew, priorWeekStart } from "@/server/whats-new";

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
    const result = await generateWhatsNew(weekStart, null);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("whats-new cron failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
