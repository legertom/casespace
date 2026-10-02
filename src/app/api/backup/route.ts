import { getCurrentUser } from "@/lib/current-user";
import { canDownloadBackup } from "@/lib/permissions";
import { createBackup } from "@/server/backup";

export const maxDuration = 60;

/**
 * The backup, as a download. A GET so the page can offer it as a plain link,
 * and it changes nothing — it reads one snapshot and hands it over.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  // 404, like the admin pages: who may take a copy of everything is not
  // something to confirm to someone who may not.
  if (!canDownloadBackup(user.role)) {
    return new Response("Not found", { status: 404 });
  }

  const { bytes, filename, manifest } = await createBackup(user.name);
  // Who took a full copy, and when, belongs on the record.
  console.info(
    "backup downloaded",
    JSON.stringify({
      userId: user.id,
      filename,
      useCases: manifest.tables.find((t) => t.name === "use_cases")?.rows,
    }),
  );
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
