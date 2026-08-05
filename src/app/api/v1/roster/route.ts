import { authenticatePat } from "@/server/pat";
import { listRoster } from "@/server/reference";

export async function GET(req: Request) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const roster = await listRoster();
  return Response.json({
    aiLeads: roster.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      emailUnverified: l.emailUnverified,
      department: l.department,
      state: l.state,
      teams: l.teams.map((t) => t.name),
    })),
  });
}
