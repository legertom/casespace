import { getCurrentUser } from "@/lib/current-user";
import { canDownloadBackup } from "@/lib/permissions";
import {
  backupStorageConfigured,
  openStoredBackup,
} from "@/server/backup-storage";

/**
 * One stored backup, as a download. The store is private and this route is
 * the only way out of it: same admin check as a fresh backup, and the name
 * has to be one the job could have written.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!canDownloadBackup(user.role) || !backupStorageConfigured()) {
    return new Response("Not found", { status: 404 });
  }
  const { name } = await params;
  const stream = await openStoredBackup(name);
  if (!stream) return new Response("Not found", { status: 404 });

  console.info(
    "stored backup downloaded",
    JSON.stringify({ userId: user.id, name }),
  );
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
