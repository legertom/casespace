import {
  backupStorageConfigured,
  saveBackupToStorage,
} from "@/server/backup-storage";

export const maxDuration = 120;

/** Vercel cron, daily — takes a backup and stores it outside the database. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!backupStorageConfigured()) {
    return Response.json(
      { ok: false, reason: "Blob storage not configured; nothing saved." },
      { status: 503 },
    );
  }
  try {
    const stored = await saveBackupToStorage("Scheduled backup");
    console.info("backup stored", JSON.stringify(stored));
    return Response.json({ ok: true, ...stored });
  } catch (err) {
    // The backup page shows when the newest stored backup is older than it
    // should be, which is how a run that ends here gets noticed.
    console.error("backup cron failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
