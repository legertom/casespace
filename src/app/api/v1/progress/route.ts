import { authenticatePat } from "@/server/pat";
import { buildProgressReport } from "@/server/progress-report";

export async function GET(req: Request) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await buildProgressReport());
}
